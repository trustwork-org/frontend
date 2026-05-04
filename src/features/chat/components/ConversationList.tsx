import { formatRelativeTime } from "../utils/chat.format";
import type { ChatConversation } from "../types";

interface ConversationListProps {
  conversations: ChatConversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
}

export default function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  if (!conversations.length) {
    return (
      <aside className="h-full border-r border-[#e0e0dc] bg-white p-4">
        <p className="text-sm text-[#6b6b6b]">No conversations yet.</p>
      </aside>
    );
  }

  return (
    <aside className="h-full border-r border-[#e0e0dc] bg-white overflow-y-auto">
      <div className="p-3 border-b border-[#e0e0dc]">
        <h2 className="text-sm font-semibold text-[#1c1c1c]">Messages</h2>
      </div>

      <ul className="divide-y divide-[#e0e0dc]">
        {conversations.map((conversation) => {
          const isActive = conversation.id === selectedConversationId;

          return (
            <li key={conversation.id}>
              <button
                type="button"
                onClick={() => onSelectConversation(conversation.id)}
                className={`w-full text-left px-3 py-3 transition-colors ${
                  isActive ? "bg-[#e6f4e1]" : "hover:bg-[#f7f7f5]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1c1c1c] truncate">
                      {conversation.peerDisplayName}
                    </p>
                    <p
                      className="text-xs text-[#6b6b6b] 
truncate"
                    >
                      {conversation.jobTitle}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] text-[#a0a0a0]">
                      {formatRelativeTime(conversation.lastMessageAt)}
                    </span>
                    {conversation.unreadCount > 0 && (
                      <span
                        className="inline-flex min-w-5 h-5 items-center justify-center 
rounded-full bg-[#14a800] px-1 text-[11px] font-semibold text-white"
                      >
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-1 text-xs text-[#6b6b6b] truncate">
                  {conversation.lastMessagePreview}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
