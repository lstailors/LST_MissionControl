import { useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/Layout/AppLayout';
import { DashboardPage } from '@/pages/Dashboard';
import { ChatPage } from '@/pages/ChatPage';
import { WorkshopPage } from '@/pages/Workshop';
import { CostTrackerPage } from '@/pages/CostTracker';
import { CronMonitorPage } from '@/pages/CronMonitor';
import { AgentHubPage } from '@/pages/AgentHub';
import { MemoryExplorerPage } from '@/pages/MemoryExplorer';
import { SettingsPageFull } from '@/pages/SettingsPage';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { gateway } from '@/services/gateway';
import { notifications } from '@/services/notifications';
import { useNotificationStore } from '@/stores/notificationStore';
import { changeLanguage } from '@/i18n';

// ═══════════════════════════════════════════════════════════
// AEGIS Desktop v4.0 — Mission Control
// ═══════════════════════════════════════════════════════════

export default function App() {
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
          let label = s.label || s.name || key;
          if (key === 'agent:main:main') label = 'الجلسة الرئيسية';
          else if (key.startsWith('agent:main:')) label = key.split(':').pop() || key;
          return {
            key, label,
            lastMessage: s.lastMessage?.content?.substring?.(0, 60),
            lastTimestamp: s.lastMessage?.timestamp || s.updatedAt,
            kind: s.kind,
          };
        });
        setSessions(sessions);
      }
    } catch { /* silent */ }
  }, [setSessions]);

  // ── Token Usage ──
  const loadTokenUsage = useCallback(async () => {
    try {
      const result = await gateway.getSessions();
      const sessions = Array.isArray(result?.sessions) ? result.sessions : [];
      const main = sessions.find((s: any) => (s.key || '') === 'agent:main:main');
      if (main) {
        const used = main.totalTokens ?? 0;
        const max = main.contextTokens ?? 200000;
        const pct = max > 0 ? Math.round((used / max) * 100) : 0;
        if (used > 0 || max > 0) {
          setTokenUsage({ contextTokens: used, maxTokens: max, percentage: pct, compactions: main.compactions ?? 0 });
        }
      }
    } catch { /* silent */ }
  }, [setTokenUsage]);

  // ── Gateway Setup ──
  useEffect(() => {
    gateway.setCallbacks({
      onMessage: (msg) => {
        setIsTyping(false);
        addMessage(msg);
        // Notify if window not focused
        notifications.notifyIfBackground({
          title: 'AEGIS',
          body: msg.content.substring(0, 100),
          tag: 'aegis-message',
        });
        useNotificationStore.getState().addNotification({
          type: 'message',
          title: 'رسالة جديدة',
          body: msg.content.substring(0, 120),
        });
      },
      onStreamChunk: (messageId, content, media) => {
        updateStreamingMessage(messageId, content, media ? { mediaUrl: media.mediaUrl, mediaType: media.mediaType } : undefined);
      },
      onStreamEnd: (messageId, content, media) => {
        finalizeStreamingMessage(messageId, content, media ? { mediaUrl: media.mediaUrl, mediaType: media.mediaType } : undefined);
        loadTokenUsage();
        // Notify task completion if in background
        notifications.notifyIfBackground({
          title: 'AEGIS ✓',
          body: content.substring(0, 100),
          tag: 'aegis-complete',
        });
        useNotificationStore.getState().addNotification({
          type: 'task_complete',
          title: 'اكتمل الرد',
          body: content.substring(0, 120),
        });
      },
      onStatusChange: (status) => {
        setConnectionStatus(status);
        if (status.connected) {
          loadSessions();
          loadTokenUsage();
          useNotificationStore.getState().addNotification({
            type: 'connection',
            title: 'متصل',
            body: 'تم الاتصال بالـ Gateway بنجاح',
          });
        }
      },
    });

    initConnection();
    notifications.requestPermission();
  }, []);

  const initConnection = async () => {
    try {
      if (window.aegis?.config) {
        const config = await window.aegis.config.get();
        const wsUrl = config.gatewayUrl || config.gatewayWsUrl || 'ws://127.0.0.1:18789';
        const token = config.gatewayToken || '';
        if (!localStorage.getItem('aegis-language') && config.installerLanguage) {
          const lang = config.installerLanguage as 'ar' | 'en';
          changeLanguage(lang);
          useSettingsStore.getState().setLanguage(lang);
        }
        gateway.connect(wsUrl, token);
      } else {
        gateway.connect('ws://127.0.0.1:18789', '');
      }
    } catch {
      gateway.connect('ws://127.0.0.1:18789', '');
    }
  };

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/workshop" element={<WorkshopPage />} />
          <Route path="/costs" element={<CostTrackerPage />} />
          <Route path="/cron" element={<CronMonitorPage />} />
          <Route path="/agents" element={<AgentHubPage />} />
          <Route path="/memory" element={<MemoryExplorerPage />} />
          <Route path="/settings" element={<SettingsPageFull />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
