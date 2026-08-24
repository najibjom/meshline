# Contributing to Meshline

Meshline is a text-only messaging prototype. Contributions should make the product more understandable, reliable, and accessible without expanding it into media sharing, calls, payments, wallets, or blockchain features.

## Before making a change

Use the existing domain vocabulary: **identity**, **conversation**, **direct chat**, **group**, **channel**, **relay**, and **opaque envelope**. Keep user-facing copy clear and avoid calling the current transport production E2EE, decentralized, anonymous, or audited.

For client or relay behavior changes, add or update deterministic tests. Run the clean type check before submitting work:

```bash
pnpm exec tsc --noEmit --incremental false
```

## Pull request checklist

| Check | Expected result |
|---|---|
| Scope | Text-only policy remains intact. |
| Privacy | No credentials, relay records, or personal data are committed. |
| Safety | Security claims match the actual implementation. |
| Reliability | New relay or state behavior has focused deterministic coverage. |
| Mobile UX | Light and dark modes remain readable; controls have visible feedback. |
| Validation | TypeScript passes without relying on a stale watch process. |

## Reporting problems

Include the mobile platform, installed app/runtime version, whether the device was online, the exact action taken, and a screenshot only when it contains no private message content. Do not share usernames, passwords, recovery codes, or transport keys in public issues.
