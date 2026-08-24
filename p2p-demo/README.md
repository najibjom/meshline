# Meshline P2P Text Demonstration

> **Experimental developer proof only.** This program does not alter the shipped Meshline mobile app, replace its relay, or establish a production encryption protocol. It exists to demonstrate a small multi-peer libp2p transport path before native mobile integration is attempted.

## What It Demonstrates

Each process creates an independent libp2p peer identity, listens on TCP and QUIC, discovers local-network peers through mDNS, and can additionally dial explicit peer multiaddresses. Gossipsub signs network publications. This deliberately small proof enables direct publication to known subscribed peers, rather than depending on a mature mesh topology; it is not a scalability design. A text payload is encrypted into an authenticated envelope using a **test-only shared secret**; the resulting envelope binds its sender, recipient, ID, version, and expiry as associated data. Only the intended demonstration recipient attempts decryption and publishes a receipt.

This is deliberately separated from Meshline’s real account, username, and message models. It proves the basic P2P path while preventing a premature claim that the Expo application is already a decentralized messenger.

## Local Three-Peer Proof

Open three terminals in this directory. Use the same temporary secret in all of them. Start a hub first and copy the `LISTEN ... /p2p/...` TCP address that it prints.

```bash
export MESHLINE_DEMO_SECRET='choose-a-temporary-test-secret'
cargo run -- --tcp-port 4010 --quic-port 4010 --run-seconds 90
```

Start a recipient and then a sender, replacing the example address with the hub address printed above. Both peers can use mDNS on one LAN; `--peer` makes the local proof deterministic.

```bash
cargo run -- --peer /ip4/127.0.0.1/tcp/4010/p2p/HUB_PEER_ID --run-seconds 90

cargo run -- --peer /ip4/127.0.0.1/tcp/4010/p2p/HUB_PEER_ID --recipient RECIPIENT_PEER_ID --send 'Hello through the Meshline P2P proof' --run-seconds 45
```

The recipient prints `RECEIVED_ENCRYPTED_TEXT`, while the sender prints `DELIVERED` after it receives the receipt. The hub may print `FORWARDED_OPAQUE_ENVELOPE`; it does not decrypt the message.

## What This Does Not Yet Prove

This proof does not yet provide mobile-native Rust bindings, Internet NAT traversal, Circuit Relay/DCUtR, a DHT, durable distributed storage, replica repair, X3DH, Double Ratchet, key transparency, username records, group messaging, anonymity routing, or a security audit. It must never be described as production-grade end-to-end encryption.

## Local Relay Reachability Probe

The repository also includes a separate Circuit Relay and relay-client probe. It is a developer harness only: it verifies a local relay reservation and a relayed connection request, but it does not persist messages or make any public-network promise.

```bash
# Terminal A: start a local relay and copy its RELAY_LISTEN TCP address.
cargo run --bin meshline-relay -- --port 4020 --run-seconds 90

# Terminal B: reserve a relayed address and copy MESHLINE_RELAY_CLIENT_PEER.
cargo run --bin meshline-relay-client -- --mode listener --relay /ip4/127.0.0.1/tcp/4020/p2p/RELAY_PEER_ID --run-seconds 90

# Terminal C: ask for a relayed connection to the listener.
cargo run --bin meshline-relay-client -- --mode dialer --relay /ip4/127.0.0.1/tcp/4020/p2p/RELAY_PEER_ID --remote-peer LISTENER_PEER_ID --run-seconds 45
```

Expected evidence is `RELAY_RESERVATION_ACCEPTED` at the listener and `RELAY_CONNECTION_ESTABLISHED` at the dialer. When both clients run on the same host, a later direct-upgrade attempt can fail because the test does not reproduce separate NATs; that does not invalidate the established relayed fallback route. A later stage must add a real opaque-envelope exchange over this path and test DCUtR across two private networks separately from relay fallback.

## Offline Object and Replica Policy Fixture

`src/storage.rs` is a non-networked protocol fixture for the later distributed-storage phase. It defines an expiring encrypted-object manifest, a bounded replica target of one to five nodes, and a local replica ledger. Its deterministic tests reject expired objects, invalid replication policy, and duplicate assignments; they also show that a missing replica creates an explicit repair need. It does **not** store objects on peers, prove storage, choose peers, or make a distributed-storage claim.

## Next Engineering Gate

The next iteration replaces the local hub with a separate public Circuit Relay and demonstrates two private peers using a relayed connection followed by a best-effort direct connection upgrade. That work must include an explicit failure mode: when direct upgrade fails, encrypted envelope delivery continues through the relay rather than disappearing.
