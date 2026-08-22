import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(), setItem: vi.fn() },
}));

vi.mock("expo-crypto", () => ({
  randomUUID: () => "12345678-1234-4abc-8def-1234567890ab",
  CryptoDigestAlgorithm: { SHA512: "SHA512" },
  digestStringAsync: vi.fn(),
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));

import {
  calculatePersonalBytes,
  emptyMeshlineState,
  isValidDisplayName,
  isValidUsername,
  normalizeUsername,
  storageLimitLabel,
} from "../lib/meshline";

describe("Meshline local identity rules", () => {
  it("keeps display names separate from unique usernames", () => {
    expect(isValidDisplayName("Alex Johnson")).toBe(true);
    expect(isValidDisplayName("A")).toBe(false);
    expect(isValidDisplayName("x".repeat(41))).toBe(false);
  });

  it("normalizes usernames without exposing complex identity data", () => {
    expect(normalizeUsername(" Alice_9 ")).toBe("@alice_9");
    expect(normalizeUsername("@bob")).toBe("@bob");
  });

  it("accepts only concise, safe username syntax", () => {
    expect(isValidUsername("alice_9")).toBe(true);
    expect(isValidUsername("@bob")).toBe(true);
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("alice.example")).toBe(false);
    expect(isValidUsername("user with spaces")).toBe(false);
  });
});

describe("Meshline transparent storage accounting", () => {
  it("keeps personal message usage distinct from contribution settings", () => {
    const usage = calculatePersonalBytes({
      "chat-1": [
        { id: "1", conversationId: "chat-1", body: "hello", direction: "outbound", status: "local", createdAt: "2026-08-23T00:00:00.000Z" },
        { id: "2", conversationId: "chat-1", body: "world", direction: "inbound", status: "local", createdAt: "2026-08-23T00:00:01.000Z" },
      ],
    });
    expect(usage).toBe(10);
    expect(emptyMeshlineState.networkSettings.storageLimitMb).toBe(1024);
  });

  it("renders resource limits with understandable labels", () => {
    expect(storageLimitLabel(0)).toBe("Off");
    expect(storageLimitLabel(500)).toBe("500 MB");
    expect(storageLimitLabel(1024)).toBe("1 GB");
    expect(storageLimitLabel(5120)).toBe("5 GB");
  });
});
