use std::{collections::BTreeSet, fmt};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub const OBJECT_VERSION: u8 = 1;
pub const MAX_REPLICA_TARGET: u8 = 5;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EncryptedOfflineObject {
    pub version: u8,
    pub object_id: String,
    pub recipient_hint: String,
    pub created_at_ms: u64,
    pub expires_at_ms: u64,
    pub ciphertext_b64: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlacementManifest {
    pub version: u8,
    pub object_id: String,
    pub signer_peer: String,
    pub replica_target: u8,
    pub expires_at_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StorageError {
    InvalidReplicaTarget(u8),
    Expired,
    ObjectIdMismatch,
    DuplicateReplica,
}

impl fmt::Display for StorageError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidReplicaTarget(target) => {
                write!(
                    formatter,
                    "replica target must be between 1 and {MAX_REPLICA_TARGET}, got {target}"
                )
            }
            Self::Expired => write!(formatter, "object or placement manifest has expired"),
            Self::ObjectIdMismatch => write!(formatter, "placement manifest does not match object"),
            Self::DuplicateReplica => write!(formatter, "node already stores this object"),
        }
    }
}

impl std::error::Error for StorageError {}

pub fn make_object(
    recipient_hint: String,
    created_at_ms: u64,
    expires_at_ms: u64,
    ciphertext_b64: String,
) -> EncryptedOfflineObject {
    let object_id = hex_digest(
        format!(
            "meshline-offline-object|{OBJECT_VERSION}|{recipient_hint}|{created_at_ms}|{expires_at_ms}|{ciphertext_b64}"
        )
        .as_bytes(),
    );
    EncryptedOfflineObject {
        version: OBJECT_VERSION,
        object_id,
        recipient_hint,
        created_at_ms,
        expires_at_ms,
        ciphertext_b64,
    }
}

pub fn make_manifest(
    object: &EncryptedOfflineObject,
    signer_peer: String,
    replica_target: u8,
) -> Result<PlacementManifest, StorageError> {
    validate_replica_target(replica_target)?;
    Ok(PlacementManifest {
        version: OBJECT_VERSION,
        object_id: object.object_id.clone(),
        signer_peer,
        replica_target,
        expires_at_ms: object.expires_at_ms,
    })
}

pub fn validate_manifest(
    object: &EncryptedOfflineObject,
    manifest: &PlacementManifest,
    now_ms: u64,
) -> Result<(), StorageError> {
    validate_replica_target(manifest.replica_target)?;
    if object.object_id != manifest.object_id {
        return Err(StorageError::ObjectIdMismatch);
    }
    if object.expires_at_ms < now_ms || manifest.expires_at_ms < now_ms {
        return Err(StorageError::Expired);
    }
    Ok(())
}

#[derive(Debug, Default)]
pub struct ReplicaLedger {
    assignments: BTreeSet<(String, String)>,
}

impl ReplicaLedger {
    pub fn assign(
        &mut self,
        manifest: &PlacementManifest,
        node_peer: String,
        now_ms: u64,
    ) -> Result<(), StorageError> {
        validate_replica_target(manifest.replica_target)?;
        if manifest.expires_at_ms < now_ms {
            return Err(StorageError::Expired);
        }
        if !self
            .assignments
            .insert((manifest.object_id.clone(), node_peer))
        {
            return Err(StorageError::DuplicateReplica);
        }
        Ok(())
    }

    pub fn remove(&mut self, object_id: &str, node_peer: &str) -> bool {
        self.assignments
            .remove(&(object_id.to_owned(), node_peer.to_owned()))
    }

    pub fn replica_count(&self, object_id: &str) -> usize {
        self.assignments
            .iter()
            .filter(|(assigned_object_id, _)| assigned_object_id == object_id)
            .count()
    }

    pub fn missing_replicas(&self, manifest: &PlacementManifest) -> u8 {
        manifest
            .replica_target
            .saturating_sub(self.replica_count(&manifest.object_id) as u8)
    }
}

fn validate_replica_target(replica_target: u8) -> Result<(), StorageError> {
    if (1..=MAX_REPLICA_TARGET).contains(&replica_target) {
        Ok(())
    } else {
        Err(StorageError::InvalidReplicaTarget(replica_target))
    }
}

fn hex_digest(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture() -> (EncryptedOfflineObject, PlacementManifest) {
        let object = make_object(
            "recipient-routing-hint".into(),
            1_000,
            11_000,
            "opaque-ciphertext-only".into(),
        );
        let manifest = make_manifest(&object, "12D3KooSigner".into(), 3).expect("manifest");
        (object, manifest)
    }

    #[test]
    fn placement_manifest_exposes_no_fixture_plaintext() {
        let (object, manifest) = fixture();
        let wire = serde_json::to_string(&(object, manifest)).expect("serialize");

        assert!(!wire.contains("secret message body"));
        assert!(wire.contains("opaque-ciphertext-only"));
    }

    #[test]
    fn expired_object_or_manifest_is_rejected() {
        let (object, manifest) = fixture();
        assert_eq!(
            validate_manifest(&object, &manifest, 11_001),
            Err(StorageError::Expired)
        );
    }

    #[test]
    fn substituted_manifest_is_rejected() {
        let (object, mut manifest) = fixture();
        manifest.object_id = "substituted-object-id".into();

        assert_eq!(
            validate_manifest(&object, &manifest, 1_001),
            Err(StorageError::ObjectIdMismatch)
        );
    }

    #[test]
    fn replica_target_is_bounded() {
        let (object, _) = fixture();
        assert_eq!(
            make_manifest(&object, "12D3KooSigner".into(), 0),
            Err(StorageError::InvalidReplicaTarget(0))
        );
        assert_eq!(
            make_manifest(&object, "12D3KooSigner".into(), MAX_REPLICA_TARGET + 1),
            Err(StorageError::InvalidReplicaTarget(MAX_REPLICA_TARGET + 1))
        );
    }

    #[test]
    fn duplicate_replica_is_rejected_and_loss_creates_a_repair_need() {
        let (_, manifest) = fixture();
        let mut ledger = ReplicaLedger::default();
        ledger
            .assign(&manifest, "12D3KooNodeA".into(), 1_001)
            .expect("first assignment");
        ledger
            .assign(&manifest, "12D3KooNodeB".into(), 1_001)
            .expect("second assignment");
        ledger
            .assign(&manifest, "12D3KooNodeC".into(), 1_001)
            .expect("third assignment");

        assert_eq!(
            ledger.assign(&manifest, "12D3KooNodeC".into(), 1_001),
            Err(StorageError::DuplicateReplica)
        );
        assert_eq!(ledger.missing_replicas(&manifest), 0);

        assert!(ledger.remove(&manifest.object_id, "12D3KooNodeB"));
        assert_eq!(ledger.missing_replicas(&manifest), 1);
        ledger
            .assign(&manifest, "12D3KooNodeD".into(), 1_001)
            .expect("repair assignment");
        assert_eq!(ledger.missing_replicas(&manifest), 0);
    }
}
