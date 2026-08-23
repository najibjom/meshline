# Meshline Two-Device Opaque Relay Proof

## Purpose

This is a narrow **development proof of concept** for direct text messages. It demonstrates client-side authenticated encryption with device-held key material and a relay that queues opaque envelopes. It is not production E2EE and must not be represented as such.

## What the relay can observe

The relay receives an envelope ID, sender and recipient routing usernames, a sender public key, nonce, ciphertext, timestamps, and expiry. It does not receive message plaintext or a device secret key. This prototype does not hide metadata such as timing, sender/recipient routing labels, or message size.

## Two-device procedure

1. Use two installed instances of the same Meshline build, not the web preview.
2. Create separate local identities and visit **Network → Encrypted text proof** on both devices to register their public transport keys.
3. Compare the displayed transport fingerprints out of band before considering a contact trusted.
4. Save the other device’s exact username as a contact and send a direct text.
5. On the receiving device, confirm the direct message appears after the proof relay poll interval.
6. Repeat with the recipient app closed, then reopened, while the development relay is still running.

## Verification evidence

The automated test suite proves that an encrypted ciphertext does not contain a known plaintext fixture, decrypts only with the matching recipient key, and that the relay queue accepts and returns opaque envelope fields before acknowledgement removes them. This does not replace an external cryptographic audit, an authenticated key directory, X3DH, a Double Ratchet, or durable relay persistence.

## Explicit non-goals

There is no production identity verification, forward secrecy, post-compromise security, encrypted backup, push delivery, media transport, P2P discovery, relay durability, or anti-abuse system in this proof. Those are separate milestones defined in `docs/meshline-transport-architecture.md`.
