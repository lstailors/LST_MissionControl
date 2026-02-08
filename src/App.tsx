import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TitleBar } from '@/components/TitleBar';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { ChatView } from '@/components/Chat/ChatView';
import { SettingsModal } from '@/components/Settings/SettingsModal';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { gateway } from '@/services/gateway';
import { getDirection, changeLanguage } from '@/i18n';

// ═══════════════════════════════════════════════════════════
// AEGIS Desktop — Main App
// ═══════════════════════════════════════════════════════════

export default function App() {
  const { i18n } = useTranslation();
  const { language } = useSettingsStore();
  const dir = getDirection(language);
  const {
    addMessage,
    updateStreamingMessage,
    finalizeStreamingMessage,
    setConnectionStatus,
    setIsTyping,
    setSessions,
    setTokenUsage,
  } = useChatStore();

  // ── Load Sessions from Gateway ──
  const loadSessions = useCallback(async () => {
    try {
      const result = await gateway.getSessions();
      const rawSessions = Array.isArray(result?.sessions) ? result.sessions : [];

      if (rawSessions.length > 0) {
        const sessions = rawSessions.map((s: any) => {
          const key = s.key || s.sessionKey || 'unknown';
          // Derive a friendly label
          let label = s.label || s.name || key;
          if (key === 'agent:main:main') label = 'الجلسة الرئيسية';
          else if (key.startsWith('agent:main:')) label = key.split(':').pop() || key;
          else if (s.kind === 'isolated') label = `🔄 ${s.label || key.split(':').pop()}`;

          return {
            key,
            label,
            lastMessage: s.lastMessage?.content
              ? (typeof s.lastMessage.content === 'string'
                  ? s.lastMessage.content
                  : ''
                ).substring(0, 60)
              : undefined,
            lastTimestamp: s.lastMessage?.timestamp || s.updatedAt,
            kind: s.kind,
          };
        });

        // Sort: main first, then by lastTimestamp
        sessions.sort((a: any, b: any) => {
          if (a.key === 'agent:main:main') return -1;
          if (b.key === 'agent:main:main') return 1;
          return 0;
        });

        setSessions(sessions);
      }
    } catch (err) {
      console.error('[App] Sessions load failed:', err);
    }
  }, [setSessions]);

  // ── Parse token usage from session status text ──
  const loadTokenUsage = useCallback(async () => {
    try {
      const result = await gateway.getSessions();

      const sessions = Array.isArray(result?.sessions)
        ? result.sessions
        : Array.isArray(result)
          ? result
          : [];

      const main = sessions.find((s: any) =>
        (s.key || s.sessionKey || '') === 'agent:main:main'
      );

      if (main) {
        const realUsed = main.totalTokens ?? 0;
        const realMax = main.contextTokens ?? main.maxTokens ?? 200000;
        const pct = realMax > 0 ? Math.round((realUsed / realMax) * 100) : 0;

        if (realUsed > 0 || realMax > 0) {
          setTokenUsage({
            contextTokens: realUsed,
            maxTokens: realMax,
            percentage: pct,
            compactions: main.compactions ?? 0,
          });
        }
      }
    } catch (err) {
      console.error('[TokenUsage] Error:', err);
    }
  }, [setTokenUsage]);

  // ── Gateway Setup ──
  useEffect(() => {
    gateway.setCallbacks({
      onMessage: (msg) => {
        setIsTyping(false);
        addMessage(msg);
      },
      onStreamChunk: (messageId, content, media) => {
        updateStreamingMessage(messageId, content, media ? { mediaUrl: media.mediaUrl, mediaType: media.mediaType } : undefined);
      },
      onStreamEnd: (messageId, content, media) => {
        finalizeStreamingMessage(messageId, content, media ? { mediaUrl: media.mediaUrl, mediaType: media.mediaType } : undefined);
        // Refresh token usage after each response
        loadTokenUsage();
      },
      onStatusChange: (status) => {
        setConnectionStatus(status);
        if (status.connected) {
          loadSessions();
          loadTokenUsage();
        }
      },
    });

    initConnection();
  }, []);

  const initConnection = async () => {
    try {
      if (window.aegis?.config) {
        const config = await window.aegis.config.get();
        const wsUrl = config.gatewayUrl || config.gatewayWsUrl || 'ws://127.0.0.1:18789';
        const token = config.gatewayToken || '';

        // Apply installer language on first run (no localStorage set yet)
        if (!localStorage.getItem('aegis-language') && config.installerLanguage) {
          const lang = config.installerLanguage as 'ar' | 'en';
          changeLanguage(lang);
          useSettingsStore.getState().setLanguage(lang);
        }

        gateway.connect(wsUrl, token);
      } else {
        gateway.connect('ws://127.0.0.1:18789', '');
      }
    } catch (err) {
      console.error('[App] Config load failed:', err);
      gateway.connect('ws://127.0.0.1:18789', '');
    }
  };

  // ── Keyboard Shortcuts ──
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Ctrl+R → Refresh (prevent browser reload)
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        // Dispatch custom event that ChatView listens to
        window.dispatchEvent(new CustomEvent('aegis:refresh'));
        return;
      }
      // Escape → close modals
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('aegis:escape'));
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-aegis-bg">
      <TitleBar />
      <div className="flex flex-1 min-h-0" dir={dir}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 relative">
          <ChatView />
        </div>
      </div>
      <SettingsModal />
    </div>
  );
}
