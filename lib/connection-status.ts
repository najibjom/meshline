export type MeshlineConnectionKind = "connecting" | "offline" | "connected" | "service-unavailable" | "device-registration-unavailable";

export type MeshlineConnectionPresentation = {
  label: string;
  detail: string;
  icon: "sync" | "wifi-off" | "cloud-done" | "cloud-off";
};

export function describeMeshlineConnection(kind: MeshlineConnectionKind): MeshlineConnectionPresentation {
  switch (kind) {
    case "offline":
      return { label: "No internet connection", detail: "Connect to Wi-Fi or mobile data to reach Meshline.", icon: "wifi-off" };
    case "connected":
      return { label: "Meshline connected", detail: "Internet, the Meshline service, and this device are ready for direct chats.", icon: "cloud-done" };
    case "service-unavailable":
      return { label: "Meshline service unavailable", detail: "Your internet is working, but the Meshline relay or service cannot be reached. Tap to retry.", icon: "cloud-off" };
    case "device-registration-unavailable":
      return { label: "Device connection unavailable", detail: "Meshline is reachable, but this device could not prepare its direct-chat connection. Tap to retry.", icon: "cloud-off" };
    default:
      return { label: "Connecting to Meshline…", detail: "Checking your internet, the Meshline service, and this device for direct chats.", icon: "sync" };
  }
}

export function classifyMeshlineConnection(internetReachable: boolean | null | undefined, serviceReachable: boolean | null, relayDeviceReady: boolean | null = true): MeshlineConnectionKind {
  if (internetReachable === false) return "offline";
  if (internetReachable !== true || serviceReachable === null) return "connecting";
  if (!serviceReachable) return "service-unavailable";
  if (relayDeviceReady === false) return "device-registration-unavailable";
  return relayDeviceReady ? "connected" : "connecting";
}
