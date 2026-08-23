# Meshline Protocol Research Notes

## Two-device asynchronous session establishment

The Signal X3DH specification describes an asynchronous bootstrap in which a recipient publishes an identity key, signed prekey, signature, and optional one-time prekeys. A sender retrieves that bundle, verifies the signed prekey, derives a shared secret, and sends an initial AEAD-protected ciphertext. One-time prekeys are consumed and private key material is deleted after use to support forward secrecy. The protocol also binds identity information as associated data. Source: [Signal X3DH](https://signal.org/docs/specifications/x3dh/).

## Group transport

IETF RFC 9420 specifies Messaging Layer Security (MLS) for asynchronous group key establishment with forward secrecy and post-compromise security across groups ranging from two to thousands of members. Meshline should evaluate a mature MLS implementation for future encrypted groups rather than inventing group cryptography. Source: [RFC 9420](https://www.rfc-editor.org/rfc/rfc9420).

## Decentralized identity and relay discovery

W3C DID Core defines DID documents that can express verification methods and service endpoints. Meshline can use this model as an interoperability reference for a signed public identity document that exposes public prekeys and encrypted relay-discovery metadata; it must never publish message plaintext, private keys, contact graphs, or raw presence data. Source: [W3C DID Core](https://www.w3.org/TR/did/).

## Delivery service separation

RFC 9750 separates the Authentication Service and Delivery Service roles from client-controlled cryptographic state. A delivery service may distribute messages and initial public key material, but the client manages credentials, key packages, and group secrets. This supports Meshline’s design of an untrusted store-and-forward relay layer with client-side encryption. Source: [RFC 9750](https://www.rfc-editor.org/rfc/rfc9750).
