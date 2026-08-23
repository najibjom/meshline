import { randomUUID } from "crypto";
import { and, asc, desc, eq, gt, inArray, isNull, lt } from "drizzle-orm";

import { relayDevices, relayEnvelopes } from "../drizzle/schema";
import { getDb } from "./db";

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

const MAX_PENDING_ENVELOPES = 500;
const ENVELOPE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function asDeviceRecord(device: typeof relayDevices.$inferSelect): RelayDeviceRecord {
  return { username: device.username, publicKey: device.publicKey, registeredAt: toIso(device.registeredAt) };
}

function asEnvelope(envelope: typeof relayEnvelopes.$inferSelect): OpaqueRelayEnvelope {
  return {
    id: envelope.id,
    recipientUsername: envelope.recipientUsername,
    senderUsername: envelope.senderUsername,
    senderPublicKey: envelope.senderPublicKey,
    nonce: envelope.nonce,
    ciphertext: envelope.ciphertext,
    createdAt: toIso(envelope.createdAt),
    expiresAt: toIso(envelope.expiresAt),
  };
}

async function requireRelayDb() {
  const db = await getDb();
  if (!db) throw new Error("Meshline durable relay storage is temporarily unavailable.");
  return db;
}

async function removeExpiredEnvelopes() {
  const db = await requireRelayDb();
  await db.delete(relayEnvelopes).where(lt(relayEnvelopes.expiresAt, new Date()));
  return db;
}

async function trimPendingInbox(username: string) {
  const db = await requireRelayDb();
  const pending = await db.select({ id: relayEnvelopes.id })
    .from(relayEnvelopes)
    .where(and(eq(relayEnvelopes.recipientUsername, username), isNull(relayEnvelopes.acknowledgedAt), gt(relayEnvelopes.expiresAt, new Date())))
    .orderBy(desc(relayEnvelopes.createdAt));
  const overflow = pending.slice(MAX_PENDING_ENVELOPES).map((item) => item.id);
  if (overflow.length) await db.delete(relayEnvelopes).where(inArray(relayEnvelopes.id, overflow));
}

export async function registerDevice(username: string, publicKey: string): Promise<RelayDeviceRecord> {
  const db = await requireRelayDb();
  const now = new Date();
  await db.insert(relayDevices).values({ username, publicKey, registeredAt: now, lastSeenAt: now }).onDuplicateKeyUpdate({
    set: { publicKey, lastSeenAt: now },
  });
  const rows = await db.select().from(relayDevices).where(eq(relayDevices.username, username)).limit(1);
  if (!rows[0]) throw new Error("Meshline could not confirm durable relay registration.");
  return asDeviceRecord(rows[0]);
}

export async function getDevice(username: string): Promise<RelayDeviceRecord | null> {
  const db = await requireRelayDb();
  const rows = await db.select().from(relayDevices).where(eq(relayDevices.username, username)).limit(1);
  return rows[0] ? asDeviceRecord(rows[0]) : null;
}

export async function enqueueEnvelope(input: Omit<OpaqueRelayEnvelope, "id" | "createdAt" | "expiresAt">): Promise<OpaqueRelayEnvelope> {
  const db = await removeExpiredEnvelopes();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ENVELOPE_TTL_MS);
  const envelope: OpaqueRelayEnvelope = {
    ...input,
    id: randomUUID(),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  await db.insert(relayEnvelopes).values({ ...envelope, createdAt: now, expiresAt, acknowledgedAt: null });
  await trimPendingInbox(input.recipientUsername);
  return envelope;
}

export async function readInbox(username: string): Promise<OpaqueRelayEnvelope[]> {
  const db = await removeExpiredEnvelopes();
  const rows = await db.select().from(relayEnvelopes)
    .where(and(eq(relayEnvelopes.recipientUsername, username), isNull(relayEnvelopes.acknowledgedAt), gt(relayEnvelopes.expiresAt, new Date())))
    .orderBy(asc(relayEnvelopes.createdAt));
  return rows.map(asEnvelope);
}

export async function acknowledgeEnvelope(username: string, envelopeId: string) {
  const db = await requireRelayDb();
  const current = await db.select({ id: relayEnvelopes.id }).from(relayEnvelopes)
    .where(and(eq(relayEnvelopes.recipientUsername, username), eq(relayEnvelopes.id, envelopeId), isNull(relayEnvelopes.acknowledgedAt)))
    .limit(1);
  if (!current[0]) return false;
  await db.update(relayEnvelopes).set({ acknowledgedAt: new Date() })
    .where(and(eq(relayEnvelopes.recipientUsername, username), eq(relayEnvelopes.id, envelopeId)));
  return true;
}
