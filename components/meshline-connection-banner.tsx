import { MaterialIcons } from "@expo/vector-icons";
import * as Network from "expo-network";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { palette } from "@/components/meshline-ui";
import { getApiBaseUrl } from "@/constants/oauth";
import { classifyMeshlineConnection, describeMeshlineConnection } from "@/lib/connection-status";
import { haptic } from "@/lib/haptics";

export function MeshlineConnectionBanner() {
  const network = Network.useNetworkState();
  const [serviceReachable, setServiceReachable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const internetReachable = network.isInternetReachable;

  const probe = useCallback(async () => {
    if (internetReachable === false) {
      setServiceReachable(null);
      return;
    }
    setChecking(true);
    setServiceReachable(null);
    try {
      const baseUrl = getApiBaseUrl().replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/api/health`, { method: "GET" });
      setServiceReachable(response.ok);
    } catch {
      setServiceReachable(false);
    } finally {
      setChecking(false);
    }
  }, [internetReachable]);

  useEffect(() => {
    void probe();
    const interval = setInterval(() => void probe(), 15000);
    return () => clearInterval(interval);
  }, [probe]);

  const kind = useMemo(() => classifyMeshlineConnection(internetReachable, serviceReachable), [internetReachable, serviceReachable]);
  const presentation = describeMeshlineConnection(kind);
  const tone = kind === "connected" ? styles.connected : kind === "offline" || kind === "service-unavailable" ? styles.problem : styles.connecting;
  const iconColor = kind === "connected" ? palette.emerald : kind === "offline" || kind === "service-unavailable" ? palette.coral : palette.indigo;

  return (
    <Pressable onPress={() => { haptic.light(); void probe(); }} style={({ pressed }) => [styles.banner, tone, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`${presentation.label}. ${presentation.detail}. Tap to retry.`}>
      <View style={styles.iconWrap}>{checking || kind === "connecting" ? <ActivityIndicator color={iconColor} size="small" /> : <MaterialIcons name={presentation.icon} size={19} color={iconColor} />}</View>
      <View style={styles.copy}><Text style={styles.label}>{presentation.label}</Text><Text style={styles.detail}>{presentation.detail}</Text></View>
      <MaterialIcons name="refresh" size={18} color={iconColor} />
    </Pressable>
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
  pressed: { opacity: 0.72 },
});
