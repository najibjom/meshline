import { describe, expect, it } from "vitest";

import { describeRelayDeliveryFailure } from "../lib/delivery-status";

describe("Meshline direct-message delivery feedback", () => {
  it("explains that a reachable service does not mean an unregistered recipient can receive a message", () => {
    expect(describeRelayDeliveryFailure(new Error("Recipient has not connected a proof-of-concept device relay key yet."))).toContain("Recipient needs to open Meshline");
    expect(describeRelayDeliveryFailure(new Error("Recipient device is not registered with the proof relay."))).toContain("Recipient needs to open Meshline");
  });

  it("keeps an unknown relay failure actionable without promising delivery", () => {
    expect(describeRelayDeliveryFailure(new Error("Network request failed"))).toContain("Check the connection banner");
  });
});
