// ═══════════════════════════════════════════════════════════
// Invoices — KPI dashboard + full list sorted by age
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Receipt, RefreshCw, Search, DollarSign, AlertTriangle,
  CheckCircle2, Clock, TrendingUp,
} from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { PageTransition } from '@/components/shared/PageTransition';
import { supabase } from '@/lib/supabase';
import clsx from 'clsx';

interface Invoice {
  id: string;
  invoice_number?: string;
  customer_name?: string;
  customer_id?: string;
  amount?: number;
  status?: string;
  due_date?: string;
  created_at?: string;
  paid_at?: string;
  notes?: string;
}

const STATUS_STYLES: Record<string, string> = {
  paid:       'bg-aegis-success/10 text-aegis-success',
  unpaid:     'bg-aegis-warning/10 text-aegis-warning',
  overdue:    'bg-aegis-danger/10 text-aegis-danger',
  partial:    'bg-aegis-accent/10 text-aegis-accent',
  cancelled:  'bg-[rgb(var(--aegis-overlay)/0.06)] text-aegis-text-dim',
  draft:      'bg-[rgb(var(--aegis-overlay)/0.06)] text-aegis-text-dim',
};

function getStatusStyle(status?: string) {
  if (!status) return 'bg-[rgb(var(--aegis-overlay)/0.06)] text-aegis-text-dim';
  return STATUS_STYLES[status] || 'bg-[rgb(var(--aegis-overlay)/0.06)] text-aegis-text-dim';
}

function fmtMoney(cents: number) {
  const val = cents / 100;
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
  return `$${val.toFixed(0)}`;
}

function daysSince(dateStr?: string) {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86_400_000);
}

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(500);

      if (err) throw err;
      setInvoices(data ?? []);
    } catch (e: any) {
      setError(e.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInvoices();
    setTimeout(() => setRefreshing(false), 500);
  };

  // KPI calculations
  const kpis = useMemo(() => {
    const total = invoices.length;
    const outstanding = invoices.filter(i => i.status === 'unpaid' || i.status === 'overdue' || i.status === 'partial');
    const overdue = invoices.filter(i => {
      if (i.status === 'overdue') return true;
      if ((i.status === 'unpaid' || i.status === 'partial') && i.due_date) {
        return new Date(i.due_date) < new Date();
      }
      return false;
    });
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const paidThisMonth = invoices.filter(i =>
      i.status === 'paid' && i.paid_at && i.paid_at >= monthStart
    );

    const totalOutstandingAmount = outstanding.reduce((s, i) => s + (i.amount || 0), 0);
    const paidThisMonthAmount = paidThisMonth.reduce((s, i) => s + (i.amount || 0), 0);

    return {
      total,
      outstandingCount: outstanding.length,
      totalOutstandingAmount,
      overdueCount: overdue.length,
      paidThisMonthCount: paidThisMonth.length,
      paidThisMonthAmount,
    };
  }, [invoices]);

  // Sorted by age (oldest first — created_at ascending)
  const sorted = useMemo(() => {
    let list = [...invoices];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        (i.customer_name || '').toLowerCase().includes(q) ||
        (i.invoice_number || '').toLowerCase().includes(q) ||
        (i.status || '').toLowerCase().includes(q)
      );
    }
    // Already fetched in ascending order (oldest first)
    return list;
  }, [invoices, search]);

  return (
    <PageTransition className="p-5 space-y-4 max-w-[1280px] mx-auto overflow-y-auto h-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-aegis-warning/15 to-aegis-warning/5 border border-aegis-warning/20 flex items-center justify-center">
            <Receipt size={20} className="text-aegis-warning" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-aegis-text tracking-tight">Invoices</h1>
            <p className="text-[11px] text-aegis-text-dim">{invoices.length} total invoices</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-aegis-text-dim" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search invoices..."
              className="pl-8 pr-3 py-1.5 text-[11px] rounded-lg bg-[rgb(var(--aegis-overlay)/0.04)] border border-aegis-border text-aegis-text placeholder:text-aegis-text-dim focus:outline-none focus:border-aegis-warning/40 w-[180px]"
            />
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg hover:bg-[rgb(var(--aegis-overlay)/0.06)] transition-colors"
          >
            <RefreshCw size={15} className={clsx('text-aegis-text-muted', refreshing && 'animate-spin text-aegis-warning')} />
          </button>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GlassCard delay={0.05} className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10.5px] text-aegis-text-muted font-medium">
            <Receipt size={13} className="text-aegis-primary" />
            Total Invoices
          </div>
          {loading ? (
            <div className="h-7 w-12 rounded-md bg-[rgb(var(--aegis-overlay)/0.06)] animate-pulse" />
          ) : (
            <div className="text-[28px] font-bold text-aegis-text leading-none tracking-tight">
              {kpis.total}
            </div>
          )}
          <div className="text-[10px] text-aegis-text-dim">all time</div>
        </GlassCard>

        <GlassCard delay={0.08} className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10.5px] text-aegis-text-muted font-medium">
            <DollarSign size={13} className="text-aegis-warning" />
            Outstanding
          </div>
          {loading ? (
            <div className="h-7 w-16 rounded-md bg-[rgb(var(--aegis-overlay)/0.06)] animate-pulse" />
          ) : (
            <div className="text-[28px] font-bold text-aegis-text leading-none tracking-tight">
              {fmtMoney(kpis.totalOutstandingAmount)}
            </div>
          )}
          <div className="text-[10px] text-aegis-text-dim">{kpis.outstandingCount} unpaid</div>
        </GlassCard>

        <GlassCard delay={0.11} className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10.5px] text-aegis-text-muted font-medium">
            <AlertTriangle size={13} className="text-aegis-danger" />
            Overdue
          </div>
          {loading ? (
            <div className="h-7 w-8 rounded-md bg-[rgb(var(--aegis-overlay)/0.06)] animate-pulse" />
          ) : (
            <div className={clsx(
              'text-[28px] font-bold leading-none tracking-tight',
              kpis.overdueCount > 0 ? 'text-aegis-danger' : 'text-aegis-text'
            )}>
              {kpis.overdueCount}
            </div>
          )}
          <div className="text-[10px] text-aegis-text-dim">past due date</div>
        </GlassCard>

        <GlassCard delay={0.14} className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10.5px] text-aegis-text-muted font-medium">
            <TrendingUp size={13} className="text-aegis-success" />
            Paid This Month
          </div>
          {loading ? (
            <div className="h-7 w-16 rounded-md bg-[rgb(var(--aegis-overlay)/0.06)] animate-pulse" />
          ) : (
            <div className="text-[28px] font-bold text-aegis-success leading-none tracking-tight">
              {fmtMoney(kpis.paidThisMonthAmount)}
            </div>
          )}
          <div className="text-[10px] text-aegis-text-dim">{kpis.paidThisMonthCount} invoices</div>
        </GlassCard>
      </div>

      {error && (
        <div className="text-[11px] text-aegis-danger bg-aegis-danger-surface border border-aegis-danger/20 rounded-xl px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Invoice List (age order — oldest first) */}
      {loading ? (
        <GlassCard>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 rounded-xl bg-[rgb(var(--aegis-overlay)/0.04)] animate-pulse" />
            ))}
          </div>
        </GlassCard>
      ) : sorted.length === 0 ? (
        <GlassCard>
          <div className="text-center py-16">
            <Receipt size={36} className="text-aegis-text-dim mx-auto mb-3 opacity-40" />
            <div className="text-[13px] text-aegis-text-dim">
              {search ? 'No invoices match your search' : 'No invoices yet'}
            </div>
          </div>
        </GlassCard>
      ) : (
        <GlassCard noPad>
          {/* Table header */}
          <div className="flex items-center gap-4 px-5 py-2.5 border-b border-aegis-border text-[9px] font-bold text-aegis-text-dim tracking-wider">
            <span className="w-[60px]">INV #</span>
            <span className="flex-1">CUSTOMER</span>
            <span className="w-[70px] text-right">AMOUNT</span>
            <span className="w-[50px] text-center">AGE</span>
            <span className="w-[70px] text-center">DUE</span>
            <span className="w-[80px] text-center">STATUS</span>
          </div>

          <div className="divide-y divide-[rgb(var(--aegis-overlay)/0.04)]">
            {sorted.map((inv) => {
              const age = daysSince(inv.created_at);
              const isOverdue = (inv.status === 'unpaid' || inv.status === 'partial' || inv.status === 'overdue')
                && inv.due_date && new Date(inv.due_date) < new Date();

              return (
                <div
                  key={inv.id}
                  className={clsx(
                    'flex items-center gap-4 px-5 py-3 hover:bg-[rgb(var(--aegis-overlay)/0.03)] transition-colors',
                    isOverdue && 'bg-aegis-danger/[0.02]'
                  )}
                >
                  <span className="w-[60px] text-[10px] font-mono text-aegis-text-muted truncate">
                    {inv.invoice_number || `#${inv.id.slice(0, 6)}`}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-aegis-text truncate">
                      {inv.customer_name || 'Unnamed'}
                    </div>
                    {inv.notes && (
                      <div className="text-[9px] text-aegis-text-dim truncate mt-0.5">{inv.notes}</div>
                    )}
                  </div>

                  <span className="w-[70px] text-[12px] font-semibold text-aegis-text font-mono text-right">
                    {inv.amount != null ? `$${(inv.amount / 100).toFixed(0)}` : '—'}
                  </span>

                  <span className={clsx(
                    'w-[50px] text-[10px] font-mono text-center',
                    age > 60 ? 'text-aegis-danger' : age > 30 ? 'text-aegis-warning' : 'text-aegis-text-muted'
                  )}>
                    {age}d
                  </span>

                  <span className="w-[70px] text-[10px] font-mono text-aegis-text-muted text-center">
                    {inv.due_date
                      ? new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—'}
                  </span>

                  <span className={clsx(
                    'w-[80px] text-[9px] font-bold px-2 py-1 rounded-lg tracking-wide text-center',
                    getStatusStyle(isOverdue ? 'overdue' : inv.status)
                  )}>
                    {isOverdue ? 'OVERDUE' : (inv.status || 'unknown').toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </PageTransition>
  );
}
