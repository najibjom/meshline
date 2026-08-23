import type { Express } from "express";
import { z } from "zod";

import { acknowledgeEnvelope, enqueueEnvelope, getDevice, readInbox, registerDevice } from "./opaque-relay";

const usernameSchema = z.string().regex(/^@[a-z0-9_]{3,24}$/);
const keySchema = z.string().min(40).max(120);
const envelopeSchema = z.object({
  recipientUsername: usernameSchema,
  senderUsername: usernameSchema,
  senderPublicKey: keySchema,
  nonce: z.string().min(20).max(80),
  ciphertext: z.string().min(20).max(8000),
});

function durableRelayUnavailable(res: import("express").Response, operation: string, error: unknown) {
  console.error(`[Meshline relay] durable ${operation} failed`, error);
  return res.status(503).json({ error: "Meshline durable relay storage is temporarily unavailable." });
}

export function registerOpaqueRelayRoutes(app: Express) {
  app.post("/api/relay/register", async (req, res) => {
    const parsed = z.object({ username: usernameSchema, publicKey: keySchema }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid public relay-device registration." });
    try {
      return res.json(await registerDevice(parsed.data.username, parsed.data.publicKey));
    } catch (error) {
      return durableRelayUnavailable(res, "registration", error);
    }
  });

  app.get("/api/relay/device/:username", async (req, res) => {
    const username = decodeURIComponent(req.params.username);
    if (!usernameSchema.safeParse(username).success) return res.status(400).json({ error: "Invalid recipient username." });
    try {
      const device = await getDevice(username);
      if (!device) return res.status(404).json({ error: "Recipient has not connected a proof-of-concept device relay key yet." });
      return res.json(device);
    } catch (error) {
      return durableRelayUnavailable(res, "device lookup", error);
    }
  });

  app.post("/api/relay/envelopes", async (req, res) => {
    const parsed = envelopeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid opaque relay envelope." });
    try {
      if (!await getDevice(parsed.data.recipientUsername)) return res.status(404).json({ error: "Recipient device is not registered with the proof relay." });
      return res.status(201).json(await enqueueEnvelope(parsed.data));
    } catch (error) {
      return durableRelayUnavailable(res, "envelope enqueue", error);
    }
  });

  app.get("/api/relay/inbox/:username", async (req, res) => {
    const username = decodeURIComponent(req.params.username);
    if (!usernameSchema.safeParse(username).success) return res.status(400).json({ error: "Invalid inbox username." });
    try {
      return res.json({ envelopes: await readInbox(username) });
    } catch (error) {
      return durableRelayUnavailable(res, "inbox read", error);
    }
  });

  app.post("/api/relay/ack", async (req, res) => {
    const parsed = z.object({ username: usernameSchema, envelopeId: z.string().uuid() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid relay acknowledgement." });
    try {
      return res.json({ acknowledged: await acknowledgeEnvelope(parsed.data.username, parsed.data.envelopeId) });
    } catch (error) {
      return durableRelayUnavailable(res, "acknowledgement", error);
    }
  });
}
