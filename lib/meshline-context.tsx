import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import { AppState, Platform } from "react-native";

import { acknowledgeRelayEnvelope, enqueueOpaqueEnvelope, lookupRelayDevice, readRelayInbox, registerRelayDevice } from "@/lib/relay-client";
import { decodeSpaceRelayPayload, encodeSpaceRelayPayload, encodeSpaceRelaySyncPayload } from "@/lib/space-relay-payload";
import { decryptTextFromDevice, encryptTextForDevice, getOrCreateTransportDeviceKey, transportFingerprint } from "@/lib/transport";
import { describeRelayDeliveryFailure } from "@/lib/delivery-status";

import {
  changeLocalUsername,
  clearLocalSession,
  Contact,
  Conversation,
  ConversationKind,
  deleteLocalMeshlineAccount,
  emptyMeshlineState,
  ensureSavedMessagesConversation,
  Identity,
  GroupPermissions,
  isValidDisplayName,
  isValidUsername,
  isLocalChannelOwner,
  isLocalGroupOwner,
  loadMeshlineState,
  loadLocalSession,
  makeIdentity,
  matchesIdentityUsername,
  Message,
  MeshlineState,
  NetworkSettings,
  normalizeDisplayName,
  normalizeUsername,
  observeTransportKey,
  persistMeshlineState,
  persistLocalSession,
  PrivacySettings,
  retainMessagesSince,
  verifyLocalIdentity,
} from "@/lib/meshline";

type ReplyReference = { id: string; body: string };

type MeshlineContextValue = {
  ready: boolean;
  isAuthenticated: boolean;
  appLocked: boolean;
  state: MeshlineState;
  identity: Identity | null;
  createIdentity: (displayName: string, username: string, password: string) => Promise<void>;
  loginIdentity: (username: string, password: string) => Promise<boolean>;
  updateDisplayName: (displayName: string) => Promise<void>;
  updateUsername: (username: string) => Promise<boolean>;
  updateProfileDescription: (description: string) => Promise<void>;
  acknowledgeRecovery: () => Promise<void>;
  startConversation: (username: string) => Promise<string>;
  createSpace: (kind: "group" | "channel", title: string, username: string, description: string, memberUsernames: string[]) => Promise<string>;
  updateChannelDetails: (conversationId: string, title: string, username: string, description: string) => Promise<boolean>;
  updateGroupDetails: (conversationId: string, title: string, username: string, description: string) => Promise<boolean>;
  updateSpaceMembers: (conversationId: string, memberUsernames: string[]) => Promise<boolean>;
  updateGroupPermissions: (conversationId: string, permissions: Partial<GroupPermissions>) => Promise<boolean>;
  saveContact: (displayName: string, username: string) => Promise<void>;
  saveContactAndStartConversation: (displayName: string, username: string) => Promise<string>;
  removeContact: (username: string) => Promise<void>;
  toggleConversationPin: (conversationId: string) => Promise<void>;
  markConversationRead: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, text: string, replyTo?: ReplyReference) => Promise<void>;
  saveMessage: (text: string) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  updateNetworkSettings: (settings: Partial<NetworkSettings>) => Promise<void>;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
  continueWithPassword: () => void;
  logout: () => void;
  deleteAccount: (username: string, password: string) => Promise<boolean>;
  validateDisplayName: (displayName: string) => boolean;
  validateUsername: (username: string) => boolean;
};

const MeshlineContext = createContext<MeshlineContextValue | null>(null);

export function MeshlineProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [appLocked, setAppLocked] = useState(false);
  const [state, setState] = useState<MeshlineState>(emptyMeshlineState);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    void Promise.all([loadMeshlineState(), loadLocalSession()]).then(([stored, hasSession]) => {
      setState(stored);
      setIsAuthenticated(Boolean(stored.identity && hasSession));
      setReady(true);
    });
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" && appState.current === "active" && isAuthenticated && state.privacySettings.biometricLockEnabled) setAppLocked(true);
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [isAuthenticated, state.privacySettings.biometricLockEnabled]);

  useEffect(() => {
    if (!ready || !isAuthenticated || !state.identity) return;
    let active = true;
    const identity = state.identity;

    const register = async () => {
      try {
        const transportKey = await getOrCreateTransportDeviceKey();
        if (active) await registerRelayDevice(identity.username, transportKey.publicKey);
      } catch (error) {
        console.warn("[Meshline relay proof] device registration unavailable", error);
      }
    };

    const pull = async () => {
      try {
        const [{ envelopes }, transportKey] = await Promise.all([readRelayInbox(identity.username), getOrCreateTransportDeviceKey()]);
        for (const envelope of envelopes) {
          try {
            const body = decryptTextFromDevice(envelope, transportKey.secretKey, envelope.senderPublicKey);
            const createdAt = envelope.createdAt;
            const spacePayload = decodeSpaceRelayPayload(body);
            if (spacePayload && !(spacePayload.space.memberUsernames ?? []).includes(identity.username)) throw new Error("Received a space envelope for a device outside its member list.");
            setState((current) => {
              const alreadyStored = Object.values(current.messages).flat().some((message) => message.transportEnvelopeId === envelope.id);
              if (alreadyStored) {
                void acknowledgeRelayEnvelope(identity.username, envelope.id).catch((error) => console.warn("[Meshline relay proof] acknowledgement retry failed", error));
                return current;
              }
              const observed = observeTransportKey(current, envelope.senderUsername, envelope.senderPublicKey, transportFingerprint(envelope.senderPublicKey), createdAt);
              const existingConversation = spacePayload
                ? observed.state.conversations.find((conversation) => conversation.id === spacePayload.space.id)
                : observed.state.conversations.find((conversation) => conversation.peerUsername === envelope.senderUsername);
              const canApplySpaceSnapshot = Boolean(spacePayload && envelope.senderUsername === spacePayload.space.createdBy && (!existingConversation || existingConversation.createdBy === spacePayload.space.createdBy));
              if (spacePayload && !existingConversation && !canApplySpaceSnapshot) throw new Error("Rejected a first-time space envelope that was not sent by its recorded owner.");
              if (spacePayload?.type === "meshline-space-sync" && !canApplySpaceSnapshot) throw new Error("Rejected a space settings update that was not sent by the recorded owner.");
              const incomingSpaceUpdatedAt = spacePayload?.type === "meshline-space-sync" ? spacePayload.updatedAt : spacePayload?.spaceUpdatedAt ?? createdAt;
              const isStaleSpaceSnapshot = Boolean(existingConversation && canApplySpaceSnapshot && Date.parse(incomingSpaceUpdatedAt) < Date.parse(existingConversation.spaceUpdatedAt ?? existingConversation.createdAt));
              if (spacePayload?.type === "meshline-space-sync" && isStaleSpaceSnapshot) {
                void acknowledgeRelayEnvelope(identity.username, envelope.id).catch((error) => console.warn("[Meshline relay proof] acknowledgement retry failed", error));
                return current;
              }
              const conversation = existingConversation ?? (spacePayload
                ? { ...spacePayload.space, createdAt, updatedAt: createdAt, spaceUpdatedAt: incomingSpaceUpdatedAt }
                : { id: Crypto.randomUUID(), peerUsername: envelope.senderUsername, peerDisplayName: envelope.senderUsername.slice(1), createdAt, updatedAt: createdAt });
              const message: Message = spacePayload?.type === "meshline-space-message"
                ? { id: spacePayload.message.id, conversationId: conversation.id, body: spacePayload.message.body, replyTo: spacePayload.message.replyTo, direction: "inbound", senderUsername: envelope.senderUsername, status: "delivered", createdAt: spacePayload.message.createdAt, transportEnvelopeId: envelope.id }
                : spacePayload
                  ? { id: `space-sync-${spacePayload.updatedAt}`, conversationId: conversation.id, body: `The owner synchronized ${conversation.kind === "channel" ? "channel" : "group"} details, members, or posting permissions.`, direction: "system", status: "local", createdAt: spacePayload.updatedAt, transportEnvelopeId: envelope.id }
                : { id: Crypto.randomUUID(), conversationId: conversation.id, body, direction: "inbound", senderUsername: envelope.senderUsername, status: "delivered", createdAt, transportEnvelopeId: envelope.id };
              const unreadCount = message.direction === "inbound" ? 1 : 0;
              const keyNotice: Message | null = observed.keyChanged ? {
                id: Crypto.randomUUID(),
                conversationId: conversation.id,
                body: "Security notice: this contact’s transport key changed. Compare the new fingerprint outside Meshline before sharing sensitive content. This experimental relay cannot verify identity automatically.",
                direction: "system",
                status: "local",
                createdAt,
              } : null;
              const next: MeshlineState = {
                ...observed.state,
                conversations: existingConversation ? observed.state.conversations.map((candidate) => candidate.id === conversation.id ? { ...candidate, ...(canApplySpaceSnapshot && !isStaleSpaceSnapshot ? { ...(spacePayload?.space ?? {}), spaceUpdatedAt: incomingSpaceUpdatedAt } : {}), updatedAt: createdAt, unreadCount: (candidate.unreadCount ?? 0) + unreadCount } : candidate) : [{ ...conversation, unreadCount }, ...observed.state.conversations],
                messages: { ...observed.state.messages, [conversation.id]: [...(observed.state.messages[conversation.id] ?? []), message, ...(keyNotice ? [keyNotice] : [])] },
              };
              void persistMeshlineState(next)
                .then(() => acknowledgeRelayEnvelope(identity.username, envelope.id))
                .catch((error) => console.warn("[Meshline relay proof] inbox persistence or acknowledgement failed", error));
              return next;
            });
          } catch (error) {
            console.warn("[Meshline relay proof] rejected unauthenticated envelope", error);
          }
        }
      } catch {
        // The relay proof is optional; local-first activity remains available offline.
      }
    };

    void register().then(pull);
    const interval = setInterval(() => { if (AppState.currentState === "active") void pull(); }, 3500);
    return () => { active = false; clearInterval(interval); };
  }, [isAuthenticated, ready, state.identity?.deviceId, state.identity?.username]);

  const commit = useCallback((recipe: (current: MeshlineState) => MeshlineState) => {
    setState((current) => {
      const next = recipe(current);
      void persistMeshlineState(next);
      return next;
    });
  }, []);

  const relaySpaceSnapshot = useCallback(async (space: Conversation, previousMemberUsernames: string[] = []) => {
    if (!state.identity) return { accepted: 0, total: 0 };
    const recipients = Array.from(new Set([...previousMemberUsernames, ...(space.memberUsernames ?? [])]))
      .filter((username) => username !== state.identity!.username);
    if (!recipients.length) return { accepted: 0, total: 0 };
    const transportKey = await getOrCreateTransportDeviceKey();
    const wirePayload = encodeSpaceRelaySyncPayload(space);
    const results = await Promise.allSettled(recipients.map(async (recipientUsername) => {
      const recipient = await lookupRelayDevice(recipientUsername);
      const encrypted = encryptTextForDevice(wirePayload, transportKey.secretKey, recipient.publicKey);
      return enqueueOpaqueEnvelope({ recipientUsername, senderUsername: state.identity!.username, senderPublicKey: transportKey.publicKey, ...encrypted });
    }));
    return { accepted: results.filter((result) => result.status === "fulfilled").length, total: recipients.length };
  }, [state.identity]);

  const recordSpaceSyncResult = useCallback((conversationId: string, result: { accepted: number; total: number }) => {
    if (!result.total) return;
    const createdAt = new Date().toISOString();
    const body = result.accepted === result.total
      ? `Space settings were queued for ${result.accepted} registered member${result.accepted === 1 ? "" : "s"}.`
      : `Space settings were queued for ${result.accepted} of ${result.total} registered members. Members without a registered device will receive the latest settings after a later owner update.`;
    commit((current) => ({ ...current, messages: { ...current.messages, [conversationId]: [...(current.messages[conversationId] ?? []), { id: Crypto.randomUUID(), conversationId, body, direction: "system", status: "local", createdAt }] } }));
  }, [commit]);

  const createIdentity = useCallback(async (displayName: string, username: string, password: string) => {
    const next = ensureSavedMessagesConversation(await makeIdentity(displayName, username, password));
    setState(next);
    setIsAuthenticated(true);
    await Promise.all([persistMeshlineState(next), persistLocalSession()]);
  }, []);

  const loginIdentity = useCallback(async (username: string, password: string) => {
    if (!state.identity || !matchesIdentityUsername(state.identity.username, username)) return false;
    const accepted = await verifyLocalIdentity(username, password);
    if (accepted) {
      setIsAuthenticated(true);
      await persistLocalSession();
    }
    return accepted;
  }, [state.identity]);

  const acknowledgeRecovery = useCallback(async () => {
    commit((current) => ({ ...current, identity: current.identity ? { ...current.identity, recoveryAcknowledged: true } : null }));
  }, [commit]);

  const updateDisplayName = useCallback(async (displayName: string) => {
    const normalized = normalizeDisplayName(displayName);
    commit((current) => ({ ...current, identity: current.identity ? { ...current.identity, displayName: normalized } : null }));
  }, [commit]);

  const updateUsername = useCallback(async (usernameInput: string) => {
    const nextUsername = normalizeUsername(usernameInput);
    if (!state.identity || !isValidUsername(nextUsername)) return false;
    const changed = await changeLocalUsername(nextUsername);
    if (!changed) return false;
    commit((current) => ({ ...current, identity: current.identity ? { ...current.identity, username: nextUsername } : null }));
    return true;
  }, [commit, state.identity]);

  const updateProfileDescription = useCallback(async (description: string) => {
    commit((current) => ({ ...current, identity: current.identity ? { ...current.identity, description: description.trim().slice(0, 160) } : null }));
  }, [commit]);

  const saveContact = useCallback(async (displayNameInput: string, usernameInput: string) => {
    const username = normalizeUsername(usernameInput);
    const displayName = normalizeDisplayName(displayNameInput) || username.slice(1);
    const contact: Contact = { id: username, username, displayName, createdAt: new Date().toISOString() };
    const next = { ...state, contacts: [contact, ...state.contacts.filter((candidate) => candidate.username !== username)], conversations: state.conversations.map((conversation) => conversation.peerUsername === username ? { ...conversation, peerDisplayName: displayName } : conversation) };
    setState(next);
    await persistMeshlineState(next);
  }, [state]);

  const saveContactAndStartConversation = useCallback(async (displayNameInput: string, usernameInput: string) => {
    const username = normalizeUsername(usernameInput);
    const displayName = normalizeDisplayName(displayNameInput) || username.slice(1);
    const createdAt = new Date().toISOString();
    const contact: Contact = { id: username, username, displayName, createdAt };
    const existing = state.conversations.find((conversation) => conversation.peerUsername === username);
    const conversation: Conversation = existing ?? { id: Crypto.randomUUID(), peerUsername: username, peerDisplayName: displayName, createdAt, updatedAt: createdAt };
    const initialMessage: Message = { id: Crypto.randomUUID(), conversationId: conversation.id, body: "Direct messages use the experimental Meshline encrypted-relay proof when the recipient device is registered. This is not yet a production-audited end-to-end encryption protocol.", direction: "system", status: "local", createdAt };
    const next: MeshlineState = {
      ...state,
      contacts: [contact, ...state.contacts.filter((candidate) => candidate.username !== username)],
      conversations: existing
        ? state.conversations.map((candidate) => candidate.id === existing.id ? { ...candidate, peerDisplayName: displayName } : candidate)
        : [conversation, ...state.conversations],
      messages: existing ? state.messages : { ...state.messages, [conversation.id]: [initialMessage] },
    };
    setState(next);
    await persistMeshlineState(next);
    return conversation.id;
  }, [state]);

  const removeContact = useCallback(async (usernameInput: string) => {
    const username = normalizeUsername(usernameInput);
    commit((current) => ({ ...current, contacts: current.contacts.filter((contact) => contact.username !== username) }));
  }, [commit]);

  const startConversation = useCallback(async (usernameInput: string) => {
    const peerUsername = normalizeUsername(usernameInput);
    if (state.identity && peerUsername === state.identity.username) return "saved-messages";
    const existing = state.conversations.find((conversation) => conversation.peerUsername === peerUsername);
    if (existing) return existing.id;
    const createdAt = new Date().toISOString();
    const savedContact = state.contacts.find((contact) => contact.username === peerUsername);
    const conversation: Conversation = { id: Crypto.randomUUID(), peerUsername, peerDisplayName: savedContact?.displayName ?? peerUsername.slice(1), createdAt, updatedAt: createdAt };
    const message: Message = { id: Crypto.randomUUID(), conversationId: conversation.id, body: "Direct messages use the experimental Meshline encrypted-relay proof when the recipient device is registered. This is not yet a production-audited end-to-end encryption protocol.", direction: "system", status: "local", createdAt };
    const next = { ...state, conversations: [conversation, ...state.conversations], messages: { ...state.messages, [conversation.id]: [message] } };
    setState(next);
    await persistMeshlineState(next);
    return conversation.id;
  }, [state]);

  const createSpace = useCallback(async (kind: "group" | "channel", titleInput: string, usernameInput: string, descriptionInput: string, memberUsernames: string[]) => {
    if (!state.identity) throw new Error("A local identity is required to create a space.");
    const title = titleInput.trim().slice(0, 60);
    const username = normalizeUsername(usernameInput);
    if (!isValidUsername(username) || state.conversations.some((conversation) => conversation.peerUsername === username)) throw new Error("Choose an unused, valid @username for this space.");
    const description = descriptionInput.trim().slice(0, 180);
    const createdAt = new Date().toISOString();
    const id = Crypto.randomUUID();
    const members = Array.from(new Set([state.identity.username, ...memberUsernames]));
    const conversation: Conversation = {
      id,
      peerUsername: username,
      peerDisplayName: title,
      createdAt,
      updatedAt: createdAt,
      spaceUpdatedAt: createdAt,
      kind,
      description,
      memberUsernames: members,
      groupPermissions: kind === "group" ? { membersCanPost: true, membersCanInvite: true } : undefined,
      createdBy: state.identity.username,
      createdByDeviceId: state.identity.deviceId,
    };
    const noun = kind === "group" ? "group" : "channel";
    const message: Message = {
      id: Crypto.randomUUID(),
      conversationId: id,
      body: `${title} was created as a ${noun}. ${kind === "channel" ? "Only the owner can post in this channel." : "Members are ready for text discussion."} When registered members are included, new text is sent through experimental per-member encrypted relay copies.`,
      direction: "system",
      status: "local",
      createdAt,
    };
    const next = { ...state, conversations: [conversation, ...state.conversations], messages: { ...state.messages, [id]: [message] } };
    setState(next);
    await persistMeshlineState(next);
    return id;
  }, [state]);

  const updateChannelDetails = useCallback(async (conversationId: string, titleInput: string, usernameInput: string, descriptionInput: string) => {
    const title = normalizeDisplayName(titleInput).slice(0, 60);
    const username = normalizeUsername(usernameInput);
    const description = descriptionInput.trim().slice(0, 180);
    const channel = state.conversations.find((conversation) => conversation.id === conversationId);
    const usernameTaken = state.conversations.some((conversation) => conversation.id !== conversationId && conversation.peerUsername === username);

    if (!state.identity || !channel || !isLocalChannelOwner(channel, state.identity) || !title || !isValidUsername(username) || usernameTaken) return false;

    const updatedAt = new Date().toISOString();
    const updatedChannel = { ...channel, peerDisplayName: title, peerUsername: username, description, updatedAt, spaceUpdatedAt: updatedAt };
    commit((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) => conversation.id === conversationId
        ? updatedChannel
        : conversation),
    }));
    try { recordSpaceSyncResult(conversationId, await relaySpaceSnapshot(updatedChannel)); } catch { recordSpaceSyncResult(conversationId, { accepted: 0, total: (updatedChannel.memberUsernames ?? []).filter((member) => member !== state.identity?.username).length }); }
    return true;
  }, [commit, recordSpaceSyncResult, relaySpaceSnapshot, state.conversations, state.identity]);

  const updateGroupDetails = useCallback(async (conversationId: string, titleInput: string, usernameInput: string, descriptionInput: string) => {
    const title = normalizeDisplayName(titleInput).slice(0, 60);
    const username = normalizeUsername(usernameInput);
    const description = descriptionInput.trim().slice(0, 180);
    const group = state.conversations.find((conversation) => conversation.id === conversationId);
    const usernameTaken = state.conversations.some((conversation) => conversation.id !== conversationId && conversation.peerUsername === username);

    if (!state.identity || !group || !isLocalGroupOwner(group, state.identity) || !title || !isValidUsername(username) || usernameTaken) return false;

    const updatedAt = new Date().toISOString();
    const updatedGroup = { ...group, peerDisplayName: title, peerUsername: username, description, updatedAt, spaceUpdatedAt: updatedAt };
    commit((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) => conversation.id === conversationId
        ? updatedGroup
        : conversation),
    }));
    try { recordSpaceSyncResult(conversationId, await relaySpaceSnapshot(updatedGroup)); } catch { recordSpaceSyncResult(conversationId, { accepted: 0, total: (updatedGroup.memberUsernames ?? []).filter((member) => member !== state.identity?.username).length }); }
    return true;
  }, [commit, recordSpaceSyncResult, relaySpaceSnapshot, state.conversations, state.identity]);

  const updateSpaceMembers = useCallback(async (conversationId: string, memberUsernames: string[]) => {
    const space = state.conversations.find((conversation) => conversation.id === conversationId);
    const canManage = Boolean(state.identity && space && (isLocalChannelOwner(space, state.identity) || isLocalGroupOwner(space, state.identity)));
    if (!space || !state.identity || !canManage) return false;

    const members = Array.from(new Set([state.identity.username, ...memberUsernames.map(normalizeUsername).filter(isValidUsername)]));
    const updatedAt = new Date().toISOString();
    const updatedSpace = { ...space, memberUsernames: members, updatedAt, spaceUpdatedAt: updatedAt };
    commit((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) => conversation.id === conversationId ? updatedSpace : conversation),
    }));
    try { recordSpaceSyncResult(conversationId, await relaySpaceSnapshot(updatedSpace, space.memberUsernames)); } catch { recordSpaceSyncResult(conversationId, { accepted: 0, total: Array.from(new Set([...(space.memberUsernames ?? []), ...members])).filter((member) => member !== state.identity?.username).length }); }
    return true;
  }, [commit, recordSpaceSyncResult, relaySpaceSnapshot, state.conversations, state.identity]);

  const updateGroupPermissions = useCallback(async (conversationId: string, permissions: Partial<GroupPermissions>) => {
    const group = state.conversations.find((conversation) => conversation.id === conversationId);
    if (!state.identity || !group || !isLocalGroupOwner(group, state.identity)) return false;

    const updatedAt = new Date().toISOString();
    const updatedGroup = { ...group, groupPermissions: { membersCanPost: group.groupPermissions?.membersCanPost ?? true, membersCanInvite: group.groupPermissions?.membersCanInvite ?? true, ...permissions }, updatedAt, spaceUpdatedAt: updatedAt };
    commit((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) => conversation.id === conversationId
        ? updatedGroup
        : conversation),
    }));
    try { recordSpaceSyncResult(conversationId, await relaySpaceSnapshot(updatedGroup)); } catch { recordSpaceSyncResult(conversationId, { accepted: 0, total: (updatedGroup.memberUsernames ?? []).filter((member) => member !== state.identity?.username).length }); }
    return true;
  }, [commit, recordSpaceSyncResult, relaySpaceSnapshot, state.conversations, state.identity]);

  const toggleConversationPin = useCallback(async (conversationId: string) => {
    commit((current) => ({ ...current, conversations: current.conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, isPinned: !conversation.isPinned } : conversation) }));
  }, [commit]);

  const markConversationRead = useCallback(async (conversationId: string) => {
    commit((current) => ({ ...current, conversations: current.conversations.map((conversation) => conversation.id === conversationId && conversation.unreadCount ? { ...conversation, unreadCount: 0 } : conversation) }));
  }, [commit]);

  const sendMessage = useCallback(async (conversationId: string, text: string, replyTo?: ReplyReference) => {
    const body = text.trim();
    if (!body) return;
    const createdAt = new Date().toISOString();
    const message: Message = { id: Crypto.randomUUID(), conversationId, body, direction: "outbound", status: "sending", createdAt, replyTo };
    commit((current) => ({ ...current, conversations: current.conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, updatedAt: createdAt } : conversation), messages: { ...current.messages, [conversationId]: [...(current.messages[conversationId] ?? []), message] } }));
    const conversation = state.conversations.find((candidate) => candidate.id === conversationId);
    if (!conversation || conversation.isSavedMessages) {
      setTimeout(() => commit((current) => ({ ...current, messages: { ...current.messages, [conversationId]: (current.messages[conversationId] ?? []).map((candidate) => candidate.id === message.id ? { ...candidate, status: "delivered" } : candidate) } })), 650);
      return;
    }

    try {
      if (!state.identity) throw new Error("A local identity is required for encrypted relay transport.");
      if (conversation.kind) {
        if (!(conversation.memberUsernames ?? []).includes(state.identity.username)) throw new Error("You are no longer a member of this space.");
        const recipients = (conversation.memberUsernames ?? []).filter((username) => username !== state.identity?.username);
        if (!recipients.length) {
          commit((current) => ({ ...current, messages: { ...current.messages, [conversationId]: (current.messages[conversationId] ?? []).map((candidate) => candidate.id === message.id ? { ...candidate, status: "delivered" } : candidate) } }));
          return;
        }
        const transportKey = await getOrCreateTransportDeviceKey();
        const wirePayload = encodeSpaceRelayPayload(conversation, message);
        const results = await Promise.allSettled(recipients.map(async (recipientUsername) => {
          const recipient = await lookupRelayDevice(recipientUsername);
          const encrypted = encryptTextForDevice(wirePayload, transportKey.secretKey, recipient.publicKey);
          return enqueueOpaqueEnvelope({ recipientUsername, senderUsername: state.identity!.username, senderPublicKey: transportKey.publicKey, ...encrypted });
        }));
        const accepted = results.filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof enqueueOpaqueEnvelope>>> => result.status === "fulfilled").map((result) => result.value.id);
        if (!accepted.length) throw new Error("No space members currently have a registered Meshline device.");
        const failureDetail = accepted.length === recipients.length ? undefined : `Queued for ${accepted.length} of ${recipients.length} registered members.`;
        commit((current) => ({ ...current, messages: { ...current.messages, [conversationId]: (current.messages[conversationId] ?? []).map((candidate) => candidate.id === message.id ? { ...candidate, status: "queued", transportEnvelopeIds: accepted, failureDetail } : candidate) } }));
        return;
      }
      const [transportKey, recipient] = await Promise.all([getOrCreateTransportDeviceKey(), lookupRelayDevice(conversation.peerUsername)]);
      const observedAt = new Date().toISOString();
      commit((current) => {
        const observed = observeTransportKey(current, conversation.peerUsername, recipient.publicKey, transportFingerprint(recipient.publicKey), observedAt);
        if (!observed.keyChanged) return observed.state;
        const notice: Message = {
          id: Crypto.randomUUID(),
          conversationId,
          body: "Security notice: this contact’s transport key changed. Compare the new fingerprint outside Meshline before sharing sensitive content. This experimental relay cannot verify identity automatically.",
          direction: "system",
          status: "local",
          createdAt: observedAt,
        };
        return { ...observed.state, messages: { ...observed.state.messages, [conversationId]: [...(observed.state.messages[conversationId] ?? []), notice] } };
      });
      const encrypted = encryptTextForDevice(body, transportKey.secretKey, recipient.publicKey);
      const envelope = await enqueueOpaqueEnvelope({ recipientUsername: conversation.peerUsername, senderUsername: state.identity.username, senderPublicKey: transportKey.publicKey, ...encrypted });
      commit((current) => ({ ...current, messages: { ...current.messages, [conversationId]: (current.messages[conversationId] ?? []).map((candidate) => candidate.id === message.id ? { ...candidate, status: "queued", transportEnvelopeId: envelope.id } : candidate) } }));
    } catch (error) {
      console.warn("[Meshline relay proof] text was not accepted by the relay", error);
      const failureDetail = describeRelayDeliveryFailure(error);
      commit((current) => ({ ...current, messages: { ...current.messages, [conversationId]: (current.messages[conversationId] ?? []).map((candidate) => candidate.id === message.id ? { ...candidate, status: "failed", failureDetail } : candidate) } }));
    }
  }, [commit, state.conversations, state.identity]);

  const saveMessage = useCallback(async (textInput: string) => {
    const body = textInput.trim();
    if (!body) return;
    const createdAt = new Date().toISOString();
    commit((current) => {
      const withSavedMessages = ensureSavedMessagesConversation(current);
      const savedConversation = withSavedMessages.conversations.find((conversation) => conversation.isSavedMessages);
      if (!savedConversation) return withSavedMessages;
      const message: Message = { id: Crypto.randomUUID(), conversationId: savedConversation.id, body, direction: "outbound", status: "delivered", createdAt };
      return {
        ...withSavedMessages,
        conversations: withSavedMessages.conversations.map((conversation) => conversation.id === savedConversation.id ? { ...conversation, updatedAt: createdAt } : conversation),
        messages: { ...withSavedMessages.messages, [savedConversation.id]: [...(withSavedMessages.messages[savedConversation.id] ?? []), message] },
      };
    });
  }, [commit]);

  const deleteMessage = useCallback(async (conversationId: string, messageId: string) => {
    commit((current) => ({ ...current, messages: { ...current.messages, [conversationId]: (current.messages[conversationId] ?? []).filter((message) => message.id !== messageId) } }));
  }, [commit]);

  const updateNetworkSettings = useCallback(async (settings: Partial<NetworkSettings>) => {
    commit((current) => ({ ...current, networkSettings: { ...current.networkSettings, ...settings } }));
  }, [commit]);

  const updatePrivacySettings = useCallback(async (settings: Partial<PrivacySettings>) => {
    commit((current) => {
      const privacySettings = { ...current.privacySettings, ...settings };
      return { ...current, privacySettings, messages: retainMessagesSince(current.messages, privacySettings.retentionDays) };
    });
  }, [commit]);

  const unlockWithBiometrics = useCallback(async () => {
    if (Platform.OS === "web") return false;
    const [hasHardware, isEnrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
    if (!hasHardware || !isEnrolled) return false;
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Unlock Meshline", fallbackLabel: "Use device passcode" });
    if (result.success) setAppLocked(false);
    return result.success;
  }, []);

  const continueWithPassword = useCallback(() => { setAppLocked(false); setIsAuthenticated(false); }, []);
  const logout = useCallback(() => { setAppLocked(false); setIsAuthenticated(false); void clearLocalSession(); }, []);
  const deleteAccount = useCallback(async (usernameInput: string, password: string) => {
    if (!state.identity || !matchesIdentityUsername(state.identity.username, usernameInput)) return false;
    const accepted = await verifyLocalIdentity(usernameInput, password);
    if (!accepted) return false;
    await deleteLocalMeshlineAccount();
    setState(emptyMeshlineState);
    setAppLocked(false);
    setIsAuthenticated(false);
    return true;
  }, [state.identity]);

  const value = useMemo<MeshlineContextValue>(() => ({
    ready, isAuthenticated, appLocked, state, identity: state.identity, createIdentity, loginIdentity, updateDisplayName, updateUsername, updateProfileDescription, acknowledgeRecovery, startConversation, createSpace, updateChannelDetails, updateGroupDetails, updateSpaceMembers, updateGroupPermissions, saveContact, saveContactAndStartConversation, removeContact, toggleConversationPin, markConversationRead, sendMessage, saveMessage, deleteMessage, updateNetworkSettings, updatePrivacySettings, unlockWithBiometrics, continueWithPassword, logout, deleteAccount, validateDisplayName: isValidDisplayName, validateUsername: isValidUsername,
  }), [acknowledgeRecovery, appLocked, continueWithPassword, createIdentity, createSpace, deleteAccount, deleteMessage, isAuthenticated, loginIdentity, logout, markConversationRead, ready, removeContact, saveContact, saveContactAndStartConversation, saveMessage, sendMessage, startConversation, state, toggleConversationPin, unlockWithBiometrics, updateChannelDetails, updateDisplayName, updateGroupDetails, updateGroupPermissions, updateNetworkSettings, updatePrivacySettings, updateProfileDescription, updateSpaceMembers, updateUsername]);

  return <MeshlineContext.Provider value={value}>{children}</MeshlineContext.Provider>;
}

export function useMeshline() {
  const context = useContext(MeshlineContext);
  if (!context) throw new Error("useMeshline must be used inside MeshlineProvider");
  return context;
}
