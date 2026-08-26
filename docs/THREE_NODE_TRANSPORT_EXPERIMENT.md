# Meshline Three-Node Transport Experiment

## Purpose and Boundary

This is a **transport experiment**, not a production decentralized messenger and not a security claim. It will demonstrate that two private Rust/libp2p peers can exchange a bounded encrypted test envelope through a public bootstrap/circuit-relay node, attempt a direct connection upgrade, and retain the existing HTTPS durable relay as a visible fallback when peer-to-peer transport is unavailable.

The experiment follows the public Rust libp2p tutorial’s three-role model: one internet-reachable circuit relay, one reserving private peer, and one dialing private peer. The success record must distinguish a relayed connection from a successful DCUtR direct upgrade; the latter is not assumed to work on every NAT.[1]

| Role | Required behavior | Not in scope |
| --- | --- | --- |
| Public bootstrap/circuit relay | Advertises a stable multiaddress, accepts bounded reservations, and enforces connection, bandwidth, and reservation limits. | Message storage, account directory, membership data, or decryption. |
| Private peer A | Connects out, reserves a relay address, receives a test envelope, and records whether transport was relayed or direct. | Always-on mobile background operation. |
| Private peer B | Connects out, discovers A’s relay address, sends the test envelope, and records the transport result. | NAT traversal guarantees. |
| HTTPS relay fallback | Receives the existing opaque envelope only when P2P delivery is unavailable or explicitly disabled, preserving present offline behavior. | Silent downgrade or a false "P2P delivered" label. |

## Bounded Storage Rule

The public circuit relay stores **no messages**. The existing HTTPS relay may retain only its current opaque ciphertext envelopes and acknowledgement state within its documented expiry policy. Any later P2P replication experiment must use encrypted objects, explicit expiry, replica limits, byte quotas, and repair limits; it must not reuse channel/group directory data as a member or subscriber graph.

Circuit Relay v2 makes the relay path visible to both endpoints. This is desirable for Meshline’s transparency requirement but it is neither anonymity nor application-level authorization. The relay’s libp2p peer identity authenticates the transport peer; Meshline must separately bind device and username permissions to its application identity rules.[3] [4]

## Security Rules Before Production Claims

Meshline will not claim end-to-end encryption, authenticated session security, or key transparency from this experiment. A future private-session design must keep an independently verifiable long-term identity key, publish a signed pre-key with an expiry, maintain a bounded one-time-pre-key pool, verify the signed pre-key before session setup, atomically consume one-time pre-keys, retain a previous signed-pre-key privately for a short grace window, and surface a key-change warning. These constraints are derived from X3DH’s identity key, signed pre-key, one-time pre-key, signature verification, replacement, and deletion properties.[2]

Signed username records are a separate future object. They must bind an `@username`, identity-key fingerprint, device/pre-key references, sequence number, expiry, and revocation/replacement reference, all signed by the current identity key. The HTTPS directory remains authoritative only for the current prototype; it is not a decentralized name system and cannot by itself provide key transparency.

## Required Evidence

The experiment is complete only when a report shows the relay’s public reachability, A’s reservation, B’s relayed dial, the direct-upgrade result as either success or failure, a bounded text-envelope acknowledgement, and an intentional HTTPS fallback case. Logs must exclude private keys, plaintext messages, and authorization secrets.

## Existing Harness Audit

The current `p2p-demo` is a useful local proof but is not yet the required internet experiment. It generates a new peer identity on each run, discovers local peers with mDNS, sends test envelopes through signed Gossipsub, and uses a shared demonstration secret. It has no circuit-relay server behavior, reservation flow, direct-connection-upgrade behavior, durable peer identity, pre-key system, username record, or HTTPS-fallback decision path. Its next revision must preserve the bounded envelope and acknowledgement checks while replacing local mDNS assumptions with explicit relay-address and peer-address inputs.

The existing dependency set already includes the required Rust libp2p relay, DCUtR, Noise, Identify, TCP, QUIC, and Yamux features. The separate offline-object proof already constrains replica targets to 1–5 and checks expiry, object/manifest binding, duplicate assignments, and repair need. That storage code stays a local deterministic model for now; the public circuit relay must not run it or persist offline objects.

The repository also already has a dedicated `meshline-relay` and `meshline-relay-client` pair. The client requests a reservation, can form a relayed route to a listener, and reports DCUtR events, but both binaries still create a new key for each run. The relay currently uses the library default configuration and therefore needs explicit prototype limits; the client needs persistent test identity, clearer terminal evidence, and a command-driven envelope/receipt exchange before it qualifies as the requested three-node harness.

The harness now uses persistent, owner-only harness identities, explicit reservation/circuit limits, signed Gossipsub test envelopes, opaque relay-path logging, authenticated receipt evidence, and a reproducible local three-process runner at `p2p-demo/scripts/run-local-three-node-probe.sh`. The runner validates the relayed path and logs DCUtR success or failure without treating either same-host result as a public NAT test.

## Local Validation Result

On 26 August 2026, the local three-process runner passed: the listener reservation was accepted, the relay accepted a circuit from the dialer to the listener, the dialer established the explicit relayed transport, the listener authenticated the bounded envelope, and the dialer received the acknowledgement. In this same-host setup, DCUtR exhausted its direct-dial attempts and failed, while the relayed transport continued to deliver the envelope and receipt. This is the expected reason for the next test to use three internet-separated roles; it is not evidence about public NAT traversal success or failure.

## References

[1] [Rust libp2p Hole Punching Tutorial](https://docs.rs/libp2p/latest/libp2p/tutorials/hole_punching/index.html)

[2] [Signal: The X3DH Key Agreement Protocol](https://signal.org/docs/specifications/x3dh/)

[3] [libp2p: Circuit Relay](https://libp2p.io/docs/circuit-relay/)

[4] [libp2p: Security Considerations](https://libp2p.io/docs/security-considerations/)
