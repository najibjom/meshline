import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as Crypto from "expo-crypto";

import {
  Contact,
  Conversation,
  emptyMeshlineState,
  Identity,
  isValidDisplayName,
  isValidUsername,
  loadMeshlineState,
  makeIdentity,
  matchesIdentityUsername,
  Message,
  MeshlineState,
  NetworkSettings,
  normalizeDisplayName,
  normalizeUsername,
  persistMeshlineState,
  verifyLocalIdentity,
} from "@/lib/meshline";

type ReplyReference = { id: string; body: string };

type MeshlineContextValue = {
  ready: boolean;
  isAuthenticated: boolean;
  state: MeshlineState;
  identity: Identity | null;
  createIdentity: (displayName: string, username: string, password: string) => Promise<void>;
  loginIdentity: (username: string, password: string) => Promise<boolean>;
  updateDisplayName: (displayName: string) => Promise<void>;
  acknowledgeRecovery: () => Promise<void>;
  startConversation: (username: string) => Promise<string>;
  saveContact: (displayName: string, username: string) => Promise<void>;
  removeContact: (username: string) => Promise<void>;
  toggleConversationPin: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, text: string, replyTo?: ReplyReference) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  updateNetworkSettings: (settings: Partial<NetworkSettings>) => Promise<void>;
  validateDisplayName: (displayName: string) => boolean;
  validateUsername: (username: string) => boolean;
};

const MeshlineContext = createContext<MeshlineContextValue | null>(null);

export function MeshlineProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [state, setState] = useState<MeshlineState>(emptyMeshlineState);

  useEffect(() => {
    void loadMeshlineState().then((stored) => {
      setState(stored);
      setReady(true);
    });
  }, []);

  const commit = useCallback((recipe: (current: MeshlineState) => MeshlineState) => {
    setState((current) => {
      const next = recipe(current);
      void persistMeshlineState(next);
      return next;
    });
  }, []);

  const createIdentity = useCallback(async (displayName: string, username: string, password: string) => {
    const next = await makeIdentity(displayName, username, password);
    setState(next);
    setIsAuthenticated(true);
    await persistMeshlineState(next);
  }, []);

  const loginIdentity = useCallback(async (username: string, password: string) => {
    if (!state.identity || !matchesIdentityUsername(state.identity.username, username)) return false;
    const accepted = await verifyLocalIdentity(username, password);
    if (accepted) setIsAuthenticated(true);
    return accepted;
  }, [state.identity]);

  const acknowledgeRecovery = useCallback(async () => {
    commit((current) => ({ ...current, identity: current.identity ? { ...current.identity, recoveryAcknowledged: true } : null }));
  }, [commit]);

  const updateDisplayName = useCallback(async (displayName: string) => {
    const normalized = normalizeDisplayName(displayName);
    commit((current) => ({ ...current, identity: current.identity ? { ...current.identity, displayName: normalized } : null }));
  }, [commit]);

  const saveContact = useCallback(async (displayNameInput: string, usernameInput: string) => {
    const username = normalizeUsername(usernameInput);
    const displayName = normalizeDisplayName(displayNameInput) || username.slice(1);
    const contact: Contact = { id: username, username, displayName, createdAt: new Date().toISOString() };
    commit((current) => ({
      ...current,
      contacts: [contact, ...current.contacts.filter((candidate) => candidate.username !== username)],
      conversations: current.conversations.map((conversation) => conversation.peerUsername === username ? { ...conversation, peerDisplayName: displayName } : conversation),
    }));
  }, [commit]);

  const removeContact = useCallback(async (usernameInput: string) => {
    const username = normalizeUsername(usernameInput);
    commit((current) => ({ ...current, contacts: current.contacts.filter((contact) => contact.username !== username) }));
  }, [commit]);

  const startConversation = useCallback(async (usernameInput: string) => {
    const peerUsername = normalizeUsername(usernameInput);
    const existing = state.conversations.find((conversation) => conversation.peerUsername === peerUsername);
    if (existing) return existing.id;

    const createdAt = new Date().toISOString();
    const savedContact = state.contacts.find((contact) => contact.username === peerUsername);
    const conversation: Conversation = {
      id: Crypto.randomUUID(),
      peerUsername,
      peerDisplayName: savedContact?.displayName ?? peerUsername.slice(1),
      createdAt,
      updatedAt: createdAt,
    };
    const message: Message = {
      id: Crypto.randomUUID(),
      conversationId: conversation.id,
      body: "Conversation created locally. Decentralized username resolution will connect to the network layer in a future protocol release.",
      direction: "system",
      status: "local",
      createdAt,
    };
    const next = { ...state, conversations: [conversation, ...state.conversations], messages: { ...state.messages, [conversation.id]: [message] } };
    setState(next);
    await persistMeshlineState(next);
    return conversation.id;
  }, [state]);

  const toggleConversationPin = useCallback(async (conversationId: string) => {
    commit((current) => ({ ...current, conversations: current.conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, isPinned: !conversation.isPinned } : conversation) }));
  }, [commit]);

  const sendMessage = useCallback(async (conversationId: string, text: string, replyTo?: ReplyReference) => {
    const body = text.trim();
    if (!body) return;
    const createdAt = new Date().toISOString();
    const message: Message = { id: Crypto.randomUUID(), conversationId, body, direction: "outbound", status: "sending", createdAt, replyTo };
    commit((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, updatedAt: createdAt } : conversation),
      messages: { ...current.messages, [conversationId]: [...(current.messages[conversationId] ?? []), message] },
    }));
    setTimeout(() => {
      commit((current) => ({
        ...current,
        messages: { ...current.messages, [conversationId]: (current.messages[conversationId] ?? []).map((candidate) => candidate.id === message.id ? { ...candidate, status: "delivered" } : candidate) },
      }));
    }, 650);
  }, [commit]);

  const deleteMessage = useCallback(async (conversationId: string, messageId: string) => {
    commit((current) => ({ ...current, messages: { ...current.messages, [conversationId]: (current.messages[conversationId] ?? []).filter((message) => message.id !== messageId) } }));
  }, [commit]);

  const updateNetworkSettings = useCallback(async (settings: Partial<NetworkSettings>) => {
    commit((current) => ({ ...current, networkSettings: { ...current.networkSettings, ...settings } }));
  }, [commit]);

  const value = useMemo<MeshlineContextValue>(() => ({
    ready,
    isAuthenticated,
    state,
    identity: state.identity,
    createIdentity,
    loginIdentity,
    updateDisplayName,
    acknowledgeRecovery,
    startConversation,
    saveContact,
    removeContact,
    toggleConversationPin,
    sendMessage,
    deleteMessage,
    updateNetworkSettings,
    validateDisplayName: isValidDisplayName,
    validateUsername: isValidUsername,
  }), [acknowledgeRecovery, createIdentity, deleteMessage, isAuthenticated, loginIdentity, ready, removeContact, saveContact, sendMessage, startConversation, state, toggleConversationPin, updateDisplayName, updateNetworkSettings]);

  return <MeshlineContext.Provider value={value}>{children}</MeshlineContext.Provider>;
}

export function useMeshline() {
  const context = useContext(MeshlineContext);
  if (!context) throw new Error("useMeshline must be used inside MeshlineProvider");
  return context;
}
