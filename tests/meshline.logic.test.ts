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
vi.mock("expo-linking", () => ({ createURL: vi.fn() }));

import {
  calculatePersonalBytes,
  emptyMeshlineState,
  isLocalChannelOwner,
  isValidDisplayName,
  isValidUsername,
  matchesIdentityUsername,
  normalizeUsername,
  retainMessagesSince,
  storageLimitLabel,
} from "../lib/meshline";
import { classifyMeshlineConnection, describeMeshlineConnection } from "../lib/connection-status";
import { getApiBaseUrl } from "../constants/oauth";

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

  it("matches local login usernames without relying on a display name", () => {
    expect(matchesIdentityUsername("@alex_mesh", "Alex_Mesh")).toBe(true);
    expect(matchesIdentityUsername("@alex_mesh", "@other_user")).toBe(false);
  });

  it("keeps channel ownership bound to a device when a username changes", () => {
    const channel = { id: "channel-1", peerUsername: "@updates", peerDisplayName: "Updates", createdAt: "2026-08-23T00:00:00.000Z", updatedAt: "2026-08-23T00:00:00.000Z", kind: "channel" as const, createdByDeviceId: "device-owner" };
    const renamedOwner = { displayName: "Alex", description: "", username: "@new_alex", deviceId: "device-owner", createdAt: "2026-08-23T00:00:00.000Z", recoveryAcknowledged: true };
    const anotherDevice = { ...renamedOwner, deviceId: "device-other" };
    expect(isLocalChannelOwner(channel, renamedOwner)).toBe(true);
    expect(isLocalChannelOwner(channel, anotherDevice)).toBe(false);
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

  it("removes expired local messages when a retention limit is selected", () => {
    const now = new Date("2026-08-23T00:00:00.000Z").getTime();
    const result = retainMessagesSince({
      chat: [
        { id: "old", conversationId: "chat", body: "old", direction: "inbound", status: "local", createdAt: "2026-07-01T00:00:00.000Z" },
        { id: "new", conversationId: "chat", body: "new", direction: "inbound", status: "local", createdAt: "2026-08-22T00:00:00.000Z" },
      ],
    }, 30, now);
    expect(result.chat.map((message) => message.id)).toEqual(["new"]);
  });

  it("distinguishes phone offline state from an unavailable Meshline service", () => {
    expect(classifyMeshlineConnection(false, null)).toBe("offline");
    expect(classifyMeshlineConnection(true, false)).toBe("service-unavailable");
    expect(describeMeshlineConnection("service-unavailable").detail).toContain("internet is working");
  });
});

describe("Meshline installed-build connectivity", () => {
  it("uses the published Meshline backend when no browser hostname is available", () => {
    expect(getApiBaseUrl()).toBe("https://meshline-bpoqvmax.manus.space");
  });
});
