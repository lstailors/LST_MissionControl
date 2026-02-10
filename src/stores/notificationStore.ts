import { create } from 'zustand';

// ═══════════════════════════════════════════════════════════
// Notification Store — History of notifications
// ═══════════════════════════════════════════════════════════

export type NotificationType = 'message' | 'task_complete' | 'budget_warning' | 'connection';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

interface NotificationState {
  notifications: AppNotification[];
  panelOpen: boolean;
  addNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAllRead: () => void;
  clearAll: () => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  panelOpen: false,

  addNotification: (n) => set((state) => ({
    notifications: [
      { ...n, id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: new Date().toISOString(), read: false },
      ...state.notifications,
    ].slice(0, 20),
  })),

  markAllRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, read: true })),
  })),

  clearAll: () => set({ notifications: [], panelOpen: false }),

  setPanelOpen: (open) => set({ panelOpen: open }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),

  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
