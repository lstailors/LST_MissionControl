import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════
// Auth Store — Supabase authentication state for L&S Mission Control
// ═══════════════════════════════════════════════════════════

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      set({
        user: session?.user ?? null,
        session,
        isAuthenticated: !!session,
        isLoading: false,
      });

      // Listen for auth state changes (token refresh, sign-out, etc.)
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          user: session?.user ?? null,
          session,
          isAuthenticated: !!session,
        });
      });
    } catch (err) {
      console.error('[Auth] Failed to initialize:', err);
      set({ isLoading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      set({
        user: data.user,
        session: data.session,
        isAuthenticated: true,
      });
      return { error: null };
    } catch (err: any) {
      return { error: `[${err.name}] ${err.message}` || 'Sign in failed' };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, isAuthenticated: false });
  },
}));
