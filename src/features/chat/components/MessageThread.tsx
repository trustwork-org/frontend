import { formatDayDivider, formatMessageTime, isSameDay } from '../utils/chat.format'
import type { ChatMessage } from '../types'

interface MessageThreadProps {
  messages: ChatMessage[]
}

export default function MessageThread({ messages }: MessageThreadProps) {
  if (!messages.length) {
    return (
      <div className="flex-1 overflow-y-auto p-4 bg-[#f7f7f5]">
        <p className="text-sm text-[#6b6b6b]">No messages yet. Start the conversation.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-[#f7f7f5]">
      <div className="mx-auto max-w-3xl space-y-3">
        {messages.map((message, index) => {
          const prev = messages[index - 1]
          const showDayDivider = !prev || !isSameDay(prev.createdAt, message.createdAt)
          const isMe = message.senderRole === 'me'

          return (
            <div key={message.id}>
              {showDayDivider && (
                <div className="my-4 flex justify-center">
                  <span className="rounded-full bg-white border border-[#e0e0dc] px-3 py-1 text-[11px] text-[#6b6b6b]">
                    {formatDayDivider(message.createdAt)}
                  </span>
                </div>
              )}

              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                    isMe ? 'bg-[#14a800] text-white' : 'bg-white border border-[#e0e0dc] text-[#1c1c1c]'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {message.body}
                  </p>
                  <div className={`mt-1 text-[11px] ${isMe ? 'text-[#e6f4e1]' : 'text-[#a0a0a0]'}`}>
                    {formatMessageTime(message.createdAt)}
                    {isMe && message.status ? ` · ${message.status}` : ''}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
