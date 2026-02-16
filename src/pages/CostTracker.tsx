// ═══════════════════════════════════════════════════════════
// CostTracker — Token usage, cost estimation & charts
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, TrendingUp, Zap, Target, AlertCircle, Download, FileText, Copy, Check } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { GlassCard } from '@/components/shared/GlassCard';
import { AnimatedCounter } from '@/components/shared/AnimatedCounter';
import { PageTransition } from '@/components/shared/PageTransition';
import { ProgressRing } from '@/components/shared/ProgressRing';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { gateway } from '@/services/gateway';
import clsx from 'clsx';

// ── Cost estimation per 1M tokens (blended: 40% input + 60% output) ──
const MODEL_RATES: Record<string, number> = {
  'opus': 45,    // (15*0.4 + 75*0.6) = 51 → rounded avg
  'sonnet': 9,   // (3*0.4 + 15*0.6) = 10.2
  'haiku': 2.4,  // (0.8*0.4 + 4*0.6) = 2.72
  'gemini': 3,   // (1.25*0.4 + 5*0.6) = 3.5
  'flash': 0.2,  // (0.075*0.4 + 0.3*0.6) = 0.21
};

const MODEL_COLORS: Record<string, string> = {
  'opus': '#4EC9B0',
  'sonnet': '#6C9FFF',
  'haiku': '#E8B84E',
  'flash': '#F47067',
};

function estimateCost(tokens: number, model?: string): number {
  const m = (model || '').toLowerCase();
  const rate = Object.entries(MODEL_RATES).find(([k]) => m.includes(k))?.[1] || 9;
  return (tokens / 1000000) * rate;
}

function getModelColor(model: string): string {
  const m = model.toLowerCase();
  return Object.entries(MODEL_COLORS).find(([k]) => m.includes(k))?.[1] || '#5a6370';
}

// ── Chart tooltip ──
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-aegis-elevated-solid border border-aegis-border rounded-xl px-3 py-2 shadow-glass text-[11px]">
      <div className="text-aegis-text-dim mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-aegis-text-muted">{p.name}:</span>
          <span className="text-aegis-text font-mono">${p.value?.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Export dropdown ──
function ExportMenu({ sessions, totalTokens, totalCost, byModel, formatTokens, estimateCost }: {
  sessions: any[]; totalTokens: number; totalCost: number;
  byModel: Record<string, { tokens: number; cost: number; count: number }>;
  formatTokens: (n: number) => string; estimateCost: (t: number, m?: string) => number;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const buildCSV = () => {
    const rows = ['Session,Model,Tokens,Estimated Cost'];
    sessions
      .filter((s: any) => (s.totalTokens || 0) > 0)
      .sort((a: any, b: any) => (b.totalTokens || 0) - (a.totalTokens || 0))
      .forEach((s: any) => {
        const key = s.key || 'unknown';
        const label = key === 'agent:main:main' ? 'Main Session'
          : key.includes('#') ? `#${key.split('#')[1]}`
          : s.label || key.split(':').pop() || key;
        const model = (s.model || '').split('/').pop() || 'unknown';
        const cost = estimateCost(s.totalTokens || 0, s.model);
        rows.push(`"${label}",${model},${s.totalTokens || 0},$${cost.toFixed(2)}`);
      });
    rows.push(`Total,—,${totalTokens},$${totalCost.toFixed(2)}`);
    return rows.join('\n');
  };

  const buildSummary = () => {
    const lines = [`📊 AEGIS Cost Report — ${new Date().toLocaleDateString()}`, ''];
    lines.push(`Total Tokens: ${formatTokens(totalTokens)}`);
    lines.push(`Estimated Cost: $${totalCost.toFixed(2)}`);
    lines.push(`Active Sessions: ${sessions.filter((s: any) => (s.totalTokens || 0) > 0).length}`);
    lines.push('');
    lines.push('By Model:');
    Object.entries(byModel).sort((a, b) => b[1].cost - a[1].cost).forEach(([m, d]) => {
      lines.push(`  ${m}: ${formatTokens(d.tokens)} tokens — $${d.cost.toFixed(2)}`);
    });
    return lines.join('\n');
  };

  const downloadCSV = () => {
    const blob = new Blob([buildCSV()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `aegis-costs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    setOpen(false);
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(buildSummary());
    setCopied(true); setOpen(false);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] transition-colors"
        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.45)' }}>
        {copied ? <Check size={14} className="text-aegis-success" /> : <Download size={14} />}
        <span>{copied ? 'تم النسخ!' : 'تصدير'}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute start-0 top-full mt-1 z-50 w-44 rounded-xl bg-aegis-elevated-solid border border-aegis-border shadow-glass overflow-hidden">
            <button onClick={downloadCSV} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.05] text-[12px] text-aegis-text-muted text-start transition-colors">
              <FileText size={14} className="text-aegis-primary shrink-0" />
              <span>تحميل CSV</span>
            </button>
            <button onClick={copyText} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.05] text-[12px] text-aegis-text-muted text-start transition-colors">
              <Copy size={14} className="text-aegis-accent shrink-0" />
              <span>نسخ ملخص</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function CostTrackerPage() {
  const { t } = useTranslation();
  const { connected } = useChatStore();
  const { budgetLimit, setBudgetLimit } = useSettingsStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [costHistory, setCostHistory] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('aegis-cost-history') || '[]'); } catch { return []; }
  });
  const [budgetInput, setBudgetInput] = useState(String(budgetLimit || ''));

  const loadSessions = useCallback(async () => {
    if (!connected) return;
    try {
      const result = await gateway.getSessions();
      const raw = Array.isArray(result?.sessions) ? result.sessions : [];
      setSessions(raw);

      // Snapshot for chart
      const byModel: Record<string, number> = {};
      raw.forEach((s: any) => {
        const model = (s.model || 'unknown').split('/').pop() || 'unknown';
        byModel[model] = (byModel[model] || 0) + estimateCost(s.totalTokens || 0, s.model);
      });
      const now = new Date();
      const timeLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const snapshot = { time: timeLabel, ...byModel };

      setCostHistory((prev) => {
        const next = [...prev, snapshot].slice(-24);
        localStorage.setItem('aegis-cost-history', JSON.stringify(next));
        return next;
      });
    } catch { /* silent */ }
  }, [connected]);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  const totalTokens = sessions.reduce((sum: number, s: any) => sum + (s.totalTokens || 0), 0);
  const totalCost = sessions.reduce((sum: number, s: any) => sum + estimateCost(s.totalTokens || 0, s.model), 0);
  const formatTokens = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
  const overBudget = budgetLimit > 0 && totalCost > budgetLimit;
  const nearBudget = budgetLimit > 0 && totalCost > budgetLimit * 0.8 && !overBudget;

  // Group by model
  const byModel: Record<string, { tokens: number; cost: number; count: number }> = {};
  sessions.forEach((s: any) => {
    const model = (s.model || 'unknown').split('/').pop() || 'unknown';
    if (!byModel[model]) byModel[model] = { tokens: 0, cost: 0, count: 0 };
    byModel[model].tokens += s.totalTokens || 0;
    byModel[model].cost += estimateCost(s.totalTokens || 0, s.model);
    byModel[model].count++;
  });

  // Unique model names for chart
  const chartModels = [...new Set(costHistory.flatMap((h) => Object.keys(h).filter((k) => k !== 'time')))];

  const handleSaveBudget = () => {
    const val = parseFloat(budgetInput);
    setBudgetLimit(isNaN(val) ? 0 : val);
  };

  return (
    <PageTransition className="p-6 space-y-6 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-aegis-text flex items-center gap-3">
            <DollarSign size={24} className="text-aegis-success" />
            {t('costs.title')}
          </h1>
          <p className="text-[13px] text-aegis-text-dim mt-1">
            {t('costs.subtitle')}
            <span className="text-aegis-text-dim/50 mx-2">·</span>
            <span className="text-[11px] text-aegis-text-dim/60">{t('costs.estimate', 'تقديرات تقريبية')}</span>
          </p>
        </div>
        <ExportMenu sessions={sessions} totalTokens={totalTokens} totalCost={totalCost} byModel={byModel} formatTokens={formatTokens} estimateCost={estimateCost} />
      </div>

      {/* Budget Alert */}
      {(overBudget || nearBudget) && (
        <div role="alert" className={clsx(
          'flex items-center gap-3 px-4 py-3 rounded-xl border',
          overBudget ? 'bg-aegis-danger/10 border-aegis-danger/30 text-aegis-danger' : 'bg-aegis-warning/10 border-aegis-warning/30 text-aegis-warning'
        )}>
          <AlertCircle size={18} />
          <div className="flex-1">
            <span className="text-[13px] font-medium">
              {overBudget ? t('costs.overBudget', 'تجاوزت الميزانية!') : t('costs.nearBudget', 'اقتربت من الميزانية')}
            </span>
            <span className="text-[12px] opacity-70 mx-2">
              ${totalCost.toFixed(2)} / ${budgetLimit.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Budget + Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <GlassCard delay={0}>
          <div className="text-center">
            <DollarSign size={20} className="text-aegis-success mx-auto mb-2" />
            <div className="text-[24px] font-bold text-aegis-text">${totalCost.toFixed(2)}</div>
            <div className="text-[11px] text-aegis-text-dim">{t('costs.estimatedCost')}</div>
          </div>
        </GlassCard>
        <GlassCard delay={0.05}>
          <div className="text-center">
            <Zap size={20} className="text-aegis-primary mx-auto mb-2" />
            <div className="text-[24px] font-bold text-aegis-text">
              <AnimatedCounter value={totalTokens} format={formatTokens} />
            </div>
            <div className="text-[11px] text-aegis-text-dim">{t('costs.totalTokens')}</div>
          </div>
        </GlassCard>
        <GlassCard delay={0.1}>
          <div className="text-center">
            <Target size={20} className="text-aegis-warning mx-auto mb-2" />
            <div className="text-[24px] font-bold text-aegis-text">{sessions.length}</div>
            <div className="text-[11px] text-aegis-text-dim">{t('costs.totalSessions')}</div>
          </div>
        </GlassCard>
        <GlassCard delay={0.15}>
          <div className="text-center">
            <AlertCircle size={20} className="text-aegis-text-dim mx-auto mb-2" />
            <div className="flex items-center gap-1 justify-center">
              <span className="text-[11px] text-aegis-text-dim">$</span>
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                onBlur={handleSaveBudget}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveBudget()}
                placeholder="0"
                className="w-20 text-center text-[20px] font-bold text-aegis-text bg-transparent border-b border-aegis-border/30 focus:border-aegis-primary/40 focus:outline-none"
              />
            </div>
            <div className="text-[11px] text-aegis-text-dim mt-1">{t('costs.budgetLimit', 'حد الميزانية')}</div>
          </div>
        </GlassCard>
      </div>

      {/* Cost Chart */}
      {costHistory.length >= 2 && (
        <GlassCard delay={0.2}>
          <h3 className="text-[14px] font-semibold text-aegis-text mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-aegis-primary" />
            {t('costs.costOverTime', 'التكاليف عبر الزمن')}
          </h3>
          <div dir="ltr" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={costHistory} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  {chartModels.map((model) => (
                    <linearGradient key={model} id={`grad-${model}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={getModelColor(model)} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={getModelColor(model)} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tick={{ fill: '#5a6370', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#5a6370', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                <Tooltip content={<ChartTooltip />} />
                {chartModels.map((model) => (
                  <Area
                    key={model}
                    type="monotone"
                    dataKey={model}
                    stroke={getModelColor(model)}
                    strokeWidth={2}
                    fill={`url(#grad-${model})`}
                    dot={{ r: 2, fill: getModelColor(model) }}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      )}

      {/* By Model */}
      <GlassCard delay={0.25}>
        <h3 className="text-[14px] font-semibold text-aegis-text mb-4">{t('costs.byModel')}</h3>
        <div className="space-y-3">
          {Object.entries(byModel)
            .sort((a, b) => b[1].cost - a[1].cost)
            .map(([model, data]) => {
              const pct = totalTokens > 0 ? Math.round((data.tokens / totalTokens) * 100) : 0;
              return (
                <div key={model} className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <ProgressRing percentage={pct} size={48} strokeWidth={3} color={getModelColor(model)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium text-aegis-text">{model}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono text-aegis-text-dim">{formatTokens(data.tokens)}</span>
                          <span className="text-[11px] font-mono text-aegis-success">${data.cost.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden mt-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: getModelColor(model) }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>
      </GlassCard>

      {/* Session Details */}
      <GlassCard delay={0.3}>
        <h3 className="text-[14px] font-semibold text-aegis-text mb-4">{t('costs.sessionBreakdown')}</h3>
        <div className="space-y-2">
          {sessions
            .filter((s: any) => (s.totalTokens || 0) > 0)
            .sort((a: any, b: any) => (b.totalTokens || 0) - (a.totalTokens || 0))
            .map((s: any) => {
              const key = s.key || 'unknown';
              const label = key === 'agent:main:main' ? 'Main Session'
                : key.includes('#') ? `#${key.split('#')[1]}`
                : s.label || key.split(':').pop() || key;
              const model = (s.model || '').split('/').pop() || '—';
              const cost = estimateCost(s.totalTokens || 0, s.model);

              return (
                <div key={key} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div>
                    <div className="text-[12px] font-medium text-aegis-text">{label}</div>
                    <div className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>{model}</div>
                  </div>
                  <div className="text-end">
                    <div className="text-[12px] font-mono text-aegis-text">{formatTokens(s.totalTokens || 0)}</div>
                    <div className="text-[10px] font-mono text-aegis-success">${cost.toFixed(3)}</div>
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
