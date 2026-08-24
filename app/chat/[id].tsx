import { MaterialIcons } from "@expo/vector-icons";
import { Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar, MeshlineMark, palette, StatusPill } from "@/components/meshline-ui";
import { ScreenContainer } from "@/components/screen-container";
import { formatMessageTime, isLocalChannelOwner, isLocalGroupOwner, Message, resolveGroupPermissions } from "@/lib/meshline";
import { useMeshline } from "@/lib/meshline-context";
import { haptic } from "@/lib/haptics";
import { useColors } from "@/hooks/use-colors";
import { describeOutgoingMessageState } from "@/lib/delivery-status";

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { identity, state, deleteMessage, markConversationRead, saveMessage, sendMessage, toggleConversationPin } = useMeshline();
  const colors = useColors();
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const conversation = state.conversations.find((item) => item.id === id);
  const messages = useMemo(() => state.messages[id] ?? [], [id, state.messages]);

  useEffect(() => { requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true })); void markConversationRead(id); }, [id, markConversationRead, messages.length]);

  if (!conversation) {
    return <ScreenContainer className="items-center justify-center"><Text style={[styles.missing, { color: colors.text }]}>This conversation is not available.</Text><Pressable onPress={() => router.back()} style={styles.returnButton}><Text style={styles.returnText}>Return to chats</Text></Pressable></ScreenContainer>;
  }

  const isChannel = conversation.kind === "channel";
  const isGroup = conversation.kind === "group";
  const isChannelOwner = isLocalChannelOwner(conversation, identity);
  const isGroupOwner = isLocalGroupOwner(conversation, identity);
  const groupPermissions = resolveGroupPermissions(conversation);
  const isCurrentSpaceMember = !conversation.kind || Boolean(identity && conversation.memberUsernames?.includes(identity.username));
  const canPost = isCurrentSpaceMember && (isChannel ? isChannelOwner : isGroup ? isGroupOwner || groupPermissions.membersCanPost : true);
  const canSend = Boolean(draft.trim());
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
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", android: "height" })} keyboardVerticalOffset={0}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-back" size={22} color={colors.text} /></Pressable>
          {conversation.isSavedMessages ? <View style={styles.savedMark}><MaterialIcons name="bookmark" size={20} color="#FFFFFF" /></View> : conversation.isGuide ? <View style={styles.guideMark}><MeshlineMark size={27} /></View> : isGroup ? <View style={styles.spaceMark}><MaterialIcons name="group" size={22} color={palette.indigo} /></View> : isChannel ? <View style={styles.spaceMark}><MaterialIcons name="campaign" size={22} color={palette.indigo} /></View> : <Avatar label={conversation.peerDisplayName} size={38} tone="emerald" />}
          <View style={styles.headerCopy}><Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{conversation.peerDisplayName}</Text><Text numberOfLines={1} style={[styles.handle, { color: colors.muted }]}>{conversation.isSavedMessages ? "Private notes on this device" : isGroup ? `${conversation.peerUsername} · ${memberCount || 1} member${memberCount === 1 ? "" : "s"}` : isChannel ? `${conversation.peerUsername} · ${memberCount || 1} subscriber${memberCount === 1 ? "" : "s"}` : conversation.peerUsername}</Text></View>
          <View style={styles.headerActions}>{(isChannel && isChannelOwner) || (isGroup && isGroupOwner) ? <Pressable onPress={() => router.push(`/space-members/${conversation.id}` as Href)} hitSlop={8} style={({ pressed }) => [styles.pinButton, pressed && styles.pressed]} accessibilityLabel={isChannel ? "Manage channel subscribers" : "Manage group members"}><MaterialIcons name="manage-accounts" size={18} color={palette.indigo} /></Pressable> : null}{isChannel && isChannelOwner ? <Pressable onPress={() => router.push({ pathname: "/channel-settings/[id]", params: { id: conversation.id } })} hitSlop={8} style={({ pressed }) => [styles.pinButton, pressed && styles.pressed]} accessibilityLabel="Edit channel settings"><MaterialIcons name="edit" size={18} color={palette.indigo} /></Pressable> : null}{isGroup && isGroupOwner ? <Pressable onPress={() => router.push(`/group-settings/${conversation.id}` as Href)} hitSlop={8} style={({ pressed }) => [styles.pinButton, pressed && styles.pressed]} accessibilityLabel="Edit group settings"><MaterialIcons name="edit" size={18} color={palette.indigo} /></Pressable> : null}<Pressable onPress={() => void toggleConversationPin(conversation.id)} hitSlop={8} style={({ pressed }) => [styles.pinButton, conversation.isPinned && styles.pinButtonActive, pressed && styles.pressed]} accessibilityLabel={conversation.isPinned ? "Unpin conversation" : "Pin conversation"}><MaterialIcons name="push-pin" size={18} color={conversation.isPinned ? "#FFFFFF" : palette.indigo} /></Pressable></View>
        </View>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(message) => message.id}
          contentContainerStyle={styles.messages}
          renderItem={({ item }) => <MessageBubble message={item} isGuide={Boolean(conversation.isGuide)} isSpace={isGroup || isChannel} onLongPress={() => item.direction !== "system" && setActionMessage(item)} />}
          ListHeaderComponent={<View style={[styles.notice, { backgroundColor: colors.surface }]}><MaterialIcons name={isChannel ? "campaign" : isGroup ? "group" : "info-outline"} size={16} color={colors.muted} /><Text style={[styles.noticeText, { color: colors.muted }]}>{isChannel ? `${conversation.description || "Text-only channel"}. Only the owner can post. Registered subscribers receive an experimental individually encrypted relay copy when they next open Meshline; this is not production group E2EE.` : isGroup ? `${conversation.description || "Text-only group"}. Registered members receive experimental individually encrypted relay copies when they next open Meshline; this is not production group E2EE.` : conversation.isSavedMessages ? "Only you can see Saved Messages. Use it for notes or save text from another chat." : conversation.isGuide ? "Meshline Guide is an information chat and cannot receive messages. To send a real text, open a contact whose device is registered with Meshline." : "Experimental encrypted relay delivery is enabled for direct chats. The recipient device must be registered with Meshline; delivery failures explain what needs attention. This proof is not production-audited end-to-end encryption."}</Text></View>}
        />
        {actionMessage ? <View style={[styles.actionTray, { backgroundColor: colors.surface, borderTopColor: colors.border }]}><View style={styles.actionTrayCopy}><Text numberOfLines={1} style={[styles.actionTrayText, { color: colors.muted }]}>{actionMessage.body}</Text></View>{!conversation.isSavedMessages ? <Pressable onPress={() => { void saveMessage(actionMessage.body); setActionMessage(null); haptic.success(); }} style={styles.actionButton}><MaterialIcons name="bookmark-border" size={18} color={palette.indigo} /><Text style={styles.actionText}>Save</Text></Pressable> : null}<Pressable onPress={() => { setReplyTo(actionMessage); setActionMessage(null); }} style={styles.actionButton}><MaterialIcons name="reply" size={18} color={palette.indigo} /><Text style={styles.actionText}>Reply</Text></Pressable><Pressable onPress={() => void copyMessage()} style={styles.actionButton}><MaterialIcons name="content-copy" size={18} color={palette.indigo} /><Text style={styles.actionText}>Copy</Text></Pressable><Pressable onPress={() => { void deleteMessage(conversation.id, actionMessage.id); setActionMessage(null); haptic.warning(); }} style={styles.actionButton}><MaterialIcons name="delete-outline" size={19} color={palette.coral} /><Text style={[styles.actionText, { color: palette.coral }]}>Delete</Text></Pressable><Pressable onPress={() => setActionMessage(null)} hitSlop={8}><MaterialIcons name="close" size={20} color={colors.muted} /></Pressable></View> : null}
        <View style={[styles.composerWrap, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {replyTo ? <View style={styles.replyBar}><View style={styles.replyLine} /><View style={styles.replyCopy}><Text style={styles.replyLabel}>Replying to</Text><Text numberOfLines={1} style={styles.replyText}>{replyTo.body}</Text></View><Pressable onPress={() => setReplyTo(null)} hitSlop={8}><MaterialIcons name="close" size={18} color={palette.muted} /></Pressable></View> : null}
          {canPost && !conversation.isGuide ? <View style={[styles.composer, { backgroundColor: colors.background, borderColor: colors.border }]}><TextInput value={draft} onChangeText={setDraft} placeholder={isChannel ? "Publish an update" : conversation.isSavedMessages ? "Write a note" : "Write a message"} placeholderTextColor={colors.muted} style={[styles.composerInput, { color: colors.text }]} multiline maxLength={2000} returnKeyType="default" /><Pressable onPress={send} disabled={!canSend} accessibilityLabel="Send message" accessibilityState={{ disabled: !canSend }} style={({ pressed }) => [styles.send, { backgroundColor: colors.tint }, !canSend && styles.sendDisabled, pressed && canSend && styles.pressed]}><MaterialIcons name="arrow-upward" size={23} color={canSend ? "#FFFFFF" : colors.muted} /></Pressable></View> : <View style={[styles.readOnlyComposer, { backgroundColor: colors.background, borderColor: colors.border }]}><MaterialIcons name={conversation.isGuide ? "info-outline" : !isCurrentSpaceMember ? "person-remove" : isChannel ? "campaign" : "lock-outline"} size={19} color={colors.muted} /><Text style={[styles.readOnlyText, { color: colors.muted }]}>{conversation.isGuide ? "Meshline Guide is read-only" : !isCurrentSpaceMember ? "You are no longer a member of this space" : isChannel ? "Only the channel owner can post" : "Only group owners can post"}</Text></View>}
          <Text style={[styles.composerNote, { color: colors.muted }]}>{isChannel ? "Owner broadcast · Text only" : "Text only · No media in this MVP"}</Text>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function MessageBubble({ message, isGuide, isSpace, onLongPress }: { message: Message; isGuide: boolean; isSpace: boolean; onLongPress: () => void }) {
  const colors = useColors();
  if (message.direction === "system") {
    return <View style={[styles.system, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.systemText, { color: colors.muted }]}>{message.body}</Text></View>;
  }
  const outbound = message.direction === "outbound";
  return (
    <Pressable onLongPress={onLongPress} delayLongPress={260} style={[styles.messageWrap, outbound ? styles.outboundWrap : styles.inboundWrap]}>
      <View style={[styles.bubble, outbound ? styles.outboundBubble : [styles.inboundBubble, { backgroundColor: colors.surface, borderColor: colors.border }]]}>
        {message.replyTo ? <View style={[styles.replyPreview, outbound ? styles.outboundReplyPreview : [styles.inboundReplyPreview, { backgroundColor: colors.background }]]}><Text numberOfLines={1} style={[styles.replyPreviewText, outbound ? styles.outboundReplyText : [styles.inboundReplyText, { color: colors.muted }]]}>{message.replyTo.body}</Text></View> : null}
        {!outbound && isSpace && message.senderUsername ? <Text style={[styles.groupSender, { color: colors.tint }]}>{message.senderUsername}</Text> : null}
        <Text style={[styles.messageBody, outbound ? styles.outboundText : [styles.inboundText, { color: colors.text }]]}>{message.body}</Text>
        <View style={styles.messageMeta}>{outbound && ["sending", "queued", "failed"].includes(message.status) ? <Text style={message.status === "failed" ? styles.failedMeta : styles.queuedMeta}>{isGuide ? "Guide only" : describeOutgoingMessageState(message.status, message.failureDetail)}</Text> : null}<Text style={[styles.messageTime, outbound ? styles.outboundMeta : styles.inboundMeta]}>{formatMessageTime(message.createdAt)}</Text>{outbound ? <MaterialIcons name={message.status === "delivered" ? "done-all" : message.status === "failed" ? "error-outline" : "schedule"} size={14} color={message.status === "failed" ? "#FFD3D8" : message.status === "delivered" ? "#DDE3FF" : "#CDD5FF"} /> : null}</View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { minHeight: 68, backgroundColor: "#FFFFFF", borderBottomColor: palette.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10 },
  back: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  guideMark: { width: 38, height: 38, borderRadius: 13, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" }, savedMark: { width: 38, height: 38, borderRadius: 13, backgroundColor: palette.indigo, alignItems: "center", justifyContent: "center" },
  spaceMark: { width: 38, height: 38, borderRadius: 13, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, gap: 0 },
  name: { color: palette.ink, fontSize: 16, lineHeight: 21, fontWeight: "800", letterSpacing: -0.15 },
  handle: { color: palette.muted, fontSize: 12, lineHeight: 16 },
  headerActions: { flexDirection: "row", gap: 6 },
  pinButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" },
  pinButtonActive: { backgroundColor: palette.indigo },
  messages: { paddingHorizontal: 15, paddingTop: 16, paddingBottom: 24, flexGrow: 1 },
  notice: { flexDirection: "row", gap: 8, padding: 12, backgroundColor: "#EEF0F6", borderRadius: 15, marginBottom: 20, alignItems: "flex-start" },
  noticeText: { color: "#687387", fontSize: 12, lineHeight: 17, flex: 1 },
  messageWrap: { marginBottom: 8, flexDirection: "row" },
  outboundWrap: { justifyContent: "flex-end" },
  inboundWrap: { justifyContent: "flex-start" },
  bubble: { maxWidth: "81%", borderRadius: 19, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 8 },
  outboundBubble: { backgroundColor: palette.indigo, borderBottomRightRadius: 6 },
  inboundBubble: { borderWidth: 1, borderBottomLeftRadius: 5 },
  messageBody: { fontSize: 15, lineHeight: 21 },
  outboundText: { color: "#FFFFFF" },
  inboundText: {},
  groupSender: { fontSize: 11, lineHeight: 15, fontWeight: "800", marginBottom: 3 },
  replyPreview: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 7 },
  outboundReplyPreview: { backgroundColor: "#5B6FEF" },
  inboundReplyPreview: {},
  replyPreviewText: { fontSize: 11, lineHeight: 15 },
  outboundReplyText: { color: "#E6E9FF" },
  inboundReplyText: {},
  messageMeta: { flexDirection: "row", gap: 4, justifyContent: "flex-end", alignItems: "center", marginTop: 3 },
  messageTime: { fontSize: 10, lineHeight: 14 },
  outboundMeta: { color: "#DDE3FF" },
  failedMeta: { color: "#FFD3D8", fontSize: 10, lineHeight: 14, fontWeight: "800" },
  queuedMeta: { color: "#DDE3FF", fontSize: 10, lineHeight: 14, fontWeight: "800" },
  inboundMeta: { color: "#98A1B3" },
  system: { alignSelf: "center", maxWidth: "88%", backgroundColor: "#EDF0F6", paddingHorizontal: 13, paddingVertical: 9, borderRadius: 13, marginBottom: 13 },
  systemText: { color: "#667085", fontSize: 12, lineHeight: 17, textAlign: "center" },
  actionTray: { minHeight: 62, paddingHorizontal: 14, gap: 11, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderTopColor: palette.line, borderTopWidth: StyleSheet.hairlineWidth },
  actionTrayCopy: { flex: 1, minWidth: 0 },
  actionTrayText: { color: palette.muted, fontSize: 12, lineHeight: 16 },
  actionButton: { alignItems: "center", gap: 2 },
  actionText: { color: palette.indigo, fontSize: 10, lineHeight: 13, fontWeight: "700" },
  composerWrap: { paddingHorizontal: 14, paddingTop: 11, paddingBottom: 5, backgroundColor: "#FFFFFF", borderTopColor: palette.line, borderTopWidth: StyleSheet.hairlineWidth },
  replyBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 7, paddingBottom: 9, gap: 9 },
  replyLine: { width: 3, height: 30, borderRadius: 2, backgroundColor: palette.indigo },
  replyCopy: { flex: 1 },
  replyLabel: { color: palette.indigo, fontSize: 10, lineHeight: 13, fontWeight: "800" },
  replyText: { color: palette.muted, fontSize: 12, lineHeight: 16 },
  composer: { minHeight: 64, maxHeight: 136, borderRadius: 20, backgroundColor: palette.navyDeep, borderWidth: 1, flexDirection: "row", alignItems: "flex-end", paddingLeft: 17, paddingRight: 6, paddingVertical: 6 },
  readOnlyComposer: { minHeight: 60, borderRadius: 20, backgroundColor: palette.navyDeep, borderWidth: 1, flexDirection: "row", gap: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  readOnlyText: { color: palette.muted, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  composerInput: { flex: 1, minHeight: 48, maxHeight: 104, color: palette.ink, fontSize: 17, lineHeight: 23, paddingTop: 12, paddingBottom: 8 },
  send: { width: 52, height: 52, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: palette.indigo, marginLeft: 7, shadowColor: palette.navyDeep, shadowOpacity: 0.32, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  sendDisabled: { backgroundColor: "#14304B", borderColor: "#315B82", borderWidth: 1 },
  composerNote: { textAlign: "center", fontSize: 11, lineHeight: 15, marginTop: 6, fontWeight: "600" },
  missing: { color: palette.ink, fontSize: 16, fontWeight: "700" },
  returnButton: { marginTop: 14, backgroundColor: palette.indigoSoft, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 },
  returnText: { color: palette.indigo, fontWeight: "800" },
  pressed: { opacity: 0.7 },
});
