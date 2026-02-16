// ═══════════════════════════════════════════════════════════
// CronMonitor — Layout matches conceptual design:
// StatusDot → Name + Schedule/Last → Next Run → Toggle → Run
// Names come from API — never hardcoded
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Play, RotateCcw, Loader2, Check, X, Plus, Zap, Brain, FileText, Search, ChevronDown } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusDot } from '@/components/shared/StatusDot';
import { PageTransition } from '@/components/shared/PageTransition';
import { gateway } from '@/services/gateway';
import { useChatStore } from '@/stores/chatStore';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// ── Cron Templates (general-purpose, no private infra) ──
const CRON_TEMPLATES = [
  {
    id: 'morning-briefing',
    icon: Zap,
    name: { en: 'Morning Briefing', ar: 'إحاطة الصباح' },
    desc: { en: 'Weather, top news, and anything important from memory — delivered every morning', ar: 'طقس، أهم الأخبار، وأي شي مهم من الذاكرة — كل صباح' },
    job: {
      name: 'Morning Briefing',
      schedule: { kind: 'cron', expr: '0 6 * * *', tz: 'UTC' },
      payload: { kind: 'agentTurn', message: 'Good morning! Prepare a brief morning briefing: 1) Check the weather for my location, 2) Search for top news headlines today, 3) Check memory files for any upcoming tasks, reminders, or deadlines. Keep it concise and useful.' },
      sessionTarget: 'isolated',
      enabled: true,
    },
  },
  {
    id: 'weekly-digest',
    icon: FileText,
    name: { en: 'Weekly Digest', ar: 'ملخص أسبوعي' },
    desc: { en: 'End-of-week review — what happened, what changed, memory cleanup', ar: 'مراجعة نهاية الأسبوع — وش صار، وش تغير، تنظيف الذاكرة' },
    job: {
      name: 'Weekly Digest',
      schedule: { kind: 'cron', expr: '0 20 * * 5', tz: 'UTC' },
      payload: { kind: 'agentTurn', message: 'Weekly review time. 1) Read through this week\'s memory/YYYY-MM-DD.md files, 2) Summarize key events, decisions, and progress, 3) Update MEMORY.md with important long-term info, 4) Clean up outdated entries. Write the digest in memory/ as well.' },
      sessionTarget: 'isolated',
      enabled: true,
    },
  },
  {
    id: 'check-in',
    icon: Brain,
    name: { en: 'Check-In', ar: 'تواصل دوري' },
    desc: { en: 'Periodic nudge — asks if you need anything or have updates', ar: 'يتواصل معك كل فترة — يسأل إذا تحتاج شي أو عندك جديد' },
    job: {
      name: 'Check-In',
      schedule: { kind: 'every', everyMs: 28800000 },
      payload: { kind: 'agentTurn', message: 'Time for a check-in. Review recent memory files and sessions for context. If there are pending tasks, reminders, or anything worth following up on, reach out with a brief helpful message. If nothing needs attention, skip silently.' },
      sessionTarget: 'isolated',
      enabled: true,
    },
  },
  {
    id: 'system-health',
    icon: Search,
    name: { en: 'System Health', ar: 'صحة النظام' },
    desc: { en: 'Disk space, memory usage, uptime, and process check', ar: 'مساحة التخزين، الرام، وقت التشغيل، وفحص العمليات' },
    job: {
      name: 'System Health Check',
      schedule: { kind: 'every', everyMs: 21600000 },
      payload: { kind: 'agentTurn', message: 'Run a system health check: 1) Check disk space (df -h), 2) Check memory usage (free -h), 3) Check system uptime, 4) Look for any unusual high-CPU or high-memory processes. Report only if something needs attention.' },
      sessionTarget: 'isolated',
      enabled: true,
    },
  },
];

interface CronJob {
  id: string;
  name: string;
  schedule: any;
  enabled: boolean;
  nextRun: string | null;
  lastRun: string | null;
  sessionTarget: string;
  payload: any;
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
    lastError?: string;
    lastDurationMs?: number;
  };
}

export function CronMonitorPage() {
  const { t, i18n } = useTranslation();
  const { connected } = useChatStore();
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<Record<string, 'ok' | 'error'>>({});
  const [templateResult, setTemplateResult] = useState<Record<string, 'ok' | 'error'>>({});
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [jobRuns, setJobRuns] = useState<Record<string, any[]>>({});
  const [loadingRuns, setLoadingRuns] = useState<string | null>(null);

  // ── Load jobs from gateway ──
  const loadJobs = useCallback(async () => {
    if (!connected) return;
    try {
      const result = await gateway.call('cron.list', { includeDisabled: true });
      if (Array.isArray((result as any)?.jobs)) {
        setJobs((result as any).jobs);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [connected]);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 30000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  // ── Actions ──
  const toggleJob = async (jobId: string, enabled: boolean) => {
    setActionLoading(jobId);
    try {
      await gateway.call('cron.update', { jobId, patch: { enabled } });
      await loadJobs();
    } catch { /* silent */ }
    finally { setActionLoading(null); }
  };

  const addTemplate = async (template: typeof CRON_TEMPLATES[0]) => {
    setActionLoading(`tpl-${template.id}`);
    try {
      await gateway.call('cron.add', { job: template.job });
      await loadJobs();
      setTemplateResult((prev) => ({ ...prev, [template.id]: 'ok' }));
    } catch {
      setTemplateResult((prev) => ({ ...prev, [template.id]: 'error' }));
    } finally {
      setActionLoading(null);
      setTimeout(() => {
        setTemplateResult((prev) => { const n = { ...prev }; delete n[template.id]; return n; });
      }, 2500);
    }
  };

  const runJob = async (jobId: string) => {
    setActionLoading(`run-${jobId}`);
    setRunResult((prev) => { const n = { ...prev }; delete n[jobId]; return n; });
    try {
      const res = await gateway.call('cron.run', { id: jobId });
      console.log('[CronMonitor] run result:', jobId, res);
      await loadJobs();
      // Clear cached run history so next expand fetches fresh data
      setJobRuns(prev => { const n = { ...prev }; delete n[jobId]; return n; });
      setRunResult((prev) => ({ ...prev, [jobId]: 'ok' }));
    } catch (err) {
      console.error('[CronMonitor] run error:', jobId, err);
      setRunResult((prev) => ({ ...prev, [jobId]: 'error' }));
    } finally {
      setActionLoading(null);
      setTimeout(() => {
        setRunResult((prev) => { const n = { ...prev }; delete n[jobId]; return n; });
      }, 2500);
    }
  };

  const loadRunHistory = async (jobId: string) => {
    if (expandedJobId === jobId) { setExpandedJobId(null); return; }
    setExpandedJobId(jobId);
    if (!jobRuns[jobId]) {
      setLoadingRuns(jobId);
      try {
        const result = await gateway.call('cron.runs', { jobId });
        const entries = (result?.entries || []).slice(-10).reverse();
        setJobRuns(prev => ({ ...prev, [jobId]: entries }));
      } catch { /* silent */ }
      finally { setLoadingRuns(null); }
    }
  };

  // ── Formatters ──
  // ── Human-readable cron expression ──
  const formatSchedule = (schedule: any): string => {
    if (!schedule) return '—';
    if (schedule.kind === 'every') {
      const mins = Math.round((schedule.everyMs || 0) / 60000);
      if (mins < 60) return `Every ${mins}m`;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `Every ${h}h ${m}m` : `Every ${h}h`;
    }
    if (schedule.kind === 'at') return new Date(schedule.at).toLocaleString();
    if (schedule.kind === 'cron') {
      const expr = schedule.expr || '';
      const parts = expr.split(' ');
      if (parts.length >= 5) {
        const [min, hour, dom, mon] = parts;
        // Monthly: specific day of month
        if (dom !== '*' && mon === '*' && hour !== '*') {
          return `Monthly on ${dom}${ordinal(dom)} at ${fmtHour(hour, min)}`;
        }
        // Specific date (month + day)
        if (dom !== '*' && mon !== '*') {
          const monthName = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+mon] || mon;
          return `${monthName} ${dom} at ${fmtHour(hour, min)}`;
        }
        // Daily with interval hours
        if (hour.includes('*/')) {
          return `Every ${hour.replace('*/', '')}h`;
        }
        // Daily at specific time
        if (hour !== '*' && dom === '*') {
          return `Daily at ${fmtHour(hour, min)}`;
        }
      }
      return expr;
    }
    return '—';
  };

  const ordinal = (n: string) => {
    const num = +n;
    if (num === 1 || num === 21 || num === 31) return 'st';
    if (num === 2 || num === 22) return 'nd';
    if (num === 3 || num === 23) return 'rd';
    return 'th';
  };

  const fmtHour = (hour: string, min: string) => {
    const h = +hour;
    const m = min.padStart(2, '0');
    if (h === 0) return `12:${m} AM`;
    if (h < 12) return `${h}:${m} AM`;
    if (h === 12) return `12:${m} PM`;
    return `${h - 12}:${m} PM`;
  };

  // ── Format timestamp (supports both ms number and string) ──
  const formatTime = (ts: string | number | null | undefined): string => {
    if (ts == null) return '—';
    try {
      const d = new Date(typeof ts === 'string' ? ts : ts);
      if (isNaN(d.getTime())) return '—';
      const diff = Date.now() - d.getTime();
      if (diff < 0) {
        const absDiff = Math.abs(diff);
        if (absDiff < 3600000) return `in ${Math.floor(absDiff / 60000)}m`;
        if (absDiff < 86400000) {
          const h = Math.floor(absDiff / 3600000);
          const m = Math.floor((absDiff % 3600000) / 60000);
          if (m > 0) return `in ${h}h ${m}m`;
          return `in ${h}h`;
        }
        return `in ${Math.floor(absDiff / 86400000)}d`;
      }
      if (diff < 60000) return 'just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return `${Math.floor(diff / 86400000)}d ago`;
    } catch { return '—'; }
  };

  // ── Get effective next/last run from state or top-level ──
  const getNextRun = (job: CronJob) => job.state?.nextRunAtMs || job.nextRun;
  const getLastRun = (job: CronJob) => job.state?.lastRunAtMs || job.lastRun;
  const getStatus = (job: CronJob): 'active' | 'error' | 'paused' => {
    if (!job.enabled) return 'paused';
    if (job.state?.lastStatus === 'error') return 'error';
    return 'active';
  };

  return (
    <PageTransition className="p-6 space-y-6 max-w-[1100px] mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-extrabold text-aegis-text tracking-tight">
          Cron Monitor
        </h1>
        <button
          onClick={loadJobs}
          className="p-2 rounded-xl hover:bg-white/[0.05] text-aegis-text-dim transition-colors"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* ── Jobs List ── */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={24} className="animate-spin text-aegis-primary" />
        </div>
      ) : jobs.length === 0 ? (
        <GlassCard>
          <div className="text-center py-12 text-aegis-text-dim">
            <Clock size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-[15px] font-semibold text-aegis-text/60 mb-1">{t('cron.noJobs')}</p>
            <p className="text-[12px] text-white/25">{t('cron.noJobsHint')}</p>
          </div>
        </GlassCard>
      ) : null}

      {/* ── Active Jobs ── */}
      {!loading && jobs.length > 0 && (
        <>
          <h2 className="text-[14px] font-semibold text-aegis-text/50 uppercase tracking-wide">
            {t('cron.activeJobs')}
          </h2>
          <div className="space-y-3">
          {jobs.map((job, i) => (
            <div key={job.id}>
              <GlassCard delay={i * 0.04} hover={false}>
                <div className="flex items-center gap-5">

                  {/* ① Status Dot — green active, red error, gray paused */}
                  <StatusDot
                    status={getStatus(job)}
                    size={10}
                    glow
                    beacon={job.enabled && getStatus(job) !== 'error'}
                  />

                  {/* ② Name + Schedule/Last (conceptual: bold name, dim schedule below) */}
                  <div className="flex-1 min-w-0">
                    <div className={clsx(
                      'text-[14px] font-semibold',
                      job.enabled ? 'text-aegis-text' : 'text-aegis-text-dim'
                    )}>
                      {job.name || job.id.substring(0, 8)}
                    </div>
                    <div className="text-[11px] text-white/25 mt-1">
                      {formatSchedule(job.schedule)}
                      <span className="mx-1.5">·</span>
                      Last: {formatTime(getLastRun(job))}
                      {job.state?.lastStatus === 'error' && (
                        <span className="text-red-400/70 ms-1.5">⚠ error</span>
                      )}
                    </div>
                  </div>

                  {/* ③ Next Run — label above, time value below (conceptual: teal colored) */}
                  <div className="text-end shrink-0 me-2">
                    <div className="text-[11px] text-white/25">Next run</div>
                    <div className={clsx(
                      'text-[14px] font-semibold',
                      job.enabled ? 'text-aegis-primary text-glow-teal' : 'text-white/20'
                    )}>
                      {job.enabled ? formatTime(getNextRun(job)) : '—'}
                    </div>
                  </div>

                  {/* ④ Toggle Switch (conceptual: teal when on, gray when off) */}
                  <button
                    onClick={() => toggleJob(job.id, !job.enabled)}
                    disabled={actionLoading === job.id}
                    className={clsx(
                      'w-[42px] h-[24px] rounded-full relative transition-all shrink-0 border',
                      job.enabled
                        ? 'bg-aegis-primary/30 border-aegis-primary/40'
                        : 'bg-white/[0.08] border-white/[0.1]'
                    )}
                  >
                    <div className={clsx(
                      'absolute top-[2px] w-[18px] h-[18px] rounded-full transition-all duration-300',
                      job.enabled
                        ? 'left-[21px] bg-aegis-primary toggle-glow-teal'
                        : 'left-[2px] bg-white/30 toggle-glow-off'
                    )} />
                  </button>

                  {/* ④.5 History Button */}
                  <button
                    onClick={() => loadRunHistory(job.id)}
                    className={clsx(
                      'flex items-center gap-1 px-2.5 py-1.5 rounded-lg shrink-0',
                      'text-[11px] font-semibold transition-all duration-300',
                      'bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-aegis-primary hover:border-aegis-primary/30 hover:bg-aegis-primary/5'
                    )}
                  >
                    <Clock size={11} />
                    History
                    <ChevronDown size={11} className={clsx('transition-transform', expandedJobId === job.id && 'rotate-180')} />
                  </button>

                  {/* ⑤ Run Button (conceptual: "▶ Run" with border) */}
                  <button
                    onClick={() => runJob(job.id)}
                    disabled={!!actionLoading || !!runResult[job.id]}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0',
                      'text-[11px] font-semibold',
                      'transition-all duration-300',
                      runResult[job.id] === 'ok'
                        ? 'bg-aegis-success/10 border border-aegis-success/40 text-aegis-success'
                        : runResult[job.id] === 'error'
                        ? 'bg-red-500/10 border border-red-500/40 text-red-400'
                        : 'bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-aegis-primary hover:border-aegis-primary/30 hover:bg-aegis-primary/5'
                    )}
                  >
                    {actionLoading === `run-${job.id}` ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : runResult[job.id] === 'ok' ? (
                      <Check size={12} />
                    ) : runResult[job.id] === 'error' ? (
                      <X size={12} />
                    ) : (
                      <Play size={12} fill="currentColor" />
                    )}
                    {actionLoading === `run-${job.id}` ? 'Running...'
                      : runResult[job.id] === 'ok' ? 'Done!'
                      : runResult[job.id] === 'error' ? 'Failed'
                      : 'Run'}
                  </button>

                </div>
              </GlassCard>
              <AnimatePresence>
                {expandedJobId === job.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mx-2 mt-1 mb-2 rounded-xl border p-4 bg-white/[0.02] border-white/[0.06]">
                      {loadingRuns === job.id ? (
                        <div className="flex items-center gap-2 py-3 text-[11px] text-white/25">
                          <Loader2 size={12} className="animate-spin" /> Loading history...
                        </div>
                      ) : !jobRuns[job.id]?.length ? (
                        <div className="text-[11px] text-white/20 py-2">No run history yet</div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="text-[9px] text-white/25 uppercase tracking-wider font-semibold mb-2">Last {jobRuns[job.id].length} runs</div>
                          {jobRuns[job.id].map((run: any, ri: number) => (
                            <div key={ri} className="flex items-center gap-3 py-1.5 px-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                              <div className={clsx(
                                'w-2 h-2 rounded-full shrink-0',
                                run.status === 'ok' ? 'bg-emerald-400' : 'bg-red-400'
                              )} />
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] text-aegis-text/70 truncate">
                                  {run.summary || run.error || (run.status === 'ok' ? 'Completed successfully' : 'Failed')}
                                </div>
                              </div>
                              <div className="text-[10px] text-white/20 shrink-0">
                                {run.durationMs ? (run.durationMs < 1000 ? run.durationMs + 'ms' : Math.round(run.durationMs / 1000) + 's') : '—'}
                              </div>
                              <div className="text-[10px] text-white/20 shrink-0 w-[70px] text-end">
                                {run.ts ? new Date(run.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          </div>
        </>
      )}

      {/* ── Templates ── */}
      {!loading && (
        <>
          <h2 className="text-[14px] font-semibold text-aegis-text/50 uppercase tracking-wide mt-8">
            {t('cron.templates')}
          </h2>
          <p className="text-[12px] text-white/25 -mt-1">{t('cron.templatesHint')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CRON_TEMPLATES.map((tpl) => {
              const lang = i18n.language?.startsWith('en') ? 'en' : 'ar';
              const Icon = tpl.icon;
              const isAdded = templateResult[tpl.id] === 'ok';
              const isFailed = templateResult[tpl.id] === 'error';
              const isLoading = actionLoading === `tpl-${tpl.id}`;
              return (
                <GlassCard key={tpl.id} hover>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-aegis-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={18} className="text-aegis-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-aegis-text">
                        {tpl.name[lang]}
                      </div>
                      <div className="text-[11px] text-white/30 mt-0.5 leading-relaxed">
                        {tpl.desc[lang]}
                      </div>
                    </div>
                    <button
                      onClick={() => addTemplate(tpl)}
                      disabled={isLoading || isAdded}
                      className={clsx(
                        'flex items-center gap-1 px-2.5 py-1.5 rounded-lg shrink-0',
                        'text-[11px] font-semibold transition-all duration-300',
                        isAdded
                          ? 'bg-aegis-success/10 border border-aegis-success/40 text-aegis-success'
                          : isFailed
                          ? 'bg-red-500/10 border border-red-500/40 text-red-400'
                          : 'bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-aegis-primary hover:border-aegis-primary/30 hover:bg-aegis-primary/5'
                      )}
                    >
                      {isLoading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : isAdded ? (
                        <Check size={12} />
                      ) : isFailed ? (
                        <X size={12} />
                      ) : (
                        <Plus size={12} />
                      )}
                      {isLoading ? '...' : isAdded ? t('cron.templateAdded') : isFailed ? 'Error' : t('cron.runNow').split(' ')[0]}
                    </button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </>
      )}
    </PageTransition>
  );
}
