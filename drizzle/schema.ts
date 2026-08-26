import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Public proof-of-concept relay key currently associated with a Meshline username.
 * Only public material is stored; device private keys never leave the client.
 */
export const relayDevices = mysqlTable("relay_devices", {
  username: varchar("username", { length: 25 }).primaryKey(),
  publicKey: varchar("public_key", { length: 120 }).notNull(),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().onUpdateNow().notNull(),
});

/**
 * Bounded public directory records for owner-published Meshline groups and channels.
 * This stores no messages, membership list, or subscriber graph.
 */
export const relaySpaces = mysqlTable("relay_spaces", {
  username: varchar("username", { length: 25 }).primaryKey(),
  id: varchar("id", { length: 36 }).notNull(),
  kind: mysqlEnum("kind", ["group", "channel"]).notNull(),
  title: varchar("title", { length: 60 }).notNull(),
  description: varchar("description", { length: 180 }).notNull().default(""),
  ownerUsername: varchar("owner_username", { length: 25 }).notNull(),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/**
 * Opaque encrypted envelopes waiting for a recipient device. The relay stores
 * ciphertext only, retains envelopes for a limited time, and records an
 * acknowledgement without accessing message plaintext.
 */
export const relayEnvelopes = mysqlTable("relay_envelopes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  recipientUsername: varchar("recipient_username", { length: 25 }).notNull(),
  senderUsername: varchar("sender_username", { length: 25 }).notNull(),
  senderPublicKey: varchar("sender_public_key", { length: 120 }).notNull(),
  nonce: varchar("nonce", { length: 80 }).notNull(),
  ciphertext: text("ciphertext").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
}, (table) => [
  index("relay_envelopes_inbox_idx").on(table.recipientUsername, table.acknowledgedAt, table.expiresAt, table.createdAt),
  index("relay_envelopes_sender_idx").on(table.senderUsername, table.createdAt),
]);

export type RelayDevice = typeof relayDevices.$inferSelect;
export type InsertRelayDevice = typeof relayDevices.$inferInsert;
export type RelaySpace = typeof relaySpaces.$inferSelect;
export type InsertRelaySpace = typeof relaySpaces.$inferInsert;
export type RelayEnvelope = typeof relayEnvelopes.$inferSelect;
export type InsertRelayEnvelope = typeof relayEnvelopes.$inferInsert;
