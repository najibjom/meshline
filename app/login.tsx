import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { MeshlineMark, palette } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { useMeshline } from "@/lib/meshline-context";

export default function LoginScreen() {
  const router = useRouter();
  const { ready, identity, loginIdentity } = useMeshline();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  if (!ready) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={palette.indigo} /></ScreenContainer>;

  const login = async () => {
    if (!identity) { router.replace("/onboarding"); return; }
    if (!username.trim() || !password) { setError("Enter your username and password."); haptic.warning(); return; }
    setLoading(true);
    setError("");
    const accepted = await loginIdentity(username, password);
    setLoading(false);
    if (!accepted) { setError("That username or password does not match this device."); haptic.warning(); return; }
    haptic.success();
    router.replace("/");
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", default: undefined })}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-back" size={22} color={palette.ink} /></Pressable>
          <View style={styles.brandRow}><MeshlineMark size={50} /><Text style={styles.brand}>Meshline</Text></View>
          <Text style={styles.title}>Welcome back.</Text><Text style={styles.subtitle}>Log in to the local Meshline identity stored on this device.</Text>
          {identity ? <View style={styles.identityHint}><MaterialIcons name="person-outline" size={19} color={palette.indigo} /><Text style={styles.identityHintText}>This device has {identity.displayName} · {identity.username}</Text></View> : null}
          <View style={styles.form}>
            <Text style={styles.label}>USERNAME</Text>
            <View style={styles.inputWrap}><Text style={styles.prefix}>@</Text><TextInput value={username.replace(/^@/, "")} onChangeText={(value) => setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} autoCapitalize="none" autoCorrect={false} placeholder="yourname" placeholderTextColor={palette.muted} style={styles.input} returnKeyType="next" /></View>
            <Text style={[styles.label, { marginTop: 19 }]}>PASSWORD</Text>
            <View style={styles.inputWrap}><TextInput value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} placeholder="Your password" placeholderTextColor={palette.muted} style={[styles.input, { paddingLeft: 15 }]} returnKeyType="done" onSubmitEditing={login} /><Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={10} style={styles.eye}><MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={20} color={palette.muted} /></Pressable></View>
            {error ? <View style={styles.error}><MaterialIcons name="error-outline" size={17} color={palette.coral} /><Text style={styles.errorText}>{error}</Text></View> : null}
          </View>
          <Pressable onPress={login} disabled={loading} style={({ pressed }) => [styles.loginButton, (pressed || loading) && styles.pressed]}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <><MaterialIcons name="login" size={20} color="#FFFFFF" /><Text style={styles.loginText}>Log in</Text></>}</Pressable>
          <Pressable onPress={() => router.push("/onboarding")} style={({ pressed }) => [styles.registerLink, pressed && styles.pressed]}><Text style={styles.registerText}>New to Meshline? Create account</Text></Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, scroll: { flexGrow: 1, flexShrink: 1, minHeight: 0 }, content: { flexGrow: 1, padding: 24, paddingTop: 22, paddingBottom: 30 },
  back: { height: 42, width: 42, borderRadius: 14, justifyContent: "center", alignItems: "center", marginLeft: -9 }, brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 34 }, brand: { color: palette.ink, fontSize: 22, lineHeight: 28, fontWeight: "800" },
  title: { color: palette.ink, fontSize: 32, lineHeight: 38, fontWeight: "800", letterSpacing: -0.8, marginTop: 39 }, subtitle: { color: palette.muted, fontSize: 16, lineHeight: 23, marginTop: 9 },
  identityHint: { flexDirection: "row", gap: 9, padding: 13, borderRadius: 15, backgroundColor: palette.indigoSoft, marginTop: 23, alignItems: "center" }, identityHintText: { flex: 1, color: palette.indigo, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  form: { marginTop: 28 }, label: { color: palette.muted, fontSize: 11, lineHeight: 15, fontWeight: "800", letterSpacing: 1.05, marginBottom: 7, marginLeft: 2 }, inputWrap: { height: 58, borderRadius: 17, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.navyDeep, flexDirection: "row", alignItems: "center" }, prefix: { color: palette.indigo, fontSize: 18, fontWeight: "800", paddingLeft: 17, marginRight: 1 }, input: { flex: 1, height: "100%", color: palette.ink, fontSize: 17, paddingRight: 15 }, eye: { height: 46, width: 46, alignItems: "center", justifyContent: "center", marginRight: 2 },
  error: { flexDirection: "row", gap: 7, alignItems: "center", backgroundColor: "#43202B", borderRadius: 12, padding: 11, marginTop: 14 }, errorText: { flex: 1, color: palette.coral, fontSize: 13, lineHeight: 17, fontWeight: "600" },
  loginButton: { height: 54, borderRadius: 17, marginTop: 26, backgroundColor: palette.indigo, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }, loginText: { color: "#FFFFFF", fontSize: 16, lineHeight: 21, fontWeight: "800" }, registerLink: { alignSelf: "center", padding: 14, marginTop: 8 }, registerText: { color: palette.indigo, fontSize: 14, lineHeight: 19, fontWeight: "700" }, pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
});
