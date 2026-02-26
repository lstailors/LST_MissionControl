// ═══════════════════════════════════════════════════════════
// Il Giornale — Daily Brief page
// Newspaper-style layout, single column, max-width 800px
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Newspaper, DollarSign, ShoppingBag, Clock, AlertTriangle,
  Scissors, CheckCircle2, ChevronDown, ChevronRight, Eye,
  EyeOff, Calendar, Gift, Star, Sparkles, ArrowUp,
  TrendingUp, Users, BookOpen,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { PageTransition } from '@/components/shared/PageTransition';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { themeHex, themeAlpha } from '@/utils/theme-colors';

// ── Helpers ──────────────────────────────────────────────

function formatBriefDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function urgencyColor(urgency: string): { bg: string; border: string; text: string } {
  switch (urgency) {
    case 'high':
      return {
        bg: themeAlpha('danger', 0.06),
        border: themeAlpha('danger', 0.2),
        text: themeHex('danger'),
      };
    case 'medium':
      return {
        bg: themeAlpha('warning', 0.06),
        border: themeAlpha('warning', 0.2),
        text: themeHex('warning'),
      };
    default:
      return {
        bg: themeAlpha('primary', 0.06),
        border: themeAlpha('primary', 0.2),
        text: themeHex('primary'),
      };
  }
}

// ── Metric stat card ────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  colorVar: 'primary' | 'accent' | 'danger' | 'warning' | 'success';
  delay?: number;
}

function StatCard({ icon: Icon, label, value, colorVar, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 rounded-xl p-3.5 border transition-colors"
      style={{
        background: themeAlpha(colorVar, 0.04),
        borderColor: themeAlpha(colorVar, 0.12),
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: themeAlpha(colorVar, 0.1),
          border: `1px solid ${themeAlpha(colorVar, 0.15)}`,
        }}
      >
        <Icon size={16} style={{ color: themeHex(colorVar) }} />
      </div>
      <div className="min-w-0">
        <div className="text-[18px] font-bold text-aegis-text leading-none">
          {value}
        </div>
        <div className="text-[9px] text-aegis-text-dim uppercase tracking-wider mt-0.5">
          {label}
        </div>
      </div>
    </motion.div>
  );
}

// ── Agent highlight row ─────────────────────────────────

interface AgentHighlightProps {
  agentSlug: string;
  summary: string;
  tasksCompleted: number;
  agents: { slug: string; name: string; emoji: string }[];
  delay?: number;
}

function AgentHighlight({ agentSlug, summary, tasksCompleted, agents, delay = 0 }: AgentHighlightProps) {
  const agent = agents.find((a) => a.slug === agentSlug);
  const name = agent?.name ?? agentSlug;
  const emoji = agent?.emoji ?? '🤖';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay }}
      className="flex items-start gap-3 py-2.5"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[14px]"
        style={{
          background: themeAlpha('accent', 0.08),
          border: `1px solid ${themeAlpha('accent', 0.12)}`,
        }}
      >
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-aegis-text">{name}</span>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
            style={{
              background: themeAlpha('success', 0.08),
              color: themeHex('success'),
            }}
          >
            {tasksCompleted} done
          </span>
        </div>
        <p className="text-[11px] text-aegis-text-secondary leading-relaxed mt-0.5">
          {summary}
        </p>
      </div>
    </motion.div>
  );
}

// ── Priority item card ──────────────────────────────────

interface PriorityItemProps {
  type: string;
  title: string;
  description: string;
  urgency: string;
  delay?: number;
}

function PriorityItem({ type, title, description, urgency, delay = 0 }: PriorityItemProps) {
  const colors = urgencyColor(urgency);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-xl p-4 relative overflow-hidden"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Gold/accent left border accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: themeHex('warning') }}
      />
      <div className="flex items-start gap-3 pl-2">
        <AlertTriangle size={14} style={{ color: colors.text }} className="shrink-0 mt-0.5" />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-aegis-text">{title}</span>
            <span
              className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                background: themeAlpha('warning', 0.1),
                color: themeHex('warning'),
              }}
            >
              {urgency}
            </span>
            <span
              className="text-[8px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                background: 'rgb(var(--aegis-overlay) / 0.04)',
                color: 'rgb(var(--aegis-text-dim))',
              }}
            >
              {type}
            </span>
          </div>
          <p className="text-[11px] text-aegis-text-secondary mt-1">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Client event card ───────────────────────────────────

interface ClientEventProps {
  name: string;
  eventType: string;
  eventDate: string;
  details: string;
  delay?: number;
}

function ClientEvent({ name, eventType, eventDate, details, delay = 0 }: ClientEventProps) {
  const daysUntil = Math.ceil((new Date(eventDate).getTime() - Date.now()) / 86400000);
  const isPast = daysUntil < 0;
  const isSoon = daysUntil >= 0 && daysUntil <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-xl p-4 border transition-colors hover:border-aegis-border-hover"
      style={{
        background: 'rgb(var(--aegis-overlay) / 0.025)',
        borderColor: 'rgb(var(--aegis-overlay) / 0.06)',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: eventType === 'Birthday'
                ? themeAlpha('accent', 0.08)
                : themeAlpha('primary', 0.08),
              border: `1px solid ${eventType === 'Birthday'
                ? themeAlpha('accent', 0.12)
                : themeAlpha('primary', 0.12)}`,
            }}
          >
            {eventType === 'Birthday' ? (
              <Gift size={16} style={{ color: themeHex('accent') }} />
            ) : (
              <Calendar size={16} style={{ color: themeHex('primary') }} />
            )}
          </div>
          <div>
            <div className="text-[12px] font-semibold text-aegis-text">{name}</div>
            <div className="text-[10px] text-aegis-text-muted mt-0.5">
              {eventType} — {new Date(eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <p className="text-[11px] text-aegis-text-secondary mt-1">{details}</p>
          </div>
        </div>
        <span
          className={clsx(
            'text-[9px] font-bold px-2 py-0.5 rounded-md shrink-0',
          )}
          style={{
            background: isPast
              ? themeAlpha('danger', 0.08)
              : isSoon
                ? themeAlpha('warning', 0.08)
                : themeAlpha('primary', 0.06),
            color: isPast
              ? themeHex('danger')
              : isSoon
                ? themeHex('warning')
                : themeHex('primary'),
          }}
        >
          {isPast ? 'Passed' : daysUntil === 0 ? 'Today' : `${daysUntil}d away`}
        </span>
      </div>
    </motion.div>
  );
}

// ── Archive brief row ───────────────────────────────────

interface ArchiveBriefRowProps {
  brief: {
    id: string;
    brief_date: string;
    headline: string;
    body_text: string;
    metrics_snapshot: {
      revenue_yesterday: number;
      active_orders: number;
      agent_tasks_completed: number;
    };
    is_read: boolean;
    created_at: string;
  };
  agents: { slug: string; name: string; emoji: string }[];
  isExpanded: boolean;
  onToggle: () => void;
}

function ArchiveBriefRow({ brief, agents, isExpanded, onToggle }: ArchiveBriefRowProps) {
  return (
    <div
      className="rounded-xl border transition-all"
      style={{
        background: 'rgb(var(--aegis-overlay) / 0.02)',
        borderColor: isExpanded
          ? themeAlpha('primary', 0.15)
          : 'rgb(var(--aegis-overlay) / 0.06)',
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: brief.is_read
                ? 'rgb(var(--aegis-overlay) / 0.04)'
                : themeAlpha('accent', 0.08),
              border: `1px solid ${brief.is_read
                ? 'rgb(var(--aegis-overlay) / 0.06)'
                : themeAlpha('accent', 0.12)}`,
            }}
          >
            {brief.is_read ? (
              <Eye size={12} className="text-aegis-text-dim" />
            ) : (
              <Sparkles size={12} style={{ color: themeHex('accent') }} />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-aegis-text truncate">
              {brief.headline}
            </div>
            <div className="text-[10px] text-aegis-text-dim">
              {formatBriefDate(brief.brief_date)}
              <span className="mx-1.5 opacity-30">·</span>
              {formatDistanceToNow(new Date(brief.created_at), { addSuffix: true })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] font-mono text-aegis-text-muted hidden sm:inline">
            {formatCurrency(brief.metrics_snapshot.revenue_yesterday)}
          </span>
          {isExpanded ? (
            <ChevronDown size={14} className="text-aegis-text-dim" />
          ) : (
            <ChevronRight size={14} className="text-aegis-text-dim" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-1 border-t"
              style={{ borderColor: 'rgb(var(--aegis-overlay) / 0.06)' }}
            >
              <p className="text-[12px] text-aegis-text-secondary leading-relaxed whitespace-pre-wrap">
                {brief.body_text}
              </p>
              <div className="flex gap-3 mt-3 text-[10px] text-aegis-text-muted font-mono">
                <span>Orders: {brief.metrics_snapshot.active_orders}</span>
                <span className="opacity-30">·</span>
                <span>Tasks: {brief.metrics_snapshot.agent_tasks_completed}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BriefPage — Main Component
// ═══════════════════════════════════════════════════════════

export function BriefPage() {
  const { briefs, agents, seed, markBriefRead } = useMissionControlStore();

  useEffect(() => {
    seed();
  }, [seed]);

  const [expandedArchiveId, setExpandedArchiveId] = useState<string | null>(null);

  // Separate today's brief from the archive
  const today = new Date().toISOString().slice(0, 10);

  const todayBrief = useMemo(
    () => briefs.find((b) => b.brief_date === today) ?? briefs[0] ?? null,
    [briefs, today],
  );

  const archiveBriefs = useMemo(
    () => briefs.filter((b) => b.id !== todayBrief?.id).sort(
      (a, b) => new Date(b.brief_date).getTime() - new Date(a.brief_date).getTime(),
    ),
    [briefs, todayBrief],
  );

  const agentMap = useMemo(
    () => agents.map((a) => ({ slug: a.slug, name: a.name, emoji: a.emoji })),
    [agents],
  );

  // ── Empty state ───────────────────────────────────────
  if (briefs.length === 0) {
    return (
      <PageTransition className="p-6 h-full flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: themeAlpha('primary', 0.06),
              border: `2px dashed ${themeAlpha('primary', 0.15)}`,
            }}
          >
            <Newspaper size={28} style={{ color: themeAlpha('primary', 0.3) }} />
          </div>
          <h3 className="text-[16px] font-bold text-aegis-text mb-1">
            No briefs yet
          </h3>
          <p className="text-[12px] text-aegis-text-dim leading-relaxed">
            Il Giornale will appear here once Maestro generates the first daily brief.
            Check back tomorrow morning.
          </p>
        </div>
      </PageTransition>
    );
  }

  // ── Main render ───────────────────────────────────────
  const m = todayBrief!.metrics_snapshot;

  return (
    <PageTransition className="p-6 h-full overflow-y-auto">
      <div className="max-w-[800px] mx-auto space-y-6">

        {/* ═══ Header ═══ */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-extrabold text-aegis-text tracking-tight flex items-center gap-3">
              <Newspaper size={24} style={{ color: themeHex('primary') }} />
              Il Giornale
            </h1>
            <p className="text-[11px] text-aegis-text-dim uppercase tracking-wider mt-1">
              The Daily Brief
            </p>
          </div>
          <div className="text-[10px] text-aegis-text-muted font-mono">
            {formatDistanceToNow(new Date(todayBrief!.created_at), { addSuffix: true })}
          </div>
        </div>

        {/* ═══ Today's Brief — Hero Card ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-2xl border overflow-hidden"
          style={{
            background: 'var(--aegis-card-bg, rgb(var(--aegis-overlay) / 0.03))',
            borderColor: themeAlpha('primary', 0.12),
          }}
        >
          {/* Top light edge */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          {/* Date banner */}
          <div
            className="px-6 py-3 border-b flex items-center justify-between"
            style={{
              background: themeAlpha('primary', 0.04),
              borderColor: themeAlpha('primary', 0.08),
            }}
          >
            <div className="flex items-center gap-2">
              <Calendar size={13} style={{ color: themeHex('primary') }} />
              <span className="text-[11px] font-semibold text-aegis-text">
                {formatBriefDate(todayBrief!.brief_date)}
              </span>
            </div>
            {!todayBrief!.is_read && (
              <span
                className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md animate-pulse"
                style={{
                  background: themeAlpha('accent', 0.1),
                  color: themeHex('accent'),
                }}
              >
                NEW
              </span>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Headline */}
            <h2 className="text-[22px] font-extrabold text-aegis-text tracking-tight leading-tight">
              {todayBrief!.headline}
            </h2>

            {/* Body text */}
            <p className="text-[13px] text-aegis-text-secondary leading-[1.75] whitespace-pre-wrap">
              {todayBrief!.body_text}
            </p>

            {/* ── Metrics Snapshot ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} style={{ color: themeHex('primary') }} />
                <span className="text-[11px] font-bold text-aegis-text uppercase tracking-wider">
                  Today's Numbers
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <StatCard
                  icon={DollarSign}
                  label="Revenue Yesterday"
                  value={formatCurrency(m.revenue_yesterday)}
                  colorVar="success"
                  delay={0.05}
                />
                <StatCard
                  icon={ShoppingBag}
                  label="Active Orders"
                  value={m.active_orders}
                  colorVar="primary"
                  delay={0.1}
                />
                <StatCard
                  icon={Clock}
                  label="Pending Approvals"
                  value={m.pending_approvals}
                  colorVar="warning"
                  delay={0.15}
                />
                <StatCard
                  icon={AlertTriangle}
                  label="Overdue Orders"
                  value={m.overdue_orders}
                  colorVar="danger"
                  delay={0.2}
                />
                <StatCard
                  icon={Scissors}
                  label="Fittings Today"
                  value={m.fittings_today}
                  colorVar="accent"
                  delay={0.25}
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Tasks Completed"
                  value={m.agent_tasks_completed}
                  colorVar="success"
                  delay={0.3}
                />
              </div>
            </div>

            {/* ── Agent Highlights ── */}
            {todayBrief!.agent_highlights.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users size={14} style={{ color: themeHex('accent') }} />
                  <span className="text-[11px] font-bold text-aegis-text uppercase tracking-wider">
                    Agent Highlights
                  </span>
                </div>
                <div
                  className="rounded-xl border divide-y"
                  style={{
                    background: 'rgb(var(--aegis-overlay) / 0.02)',
                    borderColor: 'rgb(var(--aegis-overlay) / 0.06)',
                  }}
                >
                  <div className="divide-y" style={{ borderColor: 'rgb(var(--aegis-overlay) / 0.04)' }}>
                    {todayBrief!.agent_highlights.map((h, i) => (
                      <div key={h.agent_slug} className="px-4">
                        <AgentHighlight
                          agentSlug={h.agent_slug}
                          summary={h.summary}
                          tasksCompleted={h.tasks_completed}
                          agents={agentMap}
                          delay={0.1 + i * 0.05}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Priority Items ── */}
            {todayBrief!.priority_items.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Star size={14} style={{ color: themeHex('warning') }} />
                  <span className="text-[11px] font-bold text-aegis-text uppercase tracking-wider">
                    Priority Items
                  </span>
                </div>
                <div className="space-y-2.5">
                  {todayBrief!.priority_items.map((item, i) => (
                    <PriorityItem
                      key={`${item.type}-${item.title}`}
                      type={item.type}
                      title={item.title}
                      description={item.description}
                      urgency={item.urgency}
                      delay={0.1 + i * 0.05}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Client Events ── */}
            {todayBrief!.client_events.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Gift size={14} style={{ color: themeHex('accent') }} />
                  <span className="text-[11px] font-bold text-aegis-text uppercase tracking-wider">
                    Upcoming Client Events
                  </span>
                </div>
                <div className="space-y-2.5">
                  {todayBrief!.client_events.map((ev, i) => (
                    <ClientEvent
                      key={`${ev.name}-${ev.event_type}`}
                      name={ev.name}
                      eventType={ev.event_type}
                      eventDate={ev.event_date}
                      details={ev.details}
                      delay={0.1 + i * 0.05}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Mark as Read ── */}
            {!todayBrief!.is_read && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center pt-2"
              >
                <button
                  onClick={() => markBriefRead(todayBrief!.id)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: themeHex('primary'),
                    color: 'var(--aegis-bg)',
                    boxShadow: `0 4px 16px ${themeAlpha('primary', 0.2)}`,
                  }}
                >
                  <CheckCircle2 size={14} />
                  Mark as Read
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ═══ Archive Section ═══ */}
        {archiveBriefs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={14} className="text-aegis-text-dim" />
              <span className="text-[12px] font-bold text-aegis-text-muted uppercase tracking-wider">
                Archive
              </span>
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                style={{
                  background: 'rgb(var(--aegis-overlay) / 0.04)',
                  color: 'rgb(var(--aegis-text-dim))',
                }}
              >
                {archiveBriefs.length} past {archiveBriefs.length === 1 ? 'brief' : 'briefs'}
              </span>
            </div>
            <div className="space-y-2">
              {archiveBriefs.map((brief) => (
                <ArchiveBriefRow
                  key={brief.id}
                  brief={brief}
                  agents={agentMap}
                  isExpanded={expandedArchiveId === brief.id}
                  onToggle={() =>
                    setExpandedArchiveId(
                      expandedArchiveId === brief.id ? null : brief.id,
                    )
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Bottom spacer */}
        <div className="h-6" />
      </div>
    </PageTransition>
  );
}
