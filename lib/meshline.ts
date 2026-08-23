import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type DeliveryStatus = "sending" | "delivered" | "local";
export type MessageDirection = "outbound" | "inbound" | "system";

export type Identity = {
  displayName: string;
  description: string;
  username: string;
  deviceId: string;
  createdAt: string;
  recoveryAcknowledged: boolean;
};

export type Conversation = {
  id: string;
  peerUsername: string;
  peerDisplayName: string;
  createdAt: string;
  updatedAt: string;
  isGuide?: boolean;
  isPinned?: boolean;
};

export type Contact = {
  id: string;
  displayName: string;
  username: string;
  createdAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  body: string;
  direction: MessageDirection;
  status: DeliveryStatus;
  createdAt: string;
  replyTo?: { id: string; body: string };
};

export type NetworkSettings = {
  storageLimitMb: number;
  wifiOnly: boolean;
  chargingOnly: boolean;
  mobileDataEnabled: boolean;
};

export type PrivacySettings = {
  biometricLockEnabled: boolean;
  retentionDays: 0 | 30 | 90;
};

export type MeshlineState = {
  identity: Identity | null;
  contacts: Contact[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  networkSettings: NetworkSettings;
  privacySettings: PrivacySettings;
};

const APP_STATE_KEY = "meshline.state.v1";
const RECOVERY_CODES_KEY = "meshline.recovery-codes.v1";
const IDENTITY_MARKER_KEY = "meshline.identity-marker.v1";
const PASSWORD_VERIFIER_KEY = "meshline.password-verifier.v1";
const AUTH_SESSION_KEY = "meshline.auth-session.v1";

const defaultNetworkSettings: NetworkSettings = {
  storageLimitMb: 1024,
  wifiOnly: true,
  chargingOnly: true,
  mobileDataEnabled: false,
};

const defaultPrivacySettings: PrivacySettings = {
  biometricLockEnabled: false,
  retentionDays: 0,
};

export const emptyMeshlineState: MeshlineState = {
  identity: null,
  contacts: [],
  conversations: [],
  messages: {},
  networkSettings: defaultNetworkSettings,
  privacySettings: defaultPrivacySettings,
};

const getWebStorage = () => {
  if (Platform.OS !== "web") return null;
  return globalThis.localStorage;
};

const secureValueStore = {
  async set(key: string, value: string) {
    if (Platform.OS === "web") {
      getWebStorage()?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async get(key: string) {
    if (Platform.OS === "web") {
      return getWebStorage()?.getItem(key) ?? null;
    }
    return SecureStore.getItemAsync(key);
  },
};

export async function loadLocalSession() {
  return (await secureValueStore.get(AUTH_SESSION_KEY)) === "authenticated";
}

export async function persistLocalSession() {
  await secureValueStore.set(AUTH_SESSION_KEY, "authenticated");
}

export async function clearLocalSession() {
  await secureValueStore.set(AUTH_SESSION_KEY, "");
}

export async function loadMeshlineState(): Promise<MeshlineState> {
  const raw = await AsyncStorage.getItem(APP_STATE_KEY);
  if (!raw) return emptyMeshlineState;

  try {
    const parsed = JSON.parse(raw) as Partial<MeshlineState>;
    return {
      identity: parsed.identity ?? null,
      contacts: parsed.contacts ?? [],
      conversations: parsed.conversations ?? [],
      messages: parsed.messages ?? {},
      networkSettings: { ...defaultNetworkSettings, ...parsed.networkSettings },
      privacySettings: { ...defaultPrivacySettings, ...parsed.privacySettings },
    };
  } catch {
    return emptyMeshlineState;
  }
}

export async function persistMeshlineState(state: MeshlineState) {
  await AsyncStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
}

export function normalizeUsername(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

export function isValidUsername(value: string) {
  return /^@[a-z0-9_]{3,24}$/.test(normalizeUsername(value));
}

export function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidDisplayName(value: string) {
  const name = normalizeDisplayName(value);
  return name.length >= 2 && name.length <= 40;
}

export function matchesIdentityUsername(storedUsername: string, usernameInput: string) {
  return storedUsername === normalizeUsername(usernameInput);
}

function codeFromUuid() {
  return Crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
}

function makeRecoveryCodes() {
  return Array.from({ length: 6 }, () => `${codeFromUuid().slice(0, 5)}-${codeFromUuid().slice(5, 10)}`);
}

export async function makeIdentity(displayNameInput: string, usernameInput: string, password: string): Promise<MeshlineState> {
  const displayName = normalizeDisplayName(displayNameInput);
  const username = normalizeUsername(usernameInput);
  const deviceId = Crypto.randomUUID();
  const recoveryCodes = makeRecoveryCodes();
  const deviceMarker = Crypto.randomUUID();

  // This retained verifier only supports the local prototype lifecycle. The audited
  // production core must replace it with a memory-hard, parameterized password KDF.
  const passwordVerifier = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA512,
    `${deviceMarker}:${username}:${password}`,
  );

  await Promise.all([
    secureValueStore.set(IDENTITY_MARKER_KEY, deviceMarker),
    secureValueStore.set(PASSWORD_VERIFIER_KEY, passwordVerifier),
    secureValueStore.set(RECOVERY_CODES_KEY, JSON.stringify(recoveryCodes)),
  ]);

  const createdAt = new Date().toISOString();
  const guideConversation: Conversation = {
    id: "meshline-guide",
    peerUsername: "@meshline",
    peerDisplayName: "Meshline Guide",
    createdAt,
    updatedAt: createdAt,
    isGuide: true,
  };
  const guideMessage: Message = {
    id: Crypto.randomUUID(),
    conversationId: guideConversation.id,
    direction: "system",
    status: "local",
    createdAt,
    body: "Welcome to Meshline. This first build keeps your identity and messages on this device while the peer-to-peer transport is being integrated.",
  };

  return {
    identity: { displayName, description: "", username, deviceId, createdAt, recoveryAcknowledged: false },
    contacts: [],
    conversations: [guideConversation],
    messages: { [guideConversation.id]: [guideMessage] },
    networkSettings: defaultNetworkSettings,
    privacySettings: defaultPrivacySettings,
  };
}

export function retainMessagesSince(messages: Record<string, Message[]>, retentionDays: number, now = Date.now()) {
  if (retentionDays === 0) return messages;
  const threshold = now - retentionDays * 24 * 60 * 60 * 1000;
  return Object.fromEntries(Object.entries(messages).map(([conversationId, entries]) => [
    conversationId,
    entries.filter((message) => new Date(message.createdAt).getTime() >= threshold),
  ]));
}

export async function verifyLocalIdentity(usernameInput: string, password: string) {
  const [deviceMarker, storedVerifier] = await Promise.all([
    secureValueStore.get(IDENTITY_MARKER_KEY),
    secureValueStore.get(PASSWORD_VERIFIER_KEY),
  ]);
  if (!deviceMarker || !storedVerifier) return false;

  const candidate = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA512,
    `${deviceMarker}:${normalizeUsername(usernameInput)}:${password}`,
  );
  return candidate === storedVerifier;
}

export async function getRecoveryCodes() {
  const raw = await secureValueStore.get(RECOVERY_CODES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function formatBytesAsMb(bytes: number) {
  const megabytes = bytes / (1024 * 1024);
  if (megabytes === 0) return "0 MB";
  if (megabytes < 0.01) return "< 0.01 MB";
  return `${megabytes.toFixed(2)} MB`;
}

export function calculatePersonalBytes(messages: Record<string, Message[]>) {
  return Object.values(messages)
    .flat()
    .reduce((total, message) => total + new TextEncoder().encode(message.body).length, 0);
}

export function storageLimitLabel(limitMb: number) {
  if (limitMb === 0) return "Off";
  if (limitMb >= 1024) return `${limitMb / 1024} GB`;
  return `${limitMb} MB`;
}

export function formatMessageTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function formatConversationTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return formatMessageTime(iso);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}
