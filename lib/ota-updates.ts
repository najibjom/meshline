import * as Updates from "expo-updates";
import { Platform } from "react-native";

export type OtaUpdateState = "checking" | "current" | "available" | "downloaded" | "unsupported" | "error";

export type OtaUpdateResult = {
  state: OtaUpdateState;
  message: string;
};

export function describeOtaState(state: OtaUpdateState): string {
  switch (state) {
    case "checking":
      return "Checking the approved Meshline update channel…";
    case "current":
      return "This installation already has the latest compatible Meshline update.";
    case "available":
      return "A compatible Meshline update is ready to download.";
    case "downloaded":
      return "The update has downloaded and is ready to apply.";
    case "unsupported":
      return "Updates are available after you install the next update-enabled Android build.";
    default:
      return "Meshline could not check for updates right now. Please try again when you are online.";
  }
}

export async function checkForMeshlineUpdate(): Promise<OtaUpdateResult> {
  if (Platform.OS === "web" || !Updates.isEnabled) {
    return { state: "unsupported", message: describeOtaState("unsupported") };
  }

  try {
    const result = await Updates.checkForUpdateAsync();
    const state: OtaUpdateState = result.isAvailable ? "available" : "current";
    return { state, message: describeOtaState(state) };
  } catch {
    return { state: "error", message: describeOtaState("error") };
  }
}

export async function downloadMeshlineUpdate(): Promise<OtaUpdateResult> {
  if (Platform.OS === "web" || !Updates.isEnabled) {
    return { state: "unsupported", message: describeOtaState("unsupported") };
  }

  try {
    const result = await Updates.fetchUpdateAsync();
    if (!result.isNew) return { state: "current", message: describeOtaState("current") };
    return { state: "downloaded", message: describeOtaState("downloaded") };
  } catch {
    return { state: "error", message: describeOtaState("error") };
  }
}

export async function applyDownloadedMeshlineUpdate() {
  await Updates.reloadAsync();
}
