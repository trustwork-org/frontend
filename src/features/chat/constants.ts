export const CHAT_QUERY_KEYS = {
  conversations: ["chat", "conversations"] as const,
  messages: (conversationId: string) =>
    ["chat", "messages", conversationId] as const,
};

export const CHAT_LIMITS = {
  previewLength: 120,
  maxMessageLength: 2000,
  initialPageSize: 30,
  pollingIntervalMs: 12000,
};

export const CHAT_OPTIMISTIC = {
  tempMessageIdPrefix: "temp-msg-",
};

export const CHAT_UI = {
  emptyDraftError: "Message cannot be empty.",
  tooLongError: `Message is too long. Max ${CHAT_LIMITS.maxMessageLength} characters.`,
};
