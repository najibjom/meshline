use std::time::{SystemTime, UNIX_EPOCH};

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use chacha20poly1305::{
    aead::{Aead, AeadCore, KeyInit, OsRng, Payload},
    ChaCha20Poly1305, Nonce,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;

pub const PROTOCOL_VERSION: u8 = 1;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum WireMessage {
    Envelope(Envelope),
    Receipt(Receipt),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Envelope {
    pub version: u8,
    pub id: Uuid,
    pub sender_peer: String,
    pub recipient_peer: String,
    pub created_at_ms: u64,
    pub expires_at_ms: u64,
    pub nonce_b64: String,
    pub ciphertext_b64: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Receipt {
    pub version: u8,
    pub envelope_id: Uuid,
    pub sender_peer: String,
    pub recipient_peer: String,
    pub acknowledged_at_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProtocolError {
    InvalidKey,
    InvalidNonce,
    InvalidCiphertext,
    AuthenticationFailed,
    UnsupportedVersion(u8),
    Expired,
}

impl std::fmt::Display for ProtocolError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidKey => {
                write!(formatter, "the demonstration secret could not create a key")
            }
            Self::InvalidNonce => write!(formatter, "the envelope nonce is invalid"),
            Self::InvalidCiphertext => write!(formatter, "the envelope ciphertext is invalid"),
            Self::AuthenticationFailed => {
                write!(formatter, "the envelope authentication check failed")
            }
            Self::UnsupportedVersion(version) => {
                write!(formatter, "unsupported envelope version {version}")
            }
            Self::Expired => write!(formatter, "the envelope expired before processing"),
        }
    }
}

impl std::error::Error for ProtocolError {}

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock must be after Unix epoch")
        .as_millis()
        .try_into()
        .expect("milliseconds since the Unix epoch fit into u64 for the proof")
}

pub fn encrypt_text(
    sender_peer: String,
    recipient_peer: String,
    text: &str,
    demo_secret: &str,
    ttl_ms: u64,
) -> Result<Envelope, ProtocolError> {
    let created_at_ms = now_ms();
    let envelope = Envelope {
        version: PROTOCOL_VERSION,
        id: Uuid::new_v4(),
        sender_peer,
        recipient_peer,
        created_at_ms,
        expires_at_ms: created_at_ms.saturating_add(ttl_ms),
        nonce_b64: String::new(),
        ciphertext_b64: String::new(),
    };
    let cipher = cipher_for(demo_secret)?;
    let nonce = ChaCha20Poly1305::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(
            &nonce,
            Payload {
                msg: text.as_bytes(),
                aad: envelope_associated_data(&envelope).as_bytes(),
            },
        )
        .map_err(|_| ProtocolError::AuthenticationFailed)?;

    Ok(Envelope {
        nonce_b64: BASE64.encode(nonce),
        ciphertext_b64: BASE64.encode(ciphertext),
        ..envelope
    })
}

pub fn decrypt_text(envelope: &Envelope, demo_secret: &str) -> Result<String, ProtocolError> {
    if envelope.version != PROTOCOL_VERSION {
        return Err(ProtocolError::UnsupportedVersion(envelope.version));
    }
    if envelope.expires_at_ms < now_ms() {
        return Err(ProtocolError::Expired);
    }
    let nonce_bytes = BASE64
        .decode(&envelope.nonce_b64)
        .map_err(|_| ProtocolError::InvalidNonce)?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = BASE64
        .decode(&envelope.ciphertext_b64)
        .map_err(|_| ProtocolError::InvalidCiphertext)?;
    let plaintext = cipher_for(demo_secret)?
        .decrypt(
            nonce,
            Payload {
                msg: &ciphertext,
                aad: envelope_associated_data(envelope).as_bytes(),
            },
        )
        .map_err(|_| ProtocolError::AuthenticationFailed)?;
    String::from_utf8(plaintext).map_err(|_| ProtocolError::InvalidCiphertext)
}

pub fn receipt_for(envelope: &Envelope, recipient_peer: String) -> Receipt {
    Receipt {
        version: PROTOCOL_VERSION,
        envelope_id: envelope.id,
        sender_peer: envelope.sender_peer.clone(),
        recipient_peer,
        acknowledged_at_ms: now_ms(),
    }
}

fn cipher_for(demo_secret: &str) -> Result<ChaCha20Poly1305, ProtocolError> {
    let digest = Sha256::digest(demo_secret.as_bytes());
    ChaCha20Poly1305::new_from_slice(&digest).map_err(|_| ProtocolError::InvalidKey)
}

fn envelope_associated_data(envelope: &Envelope) -> String {
    format!(
        "meshline-p2p-demo|{}|{}|{}|{}|{}",
        envelope.version,
        envelope.id,
        envelope.sender_peer,
        envelope.recipient_peer,
        envelope.expires_at_ms
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip_keeps_text_out_of_the_wire_envelope() {
        let envelope = encrypt_text(
            "12D3KooSender".into(),
            "12D3KooRecipient".into(),
            "Meshline text proof",
            "test-only-shared-secret",
            60_000,
        )
        .expect("encrypt");

        assert!(!envelope.ciphertext_b64.contains("Meshline text proof"));
        assert_eq!(
            decrypt_text(&envelope, "test-only-shared-secret").expect("decrypt"),
            "Meshline text proof"
        );
    }

    #[test]
    fn metadata_tampering_fails_authentication() {
        let mut envelope = encrypt_text(
            "12D3KooSender".into(),
            "12D3KooRecipient".into(),
            "Meshline text proof",
            "test-only-shared-secret",
            60_000,
        )
        .expect("encrypt");
        envelope.recipient_peer = "12D3KooAttacker".into();

        assert_eq!(
            decrypt_text(&envelope, "test-only-shared-secret"),
            Err(ProtocolError::AuthenticationFailed)
        );
    }

    #[test]
    fn receipt_binds_the_envelope_and_expected_peers() {
        let envelope = encrypt_text(
            "12D3KooSender".into(),
            "12D3KooRecipient".into(),
            "Meshline text proof",
            "test-only-shared-secret",
            60_000,
        )
        .expect("encrypt");
        let receipt = receipt_for(&envelope, "12D3KooRecipient".into());

        assert_eq!(receipt.envelope_id, envelope.id);
        assert_eq!(receipt.sender_peer, envelope.sender_peer);
        assert_eq!(receipt.recipient_peer, envelope.recipient_peer);
    }
}
