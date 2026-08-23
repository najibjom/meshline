import type { Conversation, GroupPermissions, Message } from "@/lib/meshline";

type SpaceWirePayload = {
  version: 1;
  type: "meshline-space-message";
  space: Pick<Conversation, "id" | "kind" | "peerUsername" | "peerDisplayName" | "description" | "memberUsernames" | "groupPermissions" | "createdBy" | "createdByDeviceId">;
  message: Pick<Message, "id" | "body" | "createdAt" | "replyTo">;
};

function validUsername(value: unknown): value is string {
  return typeof value === "string" && /^@[a-z0-9_]{3,24}$/.test(value);
}

function validText(value: unknown, max: number) {
  return typeof value === "string" && value.length <= max;
}

export function encodeSpaceRelayPayload(conversation: Conversation, message: Message) {
  const payload: SpaceWirePayload = {
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
    message: { id: message.id, body: message.body, createdAt: message.createdAt, replyTo: message.replyTo },
  };
  return JSON.stringify(payload);
}

export function decodeSpaceRelayPayload(value: string): SpaceWirePayload | null {
  try {
    const parsed = JSON.parse(value) as Partial<SpaceWirePayload>;
    const space = parsed.space;
    const message = parsed.message;
    if (parsed.version !== 1 || parsed.type !== "meshline-space-message" || !space || !message) return null;
    if ((space.kind !== "group" && space.kind !== "channel") || !validText(space.id, 64) || !validUsername(space.peerUsername) || !validText(space.peerDisplayName, 60)) return null;
    if (!Array.isArray(space.memberUsernames) || !space.memberUsernames.every(validUsername)) return null;
    if (!validText(message.id, 64) || !validText(message.body, 2000) || !validText(message.createdAt, 40)) return null;
    if (space.groupPermissions && (typeof (space.groupPermissions as GroupPermissions).membersCanPost !== "boolean" || typeof (space.groupPermissions as GroupPermissions).membersCanInvite !== "boolean")) return null;
    if (message.replyTo && (!validText(message.replyTo.id, 64) || !validText(message.replyTo.body, 2000))) return null;
    return parsed as SpaceWirePayload;
  } catch {
    return null;
  }
}
