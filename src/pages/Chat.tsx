import {
  ChatEmptyState,
  ChatHeader,
  ConversationList,
  MessageComposer,
  MessageThread,
  useChatState,
} from '../features/chat'

export default function Chat() {
  const {
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
  } = useChatState()

  const hasConversations = conversations.length > 0

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6">
      <div className="bg-white border border-[#e0e0dc] rounded-xl overflow-hidden min-h-[72vh] grid grid-cols-1 md:grid-cols-[320px_1fr]">
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={selectConversation}
        />

        {selectedConversation ? (
          <section className="min-h-0 flex flex-col">
            <ChatHeader conversation={selectedConversation} />
            <MessageThread messages={messages} />
            <MessageComposer
              draft={draft}
              isSending={isSending}
              error={error}
              onDraftChange={setDraft}
              onSend={sendCurrentMessage}
            />
          </section>
        ) : (
          <ChatEmptyState hasConversations={hasConversations} />
        )}
      </div>
    </div>
  )
}
