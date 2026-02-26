// ═══════════════════════════════════════════════════════════
// Il Registro — Decision Log page
// Layout: Table (70%) + Analytics Sidebar (30%)
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gavel, Check, X, RotateCcw, Search, Filter, ChevronDown,
  ChevronRight, Clock, Zap, Shield, TrendingUp, BarChart3,
  ToggleLeft, ToggleRight, Bot, Tag, Sparkles, ArrowUpDown,
  AlertCircle, Eye,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { PageTransition } from '@/components/shared/PageTransition';
import { useMissionControlStore } from '@/stores/missionControlStore';
import type { DecisionEntry, DecisionPattern } from '@/stores/missionControlStore';
import { themeHex, themeAlpha } from '@/utils/theme-colors';

// ── Constants ────────────────────────────────────────────

const DECISION_CONFIG = {
  approved: {
    label: 'Approved',
    icon: Check,
    symbol: '\u2713',
    colorVar: 'success' as const,
  },
  rejected: {
    label: 'Rejected',
    icon: X,
    symbol: '\u2717',
    colorVar: 'danger' as const,
  },
  revised: {
    label: 'Revised',
    icon: RotateCcw,
    symbol: '\u21BB',
    colorVar: 'warning' as const,
  },
};

type DecisionFilter = 'all' | 'approved' | 'rejected' | 'revised';

// ── Helpers ──────────────────────────────────────────────

function formatTimeTaken(seconds: number): string {
  if (seconds === 0) return 'Auto';
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

function formatAmount(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Decision badge ──────────────────────────────────────

function DecisionBadge({ decision }: { decision: DecisionEntry['decision'] }) {
  const cfg = DECISION_CONFIG[decision];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md"
      style={{
        background: themeAlpha(cfg.colorVar, 0.08),
        color: themeHex(cfg.colorVar),
      }}
    >
      {cfg.symbol} {cfg.label}
    </span>
  );
}

// ── Category badge ──────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const label = category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{
        background: 'rgb(var(--aegis-overlay) / 0.05)',
        color: 'rgb(var(--aegis-text-muted))',
        border: '1px solid rgb(var(--aegis-overlay) / 0.06)',
      }}
    >
      {label}
    </span>
  );
}

// ── Decision row ────────────────────────────────────────

interface DecisionRowProps {
  entry: DecisionEntry;
  agentName: string;
  agentEmoji: string;
  isExpanded: boolean;
  onToggle: () => void;
  delay?: number;
}

function DecisionRow({ entry, agentName, agentEmoji, isExpanded, onToggle, delay = 0 }: DecisionRowProps) {
  const cfg = DECISION_CONFIG[entry.decision];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="rounded-xl border transition-all"
      style={{
        background: isExpanded
          ? themeAlpha(cfg.colorVar, 0.02)
          : 'rgb(var(--aegis-overlay) / 0.015)',
        borderColor: isExpanded
          ? themeAlpha(cfg.colorVar, 0.12)
          : 'rgb(var(--aegis-overlay) / 0.06)',
      }}
    >
      {/* Row header */}
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-[1fr_90px_100px_80px_1.4fr_80px_70px_24px] items-center gap-2 px-4 py-3 text-left"
      >
        {/* Time */}
        <span className="text-[10px] text-aegis-text-muted font-mono truncate">
          {formatDistanceToNow(new Date(entry.decided_at), { addSuffix: true })}
        </span>

        {/* Decision badge */}
        <DecisionBadge decision={entry.decision} />

        {/* Category */}
        <CategoryBadge category={entry.category} />

        {/* Agent */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[12px] shrink-0">{agentEmoji}</span>
          <span className="text-[11px] text-aegis-text truncate">{agentName}</span>
        </div>

        {/* Title */}
        <div className="min-w-0">
          <span className="text-[11px] font-semibold text-aegis-text truncate block">
            {entry.title}
          </span>
          {entry.auto_decision && (
            <span
              className="inline-flex items-center gap-0.5 text-[8px] font-bold mt-0.5"
              style={{ color: themeHex('accent') }}
            >
              <Zap size={8} /> AUTO
            </span>
          )}
        </div>

        {/* Amount */}
        <span className="text-[11px] font-mono text-aegis-text-muted text-right">
          {formatAmount(entry.amount)}
        </span>

        {/* Time to decide */}
        <span
          className="text-[10px] font-mono text-right"
          style={{
            color: entry.time_to_decision_seconds === 0
              ? themeHex('accent')
              : entry.time_to_decision_seconds > 60
                ? themeHex('warning')
                : 'rgb(var(--aegis-text-muted))',
          }}
        >
          {formatTimeTaken(entry.time_to_decision_seconds)}
        </span>

        {/* Expand indicator */}
        {isExpanded ? (
          <ChevronDown size={12} className="text-aegis-text-dim" />
        ) : (
          <ChevronRight size={12} className="text-aegis-text-dim" />
        )}
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-1 border-t space-y-3"
              style={{ borderColor: 'rgb(var(--aegis-overlay) / 0.06)' }}
            >
              {/* Summary */}
              {entry.summary && (
                <div>
                  <span className="text-[9px] font-bold text-aegis-text-dim uppercase tracking-wider">
                    Summary
                  </span>
                  <p className="text-[12px] text-aegis-text-secondary leading-relaxed mt-1">
                    {entry.summary}
                  </p>
                </div>
              )}

              {/* Reasoning */}
              {entry.reasoning && (
                <div>
                  <span className="text-[9px] font-bold text-aegis-text-dim uppercase tracking-wider">
                    Reasoning
                  </span>
                  <p className="text-[12px] text-aegis-text-secondary leading-relaxed mt-1">
                    {entry.reasoning}
                  </p>
                </div>
              )}

              {/* Tags */}
              {entry.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag size={10} className="text-aegis-text-dim" />
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                      style={{
                        background: themeAlpha('primary', 0.06),
                        color: themeHex('primary'),
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Pattern rule card ───────────────────────────────────

interface PatternRuleProps {
  pattern: DecisionPattern;
  agentName: string;
  agentEmoji: string;
  onToggle: () => void;
}

function PatternRule({ pattern, agentName, agentEmoji, onToggle }: PatternRuleProps) {
  const actionConfig = {
    approve: { colorVar: 'success' as const, label: 'Auto-Approve' },
    reject: { colorVar: 'danger' as const, label: 'Auto-Reject' },
    flag: { colorVar: 'warning' as const, label: 'Auto-Flag' },
  };
  const cfg = actionConfig[pattern.auto_action];

  return (
    <div
      className="rounded-xl p-3.5 border transition-all"
      style={{
        background: pattern.is_active
          ? themeAlpha(cfg.colorVar, 0.03)
          : 'rgb(var(--aegis-overlay) / 0.015)',
        borderColor: pattern.is_active
          ? themeAlpha(cfg.colorVar, 0.1)
          : 'rgb(var(--aegis-overlay) / 0.06)',
        opacity: pattern.is_active ? 1 : 0.7,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-aegis-text leading-tight">
            {pattern.pattern_name}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[11px] shrink-0">{agentEmoji}</span>
            <span className="text-[10px] text-aegis-text-muted">{agentName}</span>
            <span className="opacity-30 text-aegis-text-dim">·</span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{
                background: themeAlpha(cfg.colorVar, 0.08),
                color: themeHex(cfg.colorVar),
              }}
            >
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-[9px] text-aegis-text-dim font-mono">
            <span>
              Confidence: <span className="text-aegis-text-muted">
                {(pattern.confidence_score * 100).toFixed(0)}%
              </span>
            </span>
            <span>
              Matches: <span className="text-aegis-text-muted">{pattern.total_matches}</span>
            </span>
            <span>
              Overrides: <span className="text-aegis-text-muted">{pattern.total_overrides}</span>
            </span>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={onToggle}
          className="shrink-0 mt-0.5 transition-colors"
          title={pattern.is_active ? 'Disable rule' : 'Enable rule'}
        >
          {pattern.is_active ? (
            <ToggleRight size={22} style={{ color: themeHex(cfg.colorVar) }} />
          ) : (
            <ToggleLeft size={22} className="text-aegis-text-dim" />
          )}
        </button>
      </div>
    </div>
  );
}

// ── Insight stat ────────────────────────────────────────

interface InsightStatProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  colorVar: 'primary' | 'accent' | 'success' | 'warning' | 'danger';
}

function InsightStat({ label, value, icon: Icon, colorVar }: InsightStatProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: themeAlpha(colorVar, 0.08),
          border: `1px solid ${themeAlpha(colorVar, 0.12)}`,
        }}
      >
        <Icon size={12} style={{ color: themeHex(colorVar) }} />
      </div>
      <div className="min-w-0">
        <div className="text-[14px] font-bold text-aegis-text leading-none">
          {value}
        </div>
        <div className="text-[8px] text-aegis-text-dim uppercase tracking-wider mt-0.5">
          {label}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DecisionsPage — Main Component
// ═══════════════════════════════════════════════════════════

export function DecisionsPage() {
  const { decisions, patterns, agents, seed, togglePattern } = useMissionControlStore();

  useEffect(() => {
    seed();
  }, [seed]);

  // ── State ──────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterDecision, setFilterDecision] = useState<DecisionFilter>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Agent helpers ──────────────────────────────────────
  const agentLookup = useMemo(() => {
    const map = new Map<string, { name: string; emoji: string }>();
    agents.forEach((a) => map.set(a.slug, { name: a.name, emoji: a.emoji }));
    return map;
  }, [agents]);

  const getAgent = useCallback(
    (slug: string) => agentLookup.get(slug) ?? { name: slug, emoji: '🤖' },
    [agentLookup],
  );

  // ── Filtered & sorted decisions ────────────────────────
  const sortedDecisions = useMemo(() => {
    let result = [...decisions].sort(
      (a, b) => new Date(b.decided_at).getTime() - new Date(a.decided_at).getTime(),
    );

    if (filterDecision !== 'all') {
      result = result.filter((d) => d.decision === filterDecision);
    }

    if (filterAgent !== 'all') {
      result = result.filter((d) => d.agent_slug === filterAgent);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.summary.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [decisions, filterDecision, filterAgent, searchQuery]);

  // ── Analytics ─────────────────────────────────────────
  const analytics = useMemo(() => {
    const total = decisions.length;
    const approved = decisions.filter((d) => d.decision === 'approved').length;
    const rejected = decisions.filter((d) => d.decision === 'rejected').length;
    const revised = decisions.filter((d) => d.decision === 'revised').length;
    const auto = decisions.filter((d) => d.auto_decision).length;
    const manual = total - auto;
    const avgTime = total > 0
      ? decisions.reduce((s, d) => s + d.time_to_decision_seconds, 0) / total
      : 0;
    const approvalRate = total > 0 ? (approved / total) * 100 : 0;

    // Category breakdown
    const byCategory = new Map<string, number>();
    decisions.forEach((d) => {
      byCategory.set(d.category, (byCategory.get(d.category) || 0) + 1);
    });

    // Auto-approval candidates: categories with >80% approval rate and >2 decisions
    const candidates: { category: string; agentSlug: string; rate: number; count: number }[] = [];
    const catAgentMap = new Map<string, { approved: number; total: number; agentSlug: string }>();
    decisions.forEach((d) => {
      const key = `${d.category}::${d.agent_slug}`;
      const entry = catAgentMap.get(key) || { approved: 0, total: 0, agentSlug: d.agent_slug };
      entry.total++;
      if (d.decision === 'approved') entry.approved++;
      catAgentMap.set(key, entry);
    });
    catAgentMap.forEach((val, key) => {
      const cat = key.split('::')[0];
      if (val.total >= 2) {
        const rate = (val.approved / val.total) * 100;
        if (rate >= 80) {
          candidates.push({ category: cat, agentSlug: val.agentSlug, rate, count: val.total });
        }
      }
    });

    return { total, approved, rejected, revised, auto, manual, avgTime, approvalRate, byCategory, candidates };
  }, [decisions]);

  // Unique agents in decisions for filter
  const decisionAgents = useMemo(() => {
    const slugs = [...new Set(decisions.map((d) => d.agent_slug))];
    return slugs.map((s) => ({ slug: s, ...getAgent(s) }));
  }, [decisions, getAgent]);

  // ── Empty state ───────────────────────────────────────
  if (decisions.length === 0) {
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
            <Gavel size={28} style={{ color: themeAlpha('primary', 0.3) }} />
          </div>
          <h3 className="text-[16px] font-bold text-aegis-text mb-1">
            No decisions yet
          </h3>
          <p className="text-[12px] text-aegis-text-dim leading-relaxed">
            Il Registro tracks every approval, rejection, and revision.
            Decisions will appear here as agents submit work for review.
          </p>
        </div>
      </PageTransition>
    );
  }

  // ── Main render ───────────────────────────────────────
  return (
    <PageTransition className="p-6 h-full overflow-y-auto">
      <div className="max-w-[1400px] mx-auto">

        {/* ═══ Header ═══ */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[28px] font-extrabold text-aegis-text tracking-tight flex items-center gap-3">
              <Gavel size={24} style={{ color: themeHex('primary') }} />
              Il Registro
            </h1>
            <p className="text-[11px] text-aegis-text-dim uppercase tracking-wider mt-1">
              The Decision Log
              <span className="mx-1.5 opacity-30">·</span>
              <span style={{ color: themeHex('success') }}>{analytics.approved} approved</span>
              <span className="mx-1 opacity-30">·</span>
              <span style={{ color: themeHex('danger') }}>{analytics.rejected} rejected</span>
              <span className="mx-1 opacity-30">·</span>
              <span style={{ color: themeHex('warning') }}>{analytics.revised} revised</span>
            </p>
          </div>
        </div>

        {/* ═══ Main Layout: Table + Sidebar ═══ */}
        <div className="flex gap-5">

          {/* ── LEFT: Decision Table (70%) ── */}
          <div className="flex-[7] min-w-0 space-y-3">

            {/* Filters bar */}
            <div
              className="flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 border"
              style={{
                background: 'rgb(var(--aegis-overlay) / 0.02)',
                borderColor: 'rgb(var(--aegis-overlay) / 0.06)',
              }}
            >
              {/* Decision type filters */}
              <div className="flex items-center gap-1">
                {(['all', 'approved', 'rejected', 'revised'] as const).map((f) => {
                  const isActive = filterDecision === f;
                  const cfg = f === 'all'
                    ? { colorVar: 'primary' as const, label: 'All' }
                    : { ...DECISION_CONFIG[f], label: DECISION_CONFIG[f].label };

                  return (
                    <button
                      key={f}
                      onClick={() => setFilterDecision(f)}
                      className="text-[9px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider transition-colors"
                      style={
                        isActive
                          ? {
                              background: themeAlpha(cfg.colorVar, 0.1),
                              color: themeHex(cfg.colorVar),
                              border: `1px solid ${themeAlpha(cfg.colorVar, 0.15)}`,
                            }
                          : {
                              border: '1px solid transparent',
                              color: 'rgb(var(--aegis-text-dim))',
                            }
                      }
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                {/* Agent filter */}
                <select
                  value={filterAgent}
                  onChange={(e) => setFilterAgent(e.target.value)}
                  className="text-[10px] px-2 py-1.5 rounded-lg cursor-pointer"
                  style={{
                    background: 'rgb(var(--aegis-overlay) / 0.03)',
                    border: '1px solid rgb(var(--aegis-overlay) / 0.06)',
                    color: filterAgent !== 'all' ? themeHex('primary') : 'rgb(var(--aegis-text-dim))',
                  }}
                >
                  <option value="all">All Agents</option>
                  {decisionAgents.map((a) => (
                    <option key={a.slug} value={a.slug}>
                      {a.emoji} {a.name}
                    </option>
                  ))}
                </select>

                {/* Search */}
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-aegis-text-dim" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search decisions..."
                    className="text-[10px] pl-7 pr-3 py-1.5 rounded-lg text-aegis-text placeholder:text-aegis-text-dim focus:outline-none focus:ring-1 focus:ring-aegis-primary/30 w-[160px]"
                    style={{
                      background: 'rgb(var(--aegis-overlay) / 0.03)',
                      border: '1px solid rgb(var(--aegis-overlay) / 0.06)',
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-aegis-text-dim hover:text-aegis-text-muted"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table header */}
            <div
              className="grid grid-cols-[1fr_90px_100px_80px_1.4fr_80px_70px_24px] items-center gap-2 px-4 py-2 text-[8px] font-bold text-aegis-text-dim uppercase tracking-widest"
            >
              <span>Time</span>
              <span>Decision</span>
              <span>Category</span>
              <span>Agent</span>
              <span>Title</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Speed</span>
              <span />
            </div>

            {/* Decision rows */}
            <div className="space-y-1.5">
              {sortedDecisions.length > 0 ? (
                sortedDecisions.map((entry, i) => {
                  const agent = getAgent(entry.agent_slug);
                  return (
                    <DecisionRow
                      key={entry.id}
                      entry={entry}
                      agentName={agent.name}
                      agentEmoji={agent.emoji}
                      isExpanded={expandedId === entry.id}
                      onToggle={() =>
                        setExpandedId(expandedId === entry.id ? null : entry.id)
                      }
                      delay={Math.min(i * 0.03, 0.3)}
                    />
                  );
                })
              ) : (
                <div
                  className="rounded-xl border p-8 text-center"
                  style={{
                    background: 'rgb(var(--aegis-overlay) / 0.015)',
                    borderColor: 'rgb(var(--aegis-overlay) / 0.06)',
                  }}
                >
                  <Eye size={20} className="text-aegis-text-dim mx-auto mb-2" />
                  <p className="text-[12px] text-aegis-text-dim">
                    No decisions match the current filters.
                  </p>
                </div>
              )}
            </div>

            {/* Results count */}
            {sortedDecisions.length > 0 && (
              <div className="text-[10px] text-aegis-text-dim text-center pt-2">
                Showing {sortedDecisions.length} of {decisions.length} decisions
              </div>
            )}
          </div>

          {/* ── RIGHT: Analytics Sidebar (30%) ── */}
          <div className="flex-[3] min-w-[280px] max-w-[340px] space-y-4">

            {/* Decision Insights */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border p-5 relative overflow-hidden"
              style={{
                background: 'rgb(var(--aegis-overlay) / 0.025)',
                borderColor: 'rgb(var(--aegis-overlay) / 0.08)',
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={14} style={{ color: themeHex('accent') }} />
                <span className="text-[12px] font-bold text-aegis-text">Decision Patterns</span>
              </div>

              <div className="space-y-3.5">
                <InsightStat
                  label="Total Decisions"
                  value={analytics.total}
                  icon={Gavel}
                  colorVar="primary"
                />
                <InsightStat
                  label="Approval Rate"
                  value={`${analytics.approvalRate.toFixed(0)}%`}
                  icon={TrendingUp}
                  colorVar="success"
                />
                <InsightStat
                  label="Avg Time to Decide"
                  value={formatTimeTaken(Math.round(analytics.avgTime))}
                  icon={Clock}
                  colorVar="warning"
                />
                <InsightStat
                  label="Auto-Decided"
                  value={analytics.auto}
                  icon={Zap}
                  colorVar="accent"
                />
                <InsightStat
                  label="Manual Decisions"
                  value={analytics.manual}
                  icon={Shield}
                  colorVar="primary"
                />
              </div>

              {/* Mini decision breakdown bar */}
              <div className="mt-4 pt-3 border-t" style={{ borderColor: 'rgb(var(--aegis-overlay) / 0.06)' }}>
                <div className="text-[8px] font-bold text-aegis-text-dim uppercase tracking-widest mb-2">
                  Breakdown
                </div>
                <div className="flex rounded-full overflow-hidden h-2">
                  {analytics.approved > 0 && (
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${(analytics.approved / analytics.total) * 100}%`,
                        background: themeHex('success'),
                      }}
                      title={`Approved: ${analytics.approved}`}
                    />
                  )}
                  {analytics.revised > 0 && (
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${(analytics.revised / analytics.total) * 100}%`,
                        background: themeHex('warning'),
                      }}
                      title={`Revised: ${analytics.revised}`}
                    />
                  )}
                  {analytics.rejected > 0 && (
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${(analytics.rejected / analytics.total) * 100}%`,
                        background: themeHex('danger'),
                      }}
                      title={`Rejected: ${analytics.rejected}`}
                    />
                  )}
                </div>
                <div className="flex justify-between mt-1.5 text-[8px] text-aegis-text-dim">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: themeHex('success') }} />
                    {analytics.approved}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: themeHex('warning') }} />
                    {analytics.revised}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: themeHex('danger') }} />
                    {analytics.rejected}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Auto-Approval Candidates */}
            {analytics.candidates.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl border p-5 relative overflow-hidden"
                style={{
                  background: 'rgb(var(--aegis-overlay) / 0.025)',
                  borderColor: 'rgb(var(--aegis-overlay) / 0.08)',
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} style={{ color: themeHex('warning') }} />
                  <span className="text-[12px] font-bold text-aegis-text">
                    Auto-Approval Candidates
                  </span>
                </div>
                <p className="text-[10px] text-aegis-text-dim mb-3 leading-relaxed">
                  These agent + category pairs have a high approval rate and could be automated.
                </p>
                <div className="space-y-2">
                  {analytics.candidates.map((c) => {
                    const agent = getAgent(c.agentSlug);
                    const catLabel = c.category.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
                    return (
                      <div
                        key={`${c.category}-${c.agentSlug}`}
                        className="flex items-center justify-between rounded-lg p-2.5 border"
                        style={{
                          background: themeAlpha('warning', 0.03),
                          borderColor: themeAlpha('warning', 0.08),
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[12px] shrink-0">{agent.emoji}</span>
                          <div className="min-w-0">
                            <div className="text-[10px] font-semibold text-aegis-text truncate">
                              {agent.name} — {catLabel}
                            </div>
                            <div className="text-[9px] text-aegis-text-dim">
                              {c.count} decisions
                            </div>
                          </div>
                        </div>
                        <span
                          className="text-[10px] font-bold shrink-0"
                          style={{ color: themeHex('success') }}
                        >
                          {c.rate.toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Active Auto-Rules */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border p-5 relative overflow-hidden"
              style={{
                background: 'rgb(var(--aegis-overlay) / 0.025)',
                borderColor: 'rgb(var(--aegis-overlay) / 0.08)',
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot size={14} style={{ color: themeHex('primary') }} />
                  <span className="text-[12px] font-bold text-aegis-text">
                    Auto-Rules
                  </span>
                </div>
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                  style={{
                    background: themeAlpha('success', 0.08),
                    color: themeHex('success'),
                  }}
                >
                  {patterns.filter((p) => p.is_active).length} active
                </span>
              </div>

              {patterns.length > 0 ? (
                <div className="space-y-2.5">
                  {patterns.map((pattern) => {
                    const agent = getAgent(pattern.agent_slug);
                    return (
                      <PatternRule
                        key={pattern.id}
                        pattern={pattern}
                        agentName={agent.name}
                        agentEmoji={agent.emoji}
                        onToggle={() => togglePattern(pattern.id)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertCircle size={18} className="text-aegis-text-dim mx-auto mb-2" />
                  <p className="text-[11px] text-aegis-text-dim">
                    No automation rules configured yet.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="h-6" />
      </div>
    </PageTransition>
  );
}
