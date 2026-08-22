import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { MeshlineMark, palette, PrimaryButton } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useMeshline } from "@/lib/meshline-context";
import { haptic } from "@/lib/haptics";

export default function OnboardingScreen() {
  const router = useRouter();
  const { createIdentity, validateDisplayName, validateUsername } = useMeshline();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!validateDisplayName(displayName)) {
      setError("Enter a name between 2 and 40 characters.");
      haptic.warning();
      return;
    }
    const validName = validateUsername(username);
    if (!validName) {
      setError("Use 3–24 lowercase letters, numbers, or underscores.");
      haptic.warning();
      return;
    }
    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      haptic.warning();
      return;
    }
    setError("");
    setCreating(true);
    try {
      await createIdentity(displayName, username, password);
      haptic.success();
      router.replace("/recovery");
    } catch {
      setError("We could not secure your local identity. Please try again.");
      haptic.warning();
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#F6F7FB]" className="bg-[#F6F7FB]">
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", default: undefined })}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
          <View style={styles.top}><MeshlineMark size={56} /><Text style={styles.brand}>Meshline</Text></View>
          <View style={styles.copy}><Text style={styles.title}>Make a private identity.</Text><Text style={styles.subtitle}>No phone number, email, wallet, or technical setup. Choose a name, username, and password; your identity is created on this device.</Text></View>
          <View style={styles.form}>
            <Text style={styles.label}>DISPLAY NAME</Text>
            <View style={styles.inputWrap}><TextInput value={displayName} onChangeText={setDisplayName} autoCapitalize="words" autoCorrect placeholder="Your name" placeholderTextColor="#A5ADBC" style={[styles.input, { paddingLeft: 15 }]} returnKeyType="next" /></View>
            <Text style={styles.hint}>This is the name people see first on your profile and in chats.</Text>
            <Text style={styles.label}>USERNAME</Text>
            <View style={styles.inputWrap}><Text style={styles.prefix}>@</Text><TextInput value={username.replace(/^@/, "")} onChangeText={(value) => setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} autoCapitalize="none" autoCorrect={false} placeholder="yourname" placeholderTextColor="#A5ADBC" style={styles.input} returnKeyType="next" /></View>
            <Text style={styles.hint}>This prototype checks availability only on your device. Network-wide name registration comes later.</Text>
            <Text style={[styles.label, { marginTop: 19 }]}>PASSWORD</Text>
            <View style={styles.inputWrap}><TextInput value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} placeholder="At least 8 characters" placeholderTextColor="#A5ADBC" style={[styles.input, { paddingLeft: 15 }]} returnKeyType="done" onSubmitEditing={create} /><Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={10} style={styles.eye}><MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={20} color="#8B95A7" /></Pressable></View>
            <Text style={styles.hint}>Your password is never shown in your profile or sent to an account server.</Text>
            {error ? <View style={styles.error}><MaterialIcons name="error-outline" size={17} color={palette.coral} /><Text style={styles.errorText}>{error}</Text></View> : null}
          </View>
          <PrimaryButton label={creating ? "Creating identity…" : "Create account"} onPress={create} icon="arrow-forward" disabled={creating} />
          <View style={styles.privacy}><MaterialIcons name="lock-outline" size={16} color="#7F8A9D" /><Text style={styles.privacyText}>Your recovery codes are next. Store them privately before you start messaging.</Text></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, flexShrink: 1, minHeight: 0 },
  content: { flexGrow: 1, padding: 24, paddingTop: 30, paddingBottom: 20 },
  top: { flexDirection: "row", alignItems: "center", gap: 11 },
  brand: { color: palette.ink, fontSize: 23, lineHeight: 29, fontWeight: "800", letterSpacing: -0.4 },
  copy: { marginTop: 42 },
  title: { color: palette.ink, fontSize: 32, lineHeight: 38, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { color: palette.muted, fontSize: 16, lineHeight: 23, marginTop: 10 },
  form: { marginTop: 31, marginBottom: 27 },
  label: { color: "#7B8598", fontSize: 11, lineHeight: 15, fontWeight: "800", letterSpacing: 1.05, marginBottom: 7, marginLeft: 2 },
  inputWrap: { height: 54, borderRadius: 16, borderWidth: 1, borderColor: "#DDE2EC", backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center" },
  prefix: { color: palette.indigo, fontSize: 17, fontWeight: "800", paddingLeft: 16, marginRight: 1 },
  input: { flex: 1, height: "100%", color: palette.ink, fontSize: 16, paddingRight: 14 },
  eye: { height: 44, width: 44, alignItems: "center", justifyContent: "center", marginRight: 2 },
  hint: { color: "#7B8598", fontSize: 12, lineHeight: 17, marginTop: 7, paddingHorizontal: 2 },
  error: { flexDirection: "row", gap: 7, alignItems: "center", backgroundColor: "#FFF0F2", borderRadius: 12, padding: 10, marginTop: 14 },
  errorText: { flex: 1, color: palette.coral, fontSize: 13, lineHeight: 17, fontWeight: "600" },
  privacy: { flexDirection: "row", gap: 8, alignItems: "flex-start", paddingHorizontal: 5, marginTop: 17 },
  privacyText: { flex: 1, color: "#7F8A9D", fontSize: 12, lineHeight: 17 },
});
