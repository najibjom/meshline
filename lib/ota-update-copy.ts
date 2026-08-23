export type OtaUpdateState = "checking" | "current" | "available" | "downloaded" | "unsupported" | "error";

export function describeOtaState(state: OtaUpdateState): string {
  const messages: Record<OtaUpdateState, string> = {
    checking: "Checking the approved Meshline update channel…",
    current: "This installation already has the latest compatible Meshline update.",
    available: "A compatible Meshline update is ready to download.",
    downloaded: "The update has downloaded and is ready to apply.",
    unsupported: "Updates are available after you install the next update-enabled Android build.",
    error: "Meshline could not check for updates right now. Please try again when you are online.",
  };
  return messages[state];
}
