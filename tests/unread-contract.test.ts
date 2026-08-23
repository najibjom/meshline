import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contextSource = readFileSync("lib/meshline-context.tsx", "utf8");
const chatSource = readFileSync("app/chat/[id].tsx", "utf8");
const chatsSource = readFileSync("app/(tabs)/index.tsx", "utf8");

describe("Meshline inbound unread contract", () => {
  it("increments only real inbound relay messages and not space settings notices", () => {
    expect(contextSource).toContain('const unreadCount = message.direction === "inbound" ? 1 : 0;');
    expect(contextSource).toContain("unreadCount: (candidate.unreadCount ?? 0) + unreadCount");
  });

  it("clears a conversation's unread state when its chat screen opens", () => {
    expect(contextSource).toContain("markConversationRead");
    expect(contextSource).toContain("unreadCount: 0");
    expect(chatSource).toContain("void markConversationRead(id)");
  });

  it("renders a bounded unread badge in the Chats list", () => {
    expect(chatsSource).toContain('conversation.unreadCount > 99 ? "99+" : conversation.unreadCount');
    expect(chatsSource).toContain("styles.unreadBadge");
  });
});
