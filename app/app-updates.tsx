import { MaterialIcons } from "@expo/vector-icons";
import * as Network from "expo-network";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { PrimaryButton, SectionCard, palette, StatusPill } from "@/components/meshline-ui";
import { checkForMeshlineUpdate, describeOtaState, type OtaUpdateState } from "@/lib/ota-updates";
import { haptic } from "@/lib/haptics";

export default function AppUpdatesScreen() {
  const router = useRouter();
  const network = Network.useNetworkState();
  const [state, setState] = useState<OtaUpdateState>("current");
  const [message, setMessage] = useState("Check the approved Meshline update channel whenever you want.");
  const [working, setWorking] = useState(false);

  const check = async () => {
    setWorking(true);
    setState("checking");
    setMessage(describeOtaState("checking"));
    try {
      const currentNetwork = await Network.getNetworkStateAsync();
      if (currentNetwork.isInternetReachable !== true) {
        setState("error");
        setMessage("No internet connection on this device. Connect to Wi-Fi or mobile data, then try again.");
        haptic.warning();
        return;
      }

      const result = await checkForMeshlineUpdate();
      setState(result.state);
      setMessage(result.state === "error" ? "Your internet is reachable, but Meshline’s update service or release channel did not respond. This is not a Wi-Fi problem." : result.message);
      result.state === "error" ? haptic.warning() : haptic.light();
    } catch {
      setState("error");
      setMessage(network.isInternetReachable === false ? "No internet connection on this device. Connect to Wi-Fi or mobile data, then try again." : "Meshline could not verify the update service. Check again in a moment.");
      haptic.warning();
    } finally {
      setWorking(false);
    }
  };

  return <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#F6F7FB]" className="bg-[#F6F7FB]"><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator><View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={22} color={palette.ink} /></Pressable><Text style={styles.title}>App updates</Text><StatusPill icon="system-update-alt">Managed</StatusPill></View><SectionCard style={styles.hero}><View style={styles.heroIcon}><MaterialIcons name="cloud-download" size={28} color={palette.indigo} /></View><Text style={styles.heroTitle}>Keep Meshline current</Text><Text style={styles.heroText}>Check your device connection first, then the approved Meshline update service.</Text></SectionCard><Text style={styles.sectionTitle}>UPDATE STATUS</Text><SectionCard style={styles.statusCard}><View style={styles.statusTop}><View style={styles.statusIcon}>{working ? <ActivityIndicator color={palette.indigo} size="small" /> : <MaterialIcons name={state === "error" ? "error-outline" : "system-update-alt"} size={22} color={state === "error" ? palette.coral : palette.indigo} />}</View><View style={styles.statusCopy}><Text style={styles.statusLabel}>{state === "error" ? "Check unavailable" : state === "checking" ? "Checking connection" : "Ready to check"}</Text><Text style={styles.statusMessage}>{message}</Text></View></View><PrimaryButton label={working ? "Checking…" : "Check for updates"} onPress={check} icon="refresh" disabled={working} /></SectionCard></ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { flexGrow: 1, padding: 18, paddingTop: 10, paddingBottom: 34 }, header: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10 }, back: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }, title: { flex: 1, color: palette.ink, fontSize: 24, lineHeight: 30, fontWeight: "800" }, hero: { marginTop: 20, padding: 20, alignItems: "center" }, heroIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" }, heroTitle: { color: palette.ink, fontSize: 19, lineHeight: 25, fontWeight: "800", marginTop: 13 }, heroText: { color: palette.muted, fontSize: 14, lineHeight: 20, marginTop: 5, textAlign: "center" }, sectionTitle: { color: "#8B95A7", fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1.05, marginTop: 25, marginBottom: 8, marginLeft: 4 }, statusCard: { padding: 16, gap: 16 }, statusTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" }, statusIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" }, statusCopy: { flex: 1 }, statusLabel: { color: palette.ink, fontSize: 15, lineHeight: 20, fontWeight: "800" }, statusMessage: { color: palette.muted, fontSize: 13, lineHeight: 18, marginTop: 2 } });
