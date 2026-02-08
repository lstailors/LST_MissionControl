import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Settings, ChevronLeft, ChevronRight, Wifi, WifiOff, Shield, Zap, Layers, TrendingUp, Clock, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { gateway } from '@/services/gateway';
import { getDirection } from '@/i18n';
import clsx from 'clsx';

// ═══════════════════════════════════════════════════════════
// Sidebar — sessions + token usage + controls
// ═══════════════════════════════════════════════════════════

export function Sidebar() {
  const { t } = useTranslation();
  const { sessions, activeSessionKey, setActiveSession, connected, connecting, tokenUsage } = useChatStore();
  const { sidebarOpen, toggleSidebar, setSettingsOpen, language } = useSettingsStore();
  const dir = getDirection(language);
  const isRTL = dir === 'rtl';

  // ── Session details for token dashboard ──
  interface SessionDetail {
    key: string; label: string; kind?: string;
    contextTokens: number; maxTokens: number; percentage: number;
    compactions: number; model?: string; lastActivity?: string;
  }
  const [sessionDetails, setSessionDetails] = useState<SessionDetail[]>([]);

  const loadSessionDetails = useCallback(async () => {
    if (!connected) return;
    try {
      const result = await gateway.getSessions();
      const rawSessions = Array.isArray(result?.sessions) ? result.sessions : Array.isArray(result) ? result : [];
      const details: SessionDetail[] = rawSessions.map((s: any) => {
        const key = s.key || s.sessionKey || 'unknown';
        let label = s.label || s.name || key;
        if (key === 'agent:main:main') label = t('sidebar.mainSession');
        else if (key.startsWith('agent:main:')) label = key.split(':').pop() || key;
        const used = s.totalTokens || 0;
        const max = s.contextTokens || 200000;
        const pct = max > 0 ? Math.round((used / max) * 100) : 0;
        return {
          key, label, kind: s.kind || 'main',
          contextTokens: used, maxTokens: max, percentage: pct,
          compactions: s.compactions || 0,
          model: s.model || undefined,
          lastActivity: s.updatedAt ? new Date(s.updatedAt).toISOString() : undefined,
        };
      });
      details.sort((a, b) => {
        if (a.key === 'agent:main:main') return -1;
        if (b.key === 'agent:main:main') return 1;
        return (b.contextTokens) - (a.contextTokens);
      });
      setSessionDetails(details);
    } catch { /* silent */ }
  }, [connected, t]);

  useEffect(() => { if (connected) loadSessionDetails(); }, [connected, loadSessionDetails]);
  useEffect(() => { if (tokenUsage) loadSessionDetails(); }, [tokenUsage, loadSessionDetails]);

  const formatTime = (ts?: string) => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      const diff = Date.now() - d.getTime();
      if (diff < 60000) return t('sidebar.now');
      if (diff < 3600000) return t('sidebar.minutesAgo', { count: Math.floor(diff / 60000) });
      if (diff < 86400000) return t('sidebar.hoursAgo', { count: Math.floor(diff / 3600000) });
      return d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
    } catch { return '—'; }
  };

  const getUsageColor = (pct: number) => {
    if (pct > 85) return { text: 'text-aegis-danger', bg: 'bg-aegis-danger', label: t('sidebar.critical') };
    if (pct > 60) return { text: 'text-aegis-warning', bg: 'bg-aegis-warning', label: t('sidebar.high') };
    if (pct > 30) return { text: 'text-aegis-primary', bg: 'bg-aegis-primary', label: t('sidebar.normal') };
    return { text: 'text-aegis-success', bg: 'bg-aegis-success', label: t('sidebar.low') };
  };

  const totalTokens = sessionDetails.reduce((sum, s) => sum + s.contextTokens, 0);
  const totalCompactions = sessionDetails.reduce((sum, s) => sum + s.compactions, 0);
  const activeSessions = sessionDetails.filter(s => s.contextTokens > 0).length;
  const mainDetail = sessionDetails.find(s => s.key === 'agent:main:main');

  const usageColor = tokenUsage
    ? tokenUsage.percentage > 85 ? 'aegis-danger' : tokenUsage.percentage > 60 ? 'aegis-warning' : 'aegis-primary'
    : 'aegis-primary';

  const usageBarColor = tokenUsage
    ? tokenUsage.percentage > 85 ? 'bg-aegis-danger' : tokenUsage.percentage > 60 ? 'bg-aegis-warning' : 'bg-aegis-primary'
    : 'bg-aegis-primary';

  const formatTokens = (n: number) => {
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(n);
  };

  // Border side based on direction
  const borderClass = isRTL ? 'border-l' : 'border-r';
  const CollapseIcon = isRTL ? (sidebarOpen ? ChevronRight : ChevronLeft) : (sidebarOpen ? ChevronLeft : ChevronRight);

  return (
    <div
      className={clsx(
        'shrink-0 flex flex-col transition-all duration-300 ease-out relative',
        borderClass, 'border-aegis-border/30',
        'bg-aegis-surface/30 backdrop-blur-sm',
        sidebarOpen ? 'w-[280px]' : 'w-[54px]'
      )}
    >
      {/* Edge gradient */}
      <div className={clsx(
        'absolute top-0 bottom-0 w-[1px] bg-gradient-to-b from-aegis-primary/10 via-transparent to-aegis-primary/5',
        isRTL ? 'right-0' : 'left-0'
      )} />

      {/* Header */}
      <div className="shrink-0 h-12 flex items-center justify-between px-3 border-b border-aegis-border/20">
        {sidebarOpen && (
          <div className={clsx('flex items-center gap-2.5 animate-fade-in', !isRTL && 'flex-row')}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-aegis-primary/20 to-aegis-accent/10 flex items-center justify-center border border-aegis-primary/10">
              <Shield size={15} className="text-aegis-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-semibold text-aegis-text leading-tight tracking-tight">{t('app.name')}</span>
              <span className={clsx(
                'text-[10px] leading-tight flex items-center gap-1',
                connected ? 'text-aegis-success' : connecting ? 'text-aegis-warning' : 'text-aegis-text-dim'
              )}>
                <span className={clsx(
                  'w-1.5 h-1.5 rounded-full inline-block',
                  connected ? 'bg-aegis-success' : connecting ? 'bg-aegis-warning animate-pulse-soft' : 'bg-aegis-text-dim'
                )} />
                {connected ? t('connection.connected') : connecting ? t('connection.connecting') : t('connection.disconnected')}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-white/[0.04] text-aegis-text-dim hover:text-aegis-text-muted transition-colors"
        >
          <CollapseIcon size={15} />
        </button>
      </div>

      {/* Connection indicator (collapsed) */}
      {!sidebarOpen && (
        <div className="flex justify-center py-3">
          {connected ? <Wifi size={15} className="text-aegis-success" /> : <WifiOff size={15} className="text-aegis-danger" />}
        </div>
      )}

      {/* Token Usage — Full Inline Dashboard */}
      {tokenUsage && (
        <div className={clsx(
          'flex-1 border-t border-aegis-border/20 transition-all overflow-y-auto scrollbar-hidden',
          sidebarOpen ? 'px-3 py-3' : 'px-2 py-2'
        )}>
          {sidebarOpen ? (
            <div className="animate-fade-in space-y-3">
              {/* Section Title */}
              <div className="flex items-center gap-1.5">
                <Activity size={13} className="text-aegis-primary" />
                <span className="text-[12px] font-medium text-aegis-text-muted">{t('sidebar.tokenUsage')}</span>
              </div>

              {/* Circular Ring + Main Stats */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-aegis-surface/40 border border-aegis-border/15">
                <div className="relative w-[68px] h-[68px] shrink-0">
                  <svg className="w-[68px] h-[68px] -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" className="text-aegis-border/30" strokeWidth="7" />
                    <circle cx="50" cy="50" r="42" fill="none" strokeWidth="7" strokeLinecap="round"
                      className={usageBarColor.replace('bg-', 'text-')}
                      strokeDasharray={`${tokenUsage.percentage * 2.64} ${264 - tokenUsage.percentage * 2.64}`}
                      style={{ transition: 'stroke-dasharray 0.8s ease' }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={clsx('text-[15px] font-bold', `text-${usageColor}`)}>{tokenUsage.percentage}%</span>
                    <span className="text-[8px] text-aegis-text-dim">{t('sidebar.context')}</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-aegis-text-dim">{t('sidebar.mainSession')}</span>
                    <span className={clsx('text-[9px] px-2 py-0.5 rounded-full border',
                      tokenUsage.percentage > 85 ? 'bg-aegis-danger/10 text-aegis-danger border-aegis-danger/20' :
                      tokenUsage.percentage > 60 ? 'bg-aegis-warning/10 text-aegis-warning border-aegis-warning/20' :
                      'bg-aegis-success/10 text-aegis-success border-aegis-success/20'
                    )}>
                      {tokenUsage.percentage > 85 ? t('sidebar.critical') : tokenUsage.percentage > 60 ? t('sidebar.high') : tokenUsage.percentage > 30 ? t('sidebar.normal') : t('sidebar.low')}
                    </span>
                  </div>
                  <div className="text-[13px] font-mono text-aegis-text">
                    {formatTokens(tokenUsage.contextTokens)}
                    <span className="text-aegis-text-dim"> / {formatTokens(tokenUsage.maxTokens)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-aegis-border/25 overflow-hidden">
                    <div className={clsx('h-full rounded-full transition-all duration-700', usageBarColor)}
                      style={{ width: `${Math.min(100, tokenUsage.percentage)}%` }} />
                  </div>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { icon: Zap, label: t('sidebar.tokens'), value: formatTokens(totalTokens), color: 'text-aegis-primary' },
                  { icon: Layers, label: t('sidebar.compression'), value: String(totalCompactions), color: 'text-aegis-warning' },
                  { icon: TrendingUp, label: t('sidebar.active'), value: String(activeSessions), color: 'text-aegis-accent' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="p-2.5 rounded-lg bg-aegis-surface/30 border border-aegis-border/10 text-center">
                    <Icon size={13} className={clsx(color, 'mx-auto mb-1')} />
                    <div className="text-[13px] font-bold text-aegis-text">{value}</div>
                    <div className="text-[9px] text-aegis-text-dim">{label}</div>
                  </div>
                ))}
              </div>

              {/* Sessions Breakdown */}
              {sessionDetails.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-aegis-text-dim" />
                    <span className="text-[11px] text-aegis-text-dim">{t('sidebar.sessions')}</span>
                  </div>
                  {sessionDetails.map((sd) => {
                    const sdColor = getUsageColor(sd.percentage);
                    const isMain = sd.key === 'agent:main:main';
                    return (
                      <div key={sd.key} className={clsx(
                        'flex items-center gap-2 p-2 rounded-lg border transition-colors',
                        isMain ? 'bg-aegis-primary-surface border-aegis-primary/15' : 'bg-aegis-surface/25 border-aegis-border/10'
                      )}>
                        <div className="relative w-10 h-10 shrink-0">
                          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                            <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" className="text-aegis-border/20" strokeWidth="3" />
                            <circle cx="20" cy="20" r="15" fill="none" strokeWidth="3" strokeLinecap="round"
                              className={sdColor.text}
                              strokeDasharray={`${sd.percentage * 0.942} ${94.2 - sd.percentage * 0.942}`} />
                          </svg>
                          <span className={clsx('absolute inset-0 flex items-center justify-center text-[9px] font-bold', sdColor.text)}>
                            {sd.percentage}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-medium text-aegis-text truncate">{sd.label}</span>
                            <span className="text-[10px] text-aegis-text-dim font-mono">{formatTokens(sd.contextTokens)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {sd.model && <span className="text-[9px] text-aegis-text-dim truncate max-w-[120px]">{sd.model}</span>}
                            <span className="text-[9px] text-aegis-text-dim">{formatTime(sd.lastActivity)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Current Model */}
              {mainDetail?.model && (
                <div className="p-2.5 rounded-lg bg-aegis-surface/25 border border-aegis-border/10 flex items-center justify-between">
                  <span className="text-[11px] text-aegis-text-dim">{t('sidebar.model')}</span>
                  <span className="text-[11px] text-aegis-primary font-mono">{mainDetail.model}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5" title={`${tokenUsage.percentage}% ${t('sidebar.context')}`}>
              <div className="relative w-9 h-9">
                <svg className="w-9 h-9 -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" className="text-aegis-border/25" strokeWidth="3" />
                  <circle cx="20" cy="20" r="16" fill="none" strokeWidth="3" strokeLinecap="round"
                    className={usageBarColor.replace('bg-', 'text-')}
                    strokeDasharray={`${tokenUsage.percentage * 1.005} ${100.5 - tokenUsage.percentage * 1.005}`} />
                </svg>
                <span className={clsx('absolute inset-0 flex items-center justify-center text-[8px] font-bold', `text-${usageColor}`)}>
                  {tokenUsage.percentage}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {!tokenUsage && <div className="flex-1" />}

      {/* Footer — Settings */}
      <div className="shrink-0 border-t border-aegis-border/20 p-2">
        <button
          onClick={() => setSettingsOpen(true)}
          className={clsx(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors',
            sidebarOpen ? 'justify-start' : 'justify-center'
          )}
          title={t('sidebar.settings')}
        >
          <Settings size={15} className="text-aegis-text-dim" />
          {sidebarOpen && <span className="text-[12px] text-aegis-text-muted animate-fade-in">{t('sidebar.settings')}</span>}
        </button>
      </div>
    </div>
  );
}
