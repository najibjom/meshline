import { apiCall } from "@/lib/_core/api";

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

export async function registerRelayDevice(username: string, publicKey: string) {
  return apiCall<RelayDeviceRecord>("/api/relay/register", { method: "POST", body: JSON.stringify({ username, publicKey }) });
}

export async function lookupRelayDevice(username: string) {
  return apiCall<RelayDeviceRecord>(`/api/relay/device/${encodeURIComponent(username)}`);
}

export async function enqueueOpaqueEnvelope(envelope: Pick<OpaqueRelayEnvelope, "recipientUsername" | "senderUsername" | "senderPublicKey" | "nonce" | "ciphertext">) {
  return apiCall<OpaqueRelayEnvelope>("/api/relay/envelopes", { method: "POST", body: JSON.stringify(envelope) });
}

export async function readRelayInbox(username: string) {
  return apiCall<{ envelopes: OpaqueRelayEnvelope[] }>(`/api/relay/inbox/${encodeURIComponent(username)}`);
}

export async function acknowledgeRelayEnvelope(username: string, envelopeId: string) {
  return apiCall<{ acknowledged: boolean }>("/api/relay/ack", { method: "POST", body: JSON.stringify({ username, envelopeId }) });
}
