import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const profile = readFileSync(resolve(process.cwd(), "app/(tabs)/profile.tsx"), "utf8");
const root = readFileSync(resolve(process.cwd(), "app/_layout.tsx"), "utf8");
const provider = readFileSync(resolve(process.cwd(), "lib/theme-provider.tsx"), "utf8");

describe("Meshline appearance contract", () => {
  it("mounts the app theme provider and aligns the native status bar", () => {
    expect(root).toContain("<ThemeProvider><MeshlineRoot /></ThemeProvider>");
    expect(root).toContain('colorScheme === "dark" ? "light" : "dark"');
  });

  it("offers clearly labeled Light and Dark controls and persists the choice", () => {
    expect(profile).toContain("Choose light or dark mode");
    expect(profile).toContain(">Light</Text>");
    expect(profile).toContain(">Dark</Text>");
    expect(provider).toContain('AsyncStorage.setItem(THEME_PREFERENCE_KEY, scheme)');
  });
});
