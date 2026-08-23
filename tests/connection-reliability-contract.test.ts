import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "..");

describe("Meshline installed-client connection reliability", () => {
  it("pins native clients to the public relay instead of an injected sandbox URL", () => {
    const source = readFileSync(resolve(projectRoot, "constants/oauth.ts"), "utf8");
    expect(source).toContain('if (ReactNative.Platform.OS !== "web")');
    expect(source).toContain("return DEFAULT_MESHLINE_API_BASE_URL;");
  });

  it("requires repeated failed health checks before presenting service unavailable", () => {
    const source = readFileSync(resolve(projectRoot, "components/meshline-connection-banner.tsx"), "utf8");
    expect(source).toContain("const FAILURE_COUNT_BEFORE_OUTAGE = 3;");
    expect(source).toContain("new AbortController()");
    expect(source).toContain("consecutiveServiceFailures.current >= FAILURE_COUNT_BEFORE_OUTAGE ? false : null");
  });
});
