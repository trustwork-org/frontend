import { truncateAddress } from "../utils/chat.format";
import type { ChatConversation } from "../types";

interface ChatHeaderProps {
  conversation: ChatConversation;
}

export default function ChatHeader({ conversation }: ChatHeaderProps) {
  return (
    <header className="border-b border-[#e0e0dc] bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#1c1c1c] truncate">
            {conversation.peerDisplayName}
          </h2>
          <p className="text-xs text-[#6b6b6b] truncate">
            {conversation.jobTitle}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p
            className="text-[11px] 
text-[#a0a0a0]"
          >
            {truncateAddress(conversation.peerAddress)}
          </p>
          <p
            className={`text-[11px] ${
              conversation.isOnline ? "text-[#14a800]" : "text-[#a0a0a0]"
            }`}
          >
            {conversation.isOnline ? "Online" : "Offline"}
          </p>
        </div>
      </div>
    </header>
  );
}
