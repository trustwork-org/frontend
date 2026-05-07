import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useJobs } from '../../../hooks/useJobs'
import { api, type ChatMessage as RawChatMessage } from '../../../lib/api'
import { shortAddress } from '../../../utils/format'
import { CHAT_LIMITS, CHAT_OPTIMISTIC, CHAT_UI } from '../constants'
import type { ChatConversation, ChatMessage } from '../types'

const ZERO = '0x0000000000000000000000000000000000000000'

interface UseChatStateReturn {
  conversations: ChatConversation[]
  selectedConversationId: string | null
  selectedConversation: ChatConversation | null
  messages: ChatMessage[]
  draft: string
  isSending: boolean
  error: string | null
  setDraft: (value: string) => void
  selectConversation: (conversationId: string) => void
  sendCurrentMessage: () => Promise<void>
}

interface PeerEntry {
  peerAddress: string
  peerRole: 'client' | 'freelancer'
  jobIds: bigint[]
  latestJobTitle: string
  latestJobAt: bigint
}

function previewOf(text: string): string {
  if (!text) return 'No messages yet'
  return text.length > CHAT_LIMITS.previewLength
    ? `${text.slice(0, CHAT_LIMITS.previewLength)}…`
    : text
}

function rawToMessage(raw: RawChatMessage, myAddress: string): ChatMessage {
  const isMe = raw.sender.toLowerCase() === myAddress.toLowerCase()
  return {
    id: raw._id,
    conversationId: (isMe ? raw.receiver : raw.sender).toLowerCase(),
    senderAddress: raw.sender,
    senderRole: isMe ? 'me' : 'client', // role label is only used for styling — 'me' vs other
    body: raw.content,
    createdAt: raw.createdAt,
    status: 'sent',
  }
}

export function useChatState(): UseChatStateReturn {
  const { address } = useAuth()
  const { jobs } = useJobs()

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [messagesByPeer, setMessagesByPeer] = useState<Record<string, ChatMessage[]>>({})
  const [previewByPeer, setPreviewByPeer] = useState<Record<string, { preview: string; at: string }>>({})
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchedPeers = useRef<Set<string>>(new Set())

  // Build conversations from real jobs (one per peer, regardless of how many shared jobs).
  const conversations = useMemo<ChatConversation[]>(() => {
    if (!address || !jobs) return []
    const me = address.toLowerCase()

    const byPeer = new Map<string, PeerEntry>()
    for (const j of jobs) {
      if (j.freelancer === ZERO) continue
      const isClient = j.client.toLowerCase() === me
      const isFreelancer = j.freelancer.toLowerCase() === me
      if (!isClient && !isFreelancer) continue
      const peerAddress = (isClient ? j.freelancer : j.client).toLowerCase()
      const peerRole: 'client' | 'freelancer' = isClient ? 'freelancer' : 'client'
      const existing = byPeer.get(peerAddress)
      if (!existing) {
        byPeer.set(peerAddress, {
          peerAddress,
          peerRole,
          jobIds: [j.jobId],
          latestJobTitle: j.title,
          latestJobAt: j.createdAt,
        })
      } else {
        existing.jobIds.push(j.jobId)
        if (j.createdAt > existing.latestJobAt) {
          existing.latestJobTitle = j.title
          existing.latestJobAt = j.createdAt
        }
      }
    }

    return Array.from(byPeer.values())
      .sort((a, b) => Number(b.latestJobAt - a.latestJobAt))
      .map(p => {
        const preview = previewByPeer[p.peerAddress]
        return {
          id: p.peerAddress,
          jobId: p.jobIds[0]?.toString() || '',
          jobTitle: p.latestJobTitle,
          peerAddress: p.peerAddress,
          peerDisplayName: shortAddress(p.peerAddress),
          peerRole: p.peerRole,
          lastMessagePreview: previewOf(preview?.preview || ''),
          lastMessageAt: preview?.at || new Date(Number(p.latestJobAt) * 1000).toISOString(),
          unreadCount: 0,
        }
      })
  }, [address, jobs, previewByPeer])

  const selectedConversation = useMemo(
    () => conversations.find(c => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  )

  const messages = useMemo(
    () => (selectedConversationId ? messagesByPeer[selectedConversationId] ?? [] : []),
    [messagesByPeer, selectedConversationId],
  )

  // Auto-select first conversation when list loads
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id)
    }
  }, [conversations, selectedConversationId])

  // Fetch messages on conversation select (one-time per peer)
  useEffect(() => {
    if (!address || !selectedConversationId) return
    if (fetchedPeers.current.has(selectedConversationId)) return
    fetchedPeers.current.add(selectedConversationId)
    ;(async () => {
      try {
        const raw = await api.getChatHistory(address, selectedConversationId)
        const mapped = raw.map(r => rawToMessage(r, address))
        setMessagesByPeer(prev => ({ ...prev, [selectedConversationId]: mapped }))
        const last = raw[raw.length - 1]
        if (last) {
          setPreviewByPeer(prev => ({
            ...prev,
            [selectedConversationId]: { preview: last.content, at: last.createdAt },
          }))
        }
      } catch (err) {
        console.error('Failed to fetch chat history:', err)
        setError(err instanceof Error ? err.message : 'Failed to load messages')
      }
    })()
  }, [address, selectedConversationId])

  const selectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId)
    setError(null)
  }, [])

  const sendCurrentMessage = useCallback(async () => {
    if (!address || !selectedConversationId) return
    const trimmed = draft.trim()
    if (!trimmed) {
      setError(CHAT_UI.emptyDraftError)
      return
    }
    if (trimmed.length > CHAT_LIMITS.maxMessageLength) {
      setError(CHAT_UI.tooLongError)
      return
    }

    setIsSending(true)
    setError(null)

    const tempId = `${CHAT_OPTIMISTIC.tempMessageIdPrefix}${Date.now()}`
    const optimistic: ChatMessage = {
      id: tempId,
      conversationId: selectedConversationId,
      senderAddress: address,
      senderRole: 'me',
      body: trimmed,
      createdAt: new Date().toISOString(),
      status: 'sending',
    }
    setMessagesByPeer(prev => ({
      ...prev,
      [selectedConversationId]: [...(prev[selectedConversationId] ?? []), optimistic],
    }))
    setDraft('')

    try {
      const raw = await api.sendMessage(address, selectedConversationId, trimmed)
      const real = rawToMessage(raw, address)
      setMessagesByPeer(prev => ({
        ...prev,
        [selectedConversationId]: (prev[selectedConversationId] ?? []).map(m =>
          m.id === tempId ? real : m,
        ),
      }))
      setPreviewByPeer(prev => ({
        ...prev,
        [selectedConversationId]: { preview: trimmed, at: real.createdAt },
      }))
    } catch (err) {
      console.error('Failed to send message:', err)
      setMessagesByPeer(prev => ({
        ...prev,
        [selectedConversationId]: (prev[selectedConversationId] ?? []).map(m =>
          m.id === tempId ? { ...m, status: 'failed' } : m,
        ),
      }))
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }, [address, draft, selectedConversationId])

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
  }
}
