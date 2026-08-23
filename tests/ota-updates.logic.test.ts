import { describe, expect, it } from "vitest";
import { describeOtaState } from "../lib/ota-update-copy";

describe("Expo release credential", () => {
  it("can authenticate with Expo before publishing a production update", async () => {
    const token = process.env.EXPO_TOKEN;
    expect(token).toBeTruthy();

    const response = await fetch("https://api.expo.dev/v2/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "query MeshlineReleaseAuth { me { username } }" }),
    });

    expect(response.ok).toBe(true);
    const payload = (await response.json()) as {
      data?: { me?: { username?: string } };
      errors?: Array<{ message: string }>;
    };
    expect(payload.errors).toBeUndefined();
    expect(payload.data?.me?.username).toBe("najibjom");
  }, 20_000);
});

describe("Meshline over-the-air update messaging", () => {
  it("distinguishes a compatible available update from a native-build requirement", () => {
    expect(describeOtaState("available")).toContain("compatible Meshline update");
    expect(describeOtaState("unsupported")).toContain("update-enabled Android build");
  });
});
