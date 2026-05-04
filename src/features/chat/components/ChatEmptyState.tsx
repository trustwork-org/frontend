interface ChatEmptyStateProps {
  hasConversations: boolean
}

export default function ChatEmptyState({ hasConversations }: ChatEmptyStateProps) {
  return (
    <div className="flex-1 bg-[#f7f7f5] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h3 className="text-xl font-semibold text-[#1c1c1c] mb-2">
          {hasConversations ? 'Select a conversation' : 'No conversations yet'}
        </h3>
        <p className="text-sm text-[#6b6b6b]">
          {hasConversations
            ? 'Pick a thread from the left to view messages and continue the discussion.'
            : 'When you apply to jobs and clients contact you, your chat threads will appear here.'}
        </p>
      </div>
    </div>
  )
}
