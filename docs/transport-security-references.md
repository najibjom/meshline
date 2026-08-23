# Meshline Transport Security Roadmap

## Current boundary

Meshline currently provides an **experimental encrypted-relay proof** for text. A device holds a local transport key, encrypts a direct message for a registered recipient key, and sends only opaque relay envelope fields to the server. The relay stores recipient and sender metadata, public keys, nonce, ciphertext, expiry, and acknowledgement state. The relay is not intended to see direct-message plaintext.

This is **not production end-to-end encryption**. It does not yet provide X3DH session setup, signed or one-time prekeys, Double Ratchet state, authenticated directory responses, key transparency, reliable device lifecycle management, replay controls, or an independent security audit. Group and channel delivery currently creates individually encrypted copies for registered members; it is not a secure group-messaging protocol.

| Area | Current Meshline behavior | Production target | Status |
|---|---|---|---|
| Direct session setup | Observed device transport key | Signed identity, signed prekey, and replenished one-time prekeys | Not implemented |
| Direct message keys | Long-lived NaCl-box-style device encryption | Per-session ratcheting message keys with secure state deletion | Not implemented |
| Identity trust | Local fingerprint observation and key-change warning | Audited directory plus user verification workflow | Not implemented |
| Groups and channels | Per-member encrypted fanout and owner snapshots | Epoch-based authenticated group protocol | Not implemented |
| Delivery | Durable opaque relay records, expiry, acknowledgement | Idempotent protocol messages, replay controls, and audited recovery policy | Partial experimental proof |

## Reference design principles

X3DH is designed for asynchronous initial setup using published key material, while still requiring users to authenticate identity keys through a trusted channel when identity assurance matters. Its security considerations also describe the role of signed prekeys, one-time prekeys, server refusal of service, and identity binding. [1]

The Double Ratchet specification treats message ordering, skipped message keys, secure deletion, and recovery from compromise as first-class protocol responsibilities rather than UI details. [2] Meshline must not present a static device public key as an equivalent substitute.

For group messaging, the current fanout approach scales linearly because it creates a copy per recipient. MLS instead models authenticated membership as a ratchet tree with epochs, proposals, commits, welcomes, and fresh secrets for current members; it supports removing a member without granting that member a subsequent epoch secret. [3]

> A future Meshline verification badge must not imply real-world identity. Even a successful automated key-verification check is narrower: it helps establish that participants are using the expected cryptographic keys, and does not by itself prevent impersonation or account compromise. [4]

## Staged implementation roadmap

### Stage 0 — Keep the current proof honest

Keep the in-app wording as **experimental relay delivery**, retain key-change warnings, and show `Queued` only after durable relay acceptance. Do not label the current transport “verified,” “audited,” or “production E2EE.” Continue testing offline retrieval only with the text proof and never mix user content into synthetic service checks.

### Stage 1 — Create a versioned device and prekey service

Introduce separate, versioned records for an account identity key, active device signing key, signed prekey, one-time prekey inventory, key epochs, revocation state, and prekey expiry. A device must sign its prekey bundle with its identity key. The service must enforce bundle validation, prekey depletion alerts, atomic one-time prekey consumption, rate limits, and authenticated device revocation.

The protocol document must define username-to-identity binding, device-add and device-remove flows, recovery after reinstall, expiration, rotation cadence, and what happens to preexisting sessions. No client implementation should begin until these records and server error semantics have a reviewed schema.

### Stage 2 — Implement and test X3DH session establishment

Use a maintained, independently reviewed cryptographic library rather than reproducing primitives. Bind the session context to protocol version, both account identifiers, both device identifiers, bundle version, and supported cipher suite through associated data. Persist an explicit session-bootstrap transcript identifier, reject replayed or stale bundles, and remove consumed one-time prekeys atomically.

Acceptance tests must cover offline initiation, signed-prekey rotation, one-time-prekey exhaustion, server substitution attempts, duplicate initial envelopes, device reinstallation, and a recipient who receives the initial envelope out of order.

### Stage 3 — Add Double Ratchet state and delivery rules

Replace the static direct-message encryption helper with a ratchet session per remote device pair. Persist root key, sending and receiving chain state, ratchet public keys, message counters, a strictly bounded skipped-key store, protocol version, and replay identifiers in encrypted device storage. Define bounded handling for out-of-order and duplicate messages, deletion of consumed or superseded material, and failure states that do not cause the app to silently reuse a message key.

The first implementation must be exercised against protocol test vectors and adversarial state-machine tests. It must include interrupted writes, duplicate relay delivery, reordered envelopes, skipped-key limit overflow, undecryptable envelopes, clock anomalies, and state rollback attempts. A background retry must be idempotent at the protocol level before Meshline offers a generic “retry send” control.

### Stage 4 — Add directory consistency and user verification

Build an auditable key directory only after the direct-session protocol is stable. The client should verify inclusion and consistency proofs, cache a trusted tree head, surface a clear key-change state, and provide an optional comparison flow such as a fingerprint or QR code. A directory failure should degrade to an explicit warning or a user choice; it must never silently replace a trusted identity key.

This stage remains distinct from real-world identity proof. In particular, Meshline’s username model should not claim that cryptographic verification proves who controls a name outside the system. [4]

### Stage 5 — Replace per-member group fanout with a group protocol

Treat groups and channels as a separate protocol project. Evaluate MLS with a maintained implementation and a full threat model for owner controls, membership commits, welcomes, removals, delayed delivery, message authentication, concurrent updates, epoch recovery, device addition, and multi-device state. Owner controls must become authenticated protocol events, not merely fields inside an application payload. [3]

No migration should erase existing conversations. Version every space, preserve a read-only history boundary, and require a deliberate client migration once the audit-approved group format is ready.

### Stage 6 — Independent review and controlled rollout

Before describing any new transport as production-ready, commission an independent cryptographic and implementation review. Publish a scope statement, threat model, test strategy, dependency inventory, known limitations, disclosure contact, and staged migration plan. Begin with opt-in test accounts, telemetry limited to operational errors rather than plaintext or keys, rollback controls, and clear migration notices.

## Explicit non-goals until the roadmap is complete

Meshline will not claim decentralized identity, trustless relays, production E2EE, automatic identity verification, secure group encryption, or unbounded global scale on the basis of the current proof. The user-facing security screen should continue to say that direct relay delivery is experimental and that group and channel fanout is individually encrypted delivery rather than a secure group protocol.

## References

[1]: https://signal.org/docs/specifications/x3dh/ "Signal — X3DH Key Agreement Protocol"
[2]: https://signal.org/docs/specifications/doubleratchet/ "Signal — The Double Ratchet Algorithm"
[3]: https://www.rfc-editor.org/rfc/rfc9420.html "RFC 9420 — The Messaging Layer Security Protocol"
[4]: https://support.signal.org/hc/en-us/articles/10223569377562-Automatic-Key-Verification "Signal Support — Automatic Key Verification"
