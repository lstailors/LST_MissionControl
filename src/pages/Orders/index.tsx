// ═══════════════════════════════════════════════════════════
// Orders — All orders from Supabase
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, RefreshCw, Search, Package } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { PageTransition } from '@/components/shared/PageTransition';
import { supabase } from '@/lib/supabase';
import clsx from 'clsx';

interface Order {
  id: string;
  customer_name?: string;
  status?: string;
  type?: string;
  created_at?: string;
  total_amount?: number;
  notes?: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending:       'bg-aegis-warning/10 text-aegis-warning',
  in_progress:   'bg-aegis-primary/10 text-aegis-primary',
  ready:         'bg-aegis-accent/10 text-aegis-accent',
  delivered:     'bg-aegis-success/10 text-aegis-success',
  cancelled:     'bg-aegis-danger/10 text-aegis-danger',
};

function getStatusStyle(status?: string) {
  if (!status) return 'bg-[rgb(var(--aegis-overlay)/0.06)] text-aegis-text-dim';
  return STATUS_STYLES[status] || 'bg-[rgb(var(--aegis-overlay)/0.06)] text-aegis-text-dim';
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (err) throw err;
      setOrders(data ?? []);
    } catch (e: any) {
      setError(e.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setTimeout(() => setRefreshing(false), 500);
  };

  const filtered = search
    ? orders.filter(o =>
        (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.status || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.type || '').toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  return (
    <PageTransition className="p-5 space-y-4 max-w-[1280px] mx-auto overflow-y-auto h-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-aegis-primary/15 to-aegis-primary/5 border border-aegis-primary/20 flex items-center justify-center">
            <ClipboardList size={20} className="text-aegis-primary" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-aegis-text tracking-tight">All Orders</h1>
            <p className="text-[11px] text-aegis-text-dim">{filtered.length} orders</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-aegis-text-dim" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search orders..."
              className="pl-8 pr-3 py-1.5 text-[11px] rounded-lg bg-[rgb(var(--aegis-overlay)/0.04)] border border-aegis-border text-aegis-text placeholder:text-aegis-text-dim focus:outline-none focus:border-aegis-primary/40 w-[180px]"
            />
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg hover:bg-[rgb(var(--aegis-overlay)/0.06)] transition-colors"
          >
            <RefreshCw size={15} className={clsx('text-aegis-text-muted', refreshing && 'animate-spin text-aegis-primary')} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <GlassCard>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 rounded-xl bg-[rgb(var(--aegis-overlay)/0.04)] animate-pulse" />
            ))}
          </div>
        </GlassCard>
      ) : error ? (
        <GlassCard>
          <div className="text-[12px] text-aegis-danger text-center py-8">{error}</div>
        </GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard>
          <div className="text-center py-16">
            <Package size={36} className="text-aegis-text-dim mx-auto mb-3 opacity-40" />
            <div className="text-[13px] text-aegis-text-dim">
              {search ? 'No orders match your search' : 'No orders yet'}
            </div>
          </div>
        </GlassCard>
      ) : (
        <GlassCard noPad>
          <div className="divide-y divide-aegis-border">
            {filtered.map((order, i) => (
              <div
                key={order.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-[rgb(var(--aegis-overlay)/0.03)] transition-colors"
              >
                <div className="w-[38px] h-[38px] rounded-xl bg-aegis-primary/8 border border-aegis-primary/10 flex items-center justify-center flex-shrink-0">
                  <ClipboardList size={16} className="text-aegis-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold text-aegis-text truncate">
                    {order.customer_name || 'Unnamed Order'}
                  </div>
                  <div className="text-[10px] text-aegis-text-muted font-mono flex items-center gap-2 mt-0.5">
                    {order.type && <span>{order.type}</span>}
                    {order.created_at && (
                      <span className="opacity-60">
                        {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>

                {order.total_amount != null && (
                  <span className="text-[11px] font-semibold text-aegis-text font-mono flex-shrink-0">
                    ${(order.total_amount / 100).toFixed(0)}
                  </span>
                )}

                <span className={clsx(
                  'text-[9px] font-bold px-2.5 py-1 rounded-lg tracking-wide flex-shrink-0',
                  getStatusStyle(order.status)
                )}>
                  {(order.status || 'unknown').toUpperCase().replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </PageTransition>
  );
}
