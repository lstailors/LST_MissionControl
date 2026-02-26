// ═══════════════════════════════════════════════════════════
// Intelligence — Client Intelligence Dashboard
// Sections: Win-Back · Rising Stars · Life Events · Geo · Segments
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, AlertTriangle, TrendingUp, TrendingDown, Gift,
  MapPin, Crown, ChevronDown, ChevronRight, ArrowUpRight,
  Users, DollarSign, Calendar, Star, Gem, Award, Shield,
} from 'lucide-react';
import clsx from 'clsx';
import { GlassCard } from '@/components/shared/GlassCard';
import { PageTransition } from '@/components/shared/PageTransition';
import { useMissionControlStore, type ClientIntelRecord } from '@/stores/missionControlStore';
import { themeHex } from '@/utils/theme-colors';

// ── Helpers ──────────────────────────────────────────────

function fmtCurrency(v: number): string {
  return v >= 1000
    ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`
    : `$${v.toLocaleString()}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function daysUntil(iso: string): number {
  // Normalize to this year for birthday/anniversary comparison
  const now = new Date();
  const target = new Date(iso);
  target.setFullYear(now.getFullYear());
  if (target.getTime() < now.getTime() - 86400000) {
    target.setFullYear(now.getFullYear() + 1);
  }
  return Math.floor((target.getTime() - now.getTime()) / 86400000);
}

function isWithin30Days(iso: string | null): boolean {
  if (!iso) return false;
  const d = daysUntil(iso);
  return d >= 0 && d <= 30;
}

const VIP_CONFIG: Record<string, { icon: typeof Crown; color: string; bg: string }> = {
  Diamond: { icon: Gem,    color: 'text-cyan-400',    bg: 'bg-cyan-400/10' },
  Gold:    { icon: Crown,  color: 'text-yellow-400',  bg: 'bg-yellow-400/10' },
  Silver:  { icon: Award,  color: 'text-gray-300',    bg: 'bg-gray-300/10' },
  Bronze:  { icon: Shield, color: 'text-orange-400',  bg: 'bg-orange-400/10' },
};

// ── Section IDs ──────────────────────────────────────────

type SectionId = 'winback' | 'rising' | 'events' | 'geo' | 'segments';

const SECTIONS: { id: SectionId; label: string; icon: typeof Brain }[] = [
  { id: 'winback',  label: 'Win-Back',       icon: AlertTriangle },
  { id: 'rising',   label: 'Rising Stars',   icon: TrendingUp },
  { id: 'events',   label: 'Life Events',    icon: Gift },
  { id: 'geo',      label: 'Geography',      icon: MapPin },
  { id: 'segments', label: 'Segments',        icon: Crown },
];

// ── Glass style constants ────────────────────────────────

const GLASS_STYLE = {
  background: 'rgb(var(--aegis-overlay) / 0.025)',
  border: '1px solid rgb(var(--aegis-overlay) / 0.07)',
};

// ── Sub-components ───────────────────────────────────────

function SectionBadge({ count }: { count: number }) {
  return (
    <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-aegis-primary/10 text-aegis-primary border border-aegis-primary/20">
      {count}
    </span>
  );
}

function VipBadge({ tier }: { tier: string }) {
  const cfg = VIP_CONFIG[tier] || VIP_CONFIG.Bronze;
  const Icon = cfg.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', cfg.bg, cfg.color)}>
      <Icon size={10} />
      {tier}
    </span>
  );
}

function TrendIndicator({ trend }: { trend: number }) {
  if (trend === 0) return <span className="text-aegis-text-dim text-[11px]">--</span>;
  const isUp = trend > 0;
  return (
    <span className={clsx(
      'inline-flex items-center gap-0.5 text-[11px] font-semibold',
      isUp ? 'text-emerald-400' : 'text-red-400',
    )}>
      {isUp ? <ArrowUpRight size={12} /> : <TrendingDown size={12} />}
      {Math.abs(trend)}%
    </span>
  );
}

function TableHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={clsx(
      'text-left text-[10px] font-semibold text-aegis-text-muted uppercase tracking-wider py-2 px-3',
      className,
    )}>
      {children}
    </th>
  );
}

function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={clsx('py-2.5 px-3 text-[12px]', className)}>
      {children}
    </td>
  );
}

// ── Win-Back Section ─────────────────────────────────────

function WinBackSection({ clients }: { clients: ClientIntelRecord[] }) {
  const winBack = useMemo(
    () =>
      clients
        .filter((c) => daysSince(c.last_order_date) > 90)
        .sort((a, b) => b.lifetime_value - a.lifetime_value),
    [clients],
  );

  if (winBack.length === 0) {
    return (
      <div className="py-8 text-center text-aegis-text-dim text-[12px]">
        No win-back clients found. All clients are active!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[rgb(var(--aegis-overlay)/0.06)]">
            <TableHeader>Name</TableHeader>
            <TableHeader>Last Order</TableHeader>
            <TableHeader className="text-right">Days Ago</TableHeader>
            <TableHeader className="text-right">Total Orders</TableHeader>
            <TableHeader className="text-right">LTV</TableHeader>
            <TableHeader>VIP Tier</TableHeader>
          </tr>
        </thead>
        <tbody>
          {winBack.map((c, i) => (
            <motion.tr
              key={c.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className="border-b border-[rgb(var(--aegis-overlay)/0.03)] hover:bg-[rgb(var(--aegis-overlay)/0.02)] transition-colors"
            >
              <TableCell className="font-medium text-aegis-text">{c.name}</TableCell>
              <TableCell className="text-aegis-text-dim">{fmtDate(c.last_order_date)}</TableCell>
              <TableCell className="text-right">
                <span className="text-red-400 font-semibold">{daysSince(c.last_order_date)}d</span>
              </TableCell>
              <TableCell className="text-right text-aegis-text-dim">{c.total_orders}</TableCell>
              <TableCell className="text-right font-semibold text-aegis-text">
                {fmtCurrency(c.lifetime_value)}
              </TableCell>
              <TableCell><VipBadge tier={c.vip_tier} /></TableCell>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Rising Stars Section ─────────────────────────────────

function RisingStarsSection({ clients }: { clients: ClientIntelRecord[] }) {
  const rising = useMemo(
    () =>
      clients
        .filter((c) => c.trend > 10)
        .sort((a, b) => b.trend - a.trend),
    [clients],
  );

  if (rising.length === 0) {
    return (
      <div className="py-8 text-center text-aegis-text-dim text-[12px]">
        No rising star clients at this time.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[rgb(var(--aegis-overlay)/0.06)]">
            <TableHeader>Name</TableHeader>
            <TableHeader className="text-right">Orders</TableHeader>
            <TableHeader className="text-right">Avg Value</TableHeader>
            <TableHeader className="text-right">Trend</TableHeader>
            <TableHeader>VIP Tier</TableHeader>
          </tr>
        </thead>
        <tbody>
          {rising.map((c, i) => (
            <motion.tr
              key={c.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className="border-b border-[rgb(var(--aegis-overlay)/0.03)] hover:bg-[rgb(var(--aegis-overlay)/0.02)] transition-colors"
            >
              <TableCell className="font-medium text-aegis-text">
                <div className="flex items-center gap-2">
                  <Star size={13} className="text-yellow-400" />
                  {c.name}
                </div>
              </TableCell>
              <TableCell className="text-right text-aegis-text-dim">{c.total_orders}</TableCell>
              <TableCell className="text-right font-semibold text-aegis-text">
                {fmtCurrency(c.avg_order_value)}
              </TableCell>
              <TableCell className="text-right">
                <TrendIndicator trend={c.trend} />
              </TableCell>
              <TableCell><VipBadge tier={c.vip_tier} /></TableCell>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Life Events Section ──────────────────────────────────

interface LifeEvent {
  client: ClientIntelRecord;
  eventType: 'Birthday' | 'Anniversary';
  eventDate: string;
  daysAway: number;
}

function LifeEventsSection({ clients }: { clients: ClientIntelRecord[] }) {
  const events = useMemo(() => {
    const list: LifeEvent[] = [];
    for (const c of clients) {
      if (isWithin30Days(c.birthday)) {
        list.push({
          client: c,
          eventType: 'Birthday',
          eventDate: c.birthday!,
          daysAway: daysUntil(c.birthday!),
        });
      }
      if (isWithin30Days(c.anniversary)) {
        list.push({
          client: c,
          eventType: 'Anniversary',
          eventDate: c.anniversary!,
          daysAway: daysUntil(c.anniversary!),
        });
      }
    }
    return list.sort((a, b) => a.daysAway - b.daysAway);
  }, [clients]);

  if (events.length === 0) {
    return (
      <div className="py-8 text-center text-aegis-text-dim text-[12px]">
        No upcoming life events in the next 30 days.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {events.map((ev, i) => (
        <motion.div
          key={`${ev.client.id}-${ev.eventType}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.35 }}
          className="rounded-xl p-4 relative overflow-hidden"
          style={GLASS_STYLE}
        >
          {/* Accent glow */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: `linear-gradient(to right, transparent, ${
                ev.eventType === 'Birthday' ? themeHex('accent') : themeHex('primary')
              }40, transparent)`,
            }}
          />

          <div className="flex items-start justify-between mb-3">
            <div className={clsx(
              'w-9 h-9 rounded-lg flex items-center justify-center',
              ev.eventType === 'Birthday'
                ? 'bg-aegis-accent/10 text-aegis-accent'
                : 'bg-aegis-primary/10 text-aegis-primary',
            )}>
              {ev.eventType === 'Birthday' ? <Gift size={18} /> : <Calendar size={18} />}
            </div>
            <span className={clsx(
              'px-2 py-0.5 rounded-full text-[10px] font-bold',
              ev.daysAway <= 3
                ? 'bg-red-400/10 text-red-400 border border-red-400/20'
                : ev.daysAway <= 7
                  ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                  : 'bg-aegis-primary/10 text-aegis-primary border border-aegis-primary/20',
            )}>
              {ev.daysAway === 0 ? 'Today!' : ev.daysAway === 1 ? 'Tomorrow' : `${ev.daysAway} days`}
            </span>
          </div>

          <h4 className="text-[13px] font-semibold text-aegis-text mb-1">{ev.client.name}</h4>
          <p className="text-[11px] text-aegis-text-dim mb-2">
            {ev.eventType} &middot; {fmtShortDate(ev.eventDate)}
          </p>
          <div className="flex items-center gap-2">
            <VipBadge tier={ev.client.vip_tier} />
            <span className="text-[10px] text-aegis-text-muted">
              {ev.client.total_orders} orders &middot; {fmtCurrency(ev.client.lifetime_value)} LTV
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Geographic Distribution Section ──────────────────────

interface GeoGroup {
  location: string;
  city: string;
  state: string;
  count: number;
  revenue: number;
}

function GeoSection({ clients }: { clients: ClientIntelRecord[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, GeoGroup>();
    for (const c of clients) {
      const key = `${c.city}, ${c.state}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.revenue += c.lifetime_value;
      } else {
        map.set(key, {
          location: key,
          city: c.city,
          state: c.state,
          count: 1,
          revenue: c.lifetime_value,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [clients]);

  const maxRevenue = useMemo(
    () => Math.max(...groups.map((g) => g.revenue), 1),
    [groups],
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[rgb(var(--aegis-overlay)/0.06)]">
            <TableHeader>Location</TableHeader>
            <TableHeader className="text-right">Clients</TableHeader>
            <TableHeader className="text-right">Revenue</TableHeader>
            <TableHeader>Distribution</TableHeader>
          </tr>
        </thead>
        <tbody>
          {groups.map((g, i) => (
            <motion.tr
              key={g.location}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className="border-b border-[rgb(var(--aegis-overlay)/0.03)] hover:bg-[rgb(var(--aegis-overlay)/0.02)] transition-colors"
            >
              <TableCell>
                <div className="flex items-center gap-2 text-aegis-text font-medium">
                  <MapPin size={13} className="text-aegis-accent shrink-0" />
                  {g.location}
                </div>
              </TableCell>
              <TableCell className="text-right text-aegis-text-dim">
                <span className="inline-flex items-center gap-1">
                  <Users size={11} className="text-aegis-text-muted" />
                  {g.count}
                </span>
              </TableCell>
              <TableCell className="text-right font-semibold text-aegis-text">
                {fmtCurrency(g.revenue)}
              </TableCell>
              <TableCell className="w-[30%]">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-[rgb(var(--aegis-overlay)/0.04)] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(g.revenue / maxRevenue) * 100}%` }}
                      transition={{ delay: i * 0.06, duration: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(to right, ${themeHex('primary')}, ${themeHex('accent')})` }}
                    />
                  </div>
                  <span className="text-[10px] text-aegis-text-muted w-8 text-right">
                    {((g.revenue / maxRevenue) * 100).toFixed(0)}%
                  </span>
                </div>
              </TableCell>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Segment Analysis Section ─────────────────────────────

interface SegmentGroup {
  tier: string;
  count: number;
  revenue: number;
  avgValue: number;
}

function SegmentSection({ clients }: { clients: ClientIntelRecord[] }) {
  const segments = useMemo(() => {
    const map = new Map<string, SegmentGroup>();
    for (const c of clients) {
      const existing = map.get(c.vip_tier);
      if (existing) {
        existing.count += 1;
        existing.revenue += c.lifetime_value;
      } else {
        map.set(c.vip_tier, {
          tier: c.vip_tier,
          count: 1,
          revenue: c.lifetime_value,
        } as SegmentGroup);
      }
    }
    // Compute averages
    return Array.from(map.values())
      .map((s) => ({ ...s, avgValue: Math.round(s.revenue / s.count) }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [clients]);

  const totalRevenue = useMemo(
    () => segments.reduce((sum, s) => sum + s.revenue, 0),
    [segments],
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {segments.map((seg, i) => {
        const cfg = VIP_CONFIG[seg.tier] || VIP_CONFIG.Bronze;
        const Icon = cfg.icon;
        const pct = totalRevenue > 0 ? ((seg.revenue / totalRevenue) * 100).toFixed(1) : '0';
        return (
          <motion.div
            key={seg.tier}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
            className="rounded-xl p-4 relative overflow-hidden"
            style={GLASS_STYLE}
          >
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background: `linear-gradient(to right, transparent, ${themeHex('primary')}30, transparent)`,
              }}
            />

            <div className="flex items-center justify-between mb-3">
              <div className={clsx('flex items-center gap-2')}>
                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', cfg.bg)}>
                  <Icon size={16} className={cfg.color} />
                </div>
                <span className={clsx('text-[14px] font-bold', cfg.color)}>{seg.tier}</span>
              </div>
              <span className="text-[10px] text-aegis-text-muted font-mono">{pct}%</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-aegis-text-muted">Clients</span>
                <span className="text-[13px] font-semibold text-aegis-text">{seg.count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-aegis-text-muted">Total Revenue</span>
                <span className="text-[13px] font-semibold text-aegis-text">{fmtCurrency(seg.revenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-aegis-text-muted">Avg LTV</span>
                <span className="text-[13px] font-semibold text-aegis-text">{fmtCurrency(seg.avgValue)}</span>
              </div>

              {/* Revenue share bar */}
              <div className="h-1.5 rounded-full bg-[rgb(var(--aegis-overlay)/0.04)] overflow-hidden mt-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: i * 0.08 + 0.2, duration: 0.5, ease: 'easeOut' }}
                  className={clsx('h-full rounded-full', cfg.bg.replace('/10', '/60'))}
                  style={{ background: themeHex('primary') }}
                />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// IntelligencePage — Main Component
// ═══════════════════════════════════════════════════════════

export function IntelligencePage() {
  const { clients, seed } = useMissionControlStore();
  const [activeTab, setActiveTab] = useState<SectionId>('winback');

  useEffect(() => { seed(); }, [seed]);

  // ── Compute counts for each section ────────────────────
  const counts = useMemo(() => {
    const winBack = clients.filter((c) => daysSince(c.last_order_date) > 90).length;
    const rising = clients.filter((c) => c.trend > 10).length;
    const events = clients.reduce((n, c) => {
      if (isWithin30Days(c.birthday)) n++;
      if (isWithin30Days(c.anniversary)) n++;
      return n;
    }, 0);
    const geoSet = new Set(clients.map((c) => `${c.city}, ${c.state}`));
    const geo = geoSet.size;
    const segments = new Set(clients.map((c) => c.vip_tier)).size;
    return { winback: winBack, rising, events, geo, segments };
  }, [clients]);

  // ── Summary metric cards ───────────────────────────────
  const totalLTV = useMemo(
    () => clients.reduce((s, c) => s + c.lifetime_value, 0),
    [clients],
  );
  const avgOrderValue = useMemo(() => {
    if (clients.length === 0) return 0;
    return Math.round(clients.reduce((s, c) => s + c.avg_order_value, 0) / clients.length);
  }, [clients]);
  const activeClients = useMemo(
    () => clients.filter((c) => daysSince(c.last_order_date) <= 90).length,
    [clients],
  );

  // ── Render ─────────────────────────────────────────────
  return (
    <PageTransition className="p-5 space-y-5 max-w-[1280px] mx-auto overflow-y-auto h-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-aegis-text tracking-tight flex items-center gap-3">
            <Brain size={22} className="text-aegis-accent" />
            Client Intelligence
          </h1>
          <p className="text-[12px] text-aegis-text-muted mt-0.5">
            Deep insights across {clients.length} clients &middot; {fmtCurrency(totalLTV)} total lifetime value
          </p>
        </div>
      </div>

      {/* ── Top Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GlassCard delay={0.04} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-aegis-text-muted font-medium">
            <Users size={12} className="text-aegis-primary" />
            Total Clients
          </div>
          <div className="text-[22px] font-bold text-aegis-text leading-none">{clients.length}</div>
          <div className="text-[10px] text-aegis-text-dim">{activeClients} active (last 90d)</div>
        </GlassCard>

        <GlassCard delay={0.07} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-aegis-text-muted font-medium">
            <DollarSign size={12} className="text-aegis-accent" />
            Lifetime Revenue
          </div>
          <div className="text-[22px] font-bold text-aegis-text leading-none">{fmtCurrency(totalLTV)}</div>
          <div className="text-[10px] text-aegis-text-dim">across all tiers</div>
        </GlassCard>

        <GlassCard delay={0.10} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-aegis-text-muted font-medium">
            <TrendingUp size={12} style={{ color: themeHex('success') }} />
            Avg Order Value
          </div>
          <div className="text-[22px] font-bold text-aegis-text leading-none">{fmtCurrency(avgOrderValue)}</div>
          <div className="text-[10px] text-aegis-text-dim">per transaction</div>
        </GlassCard>

        <GlassCard delay={0.13} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-aegis-text-muted font-medium">
            <AlertTriangle size={12} style={{ color: themeHex('warning') }} />
            At Risk
          </div>
          <div className="text-[22px] font-bold text-aegis-text leading-none">{counts.winback}</div>
          <div className="text-[10px] text-aegis-text-dim">clients past 90 days</div>
        </GlassCard>
      </div>

      {/* ── Section Tabs ── */}
      <GlassCard delay={0.16} noPad>
        <div className="p-4 pb-0">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hidden border-b border-[rgb(var(--aegis-overlay)/0.06)]">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeTab === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveTab(sec.id)}
                  className={clsx(
                    'relative flex items-center gap-1.5 px-3.5 py-2.5 text-[12px] font-medium transition-colors whitespace-nowrap',
                    isActive
                      ? 'text-aegis-primary'
                      : 'text-aegis-text-muted hover:text-aegis-text-dim',
                  )}
                >
                  <Icon size={14} />
                  {sec.label}
                  <SectionBadge count={counts[sec.id]} />
                  {isActive && (
                    <motion.div
                      layoutId="intel-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-aegis-primary"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Section Content ── */}
        <div className="p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'winback' && <WinBackSection clients={clients} />}
              {activeTab === 'rising' && <RisingStarsSection clients={clients} />}
              {activeTab === 'events' && <LifeEventsSection clients={clients} />}
              {activeTab === 'geo' && <GeoSection clients={clients} />}
              {activeTab === 'segments' && <SegmentSection clients={clients} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </GlassCard>

    </PageTransition>
  );
}
