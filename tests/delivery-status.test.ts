import { describe, expect, it } from "vitest";

import { describeOutgoingMessageState, describeRelayDeliveryFailure } from "../lib/delivery-status";

describe("Meshline direct-message delivery feedback", () => {
  it("explains that a reachable service does not mean an unregistered recipient can receive a message", () => {
    expect(describeRelayDeliveryFailure(new Error("Recipient has not connected a proof-of-concept device relay key yet."))).toContain("Recipient needs to open Meshline");
    expect(describeRelayDeliveryFailure(new Error("Recipient device is not registered with the proof relay."))).toContain("Recipient needs to open Meshline");
  });

  it("keeps an unknown relay failure actionable without promising delivery", () => {
    expect(describeRelayDeliveryFailure(new Error("Network request failed"))).toContain("Check the connection banner");
  });

  it("explains a temporary durable relay-storage fault separately from recipient availability", () => {
    expect(describeRelayDeliveryFailure(new Error("Meshline durable relay storage is temporarily unavailable."))).toContain("temporarily saving messages offline");
  });

  it("distinguishes relay acceptance from recipient delivery without creating a retry promise", () => {
    expect(describeOutgoingMessageState("sending")).toBe("Sending…");
    expect(describeOutgoingMessageState("queued")).toBe("Relay accepted · waiting for recipient");
    expect(describeOutgoingMessageState("queued", "Queued for 1 of 2 registered members.")).toContain("Relay accepted ·");
  });

  it("keeps failed messages visible and actionable without an automatic resend", () => {
    expect(describeOutgoingMessageState("failed", "Recipient needs to open Meshline and wait for Meshline connected.")).toContain("Not sent · Recipient needs");
    expect(describeOutgoingMessageState("failed")).toContain("connection banner");
  });
});
