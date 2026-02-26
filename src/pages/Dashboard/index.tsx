// ═══════════════════════════════════════════════════════════
// Dashboard — L&S Mission Control
// Sections: Top Bar → L&S Business Cards → Fittings + Activity
//           → AI Cost Chart + Agents → Quick Actions + Sessions
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  Heart, Mail, Calendar, RefreshCw, BarChart3, FileText,
  Wifi, WifiOff, Bot, Shield, Activity, Zap, ChevronRight,
  TrendingUp, TrendingDown, DollarSign, Cpu,
  Scissors, Users, ClipboardCheck, Clock,
} from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { PageTransition } from '@/components/shared/PageTransition';
import { StatusDot } from '@/components/shared/StatusDot';
import { Sparkline } from '@/components/shared/Sparkline';
import { useChatStore } from '@/stores/chatStore';
import { useGatewayDataStore, refreshAll } from '@/stores/gatewayDataStore';
import { useSupabaseStore } from '@/stores/supabaseStore';
import { gateway } from '@/services/gateway';
import clsx from 'clsx';
import { themeHex, themeAlpha, dataColor } from '@/utils/theme-colors';

import {
  ContextRing, QuickAction, SessionItem, FeedItem, AgentItem,
  fmtTokens, fmtCost, fmtCostShort, timeAgo, fmtUptime,
} from './components';

// ── Helpers ──────────────────────────────────────────────────

const fmtRevenue = (n: number) => {
  if (n >= 100_000) return `$${(n / 1_000).toFixed(0)}k`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
};

// ── Agent emoji + display name helpers ───────────────────────

const AGENT_EMOJIS: Record<string, string> = {
  main:       '✂️',
  hilali:     '⚽',
  pipeline:   '📦',
  researcher: '🔍',
  consultant: '💡',
  coder:      '💻',
};

const getAgentEmoji = (id: string) =>
  AGENT_EMOJIS[id.toLowerCase()] ?? '🤖';

const getAgentName = (id: string) => {
  const names: Record<string, string> = {
    main: 'Main Agent', hilali: 'Hilali', pipeline: 'Pipeline',
    researcher: 'Researcher', consultant: 'Consultant', coder: 'Coder',
  };
  return names[id.toLowerCase()] ?? id;
};

// ── Skeleton loader ──────────────────────────────────────────

function SkeletonValue({ width = 60 }: { width?: number }) {
  return (
    <div
      className="h-6 rounded-md bg-[rgb(var(--aegis-overlay)/0.06)] animate-pulse"
      style={{ width }}
    />
  );
}

// ── Tooltip for recharts ─────────────────────────────────────

function CostTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const input  = payload.find((p: any) => p.dataKey === 'input')?.value  || 0;
  const output = payload.find((p: any) => p.dataKey === 'output')?.value || 0;
  return (
    <div className="bg-aegis-card border border-aegis-border rounded-xl p-2.5 text-[11px] shadow-lg">
      <div className="text-aegis-text-dim font-mono mb-1.5">{label}</div>
      <div className="flex items-center gap-1.5 text-aegis-accent">
        <span className="w-2 h-2 rounded-full bg-aegis-accent" />
        Input: {fmtCost(input)}
      </div>
      <div className="flex items-center gap-1.5 text-aegis-primary">
        <span className="w-2 h-2 rounded-full bg-aegis-primary" />
        Output: {fmtCost(output)}
      </div>
      <div className="text-aegis-text font-semibold mt-1.5 pt-1.5 border-t border-[rgb(var(--aegis-overlay)/0.06)]">
        Total: {fmtCost(input + output)}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// DashboardPage — Main component
// ════════════════════════════════════════════════════════════
export function DashboardPage() {
  const { t }      = useTranslation();
  const navigate   = useNavigate();
  const { connected, tokenUsage } = useChatStore();

  // ── Supabase data ─────────────────────────────────────────
  const sbStatus   = useSupabaseStore((s) => s.status);
  const sbLoading  = useSupabaseStore((s) => s.loading);
  const sbError    = useSupabaseStore((s) => s.error);
  const dashboard  = useSupabaseStore((s) => s.dashboard);
  const fetchDashboard     = useSupabaseStore((s) => s.fetchDashboard);
  const subscribeRealtime  = useSupabaseStore((s) => s.subscribeRealtime);
  const unsubscribeRealtime = useSupabaseStore((s) => s.unsubscribeRealtime);

  // Bootstrap Supabase on mount
  useEffect(() => {
    fetchDashboard();
    subscribeRealtime();
    return () => unsubscribeRealtime();
  }, []);

  // ── Gateway data ──────────────────────────────────────────
  const sessions  = useGatewayDataStore((s) => s.sessions);
  const costData  = useGatewayDataStore((s) => s.costSummary);
  const usageData = useGatewayDataStore((s) => s.sessionsUsage);

  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const connectedSince = useRef<number | null>(null);

  // Track connection uptime
  useEffect(() => {
    if (connected && !connectedSince.current)  connectedSince.current = Date.now();
    if (!connected)                             connectedSince.current = null;
  }, [connected]);

  // Agent status derived from sessions
  const agentStatus: 'idle' | 'working' | 'offline' = useMemo(() => {
    if (!connected) return 'offline';
    const main = sessions.find((s: any) => s.key === 'agent:main:main');
    return main?.running ? 'working' : 'idle';
  }, [connected, sessions]);

  // ── Manual Refresh ──────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshAll(), fetchDashboard()]);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  // ── Quick Actions ────────────────────────────────────────────
  const handleQuickAction = (action: string) => {
    setQuickActionLoading(action);
    const messages: Record<string, string> = {
      heartbeat: 'Run a quick heartbeat check — emails, calendar, anything urgent?',
      emails:    'Check my unread emails and summarize anything important.',
      calendar:  "What's on my calendar today and tomorrow?",
      compact:   'Compact the main session context',
      status:    'Give me a full system status report',
      summary:   'Summarize what we discussed in this session',
    };
    if (messages[action]) {
      window.dispatchEvent(new CustomEvent('aegis:quick-action', {
        detail: { message: messages[action], autoSend: true },
      }));
    }
    setTimeout(() => setQuickActionLoading(null), 2000);
  };

  // ── Derived values (Gateway) ───────────────────────────────

  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const monthKey  = today.slice(0, 7);

  const allDaily: any[] = useMemo(() => costData?.daily || [], [costData]);

  const todayCost = useMemo(
    () => allDaily.find((d: any) => d.date === today)?.totalCost || 0,
    [allDaily, today]
  );
  const yesterdayCost = useMemo(
    () => allDaily.find((d: any) => d.date === yesterday)?.totalCost || 0,
    [allDaily, yesterday]
  );
  const changePercent = yesterdayCost > 0
    ? ((todayCost - yesterdayCost) / yesterdayCost) * 100
    : 0;

  const monthCost = useMemo(
    () => allDaily
      .filter((d: any) => d.date.startsWith(monthKey))
      .reduce((sum: number, d: any) => sum + d.totalCost, 0),
    [allDaily, monthKey]
  );

  const spark7 = useMemo(() => {
    const sorted = [...allDaily].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-7).map((d: any) => d.totalCost);
  }, [allDaily]);

  const todayEntry   = useMemo(() => allDaily.find((d: any) => d.date === today), [allDaily, today]);
  const tokensIn     = todayEntry?.input  || 0;
  const tokensOut    = todayEntry?.output || 0;
  const tokensToday  = tokensIn + tokensOut;

  const mainSession  = sessions.find((s: any) => s.key === 'agent:main:main');
  const mainModel    = mainSession?.model || '—';
  const shortModel   = mainModel.split('/').pop() || mainModel;
  const usagePct     = tokenUsage?.percentage || 0;
  const ctxUsed      = mainSession?.totalTokens   || 0;
  const ctxMax       = mainSession?.contextTokens || 200_000;

  const activeSessions = useMemo(
    () => sessions.filter((s: any) => (s.totalTokens || 0) > 0),
    [sessions]
  );
  const subSessions = useMemo(
    () => activeSessions
      .filter((s: any) => s.key !== 'agent:main:main')
      .sort((a: any, b: any) => (b.totalTokens || 0) - (a.totalTokens || 0))
      .slice(0, 4),
    [activeSessions]
  );

  const chartData = useMemo(() => {
    const sorted = [...allDaily]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
    return sorted.map((d: any) => ({
      date:   d.date.slice(5),
      input:  d.inputCost  || 0,
      output: d.outputCost || 0,
    }));
  }, [allDaily]);

  const agentList = useMemo(() => {
    const raw: any[] = usageData?.aggregates?.byAgent || [];
    return raw
      .filter((a: any) => a.totals?.totalCost >= 0)
      .sort((a: any, b: any) => (b.totals?.totalCost || 0) - (a.totals?.totalCost || 0));
  }, [usageData]);

  const maxAgentCost = useMemo(
    () => Math.max(...agentList.map((a: any) => a.totals?.totalCost || 0), 0.01),
    [agentList]
  );

  const uptime = connectedSince.current ? Date.now() - connectedSince.current : 0;

  // Activity feed: combine Supabase approval_queue + gateway sessions
  const feedItems = useMemo(() => {
    const items: { color: string; text: string; time: string }[] = [];

    // Supabase recent activity (approval_queue)
    (dashboard.recentActivity || []).slice(0, 6).forEach((a: any) => {
      const typeLabel = a.type || 'approval';
      const statusColor = a.status === 'pending' ? themeHex('warning')
        : a.status === 'approved' ? themeHex('success')
        : a.status === 'rejected' ? themeHex('danger')
        : themeHex('accent');
      items.push({
        color: statusColor,
        text: `${typeLabel}: ${a.title || 'Untitled'} — ${a.status}`,
        time: timeAgo(a.created_at),
      });
    });

    // Gateway session activity
    activeSessions.slice(0, 3).forEach((s: any) => {
      const key    = s.key || 'unknown';
      const isMain = key === 'agent:main:main';
      const label  = isMain ? 'Main Session'
        : key.includes('#') ? `#${key.split('#')[1]}`
        : s.label || key.split(':').pop() || key;
      items.push({
        color: isMain ? themeHex('primary') : themeHex('accent'),
        text:  `${label} — ${fmtTokens(s.totalTokens || 0)} tokens`,
        time:  timeAgo(s.lastActive),
      });
    });

    return items;
  }, [dashboard.recentActivity, activeSessions]);

  // ── Render ───────────────────────────────────────────────────
  return (
    <PageTransition className="p-5 space-y-4 max-w-[1280px] mx-auto overflow-y-auto h-full">

      {/* ════ SECTION 1: TOP BAR ════ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ boxShadow: [
              `0 0 10px ${themeAlpha('primary', 0.1)}`,
              `0 0 22px ${themeAlpha('primary', 0.2)}`,
              `0 0 10px ${themeAlpha('primary', 0.1)}`,
            ]}}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-aegis-primary/15 to-aegis-primary/5 border border-aegis-primary/20 flex items-center justify-center"
          >
            <Scissors size={20} className="text-aegis-primary" />
          </motion.div>
          <div>
            <h1 className="text-[18px] font-bold text-aegis-text tracking-tight">
              {t('dashboard.title')}
            </h1>
            <p className="text-[11px] text-aegis-text-dim">{t('dashboard.commandCenter')}</p>
          </div>
        </div>

        {/* Status + meta info */}
        <div className="flex items-center gap-3">
          {/* Uptime + model (desktop only) */}
          <div className="hidden lg:flex items-center gap-3 text-[10px] font-mono text-aegis-text-muted">
            <span>{t('dashboard.uptime')}: <span className="text-aegis-text">{fmtUptime(uptime)}</span></span>
            <span className="opacity-30">·</span>
            <span>{shortModel !== '—' ? shortModel : t('dashboard.model')}</span>
          </div>

          {/* Supabase status badge */}
          <div className={clsx(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-bold tracking-wider',
            sbStatus === 'connected'
              ? 'bg-aegis-success/[0.06] border-aegis-success/20 text-aegis-success'
              : sbStatus === 'error'
              ? 'bg-aegis-danger-surface border-aegis-danger/20 text-aegis-danger'
              : 'bg-aegis-warning-surface border-aegis-warning/20 text-aegis-warning'
          )}>
            <span className={clsx(
              'w-1.5 h-1.5 rounded-full',
              sbStatus === 'connected' ? 'bg-aegis-success' : sbStatus === 'error' ? 'bg-aegis-danger' : 'bg-aegis-warning'
            )} />
            {sbStatus === 'connected' ? 'SUPABASE LIVE' : sbStatus === 'error' ? 'SUPABASE OFFLINE' : 'CONNECTING'}
          </div>

          {/* Gateway status badge */}
          <div className={clsx(
            'flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[11px] font-semibold',
            connected
              ? 'bg-aegis-primary/[0.06] border-aegis-primary/20 text-aegis-primary'
              : 'bg-aegis-danger-surface border-aegis-danger/20 text-aegis-danger'
          )}>
            <StatusDot
              status={connected ? (agentStatus === 'working' ? 'active' : 'idle') : 'error'}
              size={6}
              beacon={agentStatus === 'working'}
            />
            {connected
              ? (agentStatus === 'working' ? t('dashboard.working') : t('dashboard.idle'))
              : t('dashboard.offline')
            }
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg hover:bg-[rgb(var(--aegis-overlay)/0.06)] transition-colors"
            title="Refresh"
          >
            <RefreshCw
              size={15}
              className={clsx(
                'text-aegis-text-muted hover:text-aegis-text transition-colors',
                refreshing && 'animate-spin text-aegis-primary'
              )}
            />
          </button>

          {/* Connectivity icon */}
          {connected
            ? <Wifi size={15} className="text-aegis-success" />
            : <WifiOff size={15} className="text-aegis-danger" />
          }
        </div>
      </div>

      {/* ════ SECTION 2: L&S BUSINESS HERO CARDS (4 columns) ════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* ✂️ Active Orders */}
        <GlassCard delay={0.05} className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10.5px] text-aegis-text-muted font-medium">
            <Scissors size={13} className="text-aegis-primary" />
            Active Orders
          </div>
          {sbLoading ? <SkeletonValue /> : (
            <div className="text-[28px] font-bold text-aegis-text leading-none tracking-tight">
              {dashboard.activeOrders}
            </div>
          )}
          <div className="text-[10px] text-aegis-text-dim">in production pipeline</div>
        </GlassCard>

        {/* 👥 Total Clients */}
        <GlassCard delay={0.08} className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10.5px] text-aegis-text-muted font-medium">
            <Users size={13} className="text-aegis-accent" />
            Total Clients
          </div>
          {sbLoading ? <SkeletonValue /> : (
            <div className="text-[28px] font-bold text-aegis-text leading-none tracking-tight">
              {dashboard.totalClients.toLocaleString()}
            </div>
          )}
          <div className="text-[10px] text-aegis-text-dim">in customer directory</div>
        </GlassCard>

        {/* 💰 Revenue MTD */}
        <GlassCard delay={0.11} className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10.5px] text-aegis-text-muted font-medium">
            <DollarSign size={13} className="text-aegis-success" />
            Revenue MTD
          </div>
          {sbLoading ? <SkeletonValue width={80} /> : (
            <div className="text-[28px] font-bold text-aegis-text leading-none tracking-tight">
              {fmtRevenue(dashboard.revenueMTD / 100)}
            </div>
          )}
          <div className="text-[10px] text-aegis-text-dim">this month via Square</div>
        </GlassCard>

        {/* 📋 Pending Approvals */}
        <GlassCard delay={0.14} className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10.5px] text-aegis-text-muted font-medium">
            <ClipboardCheck size={13} className="text-aegis-warning" />
            Pending Approvals
          </div>
          {sbLoading ? <SkeletonValue width={40} /> : (
            <div className="text-[28px] font-bold text-aegis-text leading-none tracking-tight">
              {dashboard.pendingApprovals}
            </div>
          )}
          <div className="text-[10px] text-aegis-text-dim">awaiting review</div>
        </GlassCard>
      </div>

      {/* ════ SECTION 3: FITTINGS + ACTIVITY FEED ════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-3">

        {/* Today's Fittings */}
        <GlassCard delay={0.16}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-aegis-primary" />
              <span className="text-[13px] font-semibold text-aegis-text">Today's Fittings</span>
            </div>
            <span className="text-[9px] font-mono text-aegis-text-muted">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="space-y-1">
            {sbLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 rounded-lg bg-[rgb(var(--aegis-overlay)/0.04)] animate-pulse" />
                ))}
              </div>
            ) : dashboard.todaysFittings.length > 0 ? (
              dashboard.todaysFittings.map((f: any) => (
                <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-[10px] hover:bg-[rgb(var(--aegis-overlay)/0.03)] transition-colors">
                  <div className="w-[34px] h-[34px] rounded-lg bg-aegis-primary/10 flex items-center justify-center flex-shrink-0">
                    <Scissors size={14} className="text-aegis-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-aegis-text truncate">
                      {f.customer_name || 'Client'}
                    </div>
                    <div className="text-[10px] text-aegis-text-muted font-mono flex gap-2 mt-0.5">
                      <span>{f.time || '—'}</span>
                      <span className="opacity-60">{f.type || 'fitting'}</span>
                    </div>
                  </div>
                  <span className={clsx(
                    'text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wide flex-shrink-0',
                    f.status === 'completed' ? 'bg-aegis-success/10 text-aegis-success'
                    : f.status === 'cancelled' ? 'bg-aegis-danger/10 text-aegis-danger'
                    : 'bg-aegis-primary/10 text-aegis-primary'
                  )}>
                    {(f.status || 'scheduled').toUpperCase()}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-[11px] text-aegis-text-dim text-center py-8">
                No fittings scheduled today
              </div>
            )}
          </div>
        </GlassCard>

        {/* Activity Feed (Supabase + Gateway combined) */}
        <GlassCard delay={0.18}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-aegis-primary" />
              <span className="text-[13px] font-semibold text-aegis-text">{t('dashboard.activity')}</span>
            </div>
            <span className="text-[8px] font-bold text-aegis-success bg-aegis-success-surface px-2 py-0.5 rounded-md tracking-wider animate-pulse-soft">
              LIVE
            </span>
          </div>

          <div className="max-h-[220px] overflow-y-auto scrollbar-hidden">
            {sbLoading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-8 rounded-lg bg-[rgb(var(--aegis-overlay)/0.04)] animate-pulse" />
                ))}
              </div>
            ) : feedItems.length > 0 ? (
              feedItems.map((item, i) => (
                <FeedItem
                  key={i}
                  color={item.color}
                  text={item.text}
                  time={item.time}
                  isLast={i === feedItems.length - 1}
                />
              ))
            ) : (
              <div className="text-[11px] text-aegis-text-dim text-center py-6">
                No recent activity
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* ════ SECTION 4: AI COST CARDS (smaller row) ════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* 💰 AI Cost Today */}
        <GlassCard delay={0.20} className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10.5px] text-aegis-text-muted font-medium">
            <DollarSign size={13} className="text-aegis-primary" />
            {t('dashboard.todayCost')}
          </div>
          <div className="text-[22px] font-bold text-aegis-text leading-none tracking-tight">
            {fmtCostShort(todayCost)}
          </div>
          <div className={clsx(
            'flex items-center gap-1 text-[11px] font-semibold',
            changePercent <= 0 ? 'text-aegis-success' : 'text-aegis-danger'
          )}>
            {changePercent <= 0
              ? <TrendingDown size={12} />
              : <TrendingUp   size={12} />
            }
            {Math.abs(changePercent).toFixed(0)}% {t('dashboard.vsYesterday')}
          </div>
          {spark7.length > 0 && (
            <Sparkline data={spark7} color={themeHex('primary')} width={120} height={30} />
          )}
        </GlassCard>

        {/* 📅 AI Cost This Month */}
        <GlassCard delay={0.22} className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10.5px] text-aegis-text-muted font-medium">
            <BarChart3 size={13} className="text-aegis-accent" />
            {t('dashboard.thisMonth')}
          </div>
          <div className="text-[22px] font-bold text-aegis-text leading-none tracking-tight">
            {fmtCostShort(monthCost)}
          </div>
          <div className="text-[11px] text-aegis-text-dim">{t('dashboard.monthBudget')}</div>
        </GlassCard>

        {/* ⚡ Tokens Today */}
        <GlassCard delay={0.24} className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10.5px] text-aegis-text-muted font-medium">
            <Zap size={13} className="text-aegis-warning" />
            {t('dashboard.tokensToday')}
          </div>
          <div className="text-[22px] font-bold text-aegis-text leading-none tracking-tight">
            {fmtTokens(tokensToday)}
          </div>
          <div className="text-[10px] text-aegis-text-muted font-mono space-y-0.5">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-aegis-accent" />
              {t('dashboard.tokensIn')}:  {fmtTokens(tokensIn)}
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-aegis-primary" />
              {t('dashboard.tokensOut')}: {fmtTokens(tokensOut)}
            </div>
          </div>
        </GlassCard>

        {/* 🧠 Context */}
        <GlassCard delay={0.26} className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10.5px] text-aegis-text-muted font-medium">
            <Cpu size={13} className="text-aegis-danger" />
            {t('dashboard.contextCard')}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <ContextRing percentage={usagePct} />
            <div className="text-[10px] text-aegis-text-muted font-mono space-y-1">
              <div>{fmtTokens(ctxUsed)} used</div>
              <div className="text-aegis-text-dim">/ {fmtTokens(ctxMax)} max</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ════ SECTION 5: CHART + AGENTS ════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-3">

        {/* Daily Cost Chart */}
        <GlassCard delay={0.28}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-aegis-primary" />
              <span className="text-[13px] font-semibold text-aegis-text">{t('dashboard.dailyCostChart')}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-aegis-text-muted font-medium">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-aegis-accent" />{t('dashboard.inputCostLabel')}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-aegis-primary" />{t('dashboard.outputCostLabel')}</span>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gInput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={themeHex('accent')} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={themeHex('accent')} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOutput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={themeHex('primary')} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={themeHex('primary')} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--aegis-overlay) / 0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgb(var(--aegis-text-dim))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'rgb(var(--aegis-text-dim))' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v === 0 ? '' : `$${v.toFixed(2)}`} />
                <Tooltip content={<CostTooltip />} cursor={{ stroke: 'rgb(var(--aegis-overlay) / 0.06)' }} />
                <Area type="monotone" dataKey="input"  stackId="1"
                  stroke={themeHex('accent')} strokeWidth={1.5} fill="url(#gInput)" />
                <Area type="monotone" dataKey="output" stackId="1"
                  stroke={themeHex('primary')} strokeWidth={1.5} fill="url(#gOutput)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-[12px] text-aegis-text-dim">
              {connected ? t('common.loading') : 'No cost data yet'}
            </div>
          )}
        </GlassCard>

        {/* Active Agents */}
        <GlassCard delay={0.30}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bot size={15} className="text-aegis-accent" />
              <span className="text-[13px] font-semibold text-aegis-text">{t('dashboard.activeAgents')}</span>
            </div>
            <button
              onClick={() => navigate('/agents')}
              className="flex items-center gap-0.5 text-[10px] text-aegis-primary hover:underline"
            >
              {t('dashboard.viewAll')}
              <ChevronRight size={12} />
            </button>
          </div>

          <div className="space-y-0">
            {agentList.length > 0 ? (
              agentList.slice(0, 5).map((a: any) => {
                const id      = a.agentId || 'unknown';
                const cost    = a.totals?.totalCost || 0;
                const model   = (a.totals?.model || usageData?.aggregates?.byModel?.find(
                  (m: any) => m) ?.model || '').split('/').pop() || '—';
                return (
                  <AgentItem
                    key={id}
                    emoji={getAgentEmoji(id)}
                    name={getAgentName(id)}
                    model={model}
                    cost={fmtCost(cost)}
                    costToday={cost}
                    maxCost={maxAgentCost}
                    isFree={cost === 0}
                  />
                );
              })
            ) : (
              <div className="text-[11px] text-aegis-text-dim text-center py-8">
                {connected ? t('dashboard.noAgentData') : 'No agent data yet'}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* ════ SECTION 6: QUICK ACTIONS + SESSIONS ════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* Quick Actions */}
        <GlassCard delay={0.32}>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={15} className="text-aegis-accent" />
            <span className="text-[13px] font-semibold text-aegis-text">{t('dashboard.quickActions')}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <QuickAction icon={Heart}    label={t('dashboard.runHeartbeat')}
              glowColor={themeAlpha('danger', 0.08)} bgColor={themeAlpha('danger', 0.1)} iconColor={themeHex('danger')}
              onClick={() => handleQuickAction('heartbeat')} loading={quickActionLoading === 'heartbeat'} />
            <QuickAction icon={Mail}     label={t('dashboard.checkEmails')}
              glowColor={themeAlpha('primary', 0.08)} bgColor={themeAlpha('primary', 0.1)} iconColor={themeHex('primary')}
              onClick={() => handleQuickAction('emails')}    loading={quickActionLoading === 'emails'} />
            <QuickAction icon={Calendar} label={t('dashboard.checkCalendar')}
              glowColor={themeAlpha('success', 0.08)} bgColor={themeAlpha('success', 0.1)} iconColor={themeHex('success')}
              onClick={() => handleQuickAction('calendar')}  loading={quickActionLoading === 'calendar'} />
            <QuickAction icon={RefreshCw} label={t('dashboard.compact')}
              glowColor={themeAlpha('warning', 0.08)} bgColor={themeAlpha('warning', 0.1)} iconColor={themeHex('warning')}
              onClick={() => handleQuickAction('compact')}   loading={quickActionLoading === 'compact'} />
            <QuickAction icon={BarChart3} label={t('dashboard.systemStatus')}
              glowColor={themeAlpha('accent', 0.08)} bgColor={themeAlpha('accent', 0.1)} iconColor={themeHex('accent')}
              onClick={() => handleQuickAction('status')}    loading={quickActionLoading === 'status'} />
            <QuickAction icon={FileText}  label={t('dashboard.sessionSummary')}
              glowColor="rgb(var(--aegis-overlay) / 0.03)" bgColor="rgb(var(--aegis-overlay) / 0.04)" iconColor="rgb(var(--aegis-text-dim))"
              onClick={() => handleQuickAction('summary')}   loading={quickActionLoading === 'summary'} />
          </div>
        </GlassCard>

        {/* Sessions */}
        <GlassCard delay={0.34}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bot size={15} className="text-aegis-accent" />
              <span className="text-[13px] font-semibold text-aegis-text">{t('dashboard.sessions')}</span>
            </div>
            <button
              onClick={() => navigate('/agents')}
              className="flex items-center gap-0.5 text-[10px] text-aegis-primary hover:underline"
            >
              {t('dashboard.viewAll')}
              <ChevronRight size={12} />
            </button>
          </div>

          <div className="space-y-1">
            {mainSession && (
              <SessionItem
                isMain
                name={t('dashboard.mainSession')}
                model={shortModel}
                detail={`${mainSession.compactions || 0} compact`}
                tokens={fmtTokens(mainSession.totalTokens || 0)}
                avatarBg={themeAlpha('primary', 0.12)}
                avatarColor={themeHex('primary')}
                icon={Shield}
              />
            )}
            {subSessions.map((s: any) => {
              const key   = s.key || 'unknown';
              const label = key.includes('#') ? `#${key.split('#')[1]}`
                : s.label || key.split(':').pop() || key;
              const sModel = (s.model || '').split('/').pop() || '—';
              return (
                <SessionItem
                  key={key}
                  name={label}
                  model={sModel}
                  detail={timeAgo(s.lastActive)}
                  tokens={fmtTokens(s.totalTokens || 0)}
                  avatarBg={themeAlpha('accent', 0.1)}
                  avatarColor={themeHex('accent')}
                  icon={Bot}
                />
              );
            })}
            {activeSessions.length === 0 && (
              <div className="text-[11px] text-aegis-text-dim text-center py-6">
                {connected ? t('dashboard.noActiveSessions') : 'No active sessions'}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Supabase error banner */}
      {sbError && (
        <div className="text-[11px] text-aegis-danger bg-aegis-danger-surface border border-aegis-danger/20 rounded-xl px-4 py-2.5">
          Supabase: {sbError}
        </div>
      )}

    </PageTransition>
  );
}
