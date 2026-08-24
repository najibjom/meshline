export function describeRelayDeliveryFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const recipientIsUnavailable = /Recipient has not connected a proof-of-concept device relay key yet|Recipient device is not registered with the proof relay/i.test(message);
  const durableStorageUnavailable = /durable relay storage is temporarily unavailable/i.test(message);

  return recipientIsUnavailable
    ? "Recipient needs to open Meshline and wait for Meshline connected."
    : durableStorageUnavailable
      ? "Meshline is temporarily saving messages offline. Try again in a moment."
    : "Meshline could not reach the message relay. Check the connection banner and try again.";
}

/**
 * Keeps local message feedback truthful: relay acceptance is not recipient delivery,
 * and failures remain visible without attempting an unsafe automatic resend.
 */
export function describeOutgoingMessageState(status: "sending" | "queued" | "delivered" | "local" | "failed", detail?: string) {
  if (status === "sending") return "Sending…";
  if (status === "queued") return detail ? `Relay accepted · ${detail}` : "Relay accepted · waiting for recipient";
  if (status === "failed") return detail ? `Not sent · ${detail}` : "Not sent · check the connection banner";
  return "";
}
