import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("bounded shared-space directory contract", () => {
  it("accepts separately typed groups and channels without storing membership or message data", () => {
    const schema = read("drizzle/schema.ts");
    const routes = read("server/relay-routes.ts");
    expect(schema).toContain('mysqlEnum("kind", ["group", "channel"])');
    expect(routes).toContain('z.enum(["group", "channel"])');
    expect(schema).not.toContain("member_usernames");
    expect(schema).not.toContain("message_body");
  });
});
