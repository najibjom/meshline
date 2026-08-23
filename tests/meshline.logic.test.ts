import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(), setItem: vi.fn() },
}));

vi.mock("expo-crypto", () => ({
  randomUUID: () => "12345678-1234-4abc-8def-1234567890ab",
  CryptoDigestAlgorithm: { SHA512: "SHA512" },
  digestStringAsync: vi.fn(),
  getRandomBytes: (count: number) => new Uint8Array(Array.from({ length: count }, (_, index) => index + 1)),
  getRandomValues: <T extends Uint8Array>(bytes: T) => {
    bytes.set(new Uint8Array(Array.from({ length: bytes.length }, (_, index) => index + 1)));
    return bytes;
  },
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));

import {
  calculatePersonalBytes,
  emptyMeshlineState,
  isLocalChannelOwner,
  isValidDisplayName,
  isValidUsername,
  matchesIdentityUsername,
  normalizeUsername,
  resolveGroupPermissions,
  retainMessagesSince,
  storageLimitLabel,
} from "../lib/meshline";
import nacl from "tweetnacl";
import * as naclUtil from "tweetnacl-util";
import { decryptTextFromDevice, encryptTextForDevice } from "../lib/transport";

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

  it("encrypts a direct text envelope so the relay ciphertext omits plaintext and only the recipient key opens it", () => {
    const sender = nacl.box.keyPair.fromSecretKey(new Uint8Array(32).fill(7));
    const recipient = nacl.box.keyPair.fromSecretKey(new Uint8Array(32).fill(9));
    const text = "relay must not see this plaintext";
    const envelope = encryptTextForDevice(text, naclUtil.encodeBase64(sender.secretKey), naclUtil.encodeBase64(recipient.publicKey));
    expect(envelope.ciphertext).not.toContain(text);
    expect(decryptTextFromDevice(envelope, naclUtil.encodeBase64(recipient.secretKey), naclUtil.encodeBase64(sender.publicKey))).toBe(text);
    expect(() => decryptTextFromDevice(envelope, naclUtil.encodeBase64(sender.secretKey), naclUtil.encodeBase64(sender.publicKey))).toThrow();
  });
  it("defaults groups to member text posting and respects an owner restriction", () => {
    const group = { id: "group-1", peerUsername: "@writers", peerDisplayName: "Writers", createdAt: "2026-08-23T00:00:00.000Z", updatedAt: "2026-08-23T00:00:00.000Z", kind: "group" as const };
    expect(resolveGroupPermissions(group)).toEqual({ membersCanPost: true, membersCanInvite: true });
    expect(resolveGroupPermissions({ ...group, groupPermissions: { membersCanPost: false, membersCanInvite: true } })).toEqual({ membersCanPost: false, membersCanInvite: true });
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
});
