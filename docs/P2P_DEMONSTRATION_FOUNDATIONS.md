# Meshline P2P Demonstration Foundations

## Purpose

This note defines the smallest honest Rust/libp2p demonstration that can support Meshline’s future text-only decentralized transport. It does not claim that the mobile application is already decentralized, private against all network observers, or ready for public use.

## Demonstration Boundary

The initial proof will run three distinct roles: a publicly reachable bootstrap/relay node, a listening peer behind a normal network boundary, and a dialing peer behind a different network boundary. The two peers must discover one another, establish a relayed connection when a direct path is unavailable, exchange a signed opaque text envelope, acknowledge receipt, and record whether a direct connection upgrade succeeds or the relay remains necessary.

The relay node is a coordination and fallback component for this proof. It is not a central message database. It must not receive plaintext message content from the demonstration protocol, and it must not be presented as a replacement for future replicated encrypted storage.

## Evidence From Current libp2p Documentation

The libp2p rendezvous protocol allows peers to register themselves under namespaces and lets other peers query the same rendezvous point for matching registrations. Its default registration lifetime is two hours, with a documented upper bound of 72 hours. Meshline can use an explicit application namespace only for the bounded demonstration; long-term decentralized names require separately signed identity records and record-rotation rules. [1]

The current Rust libp2p hole-punching tutorial documents a three-machine proof: a public relay server, a private listening client, and a private dialing client on a different network. The path begins through Circuit Relay and attempts a direct upgrade through DCUtR. A successful direct upgrade is useful evidence, but failure must remain an expected supported result: the peers can continue through the relay rather than losing the message. [2]

Rust libp2p’s Kademlia implementation exposes record and provider operations, but its documentation makes a critical integration requirement explicit: applications must connect Identify address updates to Kademlia, or provide an equivalent peer-discovery path. Without that wiring, a node cannot discover beyond its configured boot nodes. Meshline therefore must not replace the current username directory with a DHT call alone; the Rust core needs identity/address propagation, bootstrap rotation, signed-record validation, and expiry handling as one feature. [3]

## Acceptance Criteria

| Criterion | Required evidence |
|---|---|
| Independent identities | Each peer has a generated libp2p peer identity and records the remote peer ID used for the test. |
| Discovery | The dialing peer finds the listening peer via a shared, test-only rendezvous namespace. |
| Connectivity fallback | The two peers exchange an opaque envelope through the relay when no direct route is initially available. |
| Text transport | The receiving peer verifies message framing, emits a receipt, and the sender records the acknowledgement. |
| Direct-route attempt | Logs show either a DCUtR success or an explicit relayed-fallback result. |
| Failure handling | Restarting one peer, delaying a receipt, and sending a duplicate envelope produce explicit, non-crashing outcomes. |

## Current Local Evidence

The isolated `p2p-demo` harness has passed a direct two-peer proof: independently generated libp2p peers connected over local TCP/QUIC, the sender published an authenticated opaque test envelope, the recipient decrypted it, emitted a receipt, and the sender recorded `DELIVERED`. The Rust tests also verify that the envelope does not contain the fixture plaintext, metadata tampering fails authentication, and the receipt binds the expected peers and envelope ID.

The same harness now includes a local Circuit Relay binary and listener/dialer probe. In a local run, the listener received `RELAY_RESERVATION_ACCEPTED`, and the dialer established a `/p2p-circuit` connection to that listener. The following direct-upgrade attempts failed on the single-host test, as expected because it does not recreate two separate NATs. This proves a relayed fallback route exists in the harness; it does **not** yet prove public relay operation, cross-network hole punching, or message delivery over the relayed route.

## Explicit Non-Goals

The proof will not claim production end-to-end encryption, anonymous routing, global DHT reachability, distributed offline storage, multi-device key rotation, arbitrary group messaging, economic rewards, or resistance to Sybil and denial-of-service attacks. Those require a separate threat model and staged test plan.

## References

[1] [libp2p, “Rendezvous”](https://libp2p.io/docs/rendezvous/)

[2] [rust-libp2p 0.56.0, “Hole Punching Tutorial”](https://docs.rs/libp2p/latest/libp2p/tutorials/hole_punching/index.html)

[3] [rust-libp2p 0.56.0, “Kademlia”](https://docs.rs/libp2p/latest/libp2p/kad/index.html)

[4] [rust-libp2p, “relay-server example”](https://raw.githubusercontent.com/libp2p/rust-libp2p/master/examples/relay-server/src/main.rs)

[5] [rust-libp2p, “DCUtR example”](https://raw.githubusercontent.com/libp2p/rust-libp2p/master/examples/dcutr/src/main.rs)
