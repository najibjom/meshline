import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { palette, SectionCard } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { isLocalGroupOwner } from "@/lib/meshline";
import { useMeshline } from "@/lib/meshline-context";
import { useColors } from "@/hooks/use-colors";

export default function GroupSettingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { identity, ready, state, updateGroupDetails, validateUsername } = useMeshline();
  const colors = useColors();
  const group = state.conversations.find((conversation) => conversation.id === id);
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!group) return;
    setTitle(group.peerDisplayName);
    setUsername(group.peerUsername);
    setDescription(group.description ?? "");
    setError("");
  }, [group?.description, group?.id, group?.peerDisplayName, group?.peerUsername]);

  if (!ready) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={palette.indigo} /></ScreenContainer>;
  if (!group || group.kind !== "group") return <ScreenContainer className="items-center justify-center bg-[#F6F7FB]"><Text style={styles.missing}>This group is not available.</Text><Pressable onPress={() => router.back()} style={styles.returnButton}><Text style={styles.returnText}>Return</Text></Pressable></ScreenContainer>;

  const isOwner = isLocalGroupOwner(group, identity);
  const memberCount = group.memberUsernames?.length || 1;
  const save = async () => {
    if (!title.trim()) { setError("Add a group name."); haptic.warning(); return; }
    if (!validateUsername(username)) { setError("Use 3–24 lowercase letters, numbers, or underscores for the @username."); haptic.warning(); return; }
    const updated = await updateGroupDetails(group.id, title, username, description);
    if (!updated) { setError("That @username is already used locally, or this group is no longer editable."); haptic.warning(); return; }
    haptic.success();
    router.back();
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}><Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-back" size={22} color={colors.text} /></Pressable><Text style={[styles.headerTitle, { color: colors.text }]}>Edit group</Text><View style={styles.headerSpacer} /></View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
        <SectionCard style={styles.identityCard}><View style={[styles.groupMark, { backgroundColor: `${colors.tint}18` }]}><MaterialIcons name="group" size={26} color={colors.tint} /></View><View style={styles.identityCopy}><Text style={[styles.groupName, { color: colors.text }]}>{group.peerDisplayName}</Text><Text style={[styles.groupHandle, { color: colors.tint }]}>{group.peerUsername}</Text><Text style={[styles.groupMeta, { color: colors.muted }]}>Group · {memberCount} member{memberCount === 1 ? "" : "s"} · Text only</Text></View></SectionCard>
        {isOwner ? <><Text style={[styles.sectionTitle, { color: colors.muted }]}>GROUP INFO</Text><SectionCard style={styles.formCard}><Text style={[styles.label, { color: colors.muted }]}>Group name</Text><TextInput value={title} onChangeText={(value) => { setTitle(value); setError(""); }} maxLength={60} placeholder="Group name" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} returnKeyType="next" /><Text style={[styles.label, { color: colors.muted }]}>Public @username</Text><TextInput value={username} onChangeText={(value) => { setUsername(value.toLowerCase().replace(/[^a-z0-9_@]/g, "")); setError(""); }} maxLength={25} autoCapitalize="none" autoCorrect={false} placeholder="@group" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} returnKeyType="next" /><Text style={[styles.label, { color: colors.muted }]}>Description</Text><TextInput value={description} onChangeText={(value) => { setDescription(value); setError(""); }} maxLength={180} multiline placeholder="Describe this group" placeholderTextColor={colors.muted} style={[styles.input, styles.descriptionInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} />{error ? <Text style={styles.error}>{error}</Text> : null}<Pressable onPress={() => void save()} style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.tint }, pressed && styles.pressed]}><Text style={styles.saveText}>Save group changes</Text></Pressable></SectionCard><Text style={[styles.note, { color: colors.muted }]}>Owner updates are sent as experimental encrypted settings snapshots to registered members. This is not a production group-security protocol.</Text></> : <SectionCard style={styles.readOnlyCard}><MaterialIcons name="lock-outline" size={21} color={colors.muted} /><View style={styles.readOnlyCopy}><Text style={[styles.readOnlyTitle, { color: colors.text }]}>Only the group owner can edit settings</Text><Text style={[styles.readOnlyText, { color: colors.muted }]}>The creator controls this group’s name, @username, and description.</Text></View></SectionCard>}</ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 64, backgroundColor: "#FFFFFF", borderBottomColor: palette.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 }, back: { width: 37, height: 37, borderRadius: 12, alignItems: "center", justifyContent: "center" }, headerTitle: { flex: 1, textAlign: "center", color: palette.ink, fontSize: 17, lineHeight: 22, fontWeight: "800" }, headerSpacer: { width: 37 },
  content: { padding: 18, paddingTop: 17, paddingBottom: 42 }, identityCard: { flexDirection: "row", alignItems: "center", gap: 13, padding: 16 }, groupMark: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: palette.indigoSoft }, identityCopy: { flex: 1 }, groupName: { color: palette.ink, fontSize: 18, lineHeight: 24, fontWeight: "800" }, groupHandle: { color: palette.indigo, fontSize: 13, lineHeight: 18, fontWeight: "700", marginTop: 1 }, groupMeta: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  sectionTitle: { color: "#8B95A7", fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1.05, marginTop: 23, marginBottom: 8, marginLeft: 4 }, formCard: { padding: 16 }, label: { color: palette.muted, fontSize: 13, lineHeight: 17, fontWeight: "700", marginTop: 1 }, input: { height: 44, borderRadius: 12, borderColor: palette.line, borderWidth: 1, backgroundColor: "#FFFFFF", color: palette.ink, fontSize: 15, paddingHorizontal: 12, marginTop: 7, marginBottom: 16 }, descriptionInput: { height: 98, textAlignVertical: "top", paddingTop: 11 }, error: { color: palette.coral, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: -7, marginBottom: 10 }, saveButton: { height: 46, borderRadius: 14, backgroundColor: palette.indigo, alignItems: "center", justifyContent: "center", marginTop: 2 }, saveText: { color: "#FFFFFF", fontSize: 15, lineHeight: 20, fontWeight: "800" }, note: { color: "#7E889B", fontSize: 12, lineHeight: 17, marginHorizontal: 5, marginTop: 15 },
  readOnlyCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 16, marginTop: 22 }, readOnlyCopy: { flex: 1 }, readOnlyTitle: { color: palette.ink, fontSize: 14, lineHeight: 19, fontWeight: "800" }, readOnlyText: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 3 }, missing: { color: palette.ink, fontSize: 16, fontWeight: "700" }, returnButton: { marginTop: 14, backgroundColor: palette.indigoSoft, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 }, returnText: { color: palette.indigo, fontWeight: "800" }, pressed: { opacity: 0.7 },
});
