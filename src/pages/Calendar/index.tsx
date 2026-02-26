// ═══════════════════════════════════════════════════════════
// Calendar — Fittings & appointments from Supabase
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import { CalendarDays, RefreshCw, ChevronLeft, ChevronRight, Scissors, Clock } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { PageTransition } from '@/components/shared/PageTransition';
import { supabase } from '@/lib/supabase';
import clsx from 'clsx';

interface Fitting {
  id: string;
  customer_name?: string;
  date?: string;
  time?: string;
  type?: string;
  status?: string;
  notes?: string;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled:  'bg-aegis-primary/10 text-aegis-primary',
  confirmed:  'bg-aegis-success/10 text-aegis-success',
  completed:  'bg-aegis-success/10 text-aegis-success',
  cancelled:  'bg-aegis-danger/10 text-aegis-danger',
  no_show:    'bg-aegis-warning/10 text-aegis-warning',
};

function getStatusStyle(status?: string) {
  if (!status) return 'bg-[rgb(var(--aegis-overlay)/0.06)] text-aegis-text-dim';
  return STATUS_STYLES[status] || 'bg-[rgb(var(--aegis-overlay)/0.06)] text-aegis-text-dim';
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarPage() {
  const [fittings, setFittings] = useState<Fitting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const fetchFittings = useCallback(async () => {
    try {
      setError(null);
      // Fetch the whole month range
      const start = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-01`;
      const endDate = new Date(viewMonth.year, viewMonth.month + 1, 0);
      const end = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      const { data, error: err } = await supabase
        .from('fittings')
        .select('*')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (err) throw err;
      setFittings(data ?? []);
    } catch (e: any) {
      setError(e.message || 'Failed to load fittings');
    } finally {
      setLoading(false);
    }
  }, [viewMonth]);

  useEffect(() => { fetchFittings(); }, [fetchFittings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFittings();
    setTimeout(() => setRefreshing(false), 500);
  };

  const prevMonth = () => {
    setViewMonth(m => m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 });
  };
  const nextMonth = () => {
    setViewMonth(m => m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 });
  };

  // Group fittings by date for dot indicators
  const fittingsByDate = useMemo(() => {
    const map: Record<string, Fitting[]> = {};
    for (const f of fittings) {
      if (f.date) {
        if (!map[f.date]) map[f.date] = [];
        map[f.date].push(f);
      }
    }
    return map;
  }, [fittings]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewMonth.year, viewMonth.month, 1).getDay();
    const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [viewMonth]);

  const selectedFittings = fittingsByDate[selectedDate] || [];
  const today = new Date().toISOString().slice(0, 10);
  const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <PageTransition className="p-5 space-y-4 max-w-[1280px] mx-auto overflow-y-auto h-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-aegis-success/15 to-aegis-success/5 border border-aegis-success/20 flex items-center justify-center">
            <CalendarDays size={20} className="text-aegis-success" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-aegis-text tracking-tight">Calendar</h1>
            <p className="text-[11px] text-aegis-text-dim">Fittings & appointments</p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1.5 rounded-lg hover:bg-[rgb(var(--aegis-overlay)/0.06)] transition-colors"
        >
          <RefreshCw size={15} className={clsx('text-aegis-text-muted', refreshing && 'animate-spin text-aegis-success')} />
        </button>
      </div>

      {error && (
        <div className="text-[11px] text-aegis-danger bg-aegis-danger-surface border border-aegis-danger/20 rounded-xl px-4 py-2.5">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">

        {/* Mini Calendar */}
        <GlassCard delay={0.05}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-[rgb(var(--aegis-overlay)/0.06)] transition-colors">
              <ChevronLeft size={16} className="text-aegis-text-muted" />
            </button>
            <span className="text-[13px] font-semibold text-aegis-text">{monthLabel}</span>
            <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-[rgb(var(--aegis-overlay)/0.06)] transition-colors">
              <ChevronRight size={16} className="text-aegis-text-muted" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-[9px] font-bold text-aegis-text-dim py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />;
              const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === today;
              const hasFittings = !!fittingsByDate[dateStr];

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={clsx(
                    'relative aspect-square rounded-lg flex flex-col items-center justify-center text-[11px] font-medium transition-all',
                    isSelected
                      ? 'bg-aegis-primary/15 text-aegis-primary border border-aegis-primary/30'
                      : isToday
                      ? 'bg-aegis-success/8 text-aegis-success border border-aegis-success/20'
                      : 'text-aegis-text hover:bg-[rgb(var(--aegis-overlay)/0.04)]'
                  )}
                >
                  {day}
                  {hasFittings && (
                    <span className={clsx(
                      'absolute bottom-1 w-1 h-1 rounded-full',
                      isSelected ? 'bg-aegis-primary' : 'bg-aegis-accent'
                    )} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[rgb(var(--aegis-overlay)/0.05)]">
            <div className="text-[10px] text-aegis-text-muted">
              <span className="text-aegis-text font-semibold">{fittings.length}</span> this month
            </div>
            <div className="text-[10px] text-aegis-text-muted">
              <span className="text-aegis-text font-semibold">{selectedFittings.length}</span> on selected day
            </div>
          </div>
        </GlassCard>

        {/* Day Detail */}
        <GlassCard delay={0.1}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-aegis-primary" />
              <span className="text-[13px] font-semibold text-aegis-text">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
            {selectedDate === today && (
              <span className="text-[9px] font-bold text-aegis-success bg-aegis-success/10 px-2 py-0.5 rounded-md tracking-wider">
                TODAY
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-xl bg-[rgb(var(--aegis-overlay)/0.04)] animate-pulse" />
              ))}
            </div>
          ) : selectedFittings.length > 0 ? (
            <div className="space-y-2">
              {selectedFittings.map(f => (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[rgb(var(--aegis-overlay)/0.03)] transition-colors border border-[rgb(var(--aegis-overlay)/0.04)]">
                  <div className="w-[38px] h-[38px] rounded-xl bg-aegis-primary/10 flex items-center justify-center flex-shrink-0">
                    <Scissors size={15} className="text-aegis-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-aegis-text truncate">
                      {f.customer_name || 'Client'}
                    </div>
                    <div className="text-[10px] text-aegis-text-muted font-mono flex items-center gap-2 mt-0.5">
                      {f.time && <span>{f.time}</span>}
                      {f.type && <span className="opacity-60">{f.type}</span>}
                    </div>
                    {f.notes && (
                      <div className="text-[10px] text-aegis-text-dim mt-1 truncate">{f.notes}</div>
                    )}
                  </div>
                  <span className={clsx(
                    'text-[9px] font-bold px-2.5 py-1 rounded-lg tracking-wide flex-shrink-0',
                    getStatusStyle(f.status)
                  )}>
                    {(f.status || 'scheduled').toUpperCase().replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CalendarDays size={32} className="text-aegis-text-dim mx-auto mb-3 opacity-30" />
              <div className="text-[12px] text-aegis-text-dim">No fittings on this day</div>
            </div>
          )}
        </GlassCard>
      </div>
    </PageTransition>
  );
}
