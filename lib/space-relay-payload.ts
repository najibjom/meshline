import type { Conversation, GroupPermissions, Message } from "@/lib/meshline";

type SpaceMetadata = Pick<Conversation, "id" | "kind" | "peerUsername" | "peerDisplayName" | "description" | "memberUsernames" | "groupPermissions" | "createdBy" | "createdByDeviceId">;

type SpaceMessageWirePayload = {
  version: 1;
  type: "meshline-space-message";
  space: SpaceMetadata;
  spaceUpdatedAt?: string;
  message: Pick<Message, "id" | "body" | "createdAt" | "replyTo">;
};

type SpaceSyncWirePayload = {
  version: 1;
  type: "meshline-space-sync";
  space: SpaceMetadata;
  updatedAt: string;
};

export type SpaceWirePayload = SpaceMessageWirePayload | SpaceSyncWirePayload;

function validUsername(value: unknown): value is string {
  return typeof value === "string" && /^@[a-z0-9_]{3,24}$/.test(value);
}

function validText(value: unknown, max: number) {
  return typeof value === "string" && value.length <= max;
}

function validTimestamp(value: unknown) {
  return typeof value === "string" && validText(value, 40) && Number.isFinite(Date.parse(value));
}

export function encodeSpaceRelayPayload(conversation: Conversation, message: Message) {
  const payload: SpaceMessageWirePayload = {
    version: 1,
    type: "meshline-space-message",
    space: {
      id: conversation.id,
      kind: conversation.kind,
      peerUsername: conversation.peerUsername,
      peerDisplayName: conversation.peerDisplayName,
      description: conversation.description,
      memberUsernames: conversation.memberUsernames,
      groupPermissions: conversation.groupPermissions,
      createdBy: conversation.createdBy,
      createdByDeviceId: conversation.createdByDeviceId,
    },
    spaceUpdatedAt: conversation.spaceUpdatedAt ?? conversation.createdAt,
    message: { id: message.id, body: message.body, createdAt: message.createdAt, replyTo: message.replyTo },
  };
  return JSON.stringify(payload);
}

export function encodeSpaceRelaySyncPayload(conversation: Conversation) {
  const payload: SpaceSyncWirePayload = {
    version: 1,
    type: "meshline-space-sync",
    space: {
      id: conversation.id,
      kind: conversation.kind,
      peerUsername: conversation.peerUsername,
      peerDisplayName: conversation.peerDisplayName,
      description: conversation.description,
      memberUsernames: conversation.memberUsernames,
      groupPermissions: conversation.groupPermissions,
      createdBy: conversation.createdBy,
      createdByDeviceId: conversation.createdByDeviceId,
    },
    updatedAt: conversation.spaceUpdatedAt ?? conversation.createdAt,
  };
  return JSON.stringify(payload);
}

function isValidSpaceMetadata(space: unknown): space is SpaceMetadata {
  if (!space || typeof space !== "object") return false;
  const candidate = space as Partial<SpaceMetadata>;
  if ((candidate.kind !== "group" && candidate.kind !== "channel") || !validText(candidate.id, 64) || !validUsername(candidate.peerUsername) || !validText(candidate.peerDisplayName, 60)) return false;
  if (!validUsername(candidate.createdBy) || !validText(candidate.createdByDeviceId, 128)) return false;
  if (!Array.isArray(candidate.memberUsernames) || candidate.memberUsernames.length > 500 || !candidate.memberUsernames.every(validUsername) || !candidate.memberUsernames.includes(candidate.createdBy)) return false;
  if (candidate.groupPermissions && (typeof candidate.groupPermissions.membersCanPost !== "boolean" || typeof candidate.groupPermissions.membersCanInvite !== "boolean")) return false;
  return candidate.kind !== "group" || Boolean(candidate.groupPermissions);
}

export function decodeSpaceRelayPayload(value: string): SpaceWirePayload | null {
  try {
    const parsed = JSON.parse(value) as Partial<SpaceWirePayload>;
    const space = parsed.space;
    if (parsed.version !== 1 || !isValidSpaceMetadata(space)) return null;
    if (parsed.type === "meshline-space-sync") return validTimestamp((parsed as SpaceSyncWirePayload).updatedAt) ? parsed as SpaceSyncWirePayload : null;
    const message = (parsed as SpaceMessageWirePayload).message;
    if (parsed.type !== "meshline-space-message" || !message) return null;
    if ((parsed as SpaceMessageWirePayload).spaceUpdatedAt !== undefined && !validTimestamp((parsed as SpaceMessageWirePayload).spaceUpdatedAt)) return null;
    if (!validText(message.id, 64) || !validText(message.body, 2000) || !validTimestamp(message.createdAt)) return null;
    if (message.replyTo && (!validText(message.replyTo.id, 64) || !validText(message.replyTo.body, 2000))) return null;
    return parsed as SpaceMessageWirePayload;
  } catch {
    return null;
  }
}
