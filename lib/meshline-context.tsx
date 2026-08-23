import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import { AppState, Platform } from "react-native";

import {
  changeLocalUsername,
  clearLocalSession,
  Contact,
  Conversation,
  deleteLocalMeshlineAccount,
  emptyMeshlineState,
  Identity,
  isValidDisplayName,
  isValidUsername,
  loadMeshlineState,
  loadLocalSession,
  makeIdentity,
  matchesIdentityUsername,
  Message,
  MeshlineState,
  NetworkSettings,
  normalizeDisplayName,
  normalizeUsername,
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
  updateUsername: (username: string, password: string) => Promise<boolean>;
  updateProfileDescription: (description: string) => Promise<void>;
  acknowledgeRecovery: () => Promise<void>;
  startConversation: (username: string) => Promise<string>;
  saveContact: (displayName: string, username: string) => Promise<void>;
  removeContact: (username: string) => Promise<void>;
  toggleConversationPin: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, text: string, replyTo?: ReplyReference) => Promise<void>;
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

  const updateUsername = useCallback(async (usernameInput: string, password: string) => {
    const nextUsername = normalizeUsername(usernameInput);
    if (!state.identity || !isValidUsername(nextUsername)) return false;
    const changed = await changeLocalUsername(state.identity.username, nextUsername, password);
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
    commit((current) => ({ ...current, contacts: [contact, ...current.contacts.filter((candidate) => candidate.username !== username)], conversations: current.conversations.map((conversation) => conversation.peerUsername === username ? { ...conversation, peerDisplayName: displayName } : conversation) }));
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
    const conversation: Conversation = { id: Crypto.randomUUID(), peerUsername, peerDisplayName: savedContact?.displayName ?? peerUsername.slice(1), createdAt, updatedAt: createdAt };
    const message: Message = { id: Crypto.randomUUID(), conversationId: conversation.id, body: "Conversation created locally. Decentralized username resolution will connect to the network layer in a future protocol release.", direction: "system", status: "local", createdAt };
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
    commit((current) => ({ ...current, conversations: current.conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, updatedAt: createdAt } : conversation), messages: { ...current.messages, [conversationId]: [...(current.messages[conversationId] ?? []), message] } }));
    setTimeout(() => commit((current) => ({ ...current, messages: { ...current.messages, [conversationId]: (current.messages[conversationId] ?? []).map((candidate) => candidate.id === message.id ? { ...candidate, status: "delivered" } : candidate) } })), 650);
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
    ready, isAuthenticated, appLocked, state, identity: state.identity, createIdentity, loginIdentity, updateDisplayName, updateUsername, updateProfileDescription, acknowledgeRecovery, startConversation, saveContact, removeContact, toggleConversationPin, sendMessage, deleteMessage, updateNetworkSettings, updatePrivacySettings, unlockWithBiometrics, continueWithPassword, logout, deleteAccount, validateDisplayName: isValidDisplayName, validateUsername: isValidUsername,
  }), [acknowledgeRecovery, appLocked, continueWithPassword, createIdentity, deleteAccount, deleteMessage, isAuthenticated, loginIdentity, logout, ready, removeContact, saveContact, sendMessage, startConversation, state, toggleConversationPin, unlockWithBiometrics, updateDisplayName, updateNetworkSettings, updatePrivacySettings, updateProfileDescription, updateUsername]);

  return <MeshlineContext.Provider value={value}>{children}</MeshlineContext.Provider>;
}

export function useMeshline() {
  const context = useContext(MeshlineContext);
  if (!context) throw new Error("useMeshline must be used inside MeshlineProvider");
  return context;
}
