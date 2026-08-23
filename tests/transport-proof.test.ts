import { describe, expect, it, vi } from "vitest";

vi.mock("expo-crypto", () => ({
  getRandomBytes: (count: number) => new Uint8Array(Array.from({ length: count }, (_, index) => index + 1)),
  getRandomValues: <T extends Uint8Array>(bytes: T) => {
    bytes.set(new Uint8Array(Array.from({ length: bytes.length }, (_, index) => index + 1)));
    return bytes;
  },
}));

vi.mock("expo-secure-store", () => ({ getItemAsync: vi.fn(), setItemAsync: vi.fn() }));
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

import nacl from "tweetnacl";
import * as naclUtil from "tweetnacl-util";
import { decryptTextFromDevice, encryptTextForDevice } from "../lib/transport";

describe("Meshline device-side encrypted envelope proof", () => {
  it("keeps plaintext out of the relay payload and only decrypts with the recipient device key", () => {
    const sender = nacl.box.keyPair.fromSecretKey(new Uint8Array(32).fill(7));
    const recipient = nacl.box.keyPair.fromSecretKey(new Uint8Array(32).fill(9));
    const plaintext = "relay must not see this plaintext";
    const envelope = encryptTextForDevice(plaintext, naclUtil.encodeBase64(sender.secretKey), naclUtil.encodeBase64(recipient.publicKey));

    expect(envelope.ciphertext).not.toContain(plaintext);
    expect(decryptTextFromDevice(envelope, naclUtil.encodeBase64(recipient.secretKey), naclUtil.encodeBase64(sender.publicKey))).toBe(plaintext);
    expect(() => decryptTextFromDevice(envelope, naclUtil.encodeBase64(sender.secretKey), naclUtil.encodeBase64(sender.publicKey))).toThrow();
  });
});
