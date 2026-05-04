export type ChatParticipantRole = "client" | "freelancer" | "me";
export type MessageStatus =
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export interface ChatConversation {
  id: string;
  jobId: string;
  jobTitle: string;
  peerAddress: string;
  peerDisplayName: string;
  peerRole: Exclude<ChatParticipantRole, "me">;
  lastMessagePreview: string;
  lastMessageAt: string; // ISO date string
  unreadCount: number;
  isOnline?: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderAddress: string;
  senderRole: ChatParticipantRole;
  body: string;
  createdAt: string; // ISO date string
  status?: MessageStatus;
}

export interface SendMessagePayload {
  conversationId: string;
  body: string;
}

export interface SendMessageResponse {
  message: ChatMessage;
}

export interface GetConversationsResponse {
  conversations: ChatConversation[];
}

export interface GetMessagesResponse {
  conversationId: string;
  messages: ChatMessage[];
  nextCursor?: string | null;
}