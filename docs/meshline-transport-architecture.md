# Meshline Text-Only Transport and Relay Architecture

> **Status: design foundation only.** The current Meshline app stores messages locally and does not yet provide real peer-to-peer delivery, network-wide username resolution, or end-to-end encrypted transport. This document defines the implementation boundary required before those claims can be made.

## 1. Product Boundary

Meshline remains a **text-only messenger** in this milestone. There are no avatars, images, files, voice notes, media upload paths, or media relays. Direct chats, groups, and channels use text envelopes only.

The target system separates four concerns: the client device, an encrypted transport envelope, an untrusted store-and-forward relay layer, and a signed public resolution layer. This separation is intentional: messages must never be written to a blockchain, and a relay must not need plaintext or private keys to route an envelope.

| Concern | Client device | Relay | Name-resolution record | Ledger, if ever used |
|---|---|---|---|---|
| Private keys | Stores locally only | Never receives | Never contains | Never contains |
| Message plaintext | Encrypts and decrypts | Never sees | Never contains | Never contains |
| Ciphertext envelope | Creates and verifies | Temporarily queues and forwards | Never contains | Never contains |
| Public key / prekey metadata | Publishes and rotates | Caches or serves by opaque key | Binds to signed identity | May anchor a small commitment only |
| Human-readable username | Displays after verification | Does not define authority | Resolves to signed record | Optional anti-squatting / recovery anchor only |

## 2. Two-Device Encrypted Direct Messaging

### 2.1 Device identity and prekeys

Each account has a root identity signing key and each device has separate device-authentication and key-agreement material. A device publishes a signed prekey bundle containing its identity public key, signed prekey, signature, and a replenishable pool of one-time prekeys. This follows the asynchronous bootstrap model described by Signal’s X3DH specification: a sender can initiate a secure conversation while the recipient is offline, and one-time prekeys are consumed after use to strengthen forward secrecy.[1]

The app must use a maintained, audited cryptographic implementation; Meshline must not implement primitives, ratchets, serialization, or key derivation from scratch. The production cryptography review must choose concrete suites, implementations, secure-storage behavior, backup policy, and a key-rotation schedule.

### 2.2 Session lifecycle

1. The sender resolves the recipient’s current signed device/prekey record.
2. The sender verifies the record signature and derives an initial session secret through an asynchronous authenticated key agreement.
3. The first ciphertext contains the session-bootstrap header and a text message encrypted with authenticated encryption. Public identity keys, device IDs, protocol version, and routing context are bound as associated data.
4. Both devices transition into a per-device double-ratchet session. Each text message uses a fresh message key; skipped-key handling is bounded to mitigate storage exhaustion.
5. The recipient acknowledges the opaque envelope ID after successful local processing. Delivery acknowledgements are signed or authenticated at the session layer but reveal no plaintext.
6. Prekeys and ratchet state are rotated, and session recovery rules are explicit for device loss, re-registration, and suspected compromise.

The X3DH specification explicitly describes publishing identity, signed, and optional one-time prekeys; it also specifies signature verification, associated data binding, and removal of used one-time prekey material.[1] The subsequent ratchet should be based on a reviewed implementation of the Double Ratchet algorithm, rather than an application-specific variant.[2]

### 2.3 Minimal text envelope

The relay-visible envelope must be deliberately small and contain no display name, username, contact list, message preview, channel title, or plaintext metadata.

```text
version
opaque_envelope_id
recipient_device_hint
sender_ephemeral_or_session_header
created_at_bucket
expiry
ciphertext
authentication_tag
```

The recipient-device hint is an opaque, rotating routing token, not a stable public device identifier. Expiry, message size, and per-recipient queue caps are enforced to prevent unbounded relay storage.

## 3. Groups and Channels

For real encrypted group delivery, Meshline should evaluate Messaging Layer Security (MLS) rather than extending a pairwise ratchet independently for every recipient. RFC 9420 specifies asynchronous group key establishment with forward secrecy and post-compromise security for groups from two to thousands of members.[3]

The local group and channel controls in the current MVP are **not** cryptographic authorization. In the production design, membership changes become signed proposals/commits in the group’s encrypted state. A removal must result in rekeying before the removed device can decrypt future content. A channel is modeled as a group with an owner or admin authorization policy that permits one or more publisher devices to emit application messages.

RFC 9750 distinguishes client-controlled cryptographic state from delivery and authentication services. It notes that a delivery service can distribute messages and key material without becoming the cryptographic authority; the client remains responsible for credentials, key packages, and group state.[4] Meshline should retain this separation.

| Space | Current local MVP | Future encrypted transport |
|---|---|---|
| Direct chat | Local text record | Device-to-device ratcheted session |
| Group | Local member list and owner settings | MLS group with signed membership commits and permission extensions |
| Channel | Local subscriber list and owner-only posting | MLS-backed broadcast group with publisher authorization and encrypted fan-out |

## 4. Decentralized Name Resolution

Human-readable Meshline usernames are not sufficient as security identities. A username must resolve to a signed identity record, and the application must show a stable safety identifier or verification flow for key-change events.

The compatibility target is a DID-like document model: public verification methods, key-agreement material, and service endpoints are represented separately from the user experience. W3C DID Core defines documents that can express public verification methods and service endpoints.[5] Meshline need not require every user to see a DID or use a blockchain; it can use these concepts as an interoperable record shape.

```json
{
  "handle": "@alice",
  "recordVersion": 7,
  "identityKey": "public verification key",
  "devices": [
    {
      "deviceId": "rotating public device reference",
      "prekeyBundle": "signed public prekey bundle",
      "relayHints": ["opaque relay hint"]
    }
  ],
  "expiresAt": "timestamp",
  "previousRecord": "signed continuity reference",
  "signature": "identity-key signature"
}
```

Resolution follows a privacy-first order:

1. Normalize and validate the requested handle.
2. Query multiple resolvers for the current signed record.
3. Verify the record signature and continuity from the previously trusted identity key.
4. Compare resolver responses and detect equivocation or unexpected key changes.
5. Fetch only the selected device prekey bundle or relay hint needed to create an encrypted envelope.
6. Cache the record with an expiry and revalidate on change or expiry.

The global name layer should store only signed public records, short expiries, and possibly an anti-squatting/recovery commitment. It must not record message bodies, recipient names, message timestamps, social graphs, session keys, or raw online status. If a ledger is later used, it anchors a small commitment or registry state; it is never a message transport or message database.

## 5. Relay Network

Relays are **untrusted store-and-forward infrastructure**. They forward ciphertext addressed by rotating opaque delivery tokens and apply expiry and queue limits. A relay may be centralized, federated, or operated by community nodes without changing the device cryptography.

| Relay responsibility | Relay must do | Relay must not do |
|---|---|---|
| Queueing | Retain encrypted envelopes until acknowledgement or expiry | Retain plaintext or indefinite history |
| Routing | Use opaque recipient hints | Require public usernames in every request |
| Abuse controls | Apply rate, size, and expiry limits | Inspect or classify message contents |
| Availability | Support multiple relay candidates and failover | Become the sole source of identity truth |
| Observability | Expose aggregated operational metrics | Build contact graphs or presence profiles |

The first transport implementation should define a simple HTTPS request/response relay API, then add persistent connections only after envelope, retry, and acknowledgement behavior is independently tested. Realtime operation is event-driven and requires a durable always-on service; it should not be simulated with task scheduling or public-blockchain RPC calls.

## 6. Trust, Threats, and Safety Rules

The design treats relays, name resolvers, and network links as potentially curious or malicious. The client verifies signatures, rotates keys, authenticates envelopes, detects key changes, and provides a clear user-visible warning before trusting a materially changed identity record.

The design does not claim metadata anonymity. A relay can observe network addresses, envelope timing, size, and queue behavior unless countermeasures are deployed. Privacy improvements therefore progress in order: relay minimization and expiry, multiple relays and padding policy, optional proxying, and only then more advanced anonymity research. Each step needs a threat-model review because it changes latency, cost, abuse handling, and reliability.

## 7. Implementation Sequence and Acceptance Gates

| Stage | Deliverable | Gate before advancing |
|---|---|---|
| A | Formal threat model and cryptographic library selection | Independent cryptography review; no custom protocol code |
| B | Signed device and prekey directory contract | Key rotation, stale key, replay, and resolver-equivocation tests |
| C | Encrypted direct text envelope prototype between two devices | Both devices exchange text through an untrusted relay; relay cannot decrypt fixtures |
| D | Retry, acknowledgement, expiry, relay failover, and device re-linking | Deterministic offline, duplicate, out-of-order, and loss tests |
| E | Encrypted group membership and text delivery using MLS | Join, remove, rekey, permission, and late-joiner test matrix |
| F | Signed name records and multi-resolver lookup | Key-change UX, record expiry, and equivocation detection tests |
| G | Security audit and limited opt-in release | Public claims match the audited scope exactly |

## References

[1] [Signal, *The X3DH Key Agreement Protocol*](https://signal.org/docs/specifications/x3dh/)

[2] [Signal, *The Double Ratchet Algorithm*](https://signal.org/docs/specifications/doubleratchet/)

[3] [IETF RFC 9420, *The Messaging Layer Security (MLS) Protocol*](https://www.rfc-editor.org/rfc/rfc9420)

[4] [IETF RFC 9750, *The Messaging Layer Security (MLS) Architecture*](https://www.rfc-editor.org/rfc/rfc9750)

[5] [W3C, *Decentralized Identifiers (DIDs) v1.0*](https://www.w3.org/TR/did/)
