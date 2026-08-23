import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { PrimaryButton, SectionCard, palette, StatusPill } from "@/components/meshline-ui";
import { applyDownloadedMeshlineUpdate, checkForMeshlineUpdate, describeOtaState, downloadMeshlineUpdate, type OtaUpdateState } from "@/lib/ota-updates";
import { haptic } from "@/lib/haptics";

export default function AppUpdatesScreen() {
  const router = useRouter();
  const [state, setState] = useState<OtaUpdateState>("current");
  const [message, setMessage] = useState("Check the approved Meshline update channel whenever you want.");
  const [working, setWorking] = useState(false);

  const check = async () => {
    setWorking(true);
    setState("checking");
    setMessage(describeOtaState("checking"));
    const result = await checkForMeshlineUpdate();
    setState(result.state);
    setMessage(result.message);
    result.state === "available" ? haptic.success() : result.state === "error" ? haptic.warning() : haptic.light();
    setWorking(false);
  };

  const download = async () => {
    setWorking(true);
    const result = await downloadMeshlineUpdate();
    setState(result.state);
    setMessage(result.message);
    result.state === "downloaded" ? haptic.success() : haptic.warning();
    setWorking(false);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#F6F7FB]" className="bg-[#F6F7FB]">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-back" size={22} color={palette.ink} /></Pressable>
          <Text style={styles.title}>App updates</Text>
          <StatusPill icon="system-update-alt">Managed</StatusPill>
        </View>
        <SectionCard style={styles.hero}>
          <View style={styles.heroIcon}><MaterialIcons name="cloud-download" size={28} color={palette.indigo} /></View>
          <Text style={styles.heroTitle}>Keep Meshline current</Text>
          <Text style={styles.heroText}>Compatible interface and logic updates can download inside this app. Your local identity, messages, and contacts stay on this device.</Text>
        </SectionCard>
        <Text style={styles.sectionTitle}>UPDATE STATUS</Text>
        <SectionCard style={styles.statusCard}>
          <View style={styles.statusTop}>
            <View style={[styles.statusIcon, state === "error" ? styles.errorIcon : state === "available" || state === "downloaded" ? styles.readyIcon : null]}>{working ? <ActivityIndicator size="small" color={palette.indigo} /> : <MaterialIcons name={state === "error" ? "error-outline" : state === "available" || state === "downloaded" ? "new-releases" : "verified"} size={21} color={state === "error" ? palette.coral : state === "available" || state === "downloaded" ? palette.emerald : palette.indigo} />}</View>
            <View style={styles.statusCopy}><Text style={styles.statusLabel}>{state === "available" ? "Update available" : state === "downloaded" ? "Ready to apply" : state === "unsupported" ? "Update-enabled build needed" : state === "error" ? "Check unavailable" : state === "checking" ? "Checking now" : "Ready to check"}</Text><Text style={styles.statusMessage}>{message}</Text></View>
          </View>
          {state === "available" ? <PrimaryButton label={working ? "Downloading…" : "Download update"} onPress={download} icon="download" disabled={working} /> : state === "downloaded" ? <PrimaryButton label="Restart and apply update" onPress={() => void applyDownloadedMeshlineUpdate()} icon="refresh" disabled={working} /> : <PrimaryButton label={working ? "Checking…" : "Check for updates"} onPress={check} icon="refresh" disabled={working} />}
        </SectionCard>
        <Text style={styles.sectionTitle}>WHAT THIS MEANS</Text>
        <SectionCard>
          <InfoRow icon="bolt" title="No repeated APK for normal improvements" detail="Compatible screen, design, and messaging-logic changes download inside Meshline." />
          <InfoRow icon="lock-outline" title="Local data stays local" detail="Applying a compatible update does not delete this device’s account, messages, or contacts." />
          <InfoRow icon="android" title="New APK only for native changes" detail="Android permissions, SDK upgrades, or new native capabilities still need a signed APK update." last />
        </SectionCard>
      </ScrollView>
    </ScreenContainer>
  );
}

function InfoRow({ icon, title, detail, last = false }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; detail: string; last?: boolean }) {
  return <View style={[styles.infoRow, last && styles.lastInfoRow]}><View style={styles.infoIcon}><MaterialIcons name={icon} size={18} color={palette.indigo} /></View><View style={styles.infoCopy}><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoDetail}>{detail}</Text></View></View>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 18, paddingTop: 10, paddingBottom: 34 }, header: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10 }, back: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }, title: { flex: 1, color: palette.ink, fontSize: 24, lineHeight: 30, fontWeight: "800", letterSpacing: -0.4 }, hero: { marginTop: 20, padding: 20, alignItems: "center" }, heroIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" }, heroTitle: { color: palette.ink, fontSize: 19, lineHeight: 25, fontWeight: "800", marginTop: 13 }, heroText: { color: palette.muted, fontSize: 14, lineHeight: 20, marginTop: 5, textAlign: "center", maxWidth: 320 }, sectionTitle: { color: "#8B95A7", fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1.05, marginTop: 25, marginBottom: 8, marginLeft: 4 }, statusCard: { padding: 16, gap: 16 }, statusTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" }, statusIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" }, readyIcon: { backgroundColor: palette.emeraldSoft }, errorIcon: { backgroundColor: "#FFF0F1" }, statusCopy: { flex: 1 }, statusLabel: { color: palette.ink, fontSize: 15, lineHeight: 20, fontWeight: "800" }, statusMessage: { color: palette.muted, fontSize: 13, lineHeight: 18, marginTop: 2 }, infoRow: { flexDirection: "row", gap: 11, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line }, lastInfoRow: { borderBottomWidth: 0 }, infoIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: palette.indigoSoft }, infoCopy: { flex: 1 }, infoTitle: { color: palette.ink, fontSize: 14, lineHeight: 19, fontWeight: "800" }, infoDetail: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 2 }, pressed: { opacity: 0.68 },
});
