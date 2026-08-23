import { describe, expect, it } from "vitest";
import { classifyMeshlineConnection, describeMeshlineConnection } from "../lib/connection-status";

describe("Meshline connection diagnostics", () => {
  it("separates an offline device from an unavailable Meshline service", () => {
    expect(classifyMeshlineConnection(false, null)).toBe("offline");
    expect(classifyMeshlineConnection(true, false)).toBe("service-unavailable");
    expect(describeMeshlineConnection("service-unavailable").detail).toContain("internet is working");
  });

  it("reports a reachable device and service as connected", () => {
    expect(classifyMeshlineConnection(true, true)).toBe("connected");
  });
});
