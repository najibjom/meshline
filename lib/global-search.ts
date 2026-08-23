import type { Contact, Conversation, Message } from "@/lib/meshline";

export type GlobalPeopleResult =
  | { kind: "conversation"; conversation: Conversation }
  | { kind: "contact"; contact: Contact };

export type GlobalMessageResult = {
  conversation: Conversation;
  message: Message;
};

function normalizeSearchQuery(query: string) {
  return query.trim().toLocaleLowerCase();
}

function matchesQuery(value: string, query: string) {
  return value.toLocaleLowerCase().includes(query);
}

export function findGlobalPeopleResults(conversations: Conversation[], contacts: Contact[], queryInput: string): GlobalPeopleResult[] {
  const query = normalizeSearchQuery(queryInput);
  if (!query) return [];

  const conversationResults = conversations
    .filter((conversation) => matchesQuery(`${conversation.peerDisplayName} ${conversation.peerUsername} ${conversation.description ?? ""}`, query))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .map((conversation): GlobalPeopleResult => ({ kind: "conversation", conversation }));

  const conversationUsernames = new Set(conversations.map((conversation) => conversation.peerUsername));
  const contactResults = contacts
    .filter((contact) => !conversationUsernames.has(contact.username) && matchesQuery(`${contact.displayName} ${contact.username}`, query))
    .map((contact): GlobalPeopleResult => ({ kind: "contact", contact }));

  return [...conversationResults, ...contactResults];
}

export function findGlobalMessageResults(conversations: Conversation[], messagesByConversation: Record<string, Message[]>, queryInput: string): GlobalMessageResult[] {
  const query = normalizeSearchQuery(queryInput);
  if (!query) return [];

  return conversations
    .flatMap((conversation) => (messagesByConversation[conversation.id] ?? [])
      .filter((message) => matchesQuery(`${message.body} ${message.replyTo?.body ?? ""}`, query))
      .map((message) => ({ conversation, message })))
    .sort((left, right) => new Date(right.message.createdAt).getTime() - new Date(left.message.createdAt).getTime());
}
