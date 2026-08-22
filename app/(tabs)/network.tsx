import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { SectionCard, palette, RowChevron, StatusPill } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";
import { calculatePersonalBytes, formatBytesAsMb, storageLimitLabel } from "@/lib/meshline";
import { useMeshline } from "@/lib/meshline-context";
import { haptic } from "@/lib/haptics";

export default function NetworkScreen() {
  const router = useRouter();
  const { state, updateNetworkSettings } = useMeshline();
  const personalUsage = formatBytesAsMb(calculatePersonalBytes(state.messages));
  const { storageLimitMb, wifiOnly, chargingOnly, mobileDataEnabled } = state.networkSettings;
  const contributionEnabled = storageLimitMb > 0;

  const toggle = (key: "wifiOnly" | "chargingOnly" | "mobileDataEnabled", value: boolean) => {
    haptic.medium();
    void updateNetworkSettings({ [key]: value });
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-[#F6F7FB]" className="bg-[#F6F7FB]">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Network</Text>
          <StatusPill icon="info-outline">Prototype mode</StatusPill>
        </View>
        <Text style={styles.subtitle}>Your phone stays in control of the resources it contributes to Meshline.</Text>

        <SectionCard style={styles.heroCard}>
          <View style={styles.heroIcon}><MaterialIcons name="hub" size={24} color={palette.indigo} /></View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>NODE STATUS</Text>
            <Text style={styles.heroTitle}>Local identity active</Text>
            <Text style={styles.heroText}>This build stores your demo activity locally. Live peer discovery and encrypted replication are not connected yet.</Text>
          </View>
        </SectionCard>

        <Text style={styles.sectionTitle}>YOUR STORAGE</Text>
        <SectionCard>
          <View style={styles.storageBlock}>
            <View>
              <Text style={styles.storageLabel}>Personal messages</Text>
              <Text style={styles.storageValue}>{personalUsage}</Text>
              <Text style={styles.storageCaption}>Always separate from contribution space</Text>
            </View>
            <View style={styles.storageIcon}><MaterialIcons name="lock-outline" size={20} color={palette.emerald} /></View>
          </View>
          <View style={styles.divider} />
          <View style={styles.storageBlock}>
            <View>
              <Text style={styles.storageLabel}>Network contribution</Text>
              <Text style={styles.storageValue}>0 MB / {storageLimitLabel(storageLimitMb)}</Text>
              <Text style={styles.storageCaption}>{contributionEnabled ? "No network data is assigned in prototype mode" : "Contribution is turned off"}</Text>
            </View>
            <View style={[styles.storageIcon, { backgroundColor: palette.indigoSoft }]}><MaterialIcons name="storage" size={20} color={palette.indigo} /></View>
          </View>
          <Pressable onPress={() => router.push("/storage")} style={({ pressed }) => [styles.manageButton, pressed && styles.pressed]}>
            <Text style={styles.manageText}>Manage contribution</Text>
            <MaterialIcons name="arrow-forward" size={18} color={palette.indigo} />
          </Pressable>
        </SectionCard>

        <Text style={styles.sectionTitle}>RESOURCE GUARDRAILS</Text>
        <SectionCard>
          <PreferenceRow icon="wifi" title="Wi‑Fi only" detail="Avoid mobile data" value={wifiOnly} onChange={(value) => toggle("wifiOnly", value)} />
          <PreferenceRow icon="battery-charging-full" title="Only while charging" detail="Protect battery life" value={chargingOnly} onChange={(value) => toggle("chargingOnly", value)} />
          <PreferenceRow icon="network-cell" title="Mobile data contribution" detail="Disabled by default" value={mobileDataEnabled} onChange={(value) => toggle("mobileDataEnabled", value)} last />
        </SectionCard>

        <Text style={styles.sectionTitle}>NETWORK DETAILS</Text>
        <SectionCard>
          <RowChevron icon="shield" title="Privacy model" detail="Identity and metadata boundaries" onPress={() => router.push("/security")} tint={palette.emerald} />
          <View style={styles.inlineNote}><MaterialIcons name="info-outline" size={16} color={palette.muted} /><Text style={styles.inlineNoteText}>Meshline will never use your personal message history to fill a contribution limit.</Text></View>
        </SectionCard>
      </ScrollView>
    </ScreenContainer>
  );
}

function PreferenceRow({ icon, title, detail, value, onChange, last = false }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; detail: string; value: boolean; onChange: (value: boolean) => void; last?: boolean }) {
  return (
    <View style={[styles.preference, last && { borderBottomWidth: 0 }]}>
      <View style={styles.preferenceIcon}><MaterialIcons name={icon} size={19} color={palette.indigo} /></View>
      <View style={styles.preferenceCopy}><Text style={styles.preferenceTitle}>{title}</Text><Text style={styles.preferenceDetail}>{detail}</Text></View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: "#DDE2EC", true: "#B8C2FF" }} thumbColor={value ? palette.indigo : "#FFFFFF"} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingTop: 10, paddingBottom: 30 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: palette.ink, fontSize: 28, lineHeight: 34, fontWeight: "800", letterSpacing: -0.55 },
  subtitle: { color: palette.muted, fontSize: 15, lineHeight: 21, marginTop: 8, marginBottom: 20, maxWidth: 340 },
  heroCard: { padding: 17, flexDirection: "row", gap: 13, marginBottom: 23 },
  heroIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" },
  heroCopy: { flex: 1 },
  heroEyebrow: { color: palette.indigo, fontSize: 11, lineHeight: 15, fontWeight: "800", letterSpacing: 0.85 },
  heroTitle: { color: palette.ink, fontSize: 16, lineHeight: 21, fontWeight: "800", marginTop: 1 },
  heroText: { color: palette.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  sectionTitle: { color: "#8B95A7", fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1.05, marginBottom: 8, marginLeft: 4, marginTop: 3 },
  storageBlock: { minHeight: 88, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  storageLabel: { color: palette.muted, fontSize: 13, lineHeight: 17, fontWeight: "600" },
  storageValue: { color: palette.ink, fontSize: 19, lineHeight: 25, fontWeight: "800", marginTop: 2 },
  storageCaption: { color: palette.muted, fontSize: 12, lineHeight: 16, marginTop: 1 },
  storageIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: palette.emeraldSoft, alignItems: "center", justifyContent: "center" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.line, marginLeft: 16 },
  manageButton: { margin: 12, marginTop: 4, minHeight: 44, borderRadius: 14, backgroundColor: palette.indigoSoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  manageText: { color: palette.indigo, fontSize: 14, lineHeight: 19, fontWeight: "800" },
  preference: { minHeight: 68, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomColor: palette.line, borderBottomWidth: StyleSheet.hairlineWidth },
  preferenceIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center", marginRight: 11 },
  preferenceCopy: { flex: 1 },
  preferenceTitle: { color: palette.ink, fontSize: 15, lineHeight: 20, fontWeight: "700" },
  preferenceDetail: { color: palette.muted, fontSize: 12, lineHeight: 16, marginTop: 1 },
  inlineNote: { flexDirection: "row", gap: 8, padding: 16, alignItems: "flex-start" },
  inlineNoteText: { flex: 1, color: palette.muted, fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.7 },
});
