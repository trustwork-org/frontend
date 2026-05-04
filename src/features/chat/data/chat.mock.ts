import type { ChatConversation, ChatMessage } from '../types'

export const mockConversations: ChatConversation[] = [
  {
    id: 'conv-1',
    jobId: 'job-escrow-audit',
    jobTitle: 'Escrow Contract Security Audit',
    peerAddress: '0x7c1b3d6fA0D2dB88F3A34E8A0b9f0d0A12345678',
    peerDisplayName: 'Amina (Client)',
    peerRole: 'client',
    lastMessagePreview: 'Please share the latest audit notes before we finalize milestone 2.',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: 'conv-2',
    jobId: 'job-chat-ui',
    jobTitle: 'Freelancer Platform Frontend',
    peerAddress: '0xd9e031a5fA2F54Af83514e8f43CB4D49bbA90c12',
    peerDisplayName: 'Ken (Client)',
    peerRole: 'client',
    lastMessagePreview: 'Great work. Push the updated chat composer and I’ll review.',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    unreadCount: 0,
    isOnline: false,
  },
]

export const mockMessagesByConversationId: Record<string, ChatMessage[]> = {
  'conv-1': [
    {
      id: 'm-1',
      conversationId: 'conv-1',
      senderAddress: '0x7c1b3d6fA0D2dB88F3A34E8A0b9f0d0A12345678',
      senderRole: 'client',
      body: 'Hi, can you confirm if milestone 2 is ready?',
      createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      status: 'read',
    },
    {
      id: 'm-2',
      conversationId: 'conv-1',
      senderAddress: '0xme',
      senderRole: 'me',
      body: 'Yes, I just completed the reentrancy review and gas checks.',
      createdAt: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
      status: 'read',
    },
    {
      id: 'm-3',
      conversationId: 'conv-1',
      senderAddress: '0x7c1b3d6fA0D2dB88F3A34E8A0b9f0d0A12345678',
      senderRole: 'client',
      body: 'Perfect. Please share the latest audit notes before we finalize milestone 2.',
      createdAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
      status: 'delivered',
    },
  ],
  'conv-2': [
    {
      id: 'm-4',
      conversationId: 'conv-2',
      senderAddress: '0xd9e031a5fA2F54Af83514e8f43CB4D49bbA90c12',
      senderRole: 'client',
      body: 'Can you ship the chat thread UI today?',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      status: 'read',
    },
    {
      id: 'm-5',
      conversationId: 'conv-2',
      senderAddress: '0xme',
      senderRole: 'me',
      body: 'Yes, I’ll send it with responsive behavior and loading states.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
      status: 'read',
    },
  ],
}
