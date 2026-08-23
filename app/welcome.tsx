import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { MeshlineMark, palette } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useMeshline } from "@/lib/meshline-context";

export default function WelcomeScreen() {
  const router = useRouter();
  const { ready, identity } = useMeshline();
  if (!ready) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={palette.indigo} /></ScreenContainer>;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#F6F7FB]" className="bg-[#F6F7FB]">
      <View style={styles.content}>
        <View>
          <View style={styles.brandRow}><MeshlineMark size={58} /><Text style={styles.brand}>Meshline</Text></View>
          <View style={styles.hero}><Text style={styles.title}>Private messages, on your terms.</Text><Text style={styles.subtitle}>Use an existing local identity or make a new one. Meshline never asks for a phone number, email, or wallet.</Text></View>
          {identity ? <View style={styles.localIdentity}><MaterialIcons name="person-outline" size={20} color={palette.indigo} /><View style={styles.localCopy}><Text style={styles.localLabel}>LOCAL IDENTITY FOUND</Text><Text style={styles.localName}>{identity.displayName}</Text><Text style={styles.localUsername}>{identity.username}</Text></View></View> : <View style={styles.note}><MaterialIcons name="info-outline" size={18} color={palette.muted} /><Text style={styles.noteText}>No local identity is set up on this device yet.</Text></View>}
        </View>
        <View style={styles.actions}>
          <Pressable onPress={() => router.push("/login")} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><MaterialIcons name="login" size={20} color="#FFFFFF" /><Text style={styles.primaryText}>Log in</Text></Pressable>
          <Pressable onPress={() => router.push("/onboarding")} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}><MaterialIcons name="person-add-alt-1" size={20} color={palette.indigo} /><Text style={styles.secondaryText}>Create account</Text></Pressable>
          <Text style={styles.footer}>This prototype keeps identity data and messages on this device.</Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 24, paddingTop: 30, justifyContent: "space-between" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brand: { color: palette.ink, fontSize: 24, lineHeight: 30, fontWeight: "800", letterSpacing: -0.4 },
  hero: { marginTop: 58 },
  title: { color: palette.ink, fontSize: 34, lineHeight: 40, fontWeight: "800", letterSpacing: -0.9, maxWidth: 310 },
  subtitle: { color: palette.muted, fontSize: 16, lineHeight: 23, marginTop: 12, maxWidth: 335 },
  localIdentity: { flexDirection: "row", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 18, borderColor: "#E4E8F2", borderWidth: 1, padding: 16, marginTop: 28, alignItems: "center" },
  localCopy: { flex: 1 },
  localLabel: { color: "#7C8799", fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 0.95 },
  localName: { color: palette.ink, fontSize: 17, lineHeight: 23, fontWeight: "800", marginTop: 1 },
  localUsername: { color: palette.indigo, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  note: { flexDirection: "row", gap: 9, backgroundColor: "#EEF1F6", borderRadius: 16, padding: 14, marginTop: 28, alignItems: "flex-start" },
  noteText: { flex: 1, color: palette.muted, fontSize: 13, lineHeight: 18 },
  actions: { gap: 11 },
  primary: { height: 54, borderRadius: 17, backgroundColor: palette.indigo, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  primaryText: { color: "#FFFFFF", fontSize: 16, lineHeight: 21, fontWeight: "800" },
  secondary: { height: 54, borderRadius: 17, backgroundColor: palette.indigoSoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  secondaryText: { color: palette.indigo, fontSize: 16, lineHeight: 21, fontWeight: "800" },
  footer: { color: "#7D8799", textAlign: "center", fontSize: 12, lineHeight: 17, marginTop: 8, paddingHorizontal: 16 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
});
