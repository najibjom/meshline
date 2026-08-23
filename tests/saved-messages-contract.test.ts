import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const chat = readFileSync(resolve(process.cwd(), "app/chat/[id].tsx"), "utf8");
const chats = readFileSync(resolve(process.cwd(), "app/(tabs)/index.tsx"), "utf8");

describe("Meshline Saved Messages interaction contract", () => {
  it("renders a personal Saved Messages chat first in Chats and allows saving text from another conversation", () => {
    expect(chats).toContain("Boolean(right.isSavedMessages)");
    expect(chats).toContain("conversation.isSavedMessages ? <View style={styles.savedAvatar}");
    expect(chat).toContain('void saveMessage(actionMessage.body)');
    expect(chat).toContain('conversation.isSavedMessages ? "Write a note" : "Write a message"');
  });
});
