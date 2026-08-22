import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { MeshlineMark, palette, PrimaryButton, SectionCard } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";
import { getRecoveryCodes } from "@/lib/meshline";
import { useMeshline } from "@/lib/meshline-context";
import { haptic } from "@/lib/haptics";

export default function RecoveryScreen() {
  const router = useRouter();
  const { acknowledgeRecovery, identity } = useMeshline();
  const [codes, setCodes] = useState<string[] | null>(null);

  useEffect(() => { void getRecoveryCodes().then(setCodes); }, []);

  const continueToApp = async () => {
    await acknowledgeRecovery();
    haptic.success();
    router.replace("/(tabs)");
  };

  if (!identity) {
    return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={palette.indigo} /></ScreenContainer>;
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#F6F7FB]" className="bg-[#F6F7FB]">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.markWrap}><MeshlineMark size={52} /></View>
        <Text style={styles.title}>{identity.recoveryAcknowledged ? "Your recovery codes" : "Save your recovery codes."}</Text>
        <Text style={styles.subtitle}>These private codes are the fallback for a decentralized identity. Save them somewhere only you control.</Text>
        <SectionCard style={styles.codesCard}>
          <View style={styles.codeHeader}><MaterialIcons name="key" size={20} color={palette.indigo} /><Text style={styles.codeHeaderText}>ONE-TIME RECOVERY CODES</Text></View>
          <View style={styles.codes}>{codes ? codes.map((code) => <View key={code} style={styles.code}><Text style={styles.codeText}>{code}</Text></View>) : <ActivityIndicator color={palette.indigo} style={styles.loader} />}</View>
        </SectionCard>
        <View style={styles.warning}><MaterialIcons name="info-outline" size={19} color={palette.amber} /><Text style={styles.warningText}>If you lose every device and these codes, a decentralized network cannot simply reset your account like a conventional website.</Text></View>
        {!identity.recoveryAcknowledged ? <PrimaryButton label="I saved these codes" onPress={continueToApp} icon="check" disabled={!codes?.length} /> : <PrimaryButton label="Back to profile" onPress={() => router.replace("/(tabs)/profile")} icon="arrow-back" />}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 35, paddingBottom: 23 },
  markWrap: { marginBottom: 26 },
  title: { color: palette.ink, fontSize: 31, lineHeight: 38, fontWeight: "800", letterSpacing: -0.7 },
  subtitle: { color: palette.muted, fontSize: 16, lineHeight: 23, marginTop: 10 },
  codesCard: { marginTop: 25, padding: 16 },
  codeHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  codeHeaderText: { color: "#778195", fontSize: 11, lineHeight: 15, fontWeight: "800", letterSpacing: 1.05 },
  codes: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  code: { width: "48%", minHeight: 43, borderRadius: 12, backgroundColor: palette.soft, alignItems: "center", justifyContent: "center" },
  codeText: { color: palette.ink, fontSize: 13, lineHeight: 18, fontWeight: "800", letterSpacing: 0.3 },
  loader: { minHeight: 160, flex: 1 },
  warning: { flexDirection: "row", gap: 9, padding: 14, backgroundColor: palette.amberSoft, borderRadius: 16, marginVertical: 16, alignItems: "flex-start" },
  warningText: { flex: 1, color: "#8D5C10", fontSize: 13, lineHeight: 19 },
});
