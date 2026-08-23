import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { MeshlineConnectionBanner } from "@/components/meshline-connection-banner";
import { Avatar, MeshlineMark, palette } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";
import { findGlobalMessageResults, findGlobalPeopleResults, GlobalMessageResult, GlobalPeopleResult } from "@/lib/global-search";
import { formatConversationTime, Message } from "@/lib/meshline";
import { useMeshline } from "@/lib/meshline-context";
import { useColors } from "@/hooks/use-colors";

export default function ChatsScreen() {
  const router = useRouter();
  const { ready, identity, isAuthenticated, startConversation, state } = useMeshline();
  const colors = useColors();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (ready && (!identity || !isAuthenticated)) router.replace("/welcome");
    if (ready && identity && isAuthenticated && !identity.recoveryAcknowledged) router.replace("/recovery");
  }, [identity, isAuthenticated, ready, router]);

  const filteredConversations = useMemo(() => state.conversations
    .filter((conversation) => `${conversation.peerDisplayName} ${conversation.peerUsername}`.toLowerCase().includes(query.toLowerCase()))
    .sort((left, right) => Number(Boolean(right.isSavedMessages)) - Number(Boolean(left.isSavedMessages)) || Number(Boolean(right.isPinned)) - Number(Boolean(left.isPinned)) || new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()), [query, state.conversations]);
  const globalPeopleResults = useMemo(() => findGlobalPeopleResults(state.conversations, state.contacts, query), [query, state.contacts, state.conversations]);
  const globalMessageResults = useMemo(() => findGlobalMessageResults(state.conversations, state.messages, query), [query, state.conversations, state.messages]);
  const hasSearchQuery = Boolean(query.trim());
  const openPeopleResult = async (result: GlobalPeopleResult) => {
    const conversationId = result.kind === "conversation" ? result.conversation.id : await startConversation(result.contact.username);
    router.push({ pathname: "/chat/[id]", params: { id: conversationId } });
  };

  if (!ready || !identity || !isAuthenticated) {
    return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={palette.indigo} /></ScreenContainer>;
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={styles.connectionWrap}>
        <MeshlineConnectionBanner />
      </View>
      <FlatList
        data={hasSearchQuery ? [] : filteredConversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <MeshlineMark size={38} />
                <View style={styles.brandCopy}>
                  <Text style={[styles.brand, { color: colors.text }]}>{identity.displayName}</Text>
                  <Text style={[styles.username, { color: colors.muted }]}>{identity.username}</Text>
                </View>
              </View>
              <Pressable onPress={() => router.push("/new-space")} style={({ pressed }) => [styles.compose, pressed && styles.pressed]} accessibilityLabel="Create a chat, group, or channel">
                <MaterialIcons name="edit" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
            <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
              <MaterialIcons name="search" size={20} color={colors.muted} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search chats, @usernames, messages" placeholderTextColor={colors.muted} style={[styles.search, { color: colors.text }]} returnKeyType="search" />
            </View>
            {hasSearchQuery ? <>
              <Text style={[styles.searchHint, { color: colors.muted }]}>Searches chats, saved contacts, and message text on this device.</Text>
              {globalPeopleResults.length ? <><Text style={[styles.sectionLabel, { color: colors.muted }]}>CHATS & PEOPLE</Text>{globalPeopleResults.map((result) => <GlobalPeopleRow key={result.kind === "conversation" ? `chat-${result.conversation.id}` : `contact-${result.contact.id}`} result={result} onPress={() => void openPeopleResult(result)} />)}</> : null}
              {globalMessageResults.length ? <><Text style={[styles.sectionLabel, { color: colors.muted }]}>MESSAGES</Text>{globalMessageResults.map((result) => <GlobalMessageRow key={result.message.id} result={result} onPress={() => router.push({ pathname: "/chat/[id]", params: { id: result.conversation.id } })} />)}</> : null}
            </> : <Text style={[styles.sectionLabel, { color: colors.muted }]}>MESSAGES</Text>}
          </>
        }
        renderItem={({ item }) => {
          const latest = state.messages[item.id]?.at(-1);
          return <ConversationRow conversation={item} latest={latest} onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.id } })} />;
        }}
        ListEmptyComponent={hasSearchQuery ? (globalPeopleResults.length || globalMessageResults.length ? null : <View style={styles.empty}><Text style={[styles.emptyTitle, { color: colors.text }]}>No results found</Text><Text style={[styles.emptyText, { color: colors.muted }]}>Try another name, @username, or word from a message.</Text></View>) : <View style={styles.empty}><Text style={[styles.emptyTitle, { color: colors.text }]}>No chats found</Text><Text style={[styles.emptyText, { color: colors.muted }]}>Try a different username or start a new chat.</Text></View>}
      />
    </ScreenContainer>
  );
}

function GlobalPeopleRow({ result, onPress }: { result: GlobalPeopleResult; onPress: () => void }) {
  const colors = useColors();
  const label = result.kind === "conversation" ? result.conversation.peerDisplayName : result.contact.displayName;
  const username = result.kind === "conversation" ? result.conversation.peerUsername : result.contact.username;
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.globalRow, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}><Avatar label={label} size={38} tone="emerald" /><View style={styles.globalCopy}><Text numberOfLines={1} style={[styles.globalTitle, { color: colors.text }]}>{label}</Text><Text numberOfLines={1} style={[styles.globalSubtitle, { color: colors.muted }]}>{username}</Text></View><MaterialIcons name="chevron-right" size={20} color={colors.muted} /></Pressable>;
}

function GlobalMessageRow({ result, onPress }: { result: GlobalMessageResult; onPress: () => void }) {
  const colors = useColors();
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.globalRow, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}><View style={styles.messageSearchIcon}><MaterialIcons name="chat-bubble-outline" size={18} color={palette.indigo} /></View><View style={styles.globalCopy}><Text numberOfLines={1} style={[styles.globalTitle, { color: colors.text }]}>{result.conversation.peerDisplayName} <Text style={[styles.globalHandle, { color: colors.muted }]}>{result.conversation.peerUsername}</Text></Text><Text numberOfLines={2} style={[styles.globalSubtitle, { color: colors.muted }]}>{result.message.body}</Text></View><Text style={[styles.globalTime, { color: colors.muted }]}>{formatConversationTime(result.message.createdAt)}</Text></Pressable>;
}

function ConversationRow({ conversation, latest, onPress }: { conversation: { peerDisplayName: string; peerUsername: string; updatedAt: string; kind?: "direct" | "group" | "channel"; isGuide?: boolean; isSavedMessages?: boolean; isPinned?: boolean }; latest?: Message; onPress: () => void }) {
  const colors = useColors();
  const preview = latest?.body ?? "No messages yet";
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.conversation, { borderBottomColor: colors.border }, pressed && styles.pressed]}>
      {conversation.isSavedMessages ? <View style={styles.savedAvatar}><MaterialIcons name="bookmark" size={24} color="#FFFFFF" /></View> : conversation.isGuide ? <View style={styles.guideAvatar}><MeshlineMark size={30} /></View> : conversation.kind === "group" ? <View style={styles.spaceAvatar}><MaterialIcons name="group" size={24} color={palette.indigo} /></View> : conversation.kind === "channel" ? <View style={styles.spaceAvatar}><MaterialIcons name="campaign" size={24} color={palette.indigo} /></View> : <Avatar label={conversation.peerDisplayName} size={48} tone="emerald" />}
      <View style={styles.conversationCopy}>
        <View style={styles.conversationTop}>
          <Text numberOfLines={1} style={[styles.conversationName, { color: colors.text }]}>{conversation.peerDisplayName}</Text>
          {conversation.isPinned ? <MaterialIcons name="push-pin" size={14} color={palette.indigo} /> : null}
          <Text style={[styles.conversationTime, { color: colors.muted }]}>{formatConversationTime(conversation.updatedAt)}</Text>
        </View>
        <View style={styles.previewRow}>
          {conversation.isSavedMessages ? <Text style={styles.spaceLabel}>PERSONAL</Text> : conversation.kind && conversation.kind !== "direct" ? <Text style={styles.spaceLabel}>{conversation.kind === "group" ? "GROUP" : "CHANNEL"}</Text> : null}<Text numberOfLines={1} style={[styles.preview, { color: colors.muted }]}>{preview}</Text>
          {latest?.direction === "outbound" ? <MaterialIcons name={latest.status === "delivered" ? "done-all" : "done"} size={16} color={latest.status === "delivered" ? palette.indigo : "#98A1B3"} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  connectionWrap: { paddingHorizontal: 18, paddingTop: 10 },
  content: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 28, flexGrow: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  brandCopy: { gap: 1 },
  brand: { color: palette.ink, fontSize: 23, lineHeight: 28, fontWeight: "800", letterSpacing: -0.4 },
  username: { color: palette.muted, fontSize: 13, lineHeight: 17, fontWeight: "600" },
  compose: { width: 42, height: 42, borderRadius: 15, backgroundColor: palette.indigo, justifyContent: "center", alignItems: "center" },
  searchWrap: { height: 45, backgroundColor: "#ECEFF5", borderRadius: 14, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, gap: 8 },
  search: { flex: 1, height: "100%", color: palette.ink, fontSize: 16 },
  searchHint: { fontSize: 12, lineHeight: 17, marginTop: 9, marginLeft: 3 },
  sectionLabel: { color: "#8B95A7", fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1.05, marginTop: 22, marginBottom: 8, marginLeft: 4 },
  globalRow: { minHeight: 62, borderRadius: 14, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 7 },
  globalCopy: { flex: 1, gap: 2 },
  globalTitle: { fontSize: 14, lineHeight: 19, fontWeight: "800" },
  globalSubtitle: { fontSize: 12, lineHeight: 17 },
  globalHandle: { fontWeight: "600" },
  globalTime: { fontSize: 11, lineHeight: 15, fontWeight: "600" },
  messageSearchIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" },
  conversation: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomColor: "#E9ECF4", borderBottomWidth: StyleSheet.hairlineWidth },
  guideAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" },
  spaceAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" }, savedAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: palette.indigo, alignItems: "center", justifyContent: "center" },
  conversationCopy: { flex: 1, gap: 5 },
  conversationTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  conversationName: { flex: 1, color: palette.ink, fontSize: 16, lineHeight: 21, fontWeight: "700" },
  conversationTime: { color: "#8B95A7", fontSize: 12, lineHeight: 16, fontWeight: "600" },
  previewRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  preview: { flex: 1, color: palette.muted, fontSize: 14, lineHeight: 19 },
  spaceLabel: { color: palette.indigo, fontSize: 9, lineHeight: 13, fontWeight: "800", letterSpacing: 0.55 },
  empty: { alignItems: "center", paddingTop: 54, paddingHorizontal: 36 },
  emptyTitle: { color: palette.ink, fontSize: 18, lineHeight: 24, fontWeight: "800" },
  emptyText: { color: palette.muted, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 6 },
  pressed: { opacity: 0.68 },
});
