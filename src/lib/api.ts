const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text || res.statusText}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  registerAccount: (walletAddress: string, email: string) =>
    request<{ walletAddress: string; email: string }>('/api/account/register', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, email }),
    }),

  sendMessage: (sender: string, receiver: string, content: string) =>
    request<ChatMessage>('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({ sender, receiver, content }),
    }),

  getChatHistory: (userA: string, userB: string) =>
    request<ChatMessage[]>(`/api/chat/history/${userA}/${userB}`),
}

export interface ChatMessage {
  _id: string
  sender: string
  receiver: string
  content: string
  createdAt: string
  updatedAt: string
}
