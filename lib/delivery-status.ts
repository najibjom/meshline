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
