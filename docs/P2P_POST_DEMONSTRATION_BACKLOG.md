# Meshline Post-Demonstration Hardening Backlog

## Purpose

This is the next five engineering milestones after the bounded direct Rust/libp2p proof. They are intentionally ordered to protect reliability and truthful product claims before adding scale, incentives, or optional coordination layers.

| Order | Milestone | Concrete deliverable | Completion evidence |
|---:|---|---|---|
| 1 | Reachability and discovery | A three-role test harness with a bootstrap/rendezvous node, Circuit Relay fallback, and a DCUtR direct-route attempt | Two peers on distinct private networks exchange an opaque envelope. Logs report either direct upgrade or continued relay delivery. |
| 2 | Replicated offline object storage | Expiring encrypted object format, signed placement manifest, replica target, repair queue, and explicit local resource limits | Disable a replica, retrieve the ciphertext through another replica, and prove that no holder sees fixture plaintext. |
| 3 | Reliability observability | Stable transport event schema, structured local logs, delivery state transitions, duplicate/replay handling, and simulated loss tests | Deterministic test report covers peer absence, delayed acknowledgement, duplicate envelope, restart, expiry, and replica loss. |
| 4 | Native mobile-core bridge | Versioned React Native-to-Rust interface with dual transport mode and crash-safe lifecycle behavior | Fresh Android phone and x86_64 emulator demonstrate fallback, recovery after backgrounding, and preserved local data. |
| 5 | Independent security and limited beta readiness | Threat model, reviewed cryptographic library selection, key-lifecycle design, protocol test vectors, and external review plan | Public beta language is approved against evidence; no feature is described as E2EE, anonymous, or decentralized beyond what is verified. |

## Transparent Contribution Rule

No node participation or reputation system should be enabled before milestone 2 produces real, measurable resource work. When it is introduced, the application must show storage used, retention time, network/charging eligibility, recent successful work, and an opt-out switch. The first version is **local accounting**, not punishment, fines, hidden background usage, or token economics.

## Explicit Deferrals

Sharding, large-scale storage proofs, onion routing, rewards, governance, and optional TON coordination remain deferred. They cannot be used to substitute for reliable peer discovery, encrypted objects, replica repair, clear device controls, and independent security review.
