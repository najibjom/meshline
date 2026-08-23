import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import nacl from "tweetnacl";
import * as naclUtil from "tweetnacl-util";

const DEVICE_TRANSPORT_KEY = "meshline.transport-device-key.v1";

export type TransportDeviceKey = { publicKey: string; secretKey: string };
export type EncryptedTextPayload = { nonce: string; ciphertext: string };

nacl.setPRNG((output, length) => output.set(Crypto.getRandomBytes(length)));

function webStorage() {
  return Platform.OS === "web" ? globalThis.localStorage : null;
}

async function loadKey(): Promise<TransportDeviceKey | null> {
  const raw = Platform.OS === "web" ? webStorage()?.getItem(DEVICE_TRANSPORT_KEY) ?? null : await SecureStore.getItemAsync(DEVICE_TRANSPORT_KEY);
  if (!raw) return null;
  try {
    const key = JSON.parse(raw) as TransportDeviceKey;
    return key.publicKey && key.secretKey ? key : null;
  } catch {
    return null;
  }
}

async function saveKey(key: TransportDeviceKey) {
  const value = JSON.stringify(key);
  if (Platform.OS === "web") webStorage()?.setItem(DEVICE_TRANSPORT_KEY, value);
  else await SecureStore.setItemAsync(DEVICE_TRANSPORT_KEY, value);
}

export async function getOrCreateTransportDeviceKey(): Promise<TransportDeviceKey> {
  const existing = await loadKey();
  if (existing) return existing;
  const pair = nacl.box.keyPair();
  const key = { publicKey: naclUtil.encodeBase64(pair.publicKey), secretKey: naclUtil.encodeBase64(pair.secretKey) };
  await saveKey(key);
  return key;
}

export function transportFingerprint(publicKey: string) {
  const digest = nacl.hash(naclUtil.decodeBase64(publicKey));
  return naclUtil.encodeBase64(digest).replace(/[^A-Za-z0-9]/g, "").slice(0, 24).match(/.{1,4}/g)?.join(" ") ?? "";
}

export function encryptTextForDevice(text: string, senderSecretKey: string, recipientPublicKey: string): EncryptedTextPayload {
  const nonce = new Uint8Array(nacl.box.nonceLength);
  Crypto.getRandomValues(nonce);
  const ciphertext = nacl.box(naclUtil.decodeUTF8(text), nonce, naclUtil.decodeBase64(recipientPublicKey), naclUtil.decodeBase64(senderSecretKey));
  return { nonce: naclUtil.encodeBase64(nonce), ciphertext: naclUtil.encodeBase64(ciphertext) };
}

export function decryptTextFromDevice(payload: EncryptedTextPayload, recipientSecretKey: string, senderPublicKey: string) {
  const plaintext = nacl.box.open(naclUtil.decodeBase64(payload.ciphertext), naclUtil.decodeBase64(payload.nonce), naclUtil.decodeBase64(senderPublicKey), naclUtil.decodeBase64(recipientSecretKey));
  if (!plaintext) throw new Error("The encrypted relay envelope could not be authenticated.");
  return naclUtil.encodeUTF8(plaintext);
}
