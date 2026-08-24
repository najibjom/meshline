# Meshline development guide

## Repository map

| Location | Responsibility |
|---|---|
| `app/` | Expo Router screens and mobile flows. |
| `components/` | Reusable, theme-aware presentation components. |
| `lib/meshline.ts` | Domain models and local state helpers. |
| `lib/meshline-context.tsx` | Client identity, persistence, message synchronization, and relay coordination. |
| `server/relay-routes.ts` | Public relay HTTP routes. |
| `server/opaque-relay.ts` | Database-backed opaque envelope and device-directory logic. |
| `drizzle/` | Relay tables, migration files, and schema. |
| `tests/` | Deterministic contracts for model, relay, transport, fanout, update, and visual behavior. |

## Local workflow

Install packages with `pnpm install`, then start the managed client/server development workflow with `pnpm dev`. Use one-off checks rather than long-lived TypeScript or test watchers when resources are constrained.

```bash
pnpm exec tsc --noEmit --incremental false
pnpm exec vitest run --pool=forks --poolOptions.forks.singleFork=true
```

## Data and secrets

The repository contains source code and database migrations, not production credentials or data. Do not commit `.env` files, OAuth tokens, database connection strings, relay records, message text, password material, recovery codes, or device keys.

## Design constraints

Mobile screens should favor one-handed portrait use, functional light/dark contrast, readable text, and simple feedback. The Meshline visual system uses dark navy, white, restrained blue action color, and the approved brand mark. Avoid user-uploaded avatars and all media features.
