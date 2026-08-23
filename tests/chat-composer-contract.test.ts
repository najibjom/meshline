import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const chatScreen = readFileSync(resolve(process.cwd(), "app/chat/[id].tsx"), "utf8");

describe("Meshline chat composer contract", () => {
  it("keeps the disabled send arrow visible and exposes a send accessibility label", () => {
    expect(chatScreen).toContain('accessibilityLabel="Send message"');
    expect(chatScreen).toContain('color={canSend ? "#FFFFFF" : palette.indigo}');
    expect(chatScreen).toContain('sendDisabled: { backgroundColor: "#E7EBF3", borderColor: "#C5CDDA", borderWidth: 1 }');
  });

  it("makes the built-in guide read-only instead of attempting a fake direct delivery", () => {
    expect(chatScreen).toContain('canPost && !conversation.isGuide');
    expect(chatScreen).toContain('Meshline Guide is read-only');
    expect(chatScreen).toContain('Meshline Guide is an information chat and cannot receive messages.');
  });
});
