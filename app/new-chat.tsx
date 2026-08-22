import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar, palette, PrimaryButton, SectionCard } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";
import { normalizeUsername } from "@/lib/meshline";
import { useMeshline } from "@/lib/meshline-context";
import { haptic } from "@/lib/haptics";

export default function NewChatScreen() {
  const router = useRouter();
  const { startConversation, validateUsername } = useMeshline();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const normalized = normalizeUsername(username);

  const openChat = async () => {
    if (!validateUsername(username)) {
      setError("Enter a valid Meshline username.");
      haptic.warning();
      return;
    }
    setError("");
    setCreating(true);
    const conversationId = await startConversation(username);
    haptic.light();
    router.replace({ pathname: "/chat/[id]", params: { id: conversationId } });
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#F6F7FB]" className="bg-[#F6F7FB]">
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", default: undefined })}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}><Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-back" size={22} color={palette.ink} /></Pressable><Text style={styles.title}>New chat</Text><View style={styles.back} /></View>
          <Text style={styles.subtitle}>Enter a Meshline username to create a text-only conversation.</Text>
          <SectionCard style={styles.searchCard}>
            <Text style={styles.label}>USERNAME</Text>
            <View style={styles.inputWrap}><Text style={styles.prefix}>@</Text><TextInput value={username.replace(/^@/, "")} onChangeText={(value) => setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} autoCapitalize="none" autoCorrect={false} placeholder="username" placeholderTextColor="#A5ADBC" style={styles.input} returnKeyType="done" onSubmitEditing={openChat} /></View>
            <Text style={styles.hint}>No address, phone number, or contact-book upload is needed.</Text>
          </SectionCard>
          {username ? <View style={styles.preview}><Avatar label={normalized.slice(1) || "?"} size={52} tone="emerald" /><View style={styles.previewCopy}><Text style={styles.previewName}>{normalized}</Text><Text style={styles.previewText}>Local protocol-ready conversation</Text></View></View> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.bottom}><PrimaryButton label={creating ? "Opening…" : "Open conversation"} onPress={openChat} icon="chat-bubble-outline" disabled={creating || !username} /></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: 20, paddingTop: 13 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { color: palette.ink, fontSize: 18, lineHeight: 24, fontWeight: "800" },
  subtitle: { color: palette.muted, fontSize: 15, lineHeight: 21, marginTop: 22, maxWidth: 315 },
  searchCard: { padding: 16, marginTop: 22 },
  label: { color: "#7B8598", fontSize: 11, lineHeight: 15, fontWeight: "800", letterSpacing: 1.05, marginBottom: 7, marginLeft: 2 },
  inputWrap: { height: 54, borderRadius: 16, borderWidth: 1, borderColor: "#DDE2EC", backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center" },
  prefix: { color: palette.indigo, fontSize: 17, fontWeight: "800", paddingLeft: 16, marginRight: 1 },
  input: { flex: 1, height: "100%", color: palette.ink, fontSize: 16, paddingRight: 14 },
  hint: { color: "#7B8598", fontSize: 12, lineHeight: 17, marginTop: 8 },
  preview: { marginTop: 18, flexDirection: "row", alignItems: "center", gap: 12, padding: 13, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.line },
  previewCopy: { gap: 2 },
  previewName: { color: palette.ink, fontSize: 16, lineHeight: 21, fontWeight: "800" },
  previewText: { color: palette.muted, fontSize: 13, lineHeight: 18 },
  error: { color: palette.coral, fontSize: 13, lineHeight: 18, fontWeight: "700", marginTop: 12 },
  bottom: { flex: 1, justifyContent: "flex-end", marginTop: 30, paddingBottom: 4 },
  pressed: { opacity: 0.68 },
});
