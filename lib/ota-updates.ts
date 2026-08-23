import * as Updates from "expo-updates";
import { Platform } from "react-native";
import { describeOtaState, type OtaUpdateState } from "./ota-update-copy";

export { describeOtaState, type OtaUpdateState } from "./ota-update-copy";
export type OtaUpdateResult = { state: OtaUpdateState; message: string };

export async function checkForMeshlineUpdate(): Promise<OtaUpdateResult> {
  if (Platform.OS === "web" || !Updates.isEnabled) return { state: "unsupported", message: describeOtaState("unsupported") };
  try {
    const result = await Updates.checkForUpdateAsync();
    const state: OtaUpdateState = result.isAvailable ? "available" : "current";
    return { state, message: describeOtaState(state) };
  } catch {
    return { state: "error", message: describeOtaState("error") };
  }
}

export async function downloadMeshlineUpdate(): Promise<OtaUpdateResult> {
  if (Platform.OS === "web" || !Updates.isEnabled) return { state: "unsupported", message: describeOtaState("unsupported") };
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
