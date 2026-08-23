import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contextSource = readFileSync("lib/meshline-context.tsx", "utf8");

describe("Meshline cross-device space settings contract", () => {
  it("only applies received membership and permission snapshots from the recorded owner", () => {
    expect(contextSource).toContain("envelope.senderUsername === spacePayload.space.createdBy");
    expect(contextSource).toContain("Rejected a first-time space envelope that was not sent by its recorded owner.");
    expect(contextSource).toContain("Rejected a space settings update that was not sent by the recorded owner.");
    expect(contextSource).toContain("canApplySpaceSnapshot && !isStaleSpaceSnapshot");
  });

  it("queues owner settings for both prior and current registered members", () => {
    expect(contextSource).toContain("[...previousMemberUsernames, ...(space.memberUsernames ?? [])]");
    expect(contextSource).toContain("encodeSpaceRelaySyncPayload(space)");
    expect(contextSource).toContain("relaySpaceSnapshot(updatedSpace, space.memberUsernames)");
  });

  it("blocks messages from a device removed by a synchronized membership snapshot", () => {
    expect(contextSource).toContain("You are no longer a member of this space.");
  });

  it("does not roll received owner metadata backward when an older relay envelope arrives late", () => {
    expect(contextSource).toContain("Date.parse(incomingSpaceUpdatedAt) < Date.parse(existingConversation.spaceUpdatedAt ?? existingConversation.createdAt)");
    expect(contextSource).toContain("isStaleSpaceSnapshot");
  });
});
