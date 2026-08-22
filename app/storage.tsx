import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { palette, PrimaryButton, SectionCard } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";
import { calculatePersonalBytes, formatBytesAsMb, storageLimitLabel } from "@/lib/meshline";
import { useMeshline } from "@/lib/meshline-context";
import { haptic } from "@/lib/haptics";

const storageOptions = [0, 100, 500, 1024, 5 * 1024, 10 * 1024];

export default function StorageScreen() {
  const router = useRouter();
  const { state, updateNetworkSettings } = useMeshline();
  const personal = formatBytesAsMb(calculatePersonalBytes(state.messages));
  const { storageLimitMb } = state.networkSettings;
  const [customLimit, setCustomLimit] = useState("");
  const [customError, setCustomError] = useState("");
  const isCustomLimit = storageLimitMb > 0 && !storageOptions.includes(storageLimitMb);

  useEffect(() => {
    if (isCustomLimit) setCustomLimit(String(storageLimitMb));
  }, [isCustomLimit, storageLimitMb]);

  const setLimit = (limitMb: number) => { haptic.medium(); void updateNetworkSettings({ storageLimitMb: limitMb }); };
  const applyCustomLimit = () => {
    const amount = Number.parseInt(customLimit, 10);
    if (!Number.isInteger(amount) || amount < 1 || amount > 51200) {
      setCustomError("Enter a whole number from 1 MB to 50 GB.");
      haptic.warning();
      return;
    }
    setCustomError("");
    setLimit(amount);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#F6F7FB]" className="bg-[#F6F7FB]">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <View style={styles.header}><Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-back" size={22} color={palette.ink} /></Pressable><Text style={styles.title}>Storage</Text><View style={styles.back} /></View>
        <Text style={styles.subtitle}>Personal history and volunteered network space are intentionally separate.</Text>
        <SectionCard style={styles.summary}>
          <StorageSummary icon="chat-bubble-outline" label="Personal messages" value={personal} detail="Always yours; not counted against contribution" iconColor={palette.emerald} />
          <View style={styles.divider} />
          <StorageSummary icon="storage" label="Network contribution" value={`0 MB / ${storageLimitLabel(storageLimitMb)}`} detail={storageLimitMb ? "No encrypted network replicas assigned yet" : "Disabled"} iconColor={palette.indigo} />
        </SectionCard>
        <Text style={styles.sectionLabel}>CONTRIBUTION LIMIT</Text>
        <Text style={styles.sectionText}>Meshline will never silently exceed this limit. When a future network node reaches its ceiling, it stops accepting replicas until safely replaceable ones can be released.</Text>
        <View style={styles.options}>{storageOptions.map((option) => <Pressable key={option} onPress={() => { setCustomError(""); setLimit(option); }} style={({ pressed }) => [styles.option, storageLimitMb === option && styles.selectedOption, pressed && styles.pressed]}><Text style={[styles.optionText, storageLimitMb === option && styles.selectedOptionText]}>{storageLimitLabel(option)}</Text>{storageLimitMb === option ? <MaterialIcons name="check-circle" size={18} color={palette.indigo} /> : null}</Pressable>)}</View>
        <SectionCard style={[styles.customCard, isCustomLimit && styles.customCardSelected]}>
          <View style={styles.customHeader}>
            <View style={styles.customIcon}><MaterialIcons name="tune" size={19} color={palette.indigo} /></View>
            <View style={styles.customCopy}><Text style={styles.customTitle}>Custom limit</Text><Text style={styles.customCaption}>Choose the exact network-storage space to contribute.</Text></View>
          </View>
          <View style={styles.customInputRow}>
            <TextInput
              value={customLimit}
              onChangeText={(value) => { setCustomLimit(value.replace(/[^0-9]/g, "")); setCustomError(""); }}
              placeholder="Enter amount"
              placeholderTextColor="#9AA3B3"
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={applyCustomLimit}
              style={styles.customInput}
              accessibilityLabel="Custom network storage limit in megabytes"
            />
            <Text style={styles.unit}>MB</Text>
            <Pressable onPress={applyCustomLimit} style={({ pressed }) => [styles.applyButton, pressed && styles.pressed]}><Text style={styles.applyText}>Use</Text></Pressable>
          </View>
          {customError ? <Text style={styles.customError}>{customError}</Text> : <Text style={styles.customHint}>Accepted range: 1 MB to 50 GB. Your exact preference is saved on this device.</Text>}
        </SectionCard>
        <View style={styles.note}><MaterialIcons name="info-outline" size={18} color={palette.amber} /><Text style={styles.noteText}>Storage contribution is not active until the encrypted P2P replication layer has been tested. Your choice is already saved locally.</Text></View>
        <PrimaryButton label="Save contribution preference" onPress={() => { haptic.success(); router.back(); }} icon="check" />
      </ScrollView>
    </ScreenContainer>
  );
}

function StorageSummary({ icon, label, value, detail, iconColor }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string; detail: string; iconColor: string }) {
  return <View style={styles.summaryRow}><View style={[styles.summaryIcon, { backgroundColor: `${iconColor}16` }]}><MaterialIcons name={icon} size={20} color={iconColor} /></View><View style={styles.summaryCopy}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryDetail}>{detail}</Text></View></View>;
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, flexShrink: 1, minHeight: 0 },
  content: { flexGrow: 1, padding: 20, paddingTop: 13, paddingBottom: 120 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { color: palette.ink, fontSize: 18, lineHeight: 24, fontWeight: "800" },
  subtitle: { color: palette.muted, fontSize: 15, lineHeight: 21, marginTop: 22, maxWidth: 330 },
  summary: { marginTop: 20 },
  summaryRow: { flexDirection: "row", gap: 12, padding: 16, alignItems: "center" },
  summaryIcon: { width: 41, height: 41, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  summaryCopy: { flex: 1 },
  summaryLabel: { color: palette.muted, fontSize: 13, lineHeight: 17, fontWeight: "600" },
  summaryValue: { color: palette.ink, fontSize: 18, lineHeight: 24, fontWeight: "800", marginTop: 1 },
  summaryDetail: { color: "#7B8598", fontSize: 12, lineHeight: 16, marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.line, marginLeft: 16 },
  sectionLabel: { color: "#8B95A7", fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1.05, marginTop: 25, marginLeft: 3 },
  sectionText: { color: palette.muted, fontSize: 13, lineHeight: 19, marginTop: 7 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 15, marginBottom: 12 },
  option: { minWidth: "30%", flexGrow: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: "#DDE2EC", backgroundColor: "#FFFFFF", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  selectedOption: { borderColor: palette.indigo, backgroundColor: palette.indigoSoft },
  optionText: { color: palette.ink, fontSize: 14, lineHeight: 19, fontWeight: "700" },
  selectedOptionText: { color: palette.indigo },
  customCard: { padding: 14, marginBottom: 18 },
  customCardSelected: { borderColor: palette.indigo, borderWidth: 1.5 },
  customHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  customIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: palette.indigoSoft },
  customCopy: { flex: 1 },
  customTitle: { color: palette.ink, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  customCaption: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 1 },
  customInputRow: { minHeight: 48, marginTop: 12, borderRadius: 14, borderColor: "#DDE2EC", borderWidth: 1, backgroundColor: "#F9FAFC", flexDirection: "row", alignItems: "center", paddingLeft: 13, gap: 9 },
  customInput: { flex: 1, minHeight: 46, color: palette.ink, fontSize: 16, fontWeight: "700", paddingVertical: 0 },
  unit: { color: palette.muted, fontSize: 13, lineHeight: 18, fontWeight: "800" },
  applyButton: { height: 36, borderRadius: 11, backgroundColor: palette.indigo, justifyContent: "center", alignItems: "center", paddingHorizontal: 13, marginRight: 5 },
  applyText: { color: "#FFFFFF", fontSize: 13, lineHeight: 17, fontWeight: "800" },
  customHint: { color: "#7B8598", fontSize: 11, lineHeight: 16, marginTop: 8 },
  customError: { color: palette.coral, fontSize: 11, lineHeight: 16, fontWeight: "700", marginTop: 8 },
  note: { flexDirection: "row", gap: 9, padding: 13, borderRadius: 15, backgroundColor: palette.amberSoft, marginBottom: 20, alignItems: "flex-start" },
  noteText: { flex: 1, color: "#8D5C10", fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.68 },
});
