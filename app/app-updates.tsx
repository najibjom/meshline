import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Network from "expo-network";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { SectionCard, StatusPill } from "@/components/meshline-ui";
import {
  applyDownloadedMeshlineUpdate,
  checkForMeshlineUpdate,
  describeOtaState,
  downloadMeshlineUpdate,
  type OtaUpdateState,
} from "@/lib/ota-updates";
import { haptic } from "@/lib/haptics";
import { useColors } from "@/hooks/use-colors";

const MESHLINE_COMPATIBLE_RUNTIME = "1.0.7";

function label(state: OtaUpdateState) {
  if (state === "error") return "Check unavailable";
  if (state === "checking") return "Checking connection";
  if (state === "current") return "Already up to date";
  if (state === "available") return "Update ready";
  if (state === "downloaded") return "Ready to apply";
  return "Updates unavailable";
}

export default function AppUpdatesScreen() {
  const router = useRouter();
  const network = Network.useNetworkState();
  const colors = useColors();
  const [state, setState] = useState<OtaUpdateState>("current");
  const [message, setMessage] = useState("This installation already has the latest compatible Meshline update.");
  const [working, setWorking] = useState(false);

  const check = async () => {
    setWorking(true);
    setState("checking");
    setMessage(describeOtaState("checking"));
    try {
      const connectivity = await Network.getNetworkStateAsync();
      if (connectivity.isInternetReachable !== true) {
        setState("error");
        setMessage("No internet connection on this device. Connect to Wi-Fi or mobile data, then try again.");
        haptic.warning();
        return;
      }
      const result = await checkForMeshlineUpdate();
      setState(result.state);
      setMessage(
        result.state === "error"
          ? "Your internet is reachable, but Meshline’s update service or release channel did not respond. This is not a Wi-Fi problem."
          : result.message,
      );
      result.state === "error" ? haptic.warning() : haptic.light();
    } catch {
      setState("error");
      setMessage(
        network.isInternetReachable === false
          ? "No internet connection on this device. Connect to Wi-Fi or mobile data, then try again."
          : "Meshline could not verify the update service. Check again in a moment.",
      );
      haptic.warning();
    } finally {
      setWorking(false);
    }
  };

  const download = async () => {
    setWorking(true);
    setMessage("Downloading the compatible Meshline update…");
    try {
      const result = await downloadMeshlineUpdate();
      setState(result.state);
      setMessage(result.message);
      result.state === "error" ? haptic.warning() : haptic.light();
    } finally {
      setWorking(false);
    }
  };

  const apply = async () => {
    setWorking(true);
    setMessage("Restarting Meshline to apply the downloaded update…");
    try {
      await applyDownloadedMeshlineUpdate();
    } catch {
      setWorking(false);
      setState("error");
      setMessage("Meshline could not restart to apply the update. Please reopen the app and try again.");
      haptic.warning();
    }
  };

  const action = state === "available" ? download : state === "downloaded" ? apply : check;
  const actionLabel = working
    ? state === "available"
      ? "Downloading…"
      : state === "downloaded"
        ? "Restarting…"
        : "Checking…"
    : state === "available"
      ? "Download update"
      : state === "downloaded"
        ? "Restart to apply"
        : "Check for updates";
  const actionIcon = state === "available" ? "cloud-download" : state === "downloaded" ? "restart-alt" : "refresh";

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>App updates</Text>
          <StatusPill icon="system-update-alt">Managed</StatusPill>
        </View>

        <SectionCard style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: `${colors.tint}1C` }]}>
            <MaterialIcons name="cloud-download" size={28} color={colors.tint} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Keep Meshline current</Text>
          <Text style={[styles.heroText, { color: colors.muted }]}>Compatible interface updates download inside Meshline. No APK reinstall is needed after this base version.</Text>
        </SectionCard>

        <Text style={[styles.sectionTitle, { color: colors.muted }]}>UPDATE STATUS</Text>
        <SectionCard style={styles.statusCard}>
          <View style={styles.statusTop}>
            <View style={[styles.statusIcon, { backgroundColor: state === "error" ? `${colors.error}1C` : `${colors.tint}1C` }]}>
              {working ? (
                <ActivityIndicator color={colors.tint} size="small" />
              ) : (
                <MaterialIcons name={state === "error" ? "error-outline" : "system-update-alt"} size={22} color={state === "error" ? colors.error : colors.tint} />
              )}
            </View>
            <View style={styles.statusCopy}>
              <Text style={[styles.statusLabel, { color: colors.text }]}>{label(state)}</Text>
              <Text style={[styles.statusMessage, { color: colors.muted }]}>{message}</Text>
            </View>
          </View>
        </SectionCard>

        <TouchableOpacity
          testID="meshline-update-action"
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          disabled={working}
          onPress={() => void action()}
          activeOpacity={0.84}
          style={[styles.updateAction, { backgroundColor: colors.tint, shadowColor: colors.tint }, working && styles.updateActionDisabled]}
        >
          <MaterialIcons name={actionIcon} size={21} color="#FFFFFF" />
          <Text style={styles.updateActionLabel}>{actionLabel}</Text>
        </TouchableOpacity>

        <Text style={[styles.compatibility, { color: colors.muted }]}>Compatible runtime {MESHLINE_COMPATIBLE_RUNTIME} · production updates enabled</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 18, paddingTop: 10, paddingBottom: 34 },
  header: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10 },
  back: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  title: { flex: 1, fontSize: 24, lineHeight: 30, fontWeight: "800" },
  hero: { marginTop: 20, padding: 20, alignItems: "center" },
  heroIcon: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 19, lineHeight: 25, fontWeight: "800", marginTop: 13 },
  heroText: { fontSize: 14, lineHeight: 20, marginTop: 5, textAlign: "center" },
  sectionTitle: { fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1.05, marginTop: 25, marginBottom: 8, marginLeft: 4 },
  statusCard: { padding: 16 },
  statusTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  statusIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  statusCopy: { flex: 1 },
  statusLabel: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  statusMessage: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  updateAction: { minHeight: 58, marginTop: 16, borderRadius: 17, alignItems: "center", justifyContent: "center", gap: 9, flexDirection: "row", paddingHorizontal: 20, shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  updateActionLabel: { color: "#FFFFFF", fontSize: 16, lineHeight: 21, fontWeight: "800" },
  updateActionDisabled: { opacity: 0.58 },
  compatibility: { textAlign: "center", fontSize: 12, lineHeight: 17, marginTop: 12 },
});
