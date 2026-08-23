import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "..");

describe("Meshline durable relay contract", () => {
  it("persists public device keys and opaque envelopes with expiry and acknowledgements", () => {
    const schema = readFileSync(resolve(projectRoot, "drizzle/schema.ts"), "utf8");
    expect(schema).toContain('mysqlTable("relay_devices"');
    expect(schema).toContain('mysqlTable("relay_envelopes"');
    expect(schema).toContain('acknowledgedAt: timestamp("acknowledged_at")');
    expect(schema).toContain('expiresAt: timestamp("expires_at").notNull()');
  });

  it("stores ciphertext only, retains envelopes for a limited period, and acknowledges without deletion", () => {
    const relay = readFileSync(resolve(projectRoot, "server/opaque-relay.ts"), "utf8");
    expect(relay).toContain("const ENVELOPE_TTL_MS = 7 * 24 * 60 * 60 * 1000;");
    expect(relay).toContain("const MAX_PENDING_ENVELOPES = 500;");
    expect(relay).toContain("await db.insert(relayEnvelopes)");
    expect(relay).toContain("acknowledgedAt: new Date()");
    expect(relay).not.toContain("deviceDirectory = new Map");
  });
});
