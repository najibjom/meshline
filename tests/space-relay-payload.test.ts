import { describe, expect, it } from "vitest";

import { decodeSpaceRelayPayload, encodeSpaceRelayPayload, encodeSpaceRelaySyncPayload } from "../lib/space-relay-payload";
import type { Conversation, Message } from "../lib/meshline";

const group: Conversation = {
  id: "group-alpha",
  peerUsername: "@writers",
  peerDisplayName: "Writers",
  kind: "group",
  description: "Text-only writing group",
  memberUsernames: ["@nomad", "@noway"],
  groupPermissions: { membersCanPost: true, membersCanInvite: false },
  createdBy: "@nomad",
  createdByDeviceId: "device-a",
  createdAt: "2026-08-24T00:00:00.000Z",
  updatedAt: "2026-08-24T00:00:00.000Z",
  spaceUpdatedAt: "2026-08-24T00:00:00.000Z",
};

const message: Message = {
  id: "message-alpha",
  conversationId: group.id,
  body: "A text-only relay update",
  direction: "outbound",
  status: "sending",
  createdAt: "2026-08-24T00:01:00.000Z",
};

describe("Meshline space relay payload", () => {
  it("round-trips the minimum group metadata and text message needed by a registered member", () => {
    const payload = decodeSpaceRelayPayload(encodeSpaceRelayPayload(group, message));
    if (!payload || payload.type !== "meshline-space-message") throw new Error("Expected a valid space message payload.");
    expect(payload.space.peerUsername).toBe("@writers");
    expect(payload.space.memberUsernames).toEqual(["@nomad", "@noway"]);
    expect(payload.spaceUpdatedAt).toBe("2026-08-24T00:00:00.000Z");
    expect(payload.message.body).toBe("A text-only relay update");
  });

  it("round-trips an owner settings snapshot and requires the owner to remain a member", () => {
    const payload = decodeSpaceRelayPayload(encodeSpaceRelaySyncPayload(group));
    expect(payload?.type).toBe("meshline-space-sync");
    expect(payload?.space.createdBy).toBe("@nomad");
    expect(payload && payload.type === "meshline-space-sync" ? payload.updatedAt : null).toBe("2026-08-24T00:00:00.000Z");
    expect(decodeSpaceRelayPayload(JSON.stringify({
      version: 1,
      type: "meshline-space-sync",
      updatedAt: "2026-08-24T00:02:00.000Z",
      space: { ...group, memberUsernames: ["@noway"] },
    }))).toBeNull();
  });

  it("rejects malformed, non-space, or oversized member metadata", () => {
    expect(decodeSpaceRelayPayload("not-json")).toBeNull();
    expect(decodeSpaceRelayPayload(JSON.stringify({ version: 1, type: "different" }))).toBeNull();
    expect(decodeSpaceRelayPayload(JSON.stringify({
      version: 1,
      type: "meshline-space-message",
      space: { id: "group", kind: "group", peerUsername: "@bad", peerDisplayName: "Bad", memberUsernames: ["not-a-username"] },
      message: { id: "message", body: "hello", createdAt: "2026-08-24T00:01:00.000Z" },
    }))).toBeNull();
  });
});
