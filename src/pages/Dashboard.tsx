// ═══════════════════════════════════════════════════════════
// Dashboard — AEGIS Mission Control Home
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity, Zap, Layers, TrendingUp, Heart, Mail, Calendar,
  MessageCircle, Clock, Bot, CheckCircle, AlertCircle,
  Play, Loader2, Shield, Cpu, BarChart3, RefreshCw, FileText, Wifi, WifiOff
} from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { AnimatedCounter } from '@/components/shared/AnimatedCounter';
import { PageTransition } from '@/components/shared/PageTransition';
import { Sparkline } from '@/components/shared/Sparkline';
import { ProgressRing } from '@/components/shared/ProgressRing';
import { StatusDot } from '@/components/shared/StatusDot';
import { useChatStore } from '@/stores/chatStore';
import { gateway } from '@/services/gateway';
import clsx from 'clsx';

// ── Format helpers ──
const formatTokens = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);

const timeAgo = (ts?: string) => {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'الآن';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}د`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}س`;
  return `${Math.floor(diff / 86400000)}ي`;
};

const formatUptime = (ms: number) => {
  if (ms < 60000) return '<1م';
  if (ms < 3600000) return `${Math.floor(ms / 60000)}م`;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return m > 0 ? `${h}س ${m}م` : `${h}س`;
};

// ── Quick Action Component ──
function QuickAction({ icon: Icon, label, color, onClick, loading }: {
  icon: any; label: string; color: string; onClick: () => void; loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={clsx(
        'group relative flex flex-col items-center gap-2 p-3.5 rounded-xl',
        'border border-white/[0.05] bg-white/[0.02]',
        'transition-all duration-250 overflow-hidden',
        'hover:border-white/[0.12] hover:-translate-y-0.5',
        'hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)]',
        'active:translate-y-0',
        loading && 'opacity-60 pointer-events-none'
      )}
    >
      {/* Radial gradient glow on hover */}
      <div className={clsx(
        'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
        `bg-[radial-gradient(circle_at_50%_0%,_var(--tw-gradient-from)_0%,_transparent_70%)]`,
        `from-${color}/10`
      )} />
      {loading ? (
        <Loader2 size={18} className="animate-spin text-aegis-text-dim relative z-10" />
      ) : (
        <div className={clsx(
          'w-9 h-9 rounded-[10px] flex items-center justify-center relative z-10',
          `bg-${color}/10 border border-${color}/15`
        )}>
          <Icon size={18} className={`text-${color}`} />
        </div>
      )}
      <span className="text-[10.5px] font-medium text-aegis-text-muted leading-tight text-center relative z-10">{label}</span>
    </button>
  );
}

// ── Stat Card with optional Sparkline ──
function StatCard({ icon: Icon, label, value, color, delay, sparkData }: {
  icon: any; label: string; value: string | number; color: string; delay: number; sparkData?: number[];
}) {
  return (
    <GlassCard delay={delay} className="flex-1">
      <div className="flex items-center gap-4">
        <div className={clsx(
          'w-11 h-11 rounded-xl flex items-center justify-center',
          'border',
          `bg-gradient-to-br from-${color}/12 to-${color}/5`,
          `border-${color}/15`,
          `shadow-[0_0_16px_rgba(78,201,176,0.08)]`
        )}>
          <Icon size={20} className={clsx(`text-${color}`, 'icon-halo-teal')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[22px] font-bold text-aegis-text tracking-tight leading-tight text-glow-teal">
            {typeof value === 'number' ? (
              <AnimatedCounter value={value} format={formatTokens} />
            ) : value}
          </div>
          <div className="text-[11px] text-aegis-text-dim mt-0.5">{label}</div>
        </div>
        {/* Sparkline on the right */}
        {sparkData && sparkData.length >= 3 && (
          <Sparkline data={sparkData} color={color.includes('#') ? color : undefined} width={80} height={28} />
        )}
      </div>
    </GlassCard>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { connected, tokenUsage } = useChatStore();

  const [agentStatus, setAgentStatus] = useState<'idle' | 'working' | 'offline'>('offline');
  const [sessions, setSessions] = useState<any[]>([]);
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null);

  // Sparkline history (persisted in memory across refreshes)
  const [tokenHistory, setTokenHistory] = useState<number[]>([]);
  const [sessionHistory, setSessionHistory] = useState<number[]>([]);
  const connectedSince = useRef<number | null>(null);

  // Track connection time
  useEffect(() => {
    if (connected && !connectedSince.current) connectedSince.current = Date.now();
    if (!connected) connectedSince.current = null;
  }, [connected]);

  // ── Load data ──
  const loadData = useCallback(async () => {
    if (!connected) return;
    try {
      const result = await gateway.getSessions();
      const rawSessions = Array.isArray(result?.sessions) ? result.sessions : [];
      setSessions(rawSessions);

      // Update sparkline history
      const totalTok = rawSessions.reduce((sum: number, s: any) => sum + (s.totalTokens || 0), 0);
      const activeCount = rawSessions.filter((s: any) => (s.totalTokens || 0) > 0).length;
      setTokenHistory(prev => {
        const next = [...prev, totalTok];
        return next.length > 20 ? next.slice(-20) : next;
      });
      setSessionHistory(prev => {
        const next = [...prev, activeCount];
        return next.length > 20 ? next.slice(-20) : next;
      });

      // Determine agent status
      const main = rawSessions.find((s: any) => (s.key || '') === 'agent:main:main');
      if (main) setAgentStatus(main.running ? 'working' : 'idle');
    } catch { /* silent */ }
  }, [connected]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ── Quick Actions ──
  const handleQuickAction = async (action: string) => {
    setQuickActionLoading(action);
    try {
      const messages: Record<string, string> = {
        heartbeat: 'Run a quick heartbeat check — emails, calendar, anything urgent?',
        emails: 'Check my unread emails and summarize anything important.',
        calendar: "What's on my calendar today and tomorrow?",
        compact: 'Compact the main session context',
        status: 'Give me a full system status report',
        summary: 'Summarize what we discussed in this session',
      };
      if (messages[action]) {
        window.dispatchEvent(new CustomEvent('aegis:quick-action', {
          detail: { message: messages[action], autoSend: true }
        }));
      }
    } finally {
      setTimeout(() => setQuickActionLoading(null), 2000);
    }
  };

  // ── Computed values ──
  const totalTokens = sessions.reduce((sum: number, s: any) => sum + (s.totalTokens || 0), 0);
  const activeSessions = sessions.filter((s: any) => (s.totalTokens || 0) > 0).length;
  const totalCompactions = sessions.reduce((sum: number, s: any) => sum + (s.compactions || 0), 0);
  const mainSession = sessions.find((s: any) => (s.key || '') === 'agent:main:main');
  const mainModel = mainSession?.model || '—';

  const usagePct = tokenUsage?.percentage || 0;
  const uptime = connectedSince.current ? Date.now() - connectedSince.current : 0;

  return (
    <PageTransition className="p-6 space-y-6 max-w-[1200px] mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-aegis-text flex items-center gap-3">
            <Shield size={24} className="text-aegis-primary" />
            {t('dashboard.title')}
          </h1>
          <p className="text-[13px] text-aegis-text-dim mt-1">{t('dashboard.subtitle')}</p>
        </div>

        {/* Agent Status Badge */}
        <div className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-full border',
          agentStatus === 'working' ? 'bg-aegis-primary/10 border-aegis-primary/30 text-aegis-primary animate-glow-teal' :
          agentStatus === 'idle' ? 'bg-aegis-success/10 border-aegis-success/30 text-aegis-success' :
          'bg-aegis-text-dim/10 border-aegis-border/30 text-aegis-text-dim'
        )}>
          <StatusDot status={agentStatus === 'working' ? 'active' : agentStatus === 'idle' ? 'idle' : 'sleeping'} beacon={agentStatus === 'working'} />
          <span className="text-[12px] font-medium">
            {agentStatus === 'working' ? t('dashboard.working') :
             agentStatus === 'idle' ? t('dashboard.idle') : t('dashboard.offline')}
          </span>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Zap} label={t('dashboard.totalTokens')} value={totalTokens} color="aegis-primary" delay={0} sparkData={tokenHistory} />
        <StatCard icon={Activity} label={t('dashboard.activeSessions')} value={activeSessions} color="aegis-accent" delay={0.05} sparkData={sessionHistory} />
        <StatCard icon={Layers} label={t('dashboard.compactions')} value={totalCompactions} color="aegis-warning" delay={0.1} />
        <StatCard icon={Cpu} label={t('dashboard.model')} value={mainModel.split('/').pop() || mainModel} color="aegis-success" delay={0.15} />
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Context Usage — Large Card with ProgressRing */}
        <GlassCard delay={0.2} className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-semibold text-aegis-text flex items-center gap-2">
                <BarChart3 size={16} className="text-aegis-primary" />
                {t('dashboard.contextUsage')}
              </h3>
              <span className="text-[11px] text-aegis-text-dim">
                {formatTokens(tokenUsage?.contextTokens || 0)} / {formatTokens(tokenUsage?.maxTokens || 200000)}
              </span>
            </div>
            <ProgressRing percentage={usagePct} size={80} strokeWidth={5} />
          </div>

          {/* Sessions Usage Bars */}
          <div className="space-y-3">
            {sessions
              .filter((s: any) => (s.totalTokens || 0) > 0)
              .sort((a: any, b: any) => (b.totalTokens || 0) - (a.totalTokens || 0))
              .slice(0, 6)
              .map((s: any) => {
                const key = s.key || 'unknown';
                const used = s.totalTokens || 0;
                const max = s.contextTokens || 200000;
                const pct = Math.round((used / max) * 100);
                const label = key === 'agent:main:main' ? t('dashboard.mainSession')
                  : key.includes('#') ? `#${key.split('#')[1]}`
                  : key.split(':').pop() || key;
                const barGradient = pct > 85
                  ? 'bg-gradient-to-r from-aegis-danger to-red-400 progress-glow-danger'
                  : pct > 60
                  ? 'bg-gradient-to-r from-aegis-warning to-yellow-400 progress-glow-warning'
                  : 'bg-gradient-to-r from-aegis-primary to-aegis-primary-hover progress-glow-teal';

                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-aegis-text-muted truncate max-w-[200px]">{label}</span>
                      <span className="text-[11px] font-mono text-aegis-text-dim">{formatTokens(used)} / {formatTokens(max)}</span>
                    </div>
                    <div className="h-[6px] rounded-full bg-white/[0.04] overflow-hidden">
                      <div className={clsx('h-full rounded-full transition-all duration-700', barGradient)}
                        style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                );
              })
            }
            {sessions.filter((s: any) => (s.totalTokens || 0) > 0).length === 0 && (
              <div className="text-[12px] text-aegis-text-dim text-center py-8">
                {connected ? t('dashboard.noActiveSessions') : t('dashboard.notConnected')}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Right Column: Quick Actions + Health */}
        <div className="space-y-4">
          {/* Quick Actions — 2×3 Grid */}
          <GlassCard delay={0.25}>
            <h3 className="text-[14px] font-semibold text-aegis-text mb-3 flex items-center gap-2">
              <Play size={16} className="text-aegis-accent" />
              {t('dashboard.quickActions')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction icon={Heart} label={t('dashboard.runHeartbeat')} color="aegis-danger"
                onClick={() => handleQuickAction('heartbeat')} loading={quickActionLoading === 'heartbeat'} />
              <QuickAction icon={Mail} label={t('dashboard.checkEmails')} color="aegis-primary"
                onClick={() => handleQuickAction('emails')} loading={quickActionLoading === 'emails'} />
              <QuickAction icon={Calendar} label={t('dashboard.checkCalendar')} color="aegis-success"
                onClick={() => handleQuickAction('calendar')} loading={quickActionLoading === 'calendar'} />
              <QuickAction icon={RefreshCw} label={t('dashboard.compact', 'ضغط السياق')} color="aegis-warning"
                onClick={() => handleQuickAction('compact')} loading={quickActionLoading === 'compact'} />
              <QuickAction icon={BarChart3} label={t('dashboard.systemStatus', 'حالة النظام')} color="aegis-accent"
                onClick={() => handleQuickAction('status')} loading={quickActionLoading === 'status'} />
              <QuickAction icon={FileText} label={t('dashboard.sessionSummary', 'ملخص الجلسة')} color="aegis-text-muted"
                onClick={() => handleQuickAction('summary')} loading={quickActionLoading === 'summary'} />
            </div>
          </GlassCard>

          {/* Health Status */}
          <GlassCard delay={0.3}>
            <h3 className="text-[14px] font-semibold text-aegis-text mb-3 flex items-center gap-2">
              {connected ? <Wifi size={16} className="text-aegis-success" /> : <WifiOff size={16} className="text-aegis-danger" />}
              {t('dashboard.health', 'حالة النظام')}
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-aegis-text-dim">Gateway</span>
                <div className="flex items-center gap-1.5">
                  <StatusDot status={connected ? 'active' : 'error'} size={6} beacon={connected} />
                  <span className={clsx('text-[11px] font-medium', connected ? 'text-aegis-success text-glow-green' : 'text-aegis-danger')}>
                    {connected ? t('connection.connected') : t('connection.disconnected')}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-aegis-text-dim">Uptime</span>
                <span className="text-[11px] font-mono text-aegis-text-muted">
                  {connected ? formatUptime(uptime) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-aegis-text-dim">Model</span>
                <span className="text-[11px] font-mono text-aegis-text-muted truncate max-w-[120px]">
                  {mainModel.split('/').pop() || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-aegis-text-dim">{t('dashboard.activeSessions')}</span>
                <span className="text-[11px] font-mono text-aegis-text-muted">{activeSessions}</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* ── Sessions Overview ── */}
      <GlassCard delay={0.35}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-semibold text-aegis-text flex items-center gap-2">
            <Bot size={16} className="text-aegis-accent" />
            {t('dashboard.activeSessions')}
          </h3>
          <button onClick={() => navigate('/agents')} className="text-[11px] text-aegis-primary hover:underline">
            {t('dashboard.viewAll')} →
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {sessions
            .filter((s: any) => (s.totalTokens || 0) > 0)
            .slice(0, 4)
            .map((s: any) => {
              const key = s.key || 'unknown';
              const isMain = key === 'agent:main:main';
              const label = isMain ? t('dashboard.mainSession')
                : key.includes('#') ? `#${key.split('#')[1]}`
                : s.label || key.split(':').pop() || key;
              const model = (s.model || '').split('/').pop() || '—';

              return (
                <div key={key}
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/[0.04]"
                  style={isMain
                    ? { background: 'rgba(78,201,176,0.06)', border: '1px solid rgba(78,201,176,0.15)' }
                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }
                  }
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={isMain
                      ? { background: 'rgba(78,201,176,0.15)' }
                      : { background: 'rgba(255,255,255,0.06)' }
                    }
                  >
                    {isMain ? <Shield size={16} className="text-[#4EC9B0]" /> : <Bot size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-aegis-text truncate">{label}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>{model}</span>
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{formatTokens(s.totalTokens || 0)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>
      </GlassCard>
    </PageTransition>
  );
}
