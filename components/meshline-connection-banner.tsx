import { MaterialIcons } from "@expo/vector-icons";
import * as Network from "expo-network";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { palette } from "@/components/meshline-ui";
import { getApiBaseUrl } from "@/constants/oauth";
import { classifyMeshlineConnection, describeMeshlineConnection } from "@/lib/connection-status";
import { haptic } from "@/lib/haptics";
import { useMeshline } from "@/lib/meshline-context";
import { registerRelayDevice } from "@/lib/relay-client";
import { getOrCreateTransportDeviceKey } from "@/lib/transport";

export function MeshlineConnectionBanner() {
  const { identity, isAuthenticated } = useMeshline();
  const network = Network.useNetworkState();
  const [serviceReachable, setServiceReachable] = useState<boolean | null>(null);
  const [relayDeviceReady, setRelayDeviceReady] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const internetReachable = network.isInternetReachable;

  const probe = useCallback(async () => {
    if (internetReachable === false) {
      setServiceReachable(null);
      setRelayDeviceReady(null);
      return;
    }
    setChecking(true);
    setServiceReachable(null);
    setRelayDeviceReady(null);
    try {
      const baseUrl = getApiBaseUrl().replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/api/health`, { method: "GET", headers: { Accept: "application/json" } });
      setServiceReachable(response.ok);
      if (!response.ok) return;
      if (!isAuthenticated || !identity) {
        setRelayDeviceReady(true);
        return;
      }
      try {
        const transportKey = await getOrCreateTransportDeviceKey();
        await registerRelayDevice(identity.username, transportKey.publicKey);
        setRelayDeviceReady(true);
      } catch {
        setRelayDeviceReady(false);
      }
    } catch {
      setServiceReachable(false);
      setRelayDeviceReady(null);
    } finally {
      setChecking(false);
    }
  }, [identity?.username, internetReachable, isAuthenticated]);

  useEffect(() => {
    void probe();
    const interval = setInterval(() => void probe(), 15_000);
    return () => clearInterval(interval);
  }, [probe]);

  const kind = useMemo(() => classifyMeshlineConnection(internetReachable, serviceReachable, relayDeviceReady), [internetReachable, relayDeviceReady, serviceReachable]);
  const presentation = describeMeshlineConnection(kind);
  const isProblem = kind === "offline" || kind === "service-unavailable" || kind === "device-registration-unavailable";
  const tone = kind === "connected" ? styles.connected : isProblem ? styles.problem : styles.connecting;
  const iconColor = kind === "connected" ? palette.emerald : isProblem ? palette.coral : palette.indigo;

  return (
    <TouchableOpacity activeOpacity={0.78} onPress={() => { haptic.light(); void probe(); }} style={[styles.banner, tone]} accessibilityRole="button" accessibilityLabel={`${presentation.label}. ${presentation.detail}. Tap to retry.`}>
      <View style={styles.iconWrap}>{checking || kind === "connecting" ? <ActivityIndicator color={iconColor} size="small" /> : <MaterialIcons name={presentation.icon} size={19} color={iconColor} />}</View>
      <View style={styles.copy}><Text style={styles.label}>{presentation.label}</Text><Text style={styles.detail}>{presentation.detail}</Text></View>
      <MaterialIcons name="refresh" size={18} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: { minHeight: 60, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14, borderWidth: 1 },
  connecting: { backgroundColor: "#EEF0FF", borderColor: "#D8DCFF" },
  connected: { backgroundColor: "#ECFAF4", borderColor: "#C8EEDC" },
  problem: { backgroundColor: "#FFF3F4", borderColor: "#FFD8DB" },
  iconWrap: { width: 30, alignItems: "center" },
  copy: { flex: 1 },
  label: { color: palette.ink, fontSize: 13, lineHeight: 18, fontWeight: "800" },
  detail: { color: palette.muted, fontSize: 11, lineHeight: 15, marginTop: 1 },
});
