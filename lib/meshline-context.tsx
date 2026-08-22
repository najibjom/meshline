import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as Crypto from "expo-crypto";

import {
  Conversation,
  emptyMeshlineState,
  Identity,
  isValidDisplayName,
  isValidUsername,
  loadMeshlineState,
  makeIdentity,
  Message,
  MeshlineState,
  NetworkSettings,
  normalizeUsername,
  persistMeshlineState,
} from "@/lib/meshline";

type MeshlineContextValue = {
  ready: boolean;
  state: MeshlineState;
  createIdentity: (displayName: string, username: string, password: string) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  acknowledgeRecovery: () => Promise<void>;
  startConversation: (username: string) => Promise<string>;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  updateNetworkSettings: (settings: Partial<NetworkSettings>) => Promise<void>;
  identity: Identity | null;
  validateDisplayName: (displayName: string) => boolean;
  validateUsername: (username: string) => boolean;
};

const MeshlineContext = createContext<MeshlineContextValue | null>(null);

export function MeshlineProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
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
    await persistMeshlineState(next);
  }, []);

  const acknowledgeRecovery = useCallback(async () => {
    commit((current) => ({
      ...current,
      identity: current.identity ? { ...current.identity, recoveryAcknowledged: true } : null,
    }));
  }, [commit]);

  const updateDisplayName = useCallback(async (displayName: string) => {
    const normalized = displayName.trim().replace(/\s+/g, " ");
    commit((current) => ({
      ...current,
      identity: current.identity ? { ...current.identity, displayName: normalized } : null,
    }));
  }, [commit]);

  const startConversation = useCallback(async (usernameInput: string) => {
    const peerUsername = normalizeUsername(usernameInput);
    const existing = state.conversations.find((conversation) => conversation.peerUsername === peerUsername);
    if (existing) return existing.id;

    const createdAt = new Date().toISOString();
    const conversation: Conversation = {
      id: Crypto.randomUUID(),
      peerUsername,
      peerDisplayName: peerUsername.slice(1),
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
    const next = {
      ...state,
      conversations: [conversation, ...state.conversations],
      messages: { ...state.messages, [conversation.id]: [message] },
    };
    setState(next);
    await persistMeshlineState(next);
    return conversation.id;
  }, [state]);

  const sendMessage = useCallback(async (conversationId: string, text: string) => {
    const body = text.trim();
    if (!body) return;
    const createdAt = new Date().toISOString();
    const message: Message = {
      id: Crypto.randomUUID(),
      conversationId,
      body,
      direction: "outbound",
      status: "sending",
      createdAt,
    };
    commit((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, updatedAt: createdAt } : conversation,
      ),
      messages: { ...current.messages, [conversationId]: [...(current.messages[conversationId] ?? []), message] },
    }));

    setTimeout(() => {
      commit((current) => ({
        ...current,
        messages: {
          ...current.messages,
          [conversationId]: (current.messages[conversationId] ?? []).map((candidate) =>
            candidate.id === message.id ? { ...candidate, status: "delivered" } : candidate,
          ),
        },
      }));
    }, 650);
  }, [commit]);

  const updateNetworkSettings = useCallback(async (settings: Partial<NetworkSettings>) => {
    commit((current) => ({ ...current, networkSettings: { ...current.networkSettings, ...settings } }));
  }, [commit]);

  const value = useMemo<MeshlineContextValue>(() => ({
    ready,
    state,
    createIdentity,
    updateDisplayName,
    acknowledgeRecovery,
    startConversation,
    sendMessage,
    updateNetworkSettings,
    identity: state.identity,
    validateDisplayName: isValidDisplayName,
    validateUsername: isValidUsername,
  }), [acknowledgeRecovery, createIdentity, ready, sendMessage, startConversation, state, updateDisplayName, updateNetworkSettings]);

  return <MeshlineContext.Provider value={value}>{children}</MeshlineContext.Provider>;
}

export function useMeshline() {
  const context = useContext(MeshlineContext);
  if (!context) throw new Error("useMeshline must be used inside MeshlineProvider");
  return context;
}
