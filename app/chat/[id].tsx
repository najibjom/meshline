import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar, MeshlineMark, palette, StatusPill } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";
import { formatMessageTime, Message } from "@/lib/meshline";
import { useMeshline } from "@/lib/meshline-context";
import { haptic } from "@/lib/haptics";

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, sendMessage } = useMeshline();
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<Message>>(null);
  const conversation = state.conversations.find((item) => item.id === id);
  const messages = useMemo(() => state.messages[id] ?? [], [id, state.messages]);

  useEffect(() => { requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true })); }, [messages.length]);

  if (!conversation) {
    return <ScreenContainer className="items-center justify-center bg-[#F6F7FB]"><Text style={styles.missing}>This conversation is not available.</Text><Pressable onPress={() => router.back()} style={styles.returnButton}><Text style={styles.returnText}>Return to chats</Text></Pressable></ScreenContainer>;
  }

  const send = async () => {
    if (!draft.trim()) return;
    const text = draft;
    setDraft("");
    haptic.light();
    await sendMessage(conversation.id, text);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#F6F7FB]" className="bg-[#F6F7FB]">
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", default: undefined })} keyboardVerticalOffset={0}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-back" size={22} color={palette.ink} /></Pressable>
          {conversation.isGuide ? <View style={styles.guideMark}><MeshlineMark size={27} /></View> : <Avatar label={conversation.peerDisplayName} size={38} tone="emerald" />}
          <View style={styles.headerCopy}><Text style={styles.name}>{conversation.peerDisplayName}</Text><Text style={styles.handle}>{conversation.peerUsername}</Text></View>
          <StatusPill icon="lock-outline" variant="success">Local</StatusPill>
        </View>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(message) => message.id}
          contentContainerStyle={styles.messages}
          renderItem={({ item }) => <MessageBubble message={item} />}
          ListHeaderComponent={<View style={styles.notice}><MaterialIcons name="info-outline" size={16} color="#75809A" /><Text style={styles.noticeText}>The messaging interface is working locally. Network transport and end-to-end encryption are protocol milestones, not active in this mobile prototype.</Text></View>}
        />
        <View style={styles.composerWrap}>
          <View style={styles.composer}><TextInput value={draft} onChangeText={setDraft} placeholder="Write a message" placeholderTextColor="#9099AA" style={styles.composerInput} multiline maxLength={2000} returnKeyType="default" /><Pressable onPress={send} disabled={!draft.trim()} style={({ pressed }) => [styles.send, !draft.trim() && styles.sendDisabled, pressed && draft.trim() && styles.pressed]}><MaterialIcons name="arrow-upward" size={20} color="#FFFFFF" /></Pressable></View>
          <Text style={styles.composerNote}>Text only · No media in this MVP</Text>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.direction === "system") {
    return <View style={styles.system}><Text style={styles.systemText}>{message.body}</Text></View>;
  }
  const outbound = message.direction === "outbound";
  return (
    <View style={[styles.messageWrap, outbound ? styles.outboundWrap : styles.inboundWrap]}>
      <View style={[styles.bubble, outbound ? styles.outboundBubble : styles.inboundBubble]}>
        <Text style={[styles.messageBody, outbound ? styles.outboundText : styles.inboundText]}>{message.body}</Text>
        <View style={styles.messageMeta}><Text style={[styles.messageTime, outbound ? styles.outboundMeta : styles.inboundMeta]}>{formatMessageTime(message.createdAt)}</Text>{outbound ? <MaterialIcons name={message.status === "delivered" ? "done-all" : "schedule"} size={14} color={message.status === "delivered" ? "#DDE3FF" : "#CDD5FF"} /> : null}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { minHeight: 64, backgroundColor: "#FFFFFF", borderBottomColor: palette.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 9 },
  back: { width: 37, height: 37, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  guideMark: { width: 38, height: 38, borderRadius: 13, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, gap: 0 },
  name: { color: palette.ink, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  handle: { color: palette.muted, fontSize: 12, lineHeight: 16 },
  messages: { padding: 15, paddingBottom: 22, flexGrow: 1 },
  notice: { flexDirection: "row", gap: 7, padding: 11, backgroundColor: "#EEF0F6", borderRadius: 13, marginBottom: 18, alignItems: "flex-start" },
  noticeText: { color: "#687387", fontSize: 12, lineHeight: 17, flex: 1 },
  messageWrap: { marginBottom: 8, flexDirection: "row" },
  outboundWrap: { justifyContent: "flex-end" },
  inboundWrap: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", borderRadius: 18, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 7 },
  outboundBubble: { backgroundColor: palette.indigo, borderBottomRightRadius: 5 },
  inboundBubble: { backgroundColor: "#FFFFFF", borderColor: palette.line, borderWidth: 1, borderBottomLeftRadius: 5 },
  messageBody: { fontSize: 15, lineHeight: 21 },
  outboundText: { color: "#FFFFFF" },
  inboundText: { color: palette.ink },
  messageMeta: { flexDirection: "row", gap: 4, justifyContent: "flex-end", alignItems: "center", marginTop: 3 },
  messageTime: { fontSize: 10, lineHeight: 14 },
  outboundMeta: { color: "#DDE3FF" },
  inboundMeta: { color: "#98A1B3" },
  system: { alignSelf: "center", maxWidth: "88%", backgroundColor: "#EDF0F6", paddingHorizontal: 13, paddingVertical: 9, borderRadius: 13, marginBottom: 13 },
  systemText: { color: "#667085", fontSize: 12, lineHeight: 17, textAlign: "center" },
  composerWrap: { paddingHorizontal: 13, paddingTop: 10, paddingBottom: 4, backgroundColor: "#FFFFFF", borderTopColor: palette.line, borderTopWidth: StyleSheet.hairlineWidth },
  composer: { minHeight: 48, maxHeight: 120, borderRadius: 17, backgroundColor: "#F0F2F7", flexDirection: "row", alignItems: "flex-end", paddingLeft: 14, paddingRight: 5, paddingVertical: 5 },
  composerInput: { flex: 1, minHeight: 38, maxHeight: 96, color: palette.ink, fontSize: 16, lineHeight: 21, paddingTop: 9, paddingBottom: 6 },
  send: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: palette.indigo, marginLeft: 5 },
  sendDisabled: { backgroundColor: "#BFC6D6" },
  composerNote: { color: "#98A1B3", textAlign: "center", fontSize: 10, lineHeight: 14, marginTop: 5 },
  missing: { color: palette.ink, fontSize: 16, fontWeight: "700" },
  returnButton: { marginTop: 14, backgroundColor: palette.indigoSoft, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 },
  returnText: { color: palette.indigo, fontWeight: "800" },
  pressed: { opacity: 0.7 },
});
