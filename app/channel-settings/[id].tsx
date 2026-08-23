import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar, palette, SectionCard } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { isLocalChannelOwner } from "@/lib/meshline";
import { useMeshline } from "@/lib/meshline-context";

export default function ChannelSettingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { identity, ready, state, updateChannelDetails, validateUsername } = useMeshline();
  const channel = state.conversations.find((conversation) => conversation.id === id);
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!channel) return;
    setTitle(channel.peerDisplayName);
    setUsername(channel.peerUsername);
    setDescription(channel.description ?? "");
    setError("");
  }, [channel?.description, channel?.id, channel?.peerDisplayName, channel?.peerUsername]);

  if (!ready) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={palette.indigo} /></ScreenContainer>;
  if (!channel || channel.kind !== "channel") return <ScreenContainer className="items-center justify-center bg-[#F6F7FB]"><Text style={styles.missing}>This channel is not available.</Text><Pressable onPress={() => router.back()} style={styles.returnButton}><Text style={styles.returnText}>Return</Text></Pressable></ScreenContainer>;

  const isOwner = isLocalChannelOwner(channel, identity);
  const save = async () => {
    if (!title.trim()) { setError("Add a channel name."); haptic.warning(); return; }
    if (!validateUsername(username)) { setError("Use 3–24 lowercase letters, numbers, or underscores for the @username."); haptic.warning(); return; }
    const updated = await updateChannelDetails(channel.id, title, username, description);
    if (!updated) { setError("That @username is already used locally, or this channel is no longer editable."); haptic.warning(); return; }
    haptic.success();
    router.back();
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#F6F7FB]" className="bg-[#F6F7FB]">
      <View style={styles.header}><Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-back" size={22} color={palette.ink} /></Pressable><Text style={styles.headerTitle}>Edit channel</Text><View style={styles.headerSpacer} /></View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
        <SectionCard style={styles.identityCard}><View style={styles.channelMark}><MaterialIcons name="campaign" size={25} color={palette.indigo} /></View><View style={styles.identityCopy}><Text style={styles.channelName}>{channel.peerDisplayName}</Text><Text style={styles.channelHandle}>{channel.peerUsername}</Text><Text style={styles.channelMeta}>Local channel · {channel.memberUsernames?.length || 1} subscriber{(channel.memberUsernames?.length || 1) === 1 ? "" : "s"}</Text></View></SectionCard>
        {isOwner ? <><Text style={styles.sectionTitle}>CHANNEL INFO</Text><SectionCard style={styles.formCard}><Text style={styles.label}>Channel name</Text><TextInput value={title} onChangeText={(value) => { setTitle(value); setError(""); }} maxLength={60} placeholder="Channel name" placeholderTextColor="#9CA5B5" style={styles.input} returnKeyType="next" /><Text style={styles.label}>Public @username</Text><TextInput value={username} onChangeText={(value) => { setUsername(value.toLowerCase().replace(/[^a-z0-9_@]/g, "")); setError(""); }} maxLength={25} autoCapitalize="none" autoCorrect={false} placeholder="@channel" placeholderTextColor="#9CA5B5" style={styles.input} returnKeyType="next" /><Text style={styles.label}>Description</Text><TextInput value={description} onChangeText={(value) => { setDescription(value); setError(""); }} maxLength={180} multiline placeholder="Describe this channel" placeholderTextColor="#9CA5B5" style={[styles.input, styles.descriptionInput]} />{error ? <Text style={styles.error}>{error}</Text> : null}<Pressable onPress={() => void save()} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}><Text style={styles.saveText}>Save channel changes</Text></Pressable></SectionCard><Text style={styles.note}>These settings are stored on this device in the current local-first MVP. Network-wide channel identities will be handled by a future protocol layer.</Text></> : <SectionCard style={styles.readOnlyCard}><MaterialIcons name="lock-outline" size={21} color={palette.muted} /><View style={styles.readOnlyCopy}><Text style={styles.readOnlyTitle}>Only the channel owner can edit settings</Text><Text style={styles.readOnlyText}>The creator controls this channel’s name, @username, description, and posting access.</Text></View></SectionCard>}</ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 64, backgroundColor: "#FFFFFF", borderBottomColor: palette.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 },
  back: { width: 37, height: 37, borderRadius: 12, alignItems: "center", justifyContent: "center" }, headerTitle: { flex: 1, textAlign: "center", color: palette.ink, fontSize: 17, lineHeight: 22, fontWeight: "800" }, headerSpacer: { width: 37 },
  content: { padding: 18, paddingTop: 17, paddingBottom: 42 }, identityCard: { flexDirection: "row", alignItems: "center", gap: 13, padding: 16 }, channelMark: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: palette.indigoSoft }, identityCopy: { flex: 1 }, channelName: { color: palette.ink, fontSize: 18, lineHeight: 24, fontWeight: "800" }, channelHandle: { color: palette.indigo, fontSize: 13, lineHeight: 18, fontWeight: "700", marginTop: 1 }, channelMeta: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  sectionTitle: { color: "#8B95A7", fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1.05, marginTop: 23, marginBottom: 8, marginLeft: 4 }, formCard: { padding: 16 }, label: { color: palette.muted, fontSize: 13, lineHeight: 17, fontWeight: "700", marginTop: 1 }, input: { height: 44, borderRadius: 12, borderColor: palette.line, borderWidth: 1, backgroundColor: "#FFFFFF", color: palette.ink, fontSize: 15, paddingHorizontal: 12, marginTop: 7, marginBottom: 16 }, descriptionInput: { height: 98, textAlignVertical: "top", paddingTop: 11 }, error: { color: palette.coral, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: -7, marginBottom: 10 }, saveButton: { height: 46, borderRadius: 14, backgroundColor: palette.indigo, alignItems: "center", justifyContent: "center", marginTop: 2 }, saveText: { color: "#FFFFFF", fontSize: 15, lineHeight: 20, fontWeight: "800" }, note: { color: "#7E889B", fontSize: 12, lineHeight: 17, marginHorizontal: 5, marginTop: 15 },
  readOnlyCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 16, marginTop: 22 }, readOnlyCopy: { flex: 1 }, readOnlyTitle: { color: palette.ink, fontSize: 14, lineHeight: 19, fontWeight: "800" }, readOnlyText: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 3 }, missing: { color: palette.ink, fontSize: 16, fontWeight: "700" }, returnButton: { marginTop: 14, backgroundColor: palette.indigoSoft, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 }, returnText: { color: palette.indigo, fontWeight: "800" }, pressed: { opacity: 0.7 },
});
