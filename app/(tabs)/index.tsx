import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar, MeshlineMark, palette, StatusPill } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";
import { formatConversationTime, Message } from "@/lib/meshline";
import { useMeshline } from "@/lib/meshline-context";

export default function ChatsScreen() {
  const router = useRouter();
  const { ready, identity, state } = useMeshline();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (ready && !identity) router.replace("/onboarding");
    if (ready && identity && !identity.recoveryAcknowledged) router.replace("/recovery");
  }, [identity, ready, router]);

  const filteredConversations = useMemo(() => state.conversations
    .filter((conversation) => `${conversation.peerDisplayName} ${conversation.peerUsername}`.toLowerCase().includes(query.toLowerCase()))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()), [query, state.conversations]);

  if (!ready || !identity) {
    return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={palette.indigo} /></ScreenContainer>;
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-[#F6F7FB]" className="bg-[#F6F7FB]">
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <MeshlineMark size={38} />
                <View style={styles.brandCopy}>
                  <Text style={styles.brand}>Meshline</Text>
                  <Text style={styles.username}>{identity.username}</Text>
                </View>
              </View>
              <Pressable onPress={() => router.push("/new-chat")} style={({ pressed }) => [styles.compose, pressed && styles.pressed]} accessibilityLabel="Start a new chat">
                <MaterialIcons name="edit" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
            <View style={styles.statusRow}>
              <StatusPill icon="lock-outline" variant="success">Local identity ready</StatusPill>
              <StatusPill icon="device-hub">Transport: prototype</StatusPill>
            </View>
            <View style={styles.searchWrap}>
              <MaterialIcons name="search" size={20} color="#8B95A7" />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search chats" placeholderTextColor="#8B95A7" style={styles.search} returnKeyType="search" />
            </View>
            <Text style={styles.sectionLabel}>MESSAGES</Text>
          </>
        }
        renderItem={({ item }) => {
          const latest = state.messages[item.id]?.at(-1);
          return <ConversationRow conversation={item} latest={latest} onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.id } })} />;
        }}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>No chats found</Text><Text style={styles.emptyText}>Try a different username or start a new chat.</Text></View>}
      />
    </ScreenContainer>
  );
}

function ConversationRow({ conversation, latest, onPress }: { conversation: { peerDisplayName: string; peerUsername: string; updatedAt: string; isGuide?: boolean }; latest?: Message; onPress: () => void }) {
  const preview = latest?.body ?? "No messages yet";
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.conversation, pressed && styles.pressed]}>
      {conversation.isGuide ? <View style={styles.guideAvatar}><MeshlineMark size={30} /></View> : <Avatar label={conversation.peerDisplayName} size={48} tone="emerald" />}
      <View style={styles.conversationCopy}>
        <View style={styles.conversationTop}>
          <Text numberOfLines={1} style={styles.conversationName}>{conversation.peerDisplayName}</Text>
          <Text style={styles.conversationTime}>{formatConversationTime(conversation.updatedAt)}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text numberOfLines={1} style={styles.preview}>{preview}</Text>
          {latest?.direction === "outbound" ? <MaterialIcons name={latest.status === "delivered" ? "done-all" : "done"} size={16} color={latest.status === "delivered" ? palette.indigo : "#98A1B3"} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28, flexGrow: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  brandCopy: { gap: 1 },
  brand: { color: palette.ink, fontSize: 23, lineHeight: 28, fontWeight: "800", letterSpacing: -0.4 },
  username: { color: palette.muted, fontSize: 13, lineHeight: 17, fontWeight: "600" },
  compose: { width: 42, height: 42, borderRadius: 15, backgroundColor: palette.indigo, justifyContent: "center", alignItems: "center" },
  statusRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 17 },
  searchWrap: { height: 45, backgroundColor: "#ECEFF5", borderRadius: 14, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, gap: 8 },
  search: { flex: 1, height: "100%", color: palette.ink, fontSize: 16 },
  sectionLabel: { color: "#8B95A7", fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1.05, marginTop: 22, marginBottom: 8, marginLeft: 4 },
  conversation: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomColor: "#E9ECF4", borderBottomWidth: StyleSheet.hairlineWidth },
  guideAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" },
  conversationCopy: { flex: 1, gap: 5 },
  conversationTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  conversationName: { flex: 1, color: palette.ink, fontSize: 16, lineHeight: 21, fontWeight: "700" },
  conversationTime: { color: "#8B95A7", fontSize: 12, lineHeight: 16, fontWeight: "600" },
  previewRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  preview: { flex: 1, color: palette.muted, fontSize: 14, lineHeight: 19 },
  empty: { alignItems: "center", paddingTop: 54, paddingHorizontal: 36 },
  emptyTitle: { color: palette.ink, fontSize: 18, lineHeight: 24, fontWeight: "800" },
  emptyText: { color: palette.muted, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 6 },
  pressed: { opacity: 0.68 },
});
