import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar, MeshlineMark, palette, StatusPill } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";
import { formatMessageTime, Message } from "@/lib/meshline";
import { useMeshline } from "@/lib/meshline-context";
import { haptic } from "@/lib/haptics";

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { identity, state, deleteMessage, sendMessage, toggleConversationPin } = useMeshline();
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const conversation = state.conversations.find((item) => item.id === id);
  const messages = useMemo(() => state.messages[id] ?? [], [id, state.messages]);

  useEffect(() => { requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true })); }, [messages.length]);

  if (!conversation) {
    return <ScreenContainer className="items-center justify-center bg-[#F6F7FB]"><Text style={styles.missing}>This conversation is not available.</Text><Pressable onPress={() => router.back()} style={styles.returnButton}><Text style={styles.returnText}>Return to chats</Text></Pressable></ScreenContainer>;
  }

  const isChannel = conversation.kind === "channel";
  const isGroup = conversation.kind === "group";
  // Device identity remains stable when a user changes their local @username.
  // Legacy local channels lack this field, so they remain writable on the creating device.
  const canPost = !isChannel || !conversation.createdByDeviceId || conversation.createdByDeviceId === identity?.deviceId;
  const memberCount = conversation.memberUsernames?.length ?? 0;

  const send = async () => {
    if (!canPost) return;
    if (!draft.trim()) return;
    const text = draft;
    setDraft("");
    haptic.light();
    await sendMessage(conversation.id, text, replyTo ? { id: replyTo.id, body: replyTo.body } : undefined);
    setReplyTo(null);
  };

  const copyMessage = async () => {
    if (!actionMessage) return;
    try {
      await Clipboard.setStringAsync(actionMessage.body);
      haptic.success();
      setActionMessage(null);
    } catch {
      haptic.warning();
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#F6F7FB]" className="bg-[#F6F7FB]">
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", default: undefined })} keyboardVerticalOffset={0}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-back" size={22} color={palette.ink} /></Pressable>
          {conversation.isGuide ? <View style={styles.guideMark}><MeshlineMark size={27} /></View> : isGroup ? <View style={styles.spaceMark}><MaterialIcons name="group" size={22} color={palette.indigo} /></View> : isChannel ? <View style={styles.spaceMark}><MaterialIcons name="campaign" size={22} color={palette.indigo} /></View> : <Avatar label={conversation.peerDisplayName} size={38} tone="emerald" />}
          <View style={styles.headerCopy}><Text style={styles.name}>{conversation.peerDisplayName}</Text><Text style={styles.handle}>{isGroup ? `${conversation.peerUsername} · ${memberCount || 1} member${memberCount === 1 ? "" : "s"}` : isChannel ? `${conversation.peerUsername} · ${memberCount || 1} subscriber${memberCount === 1 ? "" : "s"}` : conversation.peerUsername}</Text></View>
          <Pressable onPress={() => void toggleConversationPin(conversation.id)} hitSlop={8} style={({ pressed }) => [styles.pinButton, conversation.isPinned && styles.pinButtonActive, pressed && styles.pressed]} accessibilityLabel={conversation.isPinned ? "Unpin conversation" : "Pin conversation"}><MaterialIcons name="push-pin" size={18} color={conversation.isPinned ? "#FFFFFF" : palette.indigo} /></Pressable>
        </View>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(message) => message.id}
          contentContainerStyle={styles.messages}
          renderItem={({ item }) => <MessageBubble message={item} onLongPress={() => item.direction !== "system" && setActionMessage(item)} />}
          ListHeaderComponent={<View style={styles.notice}><MaterialIcons name={isChannel ? "campaign" : isGroup ? "group" : "info-outline"} size={16} color="#75809A" /><Text style={styles.noticeText}>{isChannel ? `${conversation.description || "Local channel"}. Only the creator can post in this local-first channel; encrypted broadcast relays are a future protocol milestone.` : isGroup ? `${conversation.description || "Local group"}. Member identity and encrypted group delivery will be handled by the future network protocol.` : "The messaging interface is working locally. Network transport and end-to-end encryption are protocol milestones, not active in this mobile prototype."}</Text></View>}
        />
        {actionMessage ? <View style={styles.actionTray}><View style={styles.actionTrayCopy}><Text numberOfLines={1} style={styles.actionTrayText}>{actionMessage.body}</Text></View><Pressable onPress={() => { setReplyTo(actionMessage); setActionMessage(null); }} style={styles.actionButton}><MaterialIcons name="reply" size={18} color={palette.indigo} /><Text style={styles.actionText}>Reply</Text></Pressable><Pressable onPress={() => void copyMessage()} style={styles.actionButton}><MaterialIcons name="content-copy" size={18} color={palette.indigo} /><Text style={styles.actionText}>Copy</Text></Pressable><Pressable onPress={() => { void deleteMessage(conversation.id, actionMessage.id); setActionMessage(null); haptic.warning(); }} style={styles.actionButton}><MaterialIcons name="delete-outline" size={19} color={palette.coral} /><Text style={[styles.actionText, { color: palette.coral }]}>Delete</Text></Pressable><Pressable onPress={() => setActionMessage(null)} hitSlop={8}><MaterialIcons name="close" size={20} color={palette.muted} /></Pressable></View> : null}
        <View style={styles.composerWrap}>
          {replyTo ? <View style={styles.replyBar}><View style={styles.replyLine} /><View style={styles.replyCopy}><Text style={styles.replyLabel}>Replying to</Text><Text numberOfLines={1} style={styles.replyText}>{replyTo.body}</Text></View><Pressable onPress={() => setReplyTo(null)} hitSlop={8}><MaterialIcons name="close" size={18} color={palette.muted} /></Pressable></View> : null}
          {canPost ? <View style={styles.composer}><TextInput value={draft} onChangeText={setDraft} placeholder={isChannel ? "Publish an update" : "Write a message"} placeholderTextColor="#9099AA" style={styles.composerInput} multiline maxLength={2000} returnKeyType="default" /><Pressable onPress={send} disabled={!draft.trim()} style={({ pressed }) => [styles.send, !draft.trim() && styles.sendDisabled, pressed && draft.trim() && styles.pressed]}><MaterialIcons name="arrow-upward" size={20} color="#FFFFFF" /></Pressable></View> : <View style={styles.readOnlyComposer}><MaterialIcons name="campaign" size={18} color={palette.muted} /><Text style={styles.readOnlyText}>Only the channel owner can post</Text></View>}
          <Text style={styles.composerNote}>{isChannel ? "Owner broadcast · Text only" : "Text only · No media in this MVP"}</Text>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function MessageBubble({ message, onLongPress }: { message: Message; onLongPress: () => void }) {
  if (message.direction === "system") {
    return <View style={styles.system}><Text style={styles.systemText}>{message.body}</Text></View>;
  }
  const outbound = message.direction === "outbound";
  return (
    <Pressable onLongPress={onLongPress} delayLongPress={260} style={[styles.messageWrap, outbound ? styles.outboundWrap : styles.inboundWrap]}>
      <View style={[styles.bubble, outbound ? styles.outboundBubble : styles.inboundBubble]}>
        {message.replyTo ? <View style={[styles.replyPreview, outbound ? styles.outboundReplyPreview : styles.inboundReplyPreview]}><Text numberOfLines={1} style={[styles.replyPreviewText, outbound ? styles.outboundReplyText : styles.inboundReplyText]}>{message.replyTo.body}</Text></View> : null}
        <Text style={[styles.messageBody, outbound ? styles.outboundText : styles.inboundText]}>{message.body}</Text>
        <View style={styles.messageMeta}><Text style={[styles.messageTime, outbound ? styles.outboundMeta : styles.inboundMeta]}>{formatMessageTime(message.createdAt)}</Text>{outbound ? <MaterialIcons name={message.status === "delivered" ? "done-all" : "schedule"} size={14} color={message.status === "delivered" ? "#DDE3FF" : "#CDD5FF"} /> : null}</View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { minHeight: 64, backgroundColor: "#FFFFFF", borderBottomColor: palette.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 9 },
  back: { width: 37, height: 37, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  guideMark: { width: 38, height: 38, borderRadius: 13, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" },
  spaceMark: { width: 38, height: 38, borderRadius: 13, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, gap: 0 },
  name: { color: palette.ink, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  handle: { color: palette.muted, fontSize: 12, lineHeight: 16 },
  pinButton: { width: 37, height: 37, borderRadius: 12, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" },
  pinButtonActive: { backgroundColor: palette.indigo },
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
  replyPreview: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 7 },
  outboundReplyPreview: { backgroundColor: "#5B6FEF" },
  inboundReplyPreview: { backgroundColor: "#EEF0F5" },
  replyPreviewText: { fontSize: 11, lineHeight: 15 },
  outboundReplyText: { color: "#E6E9FF" },
  inboundReplyText: { color: "#687387" },
  messageMeta: { flexDirection: "row", gap: 4, justifyContent: "flex-end", alignItems: "center", marginTop: 3 },
  messageTime: { fontSize: 10, lineHeight: 14 },
  outboundMeta: { color: "#DDE3FF" },
  inboundMeta: { color: "#98A1B3" },
  system: { alignSelf: "center", maxWidth: "88%", backgroundColor: "#EDF0F6", paddingHorizontal: 13, paddingVertical: 9, borderRadius: 13, marginBottom: 13 },
  systemText: { color: "#667085", fontSize: 12, lineHeight: 17, textAlign: "center" },
  actionTray: { minHeight: 58, paddingHorizontal: 14, gap: 10, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderTopColor: palette.line, borderTopWidth: StyleSheet.hairlineWidth },
  actionTrayCopy: { flex: 1, minWidth: 0 },
  actionTrayText: { color: palette.muted, fontSize: 12, lineHeight: 16 },
  actionButton: { alignItems: "center", gap: 2 },
  actionText: { color: palette.indigo, fontSize: 10, lineHeight: 13, fontWeight: "700" },
  composerWrap: { paddingHorizontal: 13, paddingTop: 10, paddingBottom: 4, backgroundColor: "#FFFFFF", borderTopColor: palette.line, borderTopWidth: StyleSheet.hairlineWidth },
  replyBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 7, paddingBottom: 9, gap: 9 },
  replyLine: { width: 3, height: 30, borderRadius: 2, backgroundColor: palette.indigo },
  replyCopy: { flex: 1 },
  replyLabel: { color: palette.indigo, fontSize: 10, lineHeight: 13, fontWeight: "800" },
  replyText: { color: palette.muted, fontSize: 12, lineHeight: 16 },
  composer: { minHeight: 48, maxHeight: 120, borderRadius: 17, backgroundColor: "#F0F2F7", flexDirection: "row", alignItems: "flex-end", paddingLeft: 14, paddingRight: 5, paddingVertical: 5 },
  readOnlyComposer: { minHeight: 48, borderRadius: 17, backgroundColor: "#F0F2F7", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  readOnlyText: { color: palette.muted, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  composerInput: { flex: 1, minHeight: 38, maxHeight: 96, color: palette.ink, fontSize: 16, lineHeight: 21, paddingTop: 9, paddingBottom: 6 },
  send: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: palette.indigo, marginLeft: 5 },
  sendDisabled: { backgroundColor: "#BFC6D6" },
  composerNote: { color: "#98A1B3", textAlign: "center", fontSize: 10, lineHeight: 14, marginTop: 5 },
  missing: { color: palette.ink, fontSize: 16, fontWeight: "700" },
  returnButton: { marginTop: 14, backgroundColor: palette.indigoSoft, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 },
  returnText: { color: palette.indigo, fontWeight: "800" },
  pressed: { opacity: 0.7 },
});
