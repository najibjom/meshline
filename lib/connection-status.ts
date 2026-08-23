export type MeshlineConnectionKind = "connecting" | "offline" | "connected" | "service-unavailable";

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
      return { label: "Meshline connected", detail: "Internet and the Meshline service are reachable.", icon: "cloud-done" };
    case "service-unavailable":
      return { label: "Meshline service unavailable", detail: "Your internet is working, but the Meshline relay or service cannot be reached. Tap to retry.", icon: "cloud-off" };
    default:
      return { label: "Connecting to Meshline…", detail: "Checking your internet connection and Meshline service.", icon: "sync" };
  }
}

export function classifyMeshlineConnection(internetReachable: boolean | null | undefined, serviceReachable: boolean | null): MeshlineConnectionKind {
  if (internetReachable === false) return "offline";
  if (internetReachable !== true || serviceReachable === null) return "connecting";
  return serviceReachable ? "connected" : "service-unavailable";
}
