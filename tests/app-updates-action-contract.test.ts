import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const screenSource = readFileSync(resolve(process.cwd(), "app/app-updates.tsx"), "utf8");

describe("Meshline runtime-1.0.7 update action contract", () => {
  it("keeps a direct, visible update action outside the status card", () => {
    expect(screenSource).toContain('testID="meshline-update-action"');
    expect(screenSource).toContain('accessibilityLabel={actionLabel}');
    expect(screenSource).toContain("<TouchableOpacity");
    expect(screenSource).toContain("activeOpacity={0.84}");
    expect(screenSource).toContain("style={[styles.updateAction, { backgroundColor: colors.tint, shadowColor: colors.tint }, working && styles.updateActionDisabled]}");
    expect(screenSource).toContain('<Text style={styles.updateActionLabel}>{actionLabel}</Text>');
    expect(screenSource.indexOf('testID="meshline-update-action"')).toBeGreaterThan(screenSource.indexOf('<SectionCard style={styles.statusCard}>'));
  });

  it("defines check, download, and restart states for the one visible action", () => {
    expect(screenSource).toContain('"Check for updates"');
    expect(screenSource).toContain('"Download update"');
    expect(screenSource).toContain('"Restart to apply"');
    expect(screenSource).toContain('const action = state === "available" ? download : state === "downloaded" ? apply : check;');
    expect(screenSource).toContain('const MESHLINE_COMPATIBLE_RUNTIME = "1.0.7";');
    expect(screenSource).toContain("Compatible runtime {MESHLINE_COMPATIBLE_RUNTIME}");
  });
});
