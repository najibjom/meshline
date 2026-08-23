import { randomUUID } from "crypto";

export type RelayDeviceRecord = {
  username: string;
  publicKey: string;
  registeredAt: string;
};

export type OpaqueRelayEnvelope = {
  id: string;
  recipientUsername: string;
  senderUsername: string;
  senderPublicKey: string;
  nonce: string;
  ciphertext: string;
  createdAt: string;
  expiresAt: string;
};

const deviceDirectory = new Map<string, RelayDeviceRecord>();
const inboxes = new Map<string, OpaqueRelayEnvelope[]>();
const MAX_INBOX = 100;
const ENVELOPE_TTL_MS = 24 * 60 * 60 * 1000;

export function registerDevice(username: string, publicKey: string): RelayDeviceRecord {
  const record = { username, publicKey, registeredAt: new Date().toISOString() };
  deviceDirectory.set(username, record);
  return record;
}

export function getDevice(username: string) {
  return deviceDirectory.get(username) ?? null;
}

export function enqueueEnvelope(input: Omit<OpaqueRelayEnvelope, "id" | "createdAt" | "expiresAt">): OpaqueRelayEnvelope {
  const now = Date.now();
  const envelope: OpaqueRelayEnvelope = {
    ...input,
    id: randomUUID(),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ENVELOPE_TTL_MS).toISOString(),
  };
  const existing = (inboxes.get(input.recipientUsername) ?? []).filter((entry) => new Date(entry.expiresAt).getTime() > now);
  inboxes.set(input.recipientUsername, [...existing, envelope].slice(-MAX_INBOX));
  return envelope;
}

export function readInbox(username: string) {
  const now = Date.now();
  const current = (inboxes.get(username) ?? []).filter((entry) => new Date(entry.expiresAt).getTime() > now);
  inboxes.set(username, current);
  return current;
}

export function acknowledgeEnvelope(username: string, envelopeId: string) {
  const current = inboxes.get(username) ?? [];
  const next = current.filter((entry) => entry.id !== envelopeId);
  inboxes.set(username, next);
  return next.length !== current.length;
}

export function resetOpaqueRelayForTests() {
  deviceDirectory.clear();
  inboxes.clear();
}
