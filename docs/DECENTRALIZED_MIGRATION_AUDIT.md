# Meshline Decentralized Migration Audit

**Author:** Manus AI
**Status:** Planning and migration document. It does not claim that the released mobile application is decentralized or production-secure.

## Executive Position

Meshline should **not** be rebuilt from zero. The current React Native application already contains the valuable product shell: a text-only experience, local identity and recovery UX, conversations, group/channel controls, message states, offline-friendly local persistence, username-oriented navigation, network controls, and Android testing/release workflows. The current Express/MySQL relay is an intentionally limited transport underneath that shell.

The safe migration path is therefore a replacement of transport and storage **behind stable client contracts**, not a replacement of Chats, Profile, groups, channels, or the dark-navy product interface. At every stage, the existing relay remains a tested fallback until its decentralized successor has equivalent acceptance evidence.

> **Current truth:** the released client uses an experimental device-key encryption proof and a durable central relay for queued ciphertext. The relay does not receive plaintext, but the system does not yet provide audited end-to-end encryption, decentralized naming, anonymity, or distributed storage.

## What Was Demonstrated Before This Audit

An isolated Rust/libp2p developer proof now exists at `p2p-demo/`. Two independently generated libp2p peers established a direct local connection, sent a signed pubsub publication containing an authenticated opaque envelope, decrypted it only at the intended peer, emitted a receipt, and recorded `DELIVERED` at the sender. The proof has deterministic tests that show ciphertext does not expose the test text, metadata changes break authentication, and a receipt binds the expected envelope and peer IDs.

This is a useful first engineering signal, not a public-network claim. The proof currently uses a shared test secret, local peer discovery/direct dialing, and no mobile binding, DHT, Circuit Relay/DCUtR, durable storage, replication, X3DH, Double Ratchet, key transparency, or independent security review.

## Target Architecture

```text
React Native screens and local state
        |
MeshlineTransport contract (TypeScript)
        |------------------------------|
temporary HTTPS relay adapter      native Rust-core adapter
        |                              |
Express/MySQL fallback         Rust/libp2p transport core
                                      |
       signed records + discovery + relay fallback + encrypted object replication
                                      |
                             recipient devices and opt-in nodes
```

The first decentralized network still needs a small set of public bootstrap and relay services. Their role is discovery, connection coordination, and temporary fallback—not permanent central storage or identity authority. The libp2p rendezvous protocol is designed for peer registration and discovery through shared namespaces, while the documented DCUtR/Circuit Relay flow supports a public relay plus two private peers when direct reachability is unavailable. [1] [2]

Rust libp2p’s Kademlia implementation supports distributed records and provider lookups, but its documentation warns that Identify address updates—or a deliberate equivalent—must be wired into Kademlia. A DHT call without address discovery will not discover beyond boot nodes. [3]

## File-by-File Migration Map

| File or area | Current responsibility | Preserve now | Migration action | Exit gate |
|---|---|---|---|---|
| `app/(tabs)/index.tsx` | Chats UI, global search, direct username entry points | Keep screen and navigation behavior | Replace relay lookup calls indirectly through `MeshlineTransport.resolveHandle()` | Exact `@username` search still works through both adapters |
| `app/new-chat.tsx` | Opens a direct chat after username resolution | Keep user flow | Ask the transport contract for a verified recipient descriptor rather than a raw relay device | No contact creation required; verified/unverified state is visible |
| `app/chat/[id].tsx` | Conversation UI and delivery presentation | Keep message rendering and header profile links | Render the same `sending → queued → delivered/failed` states from transport receipts | UI does not care whether a receipt came from HTTP or Rust core |
| `app/person/[username].tsx` | Safe profile-style destination for a resolved handle | Keep its minimal privacy posture | Feed it only signed public profile fields, never node addresses, peers, or social graph | Key-change and record-expiry state are actionable but non-invasive |
| `app/(tabs)/contacts.tsx` | Saved contacts and tappable usernames | Keep local contacts | Read verification/trust state from the new identity-record cache | Existing contacts continue to open chats during rollout |
| `lib/meshline.ts` | Product-domain types, local state, local identity/session persistence | Keep `Conversation`, `Message`, contacts, message states, privacy/network settings | Add transport-neutral recipient-record and receipt metadata types; do not embed libp2p types in UI models | State can be persisted and restored without a Rust process running |
| `lib/meshline-context.tsx` | Current orchestration of registration, inbox polling, encryption, send, acknowledgement, and status promotion | Preserve state transitions and UI-facing callbacks | Extract direct relay calls into a `MeshlineTransport` adapter. Keep this file as a coordinator, not a network implementation | Test suite runs the same send/inbound/receipt scenarios against a fake adapter |
| `lib/relay-client.ts` | Thin HTTP API wrapper | Retain as `HttpRelayTransport` during migration | Make it one implementation of the new transport contract; do not delete it until P2P has rollback evidence | Client can choose HTTPS fallback by configuration or transport health |
| `lib/transport.ts` | SecureStore-backed device key and `tweetnacl.box` proof helpers | Retain secure local storage patterns only | Deprecate proof-specific key format; introduce audited Rust-core key lifecycle and session storage through a native boundary | No production claim until reviewed X3DH/ratchet/device lifecycle is complete |
| `server/relay-routes.ts` | Validated HTTP endpoints for device lookup, envelopes, inbox, receipts, acknowledgement | Preserve route compatibility | Freeze as a compatibility gateway and later expose aggregate health/fallback metrics only | Existing 1.0.5 clients remain able to deliver during rollout |
| `server/opaque-relay.ts` | Central durable queue, expiry, queue cap, acknowledgement timestamp | Preserve as a bounded fallback | Re-express its behaviors as testable transport invariants: enqueue, fetch, ack, expiry, queue cap, receipt | P2P adapter passes the same behavior contract under loss, restart, duplicate, and offline tests |
| `drizzle/schema.ts` | `relay_devices` username-to-key table and `relay_envelopes` ciphertext queue | Preserve existing rows and retention safety | Do not copy message history into a DHT. Introduce new signed-record/object schemas separately while MySQL remains fallback | Database remains optional for normal P2P traffic and is never an identity authority |
| `server/db.ts` and migrations | MySQL access and centralized persistence | Preserve for rollback and current production | Separate relay-fallback migrations from protocol formats; never couple a DHT object format to SQL column shapes | A rollback does not corrupt local or replicated object state |
| `p2p-demo/Cargo.toml` | Isolated Rust proof dependency boundary | Keep isolated from Expo build | Split into `meshline-core` library and `meshline-node` executable only after the protocol contract is approved | Core runs deterministic tests independently of React Native |
| `p2p-demo/src/protocol.rs` | Test-only envelope and receipt serialization | Preserve as a learning/test fixture, not as production protocol | Replace shared-secret setup with reviewed identity/prekey/session design; version every wire format | Old test vectors remain readable; unsupported versions fail closed |
| `p2p-demo/src/main.rs` | Local TCP/QUIC/Noise/Yamux/Gossipsub/mDNS proof | Preserve as a developer harness | Add transport tests in layers: explicit direct dial, rendezvous, Circuit Relay, DCUtR, then Kademlia and object replication | Each route reports whether it was direct or relayed; relay fallback remains usable |
| `tests/durable-relay-contract.test.ts` | Current relay semantic regression checks | Keep | Promote to transport-contract tests that every adapter must satisfy | HTTP and Rust adapters both pass the same core suite |
| `tests/delivery-receipt-and-profile-contract.test.ts` | Sender receipt promotion and username/profile UI contracts | Keep | Extend with signed-record expiry, key continuity, and fallback UI cases | “Delivered” wording stays technically honest across transports |
| `docs/meshline-transport-architecture.md` | Architecture intent and crypto roadmap | Keep as baseline | Convert protocol decisions into versioned design records with threat-model sign-off | No implementation step exceeds approved threat-model scope |
| `app.config.ts` and Expo native configuration | Android package, signing, and build setup | Keep fresh signing identity and current package unchanged | Add native Rust bindings only in a deliberate dedicated native-build phase; do not hide them inside OTA updates | Phone and emulator packages pass the existing signature/ABI/release checks |

## The Contract to Extract First

The immediate source change after the demonstration should be an adapter contract in TypeScript, implemented first by the existing HTTP relay. That avoids a risky whole-file rewrite of `meshline-context.tsx`.

```ts
type MeshlineTransport = {
  start(identity: LocalIdentity): Promise<TransportHealth>;
  resolveHandle(handle: string): Promise<RecipientRecord | null>;
  send(envelope: OutboundEnvelope): Promise<AcceptedEnvelope>;
  pullInbound(): Promise<InboundEnvelope[]>;
  acknowledge(envelopeId: string): Promise<Acknowledgement>;
  readReceipts(ids: string[]): Promise<DeliveryReceipt[]>;
  stop(): Promise<void>;
};
```

The client must not receive libp2p peer IDs, multiaddrs, relay reservations, DHT routing buckets, or replica locations through this contract unless a later safety/UI decision explicitly requires it. The product shell needs a recipient identity record, an opaque envelope ID, transport health, and an honest receipt—not network topology.

## Staged Migration Plan

| Stage | New capability | What remains unchanged | Required proof before continuing |
|---|---|---|---|
| 0. Contract extraction | `MeshlineTransport` with current HTTP relay as its first adapter | All shipped screens and relay behavior | Existing tests pass with an in-memory fake and HTTP adapter |
| 1. Rust core harness | `meshline-core` envelope/receipt test vectors and `meshline-node` CLI | Mobile app and MySQL relay | Repeatable direct two-peer proof, failure tests, versioned wire format |
| 2. Reachability | Bootstrap peer, rendezvous, Circuit Relay fallback, DCUtR attempt | HTTP relay remains available | Two private networks exchange text; logs distinguish direct success from relay fallback |
| 3. Signed identity records | Signed handle-to-device/prekey records with expiry and continuity | Current username UX and local contacts | Key rotation, stale record, rollback, and resolver-equivocation tests |
| 4. Encrypted offline objects | Content-addressed encrypted envelopes with recipient routing hints and TTL | Current receipt UI | Offline recipient retrieves only ciphertext; replay/duplicate/expiry tests pass |
| 5. Replication and repair | Explicit replication factor, placement policy, audit events, repair queue | User-selected storage/network limits | Kill replicas, recover object, demonstrate no plaintext on a node |
| 6. Native mobile bridge | Rust core invoked through a controlled native module; dual transport mode | Expo screens, fresh package identity, updater | Phone and emulator test fallback, background/restart behavior, crash recovery |
| 7. Limited opt-in network | Community node roles, public protocol docs, independent review | Central fallback remains emergency-only | External testers reproduce delivery, loss, and privacy claims independently |

## Distributed Encrypted Storage Design

The first storage system should not imitate a blockchain. It should store small, expiring, encrypted objects keyed by a collision-resistant content identifier. A placement manifest is a signed routing object that expresses desired replica count, expiry, object size, and eligible node policy. Nodes receive ciphertext and the minimum routing metadata needed to hold it; they do not receive plaintext, a global contact list, or a permanent account history.

| Object layer | Minimum contents | Explicitly excluded |
|---|---|---|
| Encrypted message object | Version, opaque object ID, recipient routing hint, expiry, ciphertext, authenticated metadata | Display name, message preview, group title, device address book |
| Signed placement manifest | Object ID, desired replica count, expiry, signer, signature, retention class | Plaintext, private key, social graph, human-readable conversation title |
| Retrieval receipt | Object ID, relay/node route class, processing acknowledgement, timestamp bucket | Human-read state, plaintext, full node topology |
| Local availability record | Opt-in limits, storage used, charging/network eligibility, signed node session data | Hidden background resource use or punitive reputation/fine values |

For the first public beta, use a modest, explicit replication target such as three eligible replicas only after a storage cap, expiry policy, repair protocol, and test harness exist. This is not a cryptographic “storage proof” yet. It is transparent local accounting backed by observable node receipts and repair events. Storage proofs, rewards, privacy routing, sharding, and optional TON coordination remain later research tracks rather than requirements for beta messaging.

## Security and Product Rules

The current client-side `tweetnacl.box` proof and the Rust proof’s shared secret are not compatible production cryptographic designs. The production Rust core must use reviewed libraries and a threat-model-approved combination of identity signing keys, signed prekeys, asynchronous session establishment, ratcheting, replay control, device lifecycle, recovery, and key transparency. The existing design note correctly points toward X3DH and Double Ratchet for direct sessions and MLS for future group/channel cryptographic state; neither should be reimplemented from scratch.

The message-layer roadmap must also avoid overclaiming anonymity. A relay, bootstrap node, or object holder may observe timing, size, and network address metadata unless a later routing/padding/proxy design changes that. The initial beta should describe privacy and availability in measured language, show user-visible resource controls, and publish protocol limitations.

## Acceptance Tests That Matter More Than Features

Before a P2P adapter becomes the default path, it must pass deterministic tests for peer absence, duplicate delivery, duplicate receipts, restart during acknowledgement, delayed receipt, object expiry, replica loss, corrupted ciphertext, key rotation, stale name record, conflicting signed record, relay fallback, and client app restart. The mobile bridge also needs real phone and x86_64 emulator validation with backgrounding and local-data preservation.

The test report must distinguish three outcomes: **accepted by a transport**, **recipient device processed encrypted material**, and **human read**. Only the middle state is represented by the current `Delivered` UI. No version should infer a human read state from a network acknowledgement.

## What Not to Do

Do not remove Express/MySQL before the Rust adapter demonstrates equal behavior under failure. Do not put messages on a blockchain. Do not publish a global presence list. Do not let DHT records become unverified username authority. Do not add hidden storage/relay usage. Do not ship native Rust bindings through a JavaScript-only update. Do not replace the release signer, package identity, or approved launcher icon while transport work proceeds.

## Recommended Immediate Next Move

The next practical code change is the **transport contract extraction** in `lib/meshline-context.tsx`, with `lib/relay-client.ts` adapted underneath it. In parallel, keep `p2p-demo/` as a CLI harness and add the three-peer public-relay/Circuit Relay/DCUtR test described in `P2P_DEMONSTRATION_FOUNDATIONS.md`. This turns the current working direct proof into a credible mobile-network research path without risking the installed messenger.

## References

[1] [libp2p, “Rendezvous”](https://libp2p.io/docs/rendezvous/)

[2] [rust-libp2p 0.56.0, “Hole Punching Tutorial”](https://docs.rs/libp2p/latest/libp2p/tutorials/hole_punching/index.html)

[3] [rust-libp2p 0.56.0, “Kademlia”](https://docs.rs/libp2p/latest/libp2p/kad/index.html)
