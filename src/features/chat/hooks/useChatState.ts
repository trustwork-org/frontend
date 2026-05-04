import { useCallback, useMemo, useState } from "react";
import { CHAT_LIMITS, CHAT_OPTIMISTIC, CHAT_UI } from "../constants";
import {
  mockConversations,
  mockMessagesByConversationId,
} from "../data/chat.mock";
import type { ChatConversation, ChatMessage } from "../types";

interface UseChatStateReturn {
  conversations: ChatConversation[];
  selectedConversationId: string | null;
  selectedConversation: ChatConversation | null;
  messages: ChatMessage[];
  draft: string;
  isSending: boolean;
  error: string | null;
  setDraft: (value: string) => void;
  selectConversation: (conversationId: string) => void;
  sendCurrentMessage: () => Promise<void>;
}

export function useChatState(): UseChatStateReturn {
  const [conversations, setConversations] =
    useState<ChatConversation[]>(mockConversations);
  const [messagesByConversationId, setMessagesByConversationId] = useState<
    Record<string, ChatMessage[]>
  >(mockMessagesByConversationId);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(mockConversations[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const messages = useMemo(
    () =>
      selectedConversationId
        ? (messagesByConversationId[selectedConversationId] ?? [])
        : [],
    [messagesByConversationId, selectedConversationId],
  );

  const selectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    setError(null);
  }, []);

  const sendCurrentMessage = useCallback(async () => {
    if (!selectedConversationId) return;

    const trimmed = draft.trim();

    if (!trimmed) {
      setError(CHAT_UI.emptyDraftError);
      return;
    }

    if (trimmed.length > CHAT_LIMITS.maxMessageLength) {
      setError(CHAT_UI.tooLongError);
      return;
    }

    setIsSending(true);
    setError(null);

    const optimisticId = `${CHAT_OPTIMISTIC.tempMessageIdPrefix}${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      conversationId: selectedConversationId,
      senderAddress: "0xme",
      senderRole: "me",
      body: trimmed,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    setMessagesByConversationId((prev) => ({
      ...prev,
      [selectedConversationId]: [
        ...(prev[selectedConversationId] ?? []),
        optimisticMessage,
      ],
    }));

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversationId
          ? {
              ...conv,
              lastMessagePreview: trimmed,
              lastMessageAt: optimisticMessage.createdAt,
            }
          : conv,
      ),
    );

    setDraft("");

    // simulate API latency; replace with real sendMessage(payload) later
    await new Promise((resolve) => setTimeout(resolve, 300));

    setMessagesByConversationId((prev) => ({
      ...prev,
      [selectedConversationId]: (prev[selectedConversationId] ?? []).map(
        (msg) => (msg.id === optimisticId ? { ...msg, status: "sent" } : msg),
      ),
    }));

    setIsSending(false);
  }, [draft, selectedConversationId]);

  return {
    conversations,
    selectedConversationId,
    selectedConversation,
    messages,
    draft,
    isSending,
    error,
    setDraft,
    selectConversation,
    sendCurrentMessage,
  };
}
