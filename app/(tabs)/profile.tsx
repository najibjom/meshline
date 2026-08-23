import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar, palette, RowChevron, SectionCard, StatusPill } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useMeshline } from "@/lib/meshline-context";
import { haptic } from "@/lib/haptics";

export default function ProfileScreen() {
  const router = useRouter();
  const { identity, ready, updateDisplayName, updateProfileDescription, validateDisplayName } = useMeshline();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  if (!ready || !identity) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={palette.indigo} /></ScreenContainer>;
  const shortId = identity.deviceId.slice(0, 8).toUpperCase();
  const startNameEdit = () => { setNameDraft(identity.displayName ?? identity.username.slice(1)); setNameError(""); setEditingName(true); };
  const saveName = () => {
    if (!validateDisplayName(nameDraft)) { setNameError("Use 2–40 characters."); haptic.warning(); return; }
    void updateDisplayName(nameDraft);
    haptic.success();
    setEditingName(false);
  };
  const startDescriptionEdit = () => { setDescriptionDraft(identity.description ?? ""); setEditingDescription(true); };
  const saveDescription = () => { void updateProfileDescription(descriptionDraft); haptic.success(); setEditingDescription(false); };

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-[#F6F7FB]" className="bg-[#F6F7FB]">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <Text style={styles.title}>Profile</Text>
        <SectionCard style={styles.profileCard}>
          <Avatar label={identity.displayName ?? identity.username.slice(1)} size={62} />
          <View style={styles.profileCopy}>
            {editingName ? <View style={styles.nameEditRow}><TextInput value={nameDraft} onChangeText={(value) => { setNameDraft(value); setNameError(""); }} style={styles.nameInput} autoFocus returnKeyType="done" onSubmitEditing={saveName} /><Pressable onPress={saveName} style={({ pressed }) => [styles.nameSave, pressed && styles.pressed]}><MaterialIcons name="check" size={18} color="#FFFFFF" /></Pressable></View> : <View style={styles.displayNameRow}><Text style={styles.displayName}>{identity.displayName ?? identity.username.slice(1)}</Text><Pressable onPress={startNameEdit} hitSlop={8} style={({ pressed }) => [styles.editName, pressed && styles.pressed]}><MaterialIcons name="edit" size={15} color={palette.indigo} /></Pressable></View>}
            {nameError ? <Text style={styles.nameError}>{nameError}</Text> : null}
            <Text style={styles.username}>{identity.username}</Text>
            {editingDescription ? <View style={styles.descriptionEdit}><TextInput value={descriptionDraft} onChangeText={setDescriptionDraft} placeholder="Write a description" placeholderTextColor="#9CA5B5" multiline maxLength={160} style={styles.descriptionInput} /><View style={styles.descriptionActions}><Pressable onPress={() => setEditingDescription(false)}><Text style={styles.descriptionCancel}>Cancel</Text></Pressable><Pressable onPress={saveDescription}><Text style={styles.descriptionSave}>Save</Text></Pressable></View></View> : <Pressable onPress={startDescriptionEdit} style={({ pressed }) => [styles.descriptionRow, pressed && styles.pressed]}><Text numberOfLines={2} style={[styles.description, !identity.description && styles.descriptionEmpty]}>{identity.description || "Add a description"}</Text><MaterialIcons name="edit" size={14} color={palette.indigo} /></Pressable>}
            <Text style={styles.device}>This device · {shortId}</Text>
            <StatusPill icon="verified-user" variant="success">Local identity created</StatusPill>
          </View>
        </SectionCard>

        <Text style={styles.sectionTitle}>ACCOUNT CONTROL</Text>
        <SectionCard>
          <RowChevron icon="key" title="Recovery codes" detail="Keep a private fallback" onPress={() => router.push("/recovery")} tint={palette.indigo} />
          <RowChevron icon="lock-outline" title="Privacy controls" detail="App lock, local retention, export, and logout" onPress={() => router.push("/privacy")} tint={palette.indigo} />
          <RowChevron icon="shield" title="Security & privacy" detail="What is protected in this build" onPress={() => router.push("/security")} tint={palette.emerald} />
          <View style={styles.identityNote}><MaterialIcons name="fingerprint" size={18} color={palette.muted} /><Text style={styles.identityNoteText}>Your raw key material and future blockchain address are intentionally hidden from the everyday experience.</Text></View>
        </SectionCard>

        <Text style={styles.sectionTitle}>USERNAME</Text>
        <SectionCard style={styles.usernameCard}>
          <View style={styles.usernameRow}><View><Text style={styles.usernameCardLabel}>Your @username</Text><Text style={styles.usernameCardValue}>{identity.username}</Text></View><Pressable onPress={() => router.push("/new-chat")} style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}><MaterialIcons name="person-add-alt-1" size={18} color={palette.indigo} /></Pressable></View>
          <Text style={styles.usernameCaption}>Your display name is shown above. A decentralized name registry will resolve your @username when the protocol layer is added.</Text>
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
  displayNameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  displayName: { color: palette.ink, fontSize: 20, lineHeight: 26, fontWeight: "800" },
  editName: { width: 27, height: 27, borderRadius: 9, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" },
  nameEditRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nameInput: { height: 34, minWidth: 150, maxWidth: 190, borderBottomWidth: 1, borderBottomColor: palette.indigo, color: palette.ink, fontSize: 18, fontWeight: "800", paddingVertical: 0 },
  nameSave: { width: 30, height: 30, borderRadius: 10, backgroundColor: palette.indigo, alignItems: "center", justifyContent: "center" },
  nameError: { color: palette.coral, fontSize: 11, lineHeight: 15, fontWeight: "700" },
  username: { color: palette.indigo, fontSize: 14, lineHeight: 19, fontWeight: "700" },
  descriptionRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 2 },
  description: { flex: 1, color: palette.muted, fontSize: 12, lineHeight: 17 },
  descriptionEmpty: { color: palette.indigo, fontWeight: "700" },
  descriptionEdit: { marginTop: 4, borderRadius: 11, borderColor: palette.line, borderWidth: 1, backgroundColor: "#FFFFFF", padding: 7 },
  descriptionInput: { minHeight: 37, maxHeight: 64, color: palette.ink, fontSize: 12, lineHeight: 17, paddingVertical: 0 },
  descriptionActions: { flexDirection: "row", justifyContent: "flex-end", gap: 14, marginTop: 4 },
  descriptionCancel: { color: palette.muted, fontSize: 12, lineHeight: 16, fontWeight: "700" },
  descriptionSave: { color: palette.indigo, fontSize: 12, lineHeight: 16, fontWeight: "800" },
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
