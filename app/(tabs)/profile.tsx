import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar, palette, RowChevron, SectionCard, StatusPill } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useMeshline } from "@/lib/meshline-context";

export default function ProfileScreen() {
  const router = useRouter();
  const { identity, ready } = useMeshline();
  if (!ready || !identity) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={palette.indigo} /></ScreenContainer>;
  const shortId = identity.deviceId.slice(0, 8).toUpperCase();

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-[#F6F7FB]" className="bg-[#F6F7FB]">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <Text style={styles.title}>Profile</Text>
        <SectionCard style={styles.profileCard}>
          <Avatar label={identity.username.slice(1)} size={62} />
          <View style={styles.profileCopy}>
            <Text style={styles.username}>{identity.username}</Text>
            <Text style={styles.device}>This device · {shortId}</Text>
            <StatusPill icon="verified-user" variant="success">Local identity created</StatusPill>
          </View>
        </SectionCard>

        <Text style={styles.sectionTitle}>ACCOUNT CONTROL</Text>
        <SectionCard>
          <RowChevron icon="key" title="Recovery codes" detail="Keep a private fallback" onPress={() => router.push("/recovery")} tint={palette.indigo} />
          <RowChevron icon="shield" title="Security & privacy" detail="What is protected in this build" onPress={() => router.push("/security")} tint={palette.emerald} />
          <View style={styles.identityNote}><MaterialIcons name="fingerprint" size={18} color={palette.muted} /><Text style={styles.identityNoteText}>Your raw key material and future blockchain address are intentionally hidden from the everyday experience.</Text></View>
        </SectionCard>

        <Text style={styles.sectionTitle}>USERNAME</Text>
        <SectionCard style={styles.usernameCard}>
          <View style={styles.usernameRow}><View><Text style={styles.usernameCardLabel}>Your Meshline name</Text><Text style={styles.usernameCardValue}>{identity.username}</Text></View><Pressable onPress={() => router.push("/new-chat")} style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}><MaterialIcons name="person-add-alt-1" size={18} color={palette.indigo} /></Pressable></View>
          <Text style={styles.usernameCaption}>This prototype validates your name locally. A decentralized name registry will resolve it when the protocol layer is added.</Text>
        </SectionCard>

        <View style={styles.footer}><MaterialIcons name="info-outline" size={17} color="#8B95A7" /><Text style={styles.footerText}>Meshline does not ask for your phone number, email address, wallet, or public key.</Text></View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, flexShrink: 1, minHeight: 0 },
  content: { flexGrow: 1, padding: 18, paddingTop: 10, paddingBottom: 120 },
  title: { color: palette.ink, fontSize: 28, lineHeight: 34, fontWeight: "800", letterSpacing: -0.55, marginBottom: 19 },
  profileCard: { flexDirection: "row", gap: 15, padding: 17, alignItems: "center", marginBottom: 23 },
  profileCopy: { flex: 1, gap: 3 },
  username: { color: palette.ink, fontSize: 20, lineHeight: 26, fontWeight: "800" },
  device: { color: palette.muted, fontSize: 13, lineHeight: 17, marginBottom: 3 },
  sectionTitle: { color: "#8B95A7", fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1.05, marginBottom: 8, marginLeft: 4 },
  identityNote: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 16 },
  identityNoteText: { flex: 1, color: palette.muted, fontSize: 13, lineHeight: 18 },
  usernameCard: { padding: 16 },
  usernameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  usernameCardLabel: { color: palette.muted, fontSize: 13, lineHeight: 17, fontWeight: "600" },
  usernameCardValue: { color: palette.ink, fontSize: 18, lineHeight: 24, fontWeight: "800", marginTop: 2 },
  shareButton: { height: 40, width: 40, borderRadius: 14, justifyContent: "center", alignItems: "center", backgroundColor: palette.indigoSoft },
  usernameCaption: { color: palette.muted, fontSize: 13, lineHeight: 18, marginTop: 12 },
  footer: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 5, marginTop: 19 },
  footerText: { flex: 1, color: "#7E889B", fontSize: 12, lineHeight: 17 },
  pressed: { opacity: 0.68 },
});
