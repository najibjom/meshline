import { describe, expect, it } from "vitest";

import { findGlobalMessageResults, findGlobalPeopleResults } from "../lib/global-search";

const conversations = [
  { id: "chat-noway", peerDisplayName: "Noway", peerUsername: "@noway", createdAt: "2026-08-24T00:00:00.000Z", updatedAt: "2026-08-24T01:00:00.000Z" },
  { id: "chat-writers", peerDisplayName: "Writers", peerUsername: "@writers", description: "Text group", createdAt: "2026-08-24T00:00:00.000Z", updatedAt: "2026-08-24T00:30:00.000Z", kind: "group" as const },
];

describe("Meshline global Chats search", () => {
  it("finds chats by display name and exact @username without duplicating an existing conversation contact", () => {
    const results = findGlobalPeopleResults(conversations, [
      { id: "@noway", displayName: "Noway", username: "@noway", createdAt: "2026-08-24T00:00:00.000Z" },
      { id: "@alex", displayName: "Alex", username: "@alex", createdAt: "2026-08-24T00:00:00.000Z" },
    ], "@noway");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ kind: "conversation", conversation: { peerUsername: "@noway" } });
    expect(findGlobalPeopleResults(conversations, [], "writers")[0]).toMatchObject({ kind: "conversation", conversation: { peerUsername: "@writers" } });
  });

  it("finds matching text across message history and returns the owning conversation", () => {
    const results = findGlobalMessageResults(conversations, {
      "chat-noway": [{ id: "1", conversationId: "chat-noway", body: "Meet after lunch", direction: "inbound", status: "delivered", createdAt: "2026-08-24T01:05:00.000Z" }],
      "chat-writers": [{ id: "2", conversationId: "chat-writers", body: "Lunch outline is ready", direction: "outbound", status: "delivered", createdAt: "2026-08-24T01:10:00.000Z" }],
    }, "lunch");
    expect(results.map((result) => result.conversation.peerUsername)).toEqual(["@writers", "@noway"]);
    expect(findGlobalMessageResults(conversations, {}, "")).toEqual([]);
  });
});
