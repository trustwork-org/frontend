import { CHAT_LIMITS } from "../constants";
import type {
  ChatConversation,
  ChatMessage,
  GetConversationsResponse,
  GetMessagesResponse,
} from "../types";

function toIsoDate(value: unknown): string {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value)))
    return new Date(value).toISOString();
  return new Date().toISOString();
}

function toSafeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toSafeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toPreview(value: unknown): string {
  const text = toSafeString(value).trim();
  if (!text) return "No messages yet";
  return text.length > CHAT_LIMITS.previewLength
    ? `${text.slice(0, CHAT_LIMITS.previewLength)}…`
    : text;
}

export function mapConversation(raw: unknown): ChatConversation {
  const item = (raw ?? {}) as Record<string, unknown>;

  return {
    id: toSafeString(item.id),
    jobId: toSafeString(item.jobId),
    jobTitle: toSafeString(item.jobTitle, "Untitled job"),
    peerAddress: toSafeString(item.peerAddress),
    peerDisplayName: toSafeString(item.peerDisplayName, "Unknown user"),
    peerRole: item.peerRole === "client" ? "client" : "freelancer",
    lastMessagePreview: toPreview(item.lastMessagePreview),
    lastMessageAt: toIsoDate(item.lastMessageAt),
    unreadCount: Math.max(0, toSafeNumber(item.unreadCount)),
    isOnline: typeof item.isOnline === "boolean" ? item.isOnline : false,
  };
}

export function mapMessage(
  raw: unknown,
  fallbackConversationId?: string,
): ChatMessage {
  const item = (raw ?? {}) as Record<string, unknown>;

  return {
    id: toSafeString(item.id),
    conversationId: toSafeString(
      item.conversationId,
      fallbackConversationId ?? "",
    ),
    senderAddress: toSafeString(item.senderAddress),
    senderRole:
      item.senderRole === "client" || item.senderRole === "freelancer"
        ? item.senderRole
        : "me",
    body: toSafeString(item.body),
    createdAt: toIsoDate(item.createdAt),
    status:
      item.status === "sending" ||
      item.status === "sent" ||
      item.status === "delivered" ||
      item.status === "read" ||
      item.status === "failed"
        ? item.status
        : undefined,
  };
}

export function mapConversationsResponse(
  raw: unknown,
): GetConversationsResponse {
  const data = (raw ?? {}) as Record<string, unknown>;
  const conversations = Array.isArray(data.conversations)
    ? data.conversations.map(mapConversation)
    : [];
  return { conversations };
}

export function mapMessagesResponse(
  raw: unknown,
  conversationId: string,
): GetMessagesResponse {
  const data = (raw ?? {}) as Record<string, unknown>;
  const messages = Array.isArray(data.messages)
    ? data.messages.map((m) => mapMessage(m, conversationId))
    : [];

  return {
    conversationId: toSafeString(data.conversationId, conversationId),
    messages,
    nextCursor:
      typeof data.nextCursor === "string" || data.nextCursor === null
        ? data.nextCursor
        : null,
  };
}
