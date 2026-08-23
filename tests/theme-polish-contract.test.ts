import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const networkSource = readFileSync("app/(tabs)/network.tsx", "utf8");
const chatSource = readFileSync("app/chat/[id].tsx", "utf8");
const profileSource = readFileSync("app/(tabs)/profile.tsx", "utf8");

describe("Meshline core theme polish contract", () => {
  it("uses the active palette for Network text, cards, and resource preferences", () => {
    expect(networkSource).toContain("const colors = useColors();");
    expect(networkSource).not.toContain("containerClassName=\"bg-[#F6F7FB]\"");
    expect(networkSource).toContain("backgroundColor: `${colors.tint}18`");
  });

  it("uses the active palette for inbound conversation bubbles", () => {
    expect(chatSource).toContain("const colors = useColors();");
    expect(chatSource).toContain("backgroundColor: colors.surface");
    expect(chatSource).toContain("color: colors.text");
  });

  it("keeps Profile focused on the text-only product boundary", () => {
    expect(profileSource).toContain("Meshline does not use a wallet or blockchain.");
  });
});
