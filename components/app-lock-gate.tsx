import { MaterialIcons } from "@expo/vector-icons";
import { PropsWithChildren, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { MeshlineMark, palette } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useMeshline } from "@/lib/meshline-context";

export function AppLockGate({ children }: PropsWithChildren) {
  const { appLocked, continueWithPassword, unlockWithBiometrics } = useMeshline();
  const [unlocking, setUnlocking] = useState(false);
  if (!appLocked) return children;
  const unlock = async () => { setUnlocking(true); await unlockWithBiometrics(); setUnlocking(false); };
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.content}><View style={styles.top}><MeshlineMark size={58} /><Text style={styles.title}>Meshline is locked</Text><Text style={styles.subtitle}>Unlock your local identity before returning to private messages.</Text></View><View style={styles.actions}>{Platform.OS === "web" ? <View style={styles.webNote}><MaterialIcons name="info-outline" size={19} color={palette.muted} /><Text style={styles.webNoteText}>Biometric unlock works in the installed iOS or Android app. Use your password in this preview.</Text></View> : <Pressable onPress={() => void unlock()} disabled={unlocking} style={({ pressed }) => [styles.primary, (pressed || unlocking) && styles.pressed]}>{unlocking ? <ActivityIndicator color="#FFFFFF" /> : <><MaterialIcons name="fingerprint" size={21} color="#FFFFFF" /><Text style={styles.primaryText}>Unlock with biometrics</Text></>}</Pressable>}<Pressable onPress={continueWithPassword} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}><Text style={styles.secondaryText}>Use password instead</Text></Pressable></View></View></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { flex: 1, padding: 24, paddingTop: 34, justifyContent: "space-between" }, top: { alignItems: "flex-start" }, title: { color: palette.ink, fontSize: 31, lineHeight: 38, fontWeight: "800", letterSpacing: -0.8, marginTop: 42 }, subtitle: { color: palette.muted, fontSize: 16, lineHeight: 23, marginTop: 10, maxWidth: 310 }, actions: { gap: 11 }, primary: { height: 54, borderRadius: 17, backgroundColor: palette.indigo, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }, primaryText: { color: "#FFFFFF", fontSize: 16, lineHeight: 21, fontWeight: "800" }, secondary: { height: 50, borderRadius: 16, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" }, secondaryText: { color: palette.indigo, fontSize: 15, lineHeight: 20, fontWeight: "800" }, webNote: { flexDirection: "row", gap: 9, backgroundColor: palette.indigoSoft, borderRadius: 16, padding: 14, alignItems: "flex-start" }, webNoteText: { flex: 1, color: palette.muted, fontSize: 13, lineHeight: 18 }, pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] } });
