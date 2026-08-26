import { randomUUID } from "crypto";
import { and, asc, desc, eq, gt, inArray, isNull, lt } from "drizzle-orm";

import { relayDevices, relayEnvelopes, relaySpaces } from "../drizzle/schema";
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

export type RelayDeliveryReceipt = {
  id: string;
  acknowledgedAt: string;
};

export type RelaySpaceRecord = {
  id: string;
  username: string;
  kind: "channel";
  title: string;
  description: string;
  ownerUsername: string;
  registeredAt: string;
  updatedAt: string;
};

const MAX_PENDING_ENVELOPES = 500;
const ENVELOPE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function asDeviceRecord(device: typeof relayDevices.$inferSelect): RelayDeviceRecord {
  return { username: device.username, publicKey: device.publicKey, registeredAt: toIso(device.registeredAt) };
}

function asSpaceRecord(space: typeof relaySpaces.$inferSelect): RelaySpaceRecord {
  return {
    id: space.id,
    username: space.username,
    kind: "channel",
    title: space.title,
    description: space.description,
    ownerUsername: space.ownerUsername,
    registeredAt: toIso(space.registeredAt),
    updatedAt: toIso(space.updatedAt),
  };
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

export async function registerSpace(input: Omit<RelaySpaceRecord, "registeredAt" | "updatedAt">): Promise<RelaySpaceRecord> {
  const db = await requireRelayDb();
  if (!await getDevice(input.ownerUsername)) throw new Error("Channel owner must have a registered Meshline device.");
  const accountCollision = await db.select({ username: relayDevices.username }).from(relayDevices).where(eq(relayDevices.username, input.username)).limit(1);
  if (accountCollision[0]) throw new Error("This username is already reserved by a Meshline account.");
  const existing = await db.select().from(relaySpaces).where(eq(relaySpaces.username, input.username)).limit(1);
  if (existing[0] && existing[0].ownerUsername !== input.ownerUsername) throw new Error("This channel username is already owned by another Meshline account.");
  const now = new Date();
  await db.insert(relaySpaces).values({ ...input, registeredAt: now, updatedAt: now }).onDuplicateKeyUpdate({
    set: { id: input.id, kind: input.kind, title: input.title, description: input.description, ownerUsername: input.ownerUsername, updatedAt: now },
  });
  const rows = await db.select().from(relaySpaces).where(eq(relaySpaces.username, input.username)).limit(1);
  if (!rows[0]) throw new Error("Meshline could not confirm channel directory publication.");
  return asSpaceRecord(rows[0]);
}

export async function getSpace(username: string): Promise<RelaySpaceRecord | null> {
  const db = await requireRelayDb();
  const rows = await db.select().from(relaySpaces).where(eq(relaySpaces.username, username)).limit(1);
  return rows[0] ? asSpaceRecord(rows[0]) : null;
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

export async function readDeliveryReceipts(senderUsername: string, envelopeIds: string[]): Promise<RelayDeliveryReceipt[]> {
  const ids = Array.from(new Set(envelopeIds)).slice(0, 100);
  if (!ids.length) return [];
  const db = await removeExpiredEnvelopes();
  const rows = await db.select({ id: relayEnvelopes.id, acknowledgedAt: relayEnvelopes.acknowledgedAt })
    .from(relayEnvelopes)
    .where(and(eq(relayEnvelopes.senderUsername, senderUsername), inArray(relayEnvelopes.id, ids), gt(relayEnvelopes.expiresAt, new Date())));
  return rows.flatMap((row) => row.acknowledgedAt ? [{ id: row.id, acknowledgedAt: toIso(row.acknowledgedAt) }] : []);
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
