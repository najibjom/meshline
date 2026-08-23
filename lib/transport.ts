import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import nacl from "tweetnacl";
import * as naclUtil from "tweetnacl-util";
import { Platform } from "react-native";

const DEVICE_TRANSPORT_KEY = "meshline.transport-device-key.v1";

export type TransportDeviceKey = {
  publicKey: string;
  secretKey: string;
};

export type EncryptedTextPayload = {
  nonce: string;
  ciphertext: string;
};

// TweetNaCl remains responsible for the cryptographic construction. Expo supplies
// native random bytes on installed iOS/Android builds; the browser fallback is only
// for previewing the prototype and is not a secure transport environment.
nacl.setPRNG((output, length) => {
  output.set(Crypto.getRandomBytes(length));
});

function getWebStorage() {
  if (Platform.OS !== "web") return null;
  return globalThis.localStorage;
}

async function loadTransportKey(): Promise<TransportDeviceKey | null> {
  const raw = Platform.OS === "web"
    ? getWebStorage()?.getItem(DEVICE_TRANSPORT_KEY) ?? null
    : await SecureStore.getItemAsync(DEVICE_TRANSPORT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TransportDeviceKey;
    if (!parsed.publicKey || !parsed.secretKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function saveTransportKey(key: TransportDeviceKey) {
  const value = JSON.stringify(key);
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(DEVICE_TRANSPORT_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(DEVICE_TRANSPORT_KEY, value);
}

export async function getOrCreateTransportDeviceKey(): Promise<TransportDeviceKey> {
  const existing = await loadTransportKey();
  if (existing) return existing;
  const pair = nacl.box.keyPair();
  const key = { publicKey: naclUtil.encodeBase64(pair.publicKey), secretKey: naclUtil.encodeBase64(pair.secretKey) };
  await saveTransportKey(key);
  return key;
}

export function transportFingerprint(publicKey: string) {
  const digest = nacl.hash(naclUtil.decodeBase64(publicKey));
  return naclUtil.encodeBase64(digest).replace(/[^A-Za-z0-9]/g, "").slice(0, 24).match(/.{1,4}/g)?.join(" ") ?? "";
}

export function encryptTextForDevice(text: string, senderSecretKey: string, recipientPublicKey: string): EncryptedTextPayload {
  const nonce = new Uint8Array(nacl.box.nonceLength);
  Crypto.getRandomValues(nonce);
  const ciphertext = nacl.box(
    naclUtil.decodeUTF8(text),
    nonce,
    naclUtil.decodeBase64(recipientPublicKey),
    naclUtil.decodeBase64(senderSecretKey),
  );
  return { nonce: naclUtil.encodeBase64(nonce), ciphertext: naclUtil.encodeBase64(ciphertext) };
}

export function decryptTextFromDevice(payload: EncryptedTextPayload, recipientSecretKey: string, senderPublicKey: string) {
  const plaintext = nacl.box.open(
    naclUtil.decodeBase64(payload.ciphertext),
    naclUtil.decodeBase64(payload.nonce),
    naclUtil.decodeBase64(senderPublicKey),
    naclUtil.decodeBase64(recipientSecretKey),
  );
  if (!plaintext) throw new Error("The encrypted relay envelope could not be authenticated.");
  return naclUtil.encodeUTF8(plaintext);
}
