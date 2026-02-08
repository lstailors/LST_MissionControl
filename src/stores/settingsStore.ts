import { create } from 'zustand';

// ═══════════════════════════════════════════════════════════
// Settings Store
// ═══════════════════════════════════════════════════════════

interface SettingsState {
  theme: 'dark' | 'light' | 'system';
  fontSize: number;
  sidebarOpen: boolean;
  sidebarWidth: number;
  settingsOpen: boolean;
  language: 'ar' | 'en';

  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setFontSize: (size: number) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setSettingsOpen: (open: boolean) => void;
  setLanguage: (lang: 'ar' | 'en') => void;
}

const savedLang = (localStorage.getItem('aegis-language') || 'ar') as 'ar' | 'en';

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'dark',
  fontSize: 14,
  sidebarOpen: true,
  sidebarWidth: 280,
  settingsOpen: false,
  language: savedLang,

  setTheme: (theme) => set({ theme }),
  setFontSize: (size) => set({ fontSize: size }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setLanguage: (lang) => set({ language: lang }),
}));
