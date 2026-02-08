import { create } from 'zustand';

// ═══════════════════════════════════════════════════════════
// Chat Store — Message, Session & Usage State
// ═══════════════════════════════════════════════════════════

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  mediaUrl?: string;
  mediaType?: string;
  attachments?: Array<{
    mimeType: string;
    content: string;
    fileName: string;
  }>;
}

export interface Session {
  key: string;
  label: string;
  lastMessage?: string;
  lastTimestamp?: string;
  unread?: number;
  kind?: string;
}

export interface TokenUsage {
  contextTokens: number;
  maxTokens: number;
  percentage: number;
  compactions: number;
}

interface ChatState {
  // Messages
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateStreamingMessage: (id: string, content: string, extra?: { mediaUrl?: string; mediaType?: string }) => void;
  finalizeStreamingMessage: (id: string, content: string, extra?: { mediaUrl?: string; mediaType?: string }) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  clearMessages: () => void;

  // Sessions
  sessions: Session[];
  activeSessionKey: string;
  setSessions: (sessions: Session[]) => void;
  setActiveSession: (key: string) => void;

  // Token Usage
  tokenUsage: TokenUsage | null;
  setTokenUsage: (usage: TokenUsage | null) => void;

  // UI State
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;
  isSending: boolean;
  setIsSending: (sending: boolean) => void;
  isLoadingHistory: boolean;
  setIsLoadingHistory: (loading: boolean) => void;

  // Connection
  connected: boolean;
  connecting: boolean;
  connectionError: string | null;
  setConnectionStatus: (status: { connected: boolean; connecting: boolean; error?: string }) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // ── Messages ──
  messages: [],

  addMessage: (msg) => {
    set((state) => {
      if (state.messages.some((m) => m.id === msg.id)) return state;
      return { messages: [...state.messages, msg] };
    });
  },

  updateStreamingMessage: (id, content, extra) => {
    set((state) => {
      const existingIdx = state.messages.findIndex((m) => m.id === id);
      if (existingIdx >= 0) {
        const updated = [...state.messages];
        updated[existingIdx] = {
          ...updated[existingIdx],
          content,
          isStreaming: true,
          ...(extra?.mediaUrl ? { mediaUrl: extra.mediaUrl, mediaType: extra.mediaType } : {}),
        };
        return { messages: updated };
      } else {
        return {
          messages: [
            ...state.messages,
            {
              id,
              role: 'assistant' as const,
              content,
              timestamp: new Date().toISOString(),
              isStreaming: true,
              ...(extra?.mediaUrl ? { mediaUrl: extra.mediaUrl, mediaType: extra.mediaType } : {}),
            },
          ],
        };
      }
    });
  },

  finalizeStreamingMessage: (id, content, extra) => {
    set((state) => {
      const existingIdx = state.messages.findIndex((m) => m.id === id);
      if (existingIdx >= 0) {
        const updated = [...state.messages];
        updated[existingIdx] = {
          ...updated[existingIdx],
          content: content || updated[existingIdx].content,
          isStreaming: false,
          ...(extra?.mediaUrl ? { mediaUrl: extra.mediaUrl, mediaType: extra.mediaType } : {}),
        };
        return { messages: updated, isTyping: false };
      }
      return { isTyping: false };
    });
  },

  setMessages: (msgs) => set({ messages: msgs }),
  clearMessages: () => set({ messages: [] }),

  // ── Sessions ──
  sessions: [{ key: 'agent:main:main', label: 'الجلسة الرئيسية' }],
  activeSessionKey: 'agent:main:main',

  setSessions: (sessions) => set({ sessions }),
  setActiveSession: (key) => set({ activeSessionKey: key, messages: [] }),

  // ── Token Usage ──
  tokenUsage: null,
  setTokenUsage: (usage) => set({ tokenUsage: usage }),

  // ── UI State ──
  isTyping: false,
  setIsTyping: (typing) => set({ isTyping: typing }),
  isSending: false,
  setIsSending: (sending) => set({ isSending: sending }),
  isLoadingHistory: false,
  setIsLoadingHistory: (loading) => set({ isLoadingHistory: loading }),

  // ── Connection ──
  connected: false,
  connecting: false,
  connectionError: null,

  setConnectionStatus: (status) =>
    set({
      connected: status.connected,
      connecting: status.connecting,
      connectionError: status.error || null,
    }),
}));
