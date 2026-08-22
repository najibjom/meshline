import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type DeliveryStatus = "sending" | "delivered" | "local";
export type MessageDirection = "outbound" | "inbound" | "system";

export type Identity = {
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
};

export type Message = {
  id: string;
  conversationId: string;
  body: string;
  direction: MessageDirection;
  status: DeliveryStatus;
  createdAt: string;
};

export type NetworkSettings = {
  storageLimitMb: number;
  wifiOnly: boolean;
  chargingOnly: boolean;
  mobileDataEnabled: boolean;
};

export type MeshlineState = {
  identity: Identity | null;
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  networkSettings: NetworkSettings;
};

const APP_STATE_KEY = "meshline.state.v1";
const RECOVERY_CODES_KEY = "meshline.recovery-codes.v1";
const IDENTITY_MARKER_KEY = "meshline.identity-marker.v1";
const PASSWORD_VERIFIER_KEY = "meshline.password-verifier.v1";

const defaultNetworkSettings: NetworkSettings = {
  storageLimitMb: 1024,
  wifiOnly: true,
  chargingOnly: true,
  mobileDataEnabled: false,
};

export const emptyMeshlineState: MeshlineState = {
  identity: null,
  conversations: [],
  messages: {},
  networkSettings: defaultNetworkSettings,
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

export async function loadMeshlineState(): Promise<MeshlineState> {
  const raw = await AsyncStorage.getItem(APP_STATE_KEY);
  if (!raw) return emptyMeshlineState;

  try {
    const parsed = JSON.parse(raw) as Partial<MeshlineState>;
    return {
      identity: parsed.identity ?? null,
      conversations: parsed.conversations ?? [],
      messages: parsed.messages ?? {},
      networkSettings: { ...defaultNetworkSettings, ...parsed.networkSettings },
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

function codeFromUuid() {
  return Crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
}

function makeRecoveryCodes() {
  return Array.from({ length: 6 }, () => `${codeFromUuid().slice(0, 5)}-${codeFromUuid().slice(5, 10)}`);
}

export async function makeIdentity(usernameInput: string, password: string): Promise<MeshlineState> {
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
    identity: { username, deviceId, createdAt, recoveryAcknowledged: false },
    conversations: [guideConversation],
    messages: { [guideConversation.id]: [guideMessage] },
    networkSettings: defaultNetworkSettings,
  };
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
