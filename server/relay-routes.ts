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

export function registerOpaqueRelayRoutes(app: Express) {
  app.post("/api/relay/register", (req, res) => {
    const parsed = z.object({ username: usernameSchema, publicKey: keySchema }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid public relay-device registration." });
    return res.json(registerDevice(parsed.data.username, parsed.data.publicKey));
  });

  app.get("/api/relay/device/:username", (req, res) => {
    const username = decodeURIComponent(req.params.username);
    if (!usernameSchema.safeParse(username).success) return res.status(400).json({ error: "Invalid recipient username." });
    const device = getDevice(username);
    if (!device) return res.status(404).json({ error: "Recipient has not connected a proof-of-concept device relay key yet." });
    return res.json(device);
  });

  app.post("/api/relay/envelopes", (req, res) => {
    const parsed = envelopeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid opaque relay envelope." });
    if (!getDevice(parsed.data.recipientUsername)) return res.status(404).json({ error: "Recipient device is not registered with the proof relay." });
    return res.status(201).json(enqueueEnvelope(parsed.data));
  });

  app.get("/api/relay/inbox/:username", (req, res) => {
    const username = decodeURIComponent(req.params.username);
    if (!usernameSchema.safeParse(username).success) return res.status(400).json({ error: "Invalid inbox username." });
    return res.json({ envelopes: readInbox(username) });
  });

  app.post("/api/relay/ack", (req, res) => {
    const parsed = z.object({ username: usernameSchema, envelopeId: z.string().uuid() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid relay acknowledgement." });
    return res.json({ acknowledged: acknowledgeEnvelope(parsed.data.username, parsed.data.envelopeId) });
  });
}
