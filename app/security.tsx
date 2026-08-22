import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { palette, SectionCard, StatusPill } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";

export default function SecurityScreen() {
  const router = useRouter();
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#F6F7FB]" className="bg-[#F6F7FB]">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-back" size={22} color={palette.ink} /></Pressable><Text style={styles.title}>Security & privacy</Text><View style={styles.back} /></View>
        <View style={styles.hero}><View style={styles.heroIcon}><MaterialIcons name="shield" size={27} color={palette.indigo} /></View><View><Text style={styles.heroTitle}>Honest by design</Text><Text style={styles.heroText}>This screen distinguishes what works in the local MVP from protocol guarantees planned for production.</Text></View></View>
        <Text style={styles.sectionTitle}>ACTIVE IN THIS BUILD</Text>
        <SectionCard>
          <SecurityRow icon="phonelink-lock" title="On-device identity marker" text="A small identity marker and recovery codes are kept in operating-system secure storage on iOS and Android." tone={palette.emerald} />
          <SecurityRow icon="person-off" title="No phone or email requirement" text="The account flow does not request a phone number, email address, wallet, or a public-key field." tone={palette.indigo} />
          <SecurityRow icon="storage" title="Separate storage controls" text="Personal message data and future volunteered network capacity are different settings." tone={palette.indigo} last />
        </SectionCard>
        <Text style={styles.sectionTitle}>NOT ACTIVE YET</Text>
        <SectionCard>
          <SecurityRow icon="lock-outline" title="End-to-end encryption" text="The chat experience and local delivery adapter are implemented, but audited E2EE is not active in this Expo prototype." tone={palette.amber} />
          <SecurityRow icon="device-hub" title="Peer-to-peer delivery" text="Live peer discovery, relay, distributed storage, and blockchain name resolution are future network-core milestones." tone={palette.amber} />
          <SecurityRow icon="password" title="Production password protection" text="The eventual cryptographic core must use an independently reviewed, memory-hard password KDF and a shared native protocol implementation." tone={palette.amber} last />
        </SectionCard>
        <View style={styles.footer}><StatusPill icon="construction" variant="warning">Protocol layer in development</StatusPill><Text style={styles.footerText}>Do not use this build for sensitive real-world conversations. It is a functional product prototype, not a production privacy network.</Text></View>
      </ScrollView>
    </ScreenContainer>
  );
}

function SecurityRow({ icon, title, text, tone, last = false }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; text: string; tone: string; last?: boolean }) {
  return <View style={[styles.row, last && { borderBottomWidth: 0 }]}><View style={[styles.rowIcon, { backgroundColor: `${tone}16` }]}><MaterialIcons name={icon} size={20} color={tone} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowText}>{text}</Text></View></View>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 13, paddingBottom: 30 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { color: palette.ink, fontSize: 18, lineHeight: 24, fontWeight: "800" },
  hero: { flexDirection: "row", gap: 13, marginTop: 23, marginBottom: 25, alignItems: "flex-start" },
  heroIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" },
  heroTitle: { color: palette.ink, fontSize: 22, lineHeight: 28, fontWeight: "800" },
  heroText: { color: palette.muted, fontSize: 14, lineHeight: 20, marginTop: 3, maxWidth: 280 },
  sectionTitle: { color: "#8B95A7", fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1.05, marginBottom: 8, marginLeft: 3 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 11, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  rowIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  rowCopy: { flex: 1 },
  rowTitle: { color: palette.ink, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  rowText: { color: palette.muted, fontSize: 13, lineHeight: 18, marginTop: 3 },
  footer: { alignItems: "flex-start", gap: 9, padding: 16, backgroundColor: "#FFFFFF", borderColor: palette.line, borderWidth: 1, borderRadius: 18, marginTop: 20 },
  footerText: { color: "#758096", fontSize: 13, lineHeight: 19 },
  pressed: { opacity: 0.68 },
});
