// ═══════════════════════════════════════════════════════════
// AppLayout — Main layout with TitleBar + NavSidebar + Content
// + Ambient background glow (from conceptual design)
// ═══════════════════════════════════════════════════════════

import { Outlet } from 'react-router-dom';
import { TitleBar } from '@/components/TitleBar';
import { NavSidebar } from '@/components/Layout/NavSidebar';
import { ChatWidget } from '@/components/Chat/ChatWidget';
import { CommandPalette } from '@/components/CommandPalette';
import { NotificationCenter } from '@/components/NotificationCenter';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useSettingsStore } from '@/stores/settingsStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { getDirection } from '@/i18n';

export function AppLayout() {
  const { language } = useSettingsStore();
  const dir = getDirection(language);

  // Register global keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-aegis-bg relative">
      {/* ── Ambient Background Glow (from conceptual JSX) ── */}
      <div className="ambient-glow-teal" />
      <div className="ambient-glow-purple" />

      <TitleBar />
      <div className="flex flex-1 min-h-0 relative z-[1]" dir={dir}>
        <NavSidebar />
        <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
      {/* Floating Chat Widget — available on all pages */}
      <ChatWidget />
      {/* Notification Center panel */}
      <NotificationCenter />
      {/* Command Palette overlay */}
      <CommandPalette />
    </div>
  );
}
