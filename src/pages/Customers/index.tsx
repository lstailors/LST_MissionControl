// ═══════════════════════════════════════════════════════════
// Customers — All customers from Supabase
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { Users, RefreshCw, Search, UserCircle } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { PageTransition } from '@/components/shared/PageTransition';
import { supabase } from '@/lib/supabase';
import clsx from 'clsx';

interface Customer {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  created_at?: string;
  notes?: string;
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (err) throw err;
      setCustomers(data ?? []);
    } catch (e: any) {
      setError(e.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers();
    setTimeout(() => setRefreshing(false), 500);
  };

  const filtered = search
    ? customers.filter(c =>
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || '').toLowerCase().includes(search.toLowerCase())
      )
    : customers;

  // Generate initials for avatar
  const initials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  };

  // Consistent color from name
  const avatarColor = (name?: string) => {
    const colors = ['aegis-primary', 'aegis-accent', 'aegis-success', 'aegis-warning'];
    const idx = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
    return colors[idx];
  };

  return (
    <PageTransition className="p-5 space-y-4 max-w-[1280px] mx-auto overflow-y-auto h-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-aegis-accent/15 to-aegis-accent/5 border border-aegis-accent/20 flex items-center justify-center">
            <Users size={20} className="text-aegis-accent" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-aegis-text tracking-tight">All Customers</h1>
            <p className="text-[11px] text-aegis-text-dim">{filtered.length} clients in directory</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-aegis-text-dim" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="pl-8 pr-3 py-1.5 text-[11px] rounded-lg bg-[rgb(var(--aegis-overlay)/0.04)] border border-aegis-border text-aegis-text placeholder:text-aegis-text-dim focus:outline-none focus:border-aegis-accent/40 w-[180px]"
            />
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg hover:bg-[rgb(var(--aegis-overlay)/0.06)] transition-colors"
          >
            <RefreshCw size={15} className={clsx('text-aegis-text-muted', refreshing && 'animate-spin text-aegis-accent')} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <GlassCard>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-20 rounded-xl bg-[rgb(var(--aegis-overlay)/0.04)] animate-pulse" />
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
            <UserCircle size={36} className="text-aegis-text-dim mx-auto mb-3 opacity-40" />
            <div className="text-[13px] text-aegis-text-dim">
              {search ? 'No customers match your search' : 'No customers yet'}
            </div>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => {
            const color = avatarColor(c.name);
            return (
              <GlassCard key={c.id} delay={0} className="!p-4">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-[40px] h-[40px] rounded-xl flex items-center justify-center flex-shrink-0 text-[13px] font-bold',
                    `bg-${color}/10 text-${color} border border-${color}/15`
                  )}>
                    {initials(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-aegis-text truncate">
                      {c.name || 'Unnamed'}
                    </div>
                    {c.phone && (
                      <div className="text-[10px] text-aegis-text-muted font-mono mt-0.5 truncate">{c.phone}</div>
                    )}
                    {c.email && (
                      <div className="text-[10px] text-aegis-text-dim font-mono truncate">{c.email}</div>
                    )}
                  </div>
                </div>
                {c.created_at && (
                  <div className="text-[9px] text-aegis-text-dim font-mono mt-2.5 pt-2 border-t border-[rgb(var(--aegis-overlay)/0.05)]">
                    Client since {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </PageTransition>
  );
}
