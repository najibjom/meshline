import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar, palette, PrimaryButton, SectionCard } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";
import { normalizeUsername } from "@/lib/meshline";
import { useMeshline } from "@/lib/meshline-context";
import { lookupRelayDevice } from "@/lib/relay-client";
import { haptic } from "@/lib/haptics";

export default function NewChatScreen() {
  const router = useRouter();
  const { saveContactAndStartConversation, validateUsername } = useMeshline();
  const [displayName, setDisplayName] = useState("");
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
    setCreating(true);
    try {
      await lookupRelayDevice(normalized);
      const conversationId = await saveContactAndStartConversation(displayName, normalized);
      haptic.light();
      router.replace({ pathname: "/chat/[id]", params: { id: conversationId } });
    } catch {
      haptic.warning();
      setError(`${normalized} is not connected to the encrypted-text proof relay yet. In the other Space, sign in and open Network → Encrypted text proof once, then try again.`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#F6F7FB]" className="bg-[#F6F7FB]">
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", default: undefined })}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
          <View style={styles.header}><Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-back" size={22} color={palette.ink} /></Pressable><Text style={styles.title}>New contact</Text><View style={styles.back} /></View>
          <Text style={styles.subtitle}>Find a person by their Meshline username on the experimental text relay, then start a direct text conversation.</Text>
          <SectionCard style={styles.searchCard}>
            <Text style={styles.label}>DISPLAY NAME</Text>
            <View style={styles.inputWrap}><TextInput value={displayName} onChangeText={setDisplayName} autoCapitalize="words" autoCorrect placeholder="How you know them" placeholderTextColor="#A5ADBC" style={[styles.input, { paddingLeft: 15 }]} returnKeyType="next" /></View>
            <Text style={styles.label}>USERNAME</Text>
            <View style={styles.inputWrap}><Text style={styles.prefix}>@</Text><TextInput value={username.replace(/^@/, "")} onChangeText={(value) => setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} autoCapitalize="none" autoCorrect={false} placeholder="username" placeholderTextColor="#A5ADBC" style={styles.input} returnKeyType="done" onSubmitEditing={openChat} /></View>
            <Text style={styles.hint}>The other person must sign in and open the encrypted-text proof screen once before their account can be found.</Text>
          </SectionCard>
          {username ? <View style={styles.preview}><Avatar label={displayName || normalized.slice(1) || "?"} size={52} tone="emerald" /><View style={styles.previewCopy}><Text style={styles.previewName}>{displayName || normalized}</Text><Text style={styles.previewText}>{displayName ? normalized : "Search the experimental encrypted-text relay"}</Text></View></View> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.bottom}><PrimaryButton label={creating ? "Looking up account…" : "Find and start encrypted chat"} onPress={openChat} icon="chat-bubble-outline" disabled={creating || !username} /></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, flexShrink: 1, minHeight: 0 },
  content: { flexGrow: 1, padding: 20, paddingTop: 13, paddingBottom: 28 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { color: palette.ink, fontSize: 18, lineHeight: 24, fontWeight: "800" },
  subtitle: { color: palette.muted, fontSize: 15, lineHeight: 21, marginTop: 22, maxWidth: 315 },
  searchCard: { padding: 16, marginTop: 22 },
  label: { color: "#7B8598", fontSize: 11, lineHeight: 15, fontWeight: "800", letterSpacing: 1.05, marginBottom: 7, marginLeft: 2, marginTop: 15 },
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
