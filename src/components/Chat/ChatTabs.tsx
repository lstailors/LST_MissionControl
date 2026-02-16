import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Plus, Shield, MessageSquare, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useChatStore, Session } from '@/stores/chatStore';
import { gateway } from '@/services/gateway';
import clsx from 'clsx';

// ═══════════════════════════════════════════════════════════
// ChatTabs — Tab bar for multi-session chat
// ═══════════════════════════════════════════════════════════

const MAIN_SESSION = 'agent:main:main';

/** Truncate session label for tab display */
function tabLabel(session: Session | undefined, key: string): string {
  if (key === MAIN_SESSION) return 'AEGIS';
  if (session?.label) {
    const label = session.label;
    return label.length > 24 ? label.slice(0, 22) + '…' : label;
  }
  // Extract readable name from session key like "agent:main:sub-abc"
  const parts = key.split(':');
  const last = parts[parts.length - 1];
  return last.length > 24 ? last.slice(0, 22) + '…' : last;
}

export function ChatTabs() {
  const { t } = useTranslation();
  const {
    openTabs,
    activeSessionKey,
    sessions,
    openTab,
    closeTab,
    setActiveSession,
    connected,
  } = useChatStore();

  const [showPicker, setShowPicker] = useState(false);
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  // Load available sessions when picker opens
  const loadAvailableSessions = useCallback(async () => {
    if (!connected) return;
    setLoadingSessions(true);
    try {
      const result = await gateway.getSessions();
      const list: Session[] = (result?.sessions || []).map((s: any) => ({
        key: s.key || s.sessionKey,
        label: s.label || s.key || '',
        kind: s.kind,
        lastMessage: s.lastMessage,
        lastTimestamp: s.lastTimestamp,
      }));
      // Filter out already-open tabs
      setAvailableSessions(list.filter((s) => !openTabs.includes(s.key)));
    } catch (err) {
      console.error('[ChatTabs] Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, [connected, openTabs]);

  const handleOpenPicker = useCallback(() => {
    setShowPicker((v) => !v);
    if (!showPicker) loadAvailableSessions();
  }, [showPicker, loadAvailableSessions]);

  const handleSelectSession = useCallback((key: string) => {
    openTab(key);
    setShowPicker(false);
  }, [openTab]);

  const handleTabClick = useCallback((key: string) => {
    if (key !== activeSessionKey) setActiveSession(key);
  }, [activeSessionKey, setActiveSession]);

  const handleCloseTab = useCallback((e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    closeTab(key);
  }, [closeTab]);

  // Find session info for a tab key
  const getSession = (key: string) => sessions.find((s) => s.key === key);

  return (
    <div className="shrink-0 flex items-center h-[40px] bg-[rgba(13,17,23,0.6)] backdrop-blur-xl border-b border-white/[0.04] overflow-hidden" role="tablist" aria-label="Chat sessions">
      {/* Scrollable tab bar */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center overflow-x-auto scrollbar-hidden gap-0.5 px-1"
      >
        <AnimatePresence initial={false}>
          {openTabs.map((key) => {
            const isActive = key === activeSessionKey;
            const isMain = key === MAIN_SESSION;
            const session = getSession(key);

            return (
              <motion.button
                key={key}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, width: 0 }}
                transition={{ duration: 0.15 }}
                role="tab"
                aria-selected={isActive}
                aria-label={tabLabel(session, key)}
                onClick={() => handleTabClick(key)}
                className={clsx(
                  'relative flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-[12px] font-medium whitespace-nowrap max-w-[200px] min-w-[80px] shrink-0 transition-colors',
                  isActive
                    ? 'text-aegis-text border-b-2 border-b-[#4EC9B0]'
                    : 'text-white/35 hover:bg-white/[0.04] hover:text-white/55',
                )}
              >
                {/* Icon */}
                {isMain ? (
                  <Shield size={12} className="text-aegis-primary shrink-0" />
                ) : (
                  <MessageSquare size={12} className="shrink-0 opacity-50" />
                )}

                {/* Label */}
                <span className="truncate">{tabLabel(session, key)}</span>

                {/* Close button (not for main) */}
                {!isMain && (
                  <span
                    onClick={(e) => handleCloseTab(e, key)}
                    className="ml-1 p-0.5 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
                    style={{ opacity: isActive ? 0.6 : undefined }}
                  >
                    <X size={10} />
                  </span>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* New Tab button + dropdown */}
      <div className="relative shrink-0 mx-1" ref={pickerRef}>
        <button
          onClick={handleOpenPicker}
          className={clsx(
            'flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-[11px] transition-colors',
            'text-white/25 hover:text-white/45 hover:bg-white/[0.04]',
            showPicker && 'bg-white/[0.06] text-white/50',
          )}
          title={t('chat.newTab', 'فتح جلسة')}
        >
          <Plus size={13} />
          <ChevronDown size={10} className={clsx('transition-transform', showPicker && 'rotate-180')} />
        </button>

        {/* Session picker dropdown */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full right-0 mt-1 w-64 max-h-64 overflow-y-auto rounded-xl glass shadow-float border border-aegis-border/30 z-50"
            >
              <div className="p-2">
                <div className="text-[10px] text-aegis-text-dim uppercase tracking-wider px-2 py-1 mb-1">
                  {t('chat.availableSessions', 'الجلسات المتاحة')}
                </div>

                {loadingSessions ? (
                  <div className="text-center py-4 text-[11px] text-aegis-text-dim">
                    {t('common.loading', 'جاري التحميل...')}
                  </div>
                ) : availableSessions.length === 0 ? (
                  <div className="text-center py-4 text-[11px] text-aegis-text-dim">
                    {t('chat.noOtherSessions', 'لا توجد جلسات أخرى')}
                  </div>
                ) : (
                  availableSessions.map((session) => (
                    <button
                      key={session.key}
                      onClick={() => handleSelectSession(session.key)}
                      className="w-full flex flex-col gap-0.5 px-3 py-2 rounded-lg text-start hover:bg-white/[0.05] transition-colors"
                    >
                      <span className="text-[12px] text-aegis-text font-medium truncate">
                        {session.label || session.key}
                      </span>
                      {session.kind && (
                        <span className="text-[10px] text-aegis-text-dim font-mono">
                          {session.kind}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
