import { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowDown, Loader2, RefreshCw, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '@/stores/chatStore';
import { gateway } from '@/services/gateway';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import clsx from 'clsx';

// ═══════════════════════════════════════════════════════════
// Chat View — premium chat area
// ═══════════════════════════════════════════════════════════

export function ChatView() {
  const { t } = useTranslation();
  const { messages, isTyping, connected, connecting, connectionError, isLoadingHistory, setMessages, setIsLoadingHistory, activeSessionKey, cacheMessagesForSession, getCachedMessages } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  useEffect(() => { if (autoScroll) scrollToBottom(); }, [messages, isTyping, autoScroll, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceFromBottom < 100;
    setAutoScroll(isNearBottom);
    setShowScrollDown(!isNearBottom && messages.length > 3);
  }, [messages.length]);

  const extractText = (val: any): string => {
    if (typeof val === 'string') return val;
    if (val == null) return '';
    if (Array.isArray(val)) {
      return val.map((b: any) => {
        if (typeof b === 'string') return b;
        if (b?.type === 'text' && typeof b.text === 'string') return b.text;
        if (typeof b?.text === 'string') return b.text;
        return '';
      }).join('');
    }
    if (typeof val === 'object') {
      if (typeof val.text === 'string') return val.text;
      if (typeof val.content === 'string') return val.content;
      if (Array.isArray(val.content)) return extractText(val.content);
      return JSON.stringify(val);
    }
    return String(val);
  };

  const NOISE_PATTERNS = [
    /^Read HEARTBEAT\.md/i, /^HEARTBEAT_OK/, /^NO_REPLY$/,
    /^احفظ جميع المعلومات المهمة/, /^⚠️ Session nearing compaction/,
    /^\[System\]/i, /^System:\s*\[/, /^PS [A-Z]:\\.*>/,
    /^node scripts\/build/, /^npx electron/, /^Ctrl\+[A-Z]/,
  ];

  const isNoise = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed) return true;
    return NOISE_PATTERNS.some((p) => p.test(trimmed));
  };

  const loadHistory = useCallback(async () => {
    // Check cache first
    const cached = getCachedMessages(activeSessionKey);
    if (cached && cached.length > 0) {
      setMessages(cached);
      return;
    }

    setIsLoadingHistory(true);
    try {
      const result = await gateway.getHistory(activeSessionKey, 200);
      const rawMessages = Array.isArray(result?.messages) ? result.messages : [];
      const filtered = rawMessages
        .map((msg: any) => {
          const role = typeof msg.role === 'string' ? msg.role : 'unknown';
          const content = extractText(msg.content);
          if (!content) return null;
          if (role === 'system') {
            if (/compact/i.test(content)) {
              return { id: msg.id || `compaction-${Math.random().toString(36).slice(2)}`, role: 'compaction' as any, content: '', timestamp: msg.timestamp || msg.createdAt || new Date().toISOString() };
            }
            return null;
          }
          if (role === 'toolResult' || role === 'tool') return null;
          if (role !== 'user' && role !== 'assistant') return null;
          if (Array.isArray(msg.content)) {
            const hasOnlyTools = msg.content.every((b: any) =>
              b.type === 'toolCall' || b.type === 'toolResult' || b.type === 'tool_use' || b.type === 'tool_result'
            );
            if (hasOnlyTools) return null;
          }
          if (msg.toolCallId || msg.tool_call_id) return null;
          if (isNoise(content)) return null;
          return {
            id: msg.id || msg.messageId || `hist-${Math.random().toString(36).slice(2)}`,
            role: role as 'user' | 'assistant',
            content,
            timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
            mediaUrl: msg.mediaUrl || undefined,
          };
        })
        .filter(Boolean) as any[];
      setMessages(filtered);
      cacheMessagesForSession(activeSessionKey, filtered);
    } catch (err) {
      console.error('[ChatView] History load failed:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [setMessages, setIsLoadingHistory, activeSessionKey, getCachedMessages, cacheMessagesForSession]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    if (isRefreshing || isLoadingHistory) return;
    setIsRefreshing(true);
    try { await loadHistory(); }
    finally { setTimeout(() => setIsRefreshing(false), 500); }
  }, [isRefreshing, isLoadingHistory, loadHistory]);

  // Load history on connect or session change
  useEffect(() => {
    if (connected && !isLoadingHistory) loadHistory();
  }, [connected, activeSessionKey]);

  useEffect(() => {
    const handler = () => handleRefresh();
    window.addEventListener('aegis:refresh', handler);
    return () => window.removeEventListener('aegis:refresh', handler);
  }, [handleRefresh]);

  const handleResend = useCallback((content: string) => { gateway.sendMessage(content, undefined, activeSessionKey); }, [activeSessionKey]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-aegis-bg">
      {/* Chat Header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-2 border-b border-white/[0.04] bg-[rgba(13,17,23,0.6)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/30 font-mono">
            {messages.length > 0 ? t('chat.messageCount', { count: messages.length }) : ''}
          </span>
        </div>
        <button onClick={handleRefresh} disabled={isRefreshing || isLoadingHistory || !connected}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-white/25 hover:text-white/45 hover:bg-white/[0.05] transition-colors disabled:opacity-30"
          title={t('chat.refresh')}>
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          <span>{t('chat.refresh')}</span>
        </button>
      </div>

      {/* Connection Banner */}
      {!connected && (
        <div className={clsx(
          'shrink-0 px-4 py-2 text-center text-[12px] border-b',
          connecting ? 'bg-aegis-warning-surface text-aegis-warning border-aegis-warning/10' : 'bg-aegis-danger-surface text-aegis-danger border-aegis-danger/10'
        )}>
          {connecting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 bg-aegis-warning rounded-full animate-pulse-soft" />
              {t('connection.connectingBanner')}
            </span>
          ) : (
            <span>
              {t('connection.disconnectedBanner')}
              {connectionError && <span className="opacity-60"> — {connectionError}</span>}
              <button onClick={() => {
                window.aegis?.config.get().then((c: any) => {
                  gateway.connect(c.gatewayUrl || 'ws://127.0.0.1:18789', c.gatewayToken || '');
                });
              }} className="mx-2 underline hover:no-underline">
                {t('connection.reconnect')}
              </button>
            </span>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overflow-x-hidden py-3 scroll-smooth">
        {isLoadingHistory ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <Loader2 size={28} className="text-aegis-primary animate-spin mb-4" />
            <p className="text-aegis-text-muted text-[13px]">{t('chat.loadingHistory')}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="relative mb-8">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-aegis-primary/15 to-aegis-accent/10 flex items-center justify-center border border-white/[0.08] shadow-[0_0_32px_rgba(78,201,176,0.15)] animate-glow-pulse">
                <Shield size={36} className="text-aegis-primary" />
              </div>
              <div className="absolute inset-0 w-20 h-20 rounded-3xl border border-aegis-primary/5 animate-pulse-ring" />
            </div>
            <h2 className="text-xl font-semibold text-aegis-text mb-1.5 tracking-tight">AEGIS Desktop</h2>
            <p className="text-gradient text-[13px] font-medium mb-3">{t('app.fullName')}</p>
            <p className="text-aegis-text-dim text-[12px]">
              {connected ? t('connection.connectedReady') : t('connection.waitingConnection')}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {messages.map((msg) => (
              msg.role === 'compaction' ? (
                <div key={msg.id} className="flex items-center gap-3 py-4 px-4">
                  <div className="flex-1 border-t border-dashed border-amber-500/20" />
                  <span className="text-[10px] text-amber-500/40 font-semibold uppercase tracking-wider shrink-0">⚡ Context Compacted</span>
                  <div className="flex-1 border-t border-dashed border-amber-500/20" />
                </div>
              ) : (
                <MessageBubble key={msg.id} message={msg} onResend={msg.role === 'user' ? handleResend : undefined} />
              )
            ))}
          </div>
        )}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Scroll to bottom */}
      {showScrollDown && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
          <button onClick={() => { setAutoScroll(true); scrollToBottom(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass shadow-float text-[11px] text-aegis-text-muted hover:text-aegis-text transition-colors">
            <ArrowDown size={13} />
            <span>{t('chat.newMessages')}</span>
          </button>
        </div>
      )}

      <MessageInput />
    </div>
  );
}
