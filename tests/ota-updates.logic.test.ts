import { describe, expect, it } from "vitest";
import { describeOtaState } from "../lib/ota-update-copy";

describe("Meshline over-the-air update messaging", () => {
  it("distinguishes a compatible available update from a native-build requirement", () => {
    expect(describeOtaState("available")).toContain("compatible Meshline update");
    expect(describeOtaState("unsupported")).toContain("update-enabled Android build");
  });
});
