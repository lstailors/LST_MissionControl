import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════
// Supabase Store — Live data for L&S Mission Control Dashboard
// ═══════════════════════════════════════════════════════════

interface DashboardData {
  activeOrders: number;
  totalClients: number;
  revenueMTD: number;
  pendingApprovals: number;
  recentActivity: any[];
  todaysFittings: any[];
}

interface SupabaseState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  dashboard: DashboardData;
  loading: boolean;
  error: string | null;

  // Actions
  fetchDashboard: () => Promise<void>;
  subscribeRealtime: () => void;
  unsubscribeRealtime: () => void;
}

let channels: RealtimeChannel[] = [];

export const useSupabaseStore = create<SupabaseState>((set, get) => ({
  status: 'connecting',
  dashboard: {
    activeOrders: 0,
    totalClients: 0,
    revenueMTD: 0,
    pendingApprovals: 0,
    recentActivity: [],
    todaysFittings: [],
  },
  loading: true,
  error: null,

  fetchDashboard: async () => {
    try {
      set({ loading: true, error: null });

      const [
        ordersRes,
        clientsRes,
        revenueRes,
        approvalsRes,
        activityRes,
        fittingsRes,
      ] = await Promise.all([
        // Active orders: not delivered
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'delivered'),

        // Total clients
        supabase
          .from('customers')
          .select('*', { count: 'exact', head: true }),

        // Revenue MTD from square_payments
        supabase.rpc('get_revenue_mtd').maybeSingle(),

        // Pending approvals
        supabase
          .from('approval_queue')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),

        // Recent activity from approval_queue
        supabase
          .from('approval_queue')
          .select('id, type, title, status, priority, created_at, requested_by')
          .order('created_at', { ascending: false })
          .limit(10),

        // Today's fittings
        supabase
          .from('fittings')
          .select('id, customer_name, time, type, status, notes')
          .eq('date', new Date().toISOString().slice(0, 10))
          .order('time', { ascending: true }),
      ]);

      // Check for any critical errors (table-level)
      const hasError = [ordersRes, clientsRes, approvalsRes, activityRes, fittingsRes]
        .some(r => r.error && r.error.code !== 'PGRST116');

      if (hasError) {
        const firstErr = [ordersRes, clientsRes, approvalsRes, activityRes, fittingsRes]
          .find(r => r.error)?.error;
        console.warn('[Supabase] Query error:', firstErr);
      }

      // Revenue: try RPC first, fall back to direct query
      let revenue = revenueRes.data?.revenue ?? 0;
      if (revenueRes.error) {
        // RPC doesn't exist yet — fall back to client-side sum
        const fallback = await supabase
          .from('square_payments')
          .select('total_money_amount')
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

        if (fallback.data) {
          revenue = fallback.data.reduce(
            (sum: number, r: any) => sum + (Number(r.total_money_amount) || 0), 0
          );
        }
      }

      set({
        status: 'connected',
        loading: false,
        dashboard: {
          activeOrders: ordersRes.count ?? 0,
          totalClients: clientsRes.count ?? 0,
          revenueMTD: revenue,
          pendingApprovals: approvalsRes.count ?? 0,
          recentActivity: activityRes.data ?? [],
          todaysFittings: fittingsRes.data ?? [],
        },
      });
    } catch (err: any) {
      console.error('[Supabase] fetchDashboard failed:', err);
      set({ status: 'error', loading: false, error: err.message || 'Failed to fetch data' });
    }
  },

  subscribeRealtime: () => {
    // Clean up old subscriptions
    get().unsubscribeRealtime();

    const approvalChannel = supabase
      .channel('approval_queue_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'approval_queue' },
        () => { get().fetchDashboard(); }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase] Realtime: approval_queue subscribed');
        }
      });

    const ordersChannel = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => { get().fetchDashboard(); }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase] Realtime: orders subscribed');
        }
      });

    channels = [approvalChannel, ordersChannel];
  },

  unsubscribeRealtime: () => {
    channels.forEach(ch => supabase.removeChannel(ch));
    channels = [];
  },
}));
