// ═══════════════════════════════════════════════════════════
// Orchestrator — Agent Management, Pipeline, Cron, Costs, Health
// 5-tab command center for the L&S Mission Control agent system
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, GitBranch, Clock, DollarSign, HeartPulse,
  Power, Thermometer, AlertTriangle, CheckCircle2,
  XCircle, ChevronRight, Activity, Cpu, Database,
  Globe, Server, Shield, Zap, ArrowRight, ToggleLeft,
  ToggleRight, CircleDot, Loader2, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { PageTransition } from '@/components/shared/PageTransition';
import { themeHex, themeAlpha } from '@/utils/theme-colors';
import {
  useMissionControlStore,
  type MaestroAgent,
  type ScheduledTask,
  type CostEntry,
  type ActivityEntry,
} from '@/stores/missionControlStore';

// ═══════════════════════════════════════════════════════════
// Tab config
// ═══════════════════════════════════════════════════════════

type TabKey = 'agents' | 'pipeline' | 'cron' | 'costs' | 'health';

const TABS: { key: TabKey; label: string; icon: typeof Bot }[] = [
  { key: 'agents',   label: 'Agent Management',     icon: Bot },
  { key: 'pipeline', label: 'Pipeline Visualization', icon: GitBranch },
  { key: 'cron',     label: 'Scheduled Tasks',       icon: Clock },
  { key: 'costs',    label: 'Cost Dashboard',        icon: DollarSign },
  { key: 'health',   label: 'System Health',         icon: HeartPulse },
];

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function fmtCost(v: number): string {
  return `$${v.toFixed(2)}`;
}

function fmtTokens(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return v.toString();
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const GLASS_CARD_STYLE: React.CSSProperties = {
  background: 'rgb(var(--aegis-overlay) / 0.025)',
  border: '1px solid rgb(var(--aegis-overlay) / 0.07)',
};

function statusColor(status: string): string {
  switch (status) {
    case 'active':     return themeHex('success');
    case 'idle':       return themeHex('warning');
    case 'error':      return themeHex('danger');
    case 'success':    return themeHex('success');
    case 'failure':    return themeHex('danger');
    case 'warning':    return themeHex('warning');
    case 'in_progress': return themeHex('primary');
    case 'skipped':    return themeHex('warning');
    default:           return themeHex('primary');
  }
}

// ═══════════════════════════════════════════════════════════
// TAB 1: Agent Management
// ═══════════════════════════════════════════════════════════

function AgentManagementTab({ agents }: { agents: MaestroAgent[] }) {
  const { toggleAgentActive, updateAgent } = useMissionControlStore();

  const handleTempChange = useCallback(
    (slug: string, temp: number) => {
      updateAgent(slug, { temperature: parseFloat(temp.toFixed(2)) });
    },
    [updateAgent],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
    >
      {agents.map((agent) => (
        <div
          key={agent.slug}
          style={GLASS_CARD_STYLE}
          className="rounded-xl p-4 flex flex-col gap-3"
        >
          {/* Header: avatar + name + status dot + toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[18px]"
                style={{ background: themeAlpha('primary', 0.08) }}
              >
                {agent.emoji}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold text-aegis-text">
                    {agent.name}
                  </span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: statusColor(agent.status) }}
                  />
                </div>
                <span className="text-[10px] text-aegis-text-muted">
                  {agent.role}
                </span>
              </div>
            </div>

            {/* Active toggle */}
            <button
              onClick={() => toggleAgentActive(agent.slug)}
              className="transition-colors"
              title={agent.is_active ? 'Deactivate' : 'Activate'}
            >
              {agent.is_active ? (
                <ToggleRight size={22} style={{ color: themeHex('success') }} />
              ) : (
                <ToggleLeft size={22} className="text-aegis-text-dim" />
              )}
            </button>
          </div>

          {/* Model + temperature */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <Cpu size={11} className="text-aegis-text-dim shrink-0" />
              <span className="text-[10px] text-aegis-text-secondary font-mono truncate">
                {agent.model.split('-').slice(0, 3).join('-')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Thermometer size={11} className="text-aegis-text-dim" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={agent.temperature}
                onChange={(e) => handleTempChange(agent.slug, parseFloat(e.target.value))}
                className="w-16 h-1 accent-aegis-primary cursor-pointer"
                style={{ accentColor: themeHex('primary') }}
              />
              <span className="text-[10px] font-mono text-aegis-text-muted w-6 text-right">
                {agent.temperature.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Current task */}
          <div
            className="rounded-lg px-3 py-2 text-[11px] text-aegis-text-secondary"
            style={{ background: 'rgb(var(--aegis-overlay) / 0.03)' }}
          >
            <span className="text-aegis-text-dim text-[9px] uppercase tracking-wider font-semibold">
              Current Task
            </span>
            <p className="mt-0.5 leading-snug">{agent.current_task}</p>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-aegis-text-muted">
              Tasks:{' '}
              <span className="text-aegis-text">{agent.tasks_today}</span>
            </span>
            <span className="text-aegis-text-muted">
              Err:{' '}
              <span
                style={{
                  color: agent.error_rate > 0.02
                    ? themeHex('danger')
                    : agent.error_rate > 0
                      ? themeHex('warning')
                      : themeHex('success'),
                }}
              >
                {(agent.error_rate * 100).toFixed(1)}%
              </span>
            </span>
            <span className="text-aegis-text-muted">
              Cost:{' '}
              <span className="text-aegis-text">{fmtCost(agent.cost_today)}</span>
            </span>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 2: Pipeline Visualization
// ═══════════════════════════════════════════════════════════

interface PipelineStage {
  label: string;
  icon: typeof Bot;
  count: number;
  color: 'primary' | 'accent' | 'success' | 'warning' | 'danger';
}

function PipelineVisualizationTab({
  activities,
  agents,
}: {
  activities: ActivityEntry[];
  agents: MaestroAgent[];
}) {
  const stages: PipelineStage[] = useMemo(() => {
    const successCount    = activities.filter((a) => a.status === 'success').length;
    const inProgressCount = activities.filter((a) => a.status === 'in_progress').length;
    const warningCount    = activities.filter((a) => a.status === 'warning').length;
    const failureCount    = activities.filter((a) => a.status === 'failure').length;
    const activeAgents    = agents.filter((a) => a.is_active && a.status === 'active').length;

    return [
      { label: 'Intake',     icon: Globe,       count: activities.length, color: 'primary' },
      { label: 'Agents',     icon: Bot,         count: activeAgents,      color: 'accent' },
      { label: 'Processing', icon: Activity,    count: inProgressCount,   color: 'warning' },
      { label: 'Completed',  icon: CheckCircle2, count: successCount,     color: 'success' },
      { label: 'Warnings',   icon: AlertTriangle, count: warningCount,    color: 'warning' },
      { label: 'Errors',     icon: XCircle,     count: failureCount,      color: 'danger' },
    ];
  }, [activities, agents]);

  // Recent pipeline activity
  const recentActivity = useMemo(
    () => [...activities].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8),
    [activities],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* Pipeline flow diagram */}
      <div
        style={GLASS_CARD_STYLE}
        className="rounded-xl p-5"
      >
        <div className="flex items-center gap-2 mb-5">
          <GitBranch size={15} style={{ color: themeHex('primary') }} />
          <span className="text-[13px] font-semibold text-aegis-text">
            Pipeline Flow
          </span>
        </div>

        {/* Flow stages */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {stages.map((stage, i) => {
            const Icon = stage.icon;
            return (
              <div key={stage.label} className="flex items-center gap-2 shrink-0">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1"
                    style={{
                      background: themeAlpha(stage.color, 0.07),
                      border: `1px solid ${themeAlpha(stage.color, 0.15)}`,
                    }}
                  >
                    <Icon size={18} style={{ color: themeHex(stage.color) }} />
                    <span
                      className="text-[16px] font-bold"
                      style={{ color: themeHex(stage.color) }}
                    >
                      {stage.count}
                    </span>
                  </div>
                  <span className="text-[10px] text-aegis-text-muted font-medium">
                    {stage.label}
                  </span>
                </motion.div>

                {i < stages.length - 1 && (
                  <ArrowRight
                    size={14}
                    className="text-aegis-text-dim shrink-0 mx-1"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Agent throughput */}
      <div
        style={GLASS_CARD_STYLE}
        className="rounded-xl p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap size={15} style={{ color: themeHex('accent') }} />
          <span className="text-[13px] font-semibold text-aegis-text">
            Agent Throughput
          </span>
        </div>

        <div className="space-y-2">
          {agents
            .filter((a) => a.is_active)
            .sort((a, b) => b.tasks_today - a.tasks_today)
            .map((agent) => {
              const max = Math.max(...agents.map((a) => a.tasks_today), 1);
              const pct = (agent.tasks_today / max) * 100;
              return (
                <div key={agent.slug} className="flex items-center gap-3">
                  <span className="text-[14px] w-6 text-center">{agent.emoji}</span>
                  <span className="text-[11px] text-aegis-text-secondary w-20 truncate font-medium">
                    {agent.name}
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgb(var(--aegis-overlay) / 0.04)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: themeHex('primary') }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-aegis-text-muted w-8 text-right">
                    {agent.tasks_today}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Recent activity feed */}
      <div
        style={GLASS_CARD_STYLE}
        className="rounded-xl p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Activity size={15} style={{ color: themeHex('primary') }} />
          <span className="text-[13px] font-semibold text-aegis-text">
            Recent Pipeline Activity
          </span>
        </div>

        <div className="space-y-1.5">
          {recentActivity.map((act) => {
            const agent = agents.find((a) => a.slug === act.agent_slug);
            return (
              <div
                key={act.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{ background: 'rgb(var(--aegis-overlay) / 0.02)' }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: statusColor(act.status) }}
                />
                <span className="text-[12px] w-5 text-center">
                  {agent?.emoji || '?'}
                </span>
                <span className="text-[11px] text-aegis-text-secondary flex-1 truncate">
                  {act.summary}
                </span>
                <span className="text-[10px] text-aegis-text-dim font-mono shrink-0">
                  {act.duration_ms}ms
                </span>
                <span className="text-[9px] text-aegis-text-dim shrink-0">
                  {timeAgo(act.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 3: Scheduled Tasks (Cron)
// ═══════════════════════════════════════════════════════════

function ScheduledTasksTab({
  tasks,
  agents,
}: {
  tasks: ScheduledTask[];
  agents: MaestroAgent[];
}) {
  const { toggleScheduledTask } = useMissionControlStore();

  // Group tasks by agent
  const grouped = useMemo(() => {
    const map = new Map<string, ScheduledTask[]>();
    for (const task of tasks) {
      const list = map.get(task.agent_slug) || [];
      list.push(task);
      map.set(task.agent_slug, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [tasks]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Summary row */}
      <div className="flex items-center gap-4 flex-wrap">
        {[
          { label: 'Total Jobs',  value: tasks.length, color: 'primary' as const },
          { label: 'Active',      value: tasks.filter((t) => t.is_active).length, color: 'success' as const },
          { label: 'Disabled',    value: tasks.filter((t) => !t.is_active).length, color: 'danger' as const },
          { label: 'Total Runs',  value: tasks.reduce((s, t) => s + t.run_count, 0), color: 'accent' as const },
          { label: 'Failures',    value: tasks.reduce((s, t) => s + t.failure_count, 0), color: 'warning' as const },
        ].map((stat) => (
          <div
            key={stat.label}
            style={GLASS_CARD_STYLE}
            className="rounded-lg px-4 py-2.5 flex items-center gap-2"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: themeHex(stat.color) }}
            />
            <span className="text-[10px] text-aegis-text-muted uppercase tracking-wider font-medium">
              {stat.label}
            </span>
            <span
              className="text-[14px] font-bold"
              style={{ color: themeHex(stat.color) }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Grouped task tables */}
      {grouped.map(([slug, agentTasks]) => {
        const agent = agents.find((a) => a.slug === slug);
        return (
          <div
            key={slug}
            style={GLASS_CARD_STYLE}
            className="rounded-xl overflow-hidden"
          >
            {/* Agent header */}
            <div
              className="flex items-center gap-2.5 px-4 py-3"
              style={{ borderBottom: '1px solid rgb(var(--aegis-overlay) / 0.06)' }}
            >
              <span className="text-[14px]">{agent?.emoji || '?'}</span>
              <span className="text-[12px] font-semibold text-aegis-text">
                {agent?.name || slug}
              </span>
              <span className="text-[10px] text-aegis-text-dim">
                {agent?.role}
              </span>
              <span className="ml-auto text-[10px] font-mono text-aegis-text-muted">
                {agentTasks.length} job{agentTasks.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr
                    className="text-[9px] text-aegis-text-dim uppercase tracking-wider"
                    style={{ borderBottom: '1px solid rgb(var(--aegis-overlay) / 0.05)' }}
                  >
                    <th className="px-4 py-2 font-semibold">Task</th>
                    <th className="px-4 py-2 font-semibold">Schedule</th>
                    <th className="px-4 py-2 font-semibold">Last Run</th>
                    <th className="px-4 py-2 font-semibold text-center">Status</th>
                    <th className="px-4 py-2 font-semibold text-right">Runs</th>
                    <th className="px-4 py-2 font-semibold text-right">Fails</th>
                    <th className="px-4 py-2 font-semibold text-center">Enabled</th>
                  </tr>
                </thead>
                <tbody>
                  {agentTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="group hover:bg-[rgb(var(--aegis-overlay)/0.02)] transition-colors"
                      style={{ borderBottom: '1px solid rgb(var(--aegis-overlay) / 0.03)' }}
                    >
                      <td className="px-4 py-2.5">
                        <div className="text-[11px] text-aegis-text font-medium">
                          {task.task_name}
                        </div>
                        <div className="text-[9px] text-aegis-text-dim mt-0.5">
                          {task.description}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-[10px] text-aegis-text-secondary">
                          {task.human_schedule}
                        </div>
                        <div className="text-[9px] text-aegis-text-dim font-mono mt-0.5">
                          {task.cron_expression}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-[10px] text-aegis-text-muted font-mono">
                        {timeAgo(task.last_run_at)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {task.last_run_status ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase"
                            style={{
                              color: statusColor(task.last_run_status),
                              background: themeAlpha(
                                task.last_run_status === 'success'
                                  ? 'success'
                                  : task.last_run_status === 'failure'
                                    ? 'danger'
                                    : 'warning',
                                0.1,
                              ),
                            }}
                          >
                            {task.last_run_status === 'success' && <CheckCircle2 size={9} />}
                            {task.last_run_status === 'failure' && <XCircle size={9} />}
                            {task.last_run_status === 'skipped' && <AlertTriangle size={9} />}
                            {task.last_run_status}
                          </span>
                        ) : (
                          <span className="text-[9px] text-aegis-text-dim">--</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[10px] font-mono text-aegis-text-secondary">
                        {task.run_count}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[10px] font-mono"
                        style={{
                          color: task.failure_count > 0 ? themeHex('danger') : themeHex('success'),
                        }}
                      >
                        {task.failure_count}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => toggleScheduledTask(task.id)}
                          className="transition-colors"
                        >
                          {task.is_active ? (
                            <ToggleRight size={20} style={{ color: themeHex('success') }} />
                          ) : (
                            <ToggleLeft size={20} className="text-aegis-text-dim" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 4: Cost Dashboard
// ═══════════════════════════════════════════════════════════

function CostDashboardTab({
  costs,
  agents,
}: {
  costs: CostEntry[];
  agents: MaestroAgent[];
}) {
  // Summary stats
  const stats = useMemo(() => {
    const totalCost    = costs.reduce((s, c) => s + c.cost_usd, 0);
    const totalTokens  = costs.reduce((s, c) => s + c.total_tokens, 0);
    const totalInput   = costs.reduce((s, c) => s + c.input_tokens, 0);
    const totalOutput  = costs.reduce((s, c) => s + c.output_tokens, 0);
    const totalRequests = costs.length;
    return { totalCost, totalTokens, totalInput, totalOutput, totalRequests };
  }, [costs]);

  // By agent breakdown
  const byAgent = useMemo(() => {
    const map = new Map<string, { cost: number; tokens: number; requests: number }>();
    for (const c of costs) {
      const prev = map.get(c.agent_slug) || { cost: 0, tokens: 0, requests: 0 };
      map.set(c.agent_slug, {
        cost: prev.cost + c.cost_usd,
        tokens: prev.tokens + c.total_tokens,
        requests: prev.requests + 1,
      });
    }
    return Array.from(map.entries())
      .map(([slug, data]) => ({ slug, ...data }))
      .sort((a, b) => b.cost - a.cost);
  }, [costs]);

  // By model breakdown
  const byModel = useMemo(() => {
    const map = new Map<string, { cost: number; tokens: number; requests: number }>();
    for (const c of costs) {
      const prev = map.get(c.model) || { cost: 0, tokens: 0, requests: 0 };
      map.set(c.model, {
        cost: prev.cost + c.cost_usd,
        tokens: prev.tokens + c.total_tokens,
        requests: prev.requests + 1,
      });
    }
    return Array.from(map.entries())
      .map(([model, data]) => ({ model, ...data }))
      .sort((a, b) => b.cost - a.cost);
  }, [costs]);

  const maxAgentCost = Math.max(...byAgent.map((a) => a.cost), 0.01);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Cost',     value: fmtCost(stats.totalCost),     color: 'primary' as const, icon: DollarSign },
          { label: 'Total Tokens',   value: fmtTokens(stats.totalTokens), color: 'accent' as const,  icon: Zap },
          { label: 'Input Tokens',   value: fmtTokens(stats.totalInput),  color: 'success' as const, icon: ArrowRight },
          { label: 'Output Tokens',  value: fmtTokens(stats.totalOutput), color: 'warning' as const, icon: ArrowRight },
          { label: 'API Requests',   value: stats.totalRequests.toString(), color: 'danger' as const, icon: Activity },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              style={GLASS_CARD_STYLE}
              className="rounded-xl p-4 flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-1.5">
                <Icon size={12} style={{ color: themeHex(stat.color) }} />
                <span className="text-[9px] text-aegis-text-dim uppercase tracking-wider font-semibold">
                  {stat.label}
                </span>
              </div>
              <span
                className="text-[20px] font-bold"
                style={{ color: themeHex(stat.color) }}
              >
                {stat.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* By Agent table */}
      <div
        style={GLASS_CARD_STYLE}
        className="rounded-xl p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Bot size={15} style={{ color: themeHex('accent') }} />
          <span className="text-[13px] font-semibold text-aegis-text">
            Cost by Agent
          </span>
        </div>

        <div className="space-y-2">
          {byAgent.map((entry) => {
            const agent = agents.find((a) => a.slug === entry.slug);
            const pct   = (entry.cost / maxAgentCost) * 100;
            return (
              <div key={entry.slug} className="flex items-center gap-3">
                <span className="text-[14px] w-6 text-center shrink-0">
                  {agent?.emoji || '?'}
                </span>
                <span className="text-[11px] text-aegis-text-secondary w-20 truncate font-medium shrink-0">
                  {agent?.name || entry.slug}
                </span>
                <div
                  className="flex-1 h-3 rounded-full overflow-hidden"
                  style={{ background: 'rgb(var(--aegis-overlay) / 0.04)' }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="h-full rounded-full"
                    style={{ background: themeHex('accent') }}
                  />
                </div>
                <span className="text-[10px] font-mono text-aegis-text-muted w-16 text-right shrink-0">
                  {fmtTokens(entry.tokens)} tk
                </span>
                <span className="text-[11px] font-mono font-semibold text-aegis-text w-14 text-right shrink-0">
                  {fmtCost(entry.cost)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* By Model table */}
      <div
        style={GLASS_CARD_STYLE}
        className="rounded-xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-5 pt-5 pb-3">
          <Cpu size={15} style={{ color: themeHex('primary') }} />
          <span className="text-[13px] font-semibold text-aegis-text">
            Cost by Model
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr
                className="text-[9px] text-aegis-text-dim uppercase tracking-wider"
                style={{ borderBottom: '1px solid rgb(var(--aegis-overlay) / 0.05)' }}
              >
                <th className="px-5 py-2 font-semibold">Model</th>
                <th className="px-5 py-2 font-semibold text-right">Requests</th>
                <th className="px-5 py-2 font-semibold text-right">Tokens</th>
                <th className="px-5 py-2 font-semibold text-right">Cost</th>
                <th className="px-5 py-2 font-semibold text-right">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {byModel.map((entry) => (
                <tr
                  key={entry.model}
                  className="hover:bg-[rgb(var(--aegis-overlay)/0.02)] transition-colors"
                  style={{ borderBottom: '1px solid rgb(var(--aegis-overlay) / 0.03)' }}
                >
                  <td className="px-5 py-2.5 text-[11px] font-mono text-aegis-text-secondary">
                    {entry.model.split('-').slice(0, 3).join('-')}
                  </td>
                  <td className="px-5 py-2.5 text-[10px] font-mono text-aegis-text-muted text-right">
                    {entry.requests}
                  </td>
                  <td className="px-5 py-2.5 text-[10px] font-mono text-aegis-text-muted text-right">
                    {fmtTokens(entry.tokens)}
                  </td>
                  <td className="px-5 py-2.5 text-[11px] font-mono font-semibold text-aegis-text text-right">
                    {fmtCost(entry.cost)}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                      style={{
                        color: themeHex('primary'),
                        background: themeAlpha('primary', 0.08),
                      }}
                    >
                      {stats.totalCost > 0
                        ? ((entry.cost / stats.totalCost) * 100).toFixed(1)
                        : '0.0'}
                      %
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-agent daily cost from agent.cost_today */}
      <div
        style={GLASS_CARD_STYLE}
        className="rounded-xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-5 pt-5 pb-3">
          <DollarSign size={15} style={{ color: themeHex('warning') }} />
          <span className="text-[13px] font-semibold text-aegis-text">
            Today's Spend by Agent
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr
                className="text-[9px] text-aegis-text-dim uppercase tracking-wider"
                style={{ borderBottom: '1px solid rgb(var(--aegis-overlay) / 0.05)' }}
              >
                <th className="px-5 py-2 font-semibold">Agent</th>
                <th className="px-5 py-2 font-semibold">Role</th>
                <th className="px-5 py-2 font-semibold text-right">Tasks Today</th>
                <th className="px-5 py-2 font-semibold text-right">Cost Today</th>
              </tr>
            </thead>
            <tbody>
              {[...agents]
                .sort((a, b) => b.cost_today - a.cost_today)
                .map((agent) => (
                  <tr
                    key={agent.slug}
                    className="hover:bg-[rgb(var(--aegis-overlay)/0.02)] transition-colors"
                    style={{ borderBottom: '1px solid rgb(var(--aegis-overlay) / 0.03)' }}
                  >
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px]">{agent.emoji}</span>
                        <span className="text-[11px] font-medium text-aegis-text">
                          {agent.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-[10px] text-aegis-text-muted">
                      {agent.role}
                    </td>
                    <td className="px-5 py-2.5 text-[10px] font-mono text-aegis-text-secondary text-right">
                      {agent.tasks_today}
                    </td>
                    <td className="px-5 py-2.5 text-[11px] font-mono font-semibold text-aegis-text text-right">
                      {fmtCost(agent.cost_today)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 5: System Health
// ═══════════════════════════════════════════════════════════

interface ServiceStatus {
  name: string;
  icon: typeof Server;
  status: 'operational' | 'degraded' | 'down';
  latency: string;
  uptime: string;
  details: string;
}

function SystemHealthTab({ agents, activities }: { agents: MaestroAgent[]; activities: ActivityEntry[] }) {
  const [services] = useState<ServiceStatus[]>(() => [
    {
      name: 'Supabase',
      icon: Database,
      status: 'operational',
      latency: '12ms',
      uptime: '99.98%',
      details: 'Database and auth services running normally. 0 connection errors in the last 24h.',
    },
    {
      name: 'Agent Gateway',
      icon: Server,
      status: 'operational',
      latency: '8ms',
      uptime: '99.99%',
      details: 'All agent routes responding. Message queue depth: 0. Last restart: 6d ago.',
    },
    {
      name: 'Claude API',
      icon: Cpu,
      status: 'operational',
      latency: '245ms',
      uptime: '99.95%',
      details: 'Sonnet and Haiku endpoints healthy. Rate limit headroom: 82%. No throttling events.',
    },
    {
      name: 'System Resources',
      icon: Activity,
      status: 'operational',
      latency: '--',
      uptime: '100%',
      details: 'CPU: 14% | Memory: 2.1 GB / 8 GB | Disk: 38% used. All within thresholds.',
    },
  ]);

  // Derive agent error summary
  const agentErrors = useMemo(() => {
    const errored = agents.filter((a) => a.error_rate > 0);
    const errorActivities = activities.filter((a) => a.status === 'failure');
    return { erroredAgents: errored, errorActivities: errorActivities.slice(0, 5) };
  }, [agents, activities]);

  const totalActiveAgents = agents.filter((a) => a.is_active).length;
  const totalIdleAgents   = agents.filter((a) => a.status === 'idle').length;
  const totalErrorAgents  = agents.filter((a) => a.status === 'error').length;

  function serviceStatusColor(s: string): string {
    switch (s) {
      case 'operational': return themeHex('success');
      case 'degraded':    return themeHex('warning');
      case 'down':        return themeHex('danger');
      default:            return themeHex('primary');
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Health overview banner */}
      <div
        className="rounded-xl px-5 py-4 flex items-center gap-3"
        style={{
          background: themeAlpha('success', 0.04),
          border: `1px solid ${themeAlpha('success', 0.12)}`,
        }}
      >
        <Shield size={20} style={{ color: themeHex('success') }} />
        <div>
          <div className="text-[13px] font-semibold text-aegis-text">
            All Systems Operational
          </div>
          <div className="text-[10px] text-aegis-text-muted mt-0.5">
            Last check: {new Date().toLocaleTimeString()} -- {totalActiveAgents} agents active, {totalIdleAgents} idle, {totalErrorAgents} errors
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ background: themeHex('success') }}
          />
          <span className="text-[10px] font-semibold" style={{ color: themeHex('success') }}>
            HEALTHY
          </span>
        </div>
      </div>

      {/* Service cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {services.map((svc) => {
          const Icon = svc.icon;
          return (
            <div
              key={svc.name}
              style={GLASS_CARD_STYLE}
              className="rounded-xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: themeAlpha('primary', 0.06) }}
                  >
                    <Icon size={18} style={{ color: themeHex('primary') }} />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-aegis-text">
                      {svc.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: serviceStatusColor(svc.status) }}
                      />
                      <span
                        className="text-[9px] font-semibold uppercase tracking-wider"
                        style={{ color: serviceStatusColor(svc.status) }}
                      >
                        {svc.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics row */}
              <div className="flex items-center gap-4 text-[10px]">
                <div>
                  <span className="text-aegis-text-dim">Latency: </span>
                  <span className="font-mono text-aegis-text-secondary">{svc.latency}</span>
                </div>
                <div>
                  <span className="text-aegis-text-dim">Uptime: </span>
                  <span className="font-mono" style={{ color: themeHex('success') }}>
                    {svc.uptime}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div
                className="text-[10px] text-aegis-text-muted leading-relaxed px-3 py-2 rounded-lg"
                style={{ background: 'rgb(var(--aegis-overlay) / 0.025)' }}
              >
                {svc.details}
              </div>
            </div>
          );
        })}
      </div>

      {/* Agent Health Summary */}
      <div
        style={GLASS_CARD_STYLE}
        className="rounded-xl p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Bot size={15} style={{ color: themeHex('accent') }} />
          <span className="text-[13px] font-semibold text-aegis-text">
            Agent Health Summary
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Active Agents', value: totalActiveAgents, total: agents.length, color: 'success' as const },
            { label: 'Idle Agents',   value: totalIdleAgents,   total: agents.length, color: 'warning' as const },
            { label: 'Error Agents',  value: totalErrorAgents,  total: agents.length, color: 'danger' as const },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg px-4 py-3 flex items-center justify-between"
              style={{ background: 'rgb(var(--aegis-overlay) / 0.025)' }}
            >
              <div>
                <div className="text-[9px] text-aegis-text-dim uppercase tracking-wider font-semibold">
                  {item.label}
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span
                    className="text-[20px] font-bold"
                    style={{ color: themeHex(item.color) }}
                  >
                    {item.value}
                  </span>
                  <span className="text-[11px] text-aegis-text-dim font-mono">
                    / {item.total}
                  </span>
                </div>
              </div>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: themeAlpha(item.color, 0.08),
                  border: `2px solid ${themeAlpha(item.color, 0.2)}`,
                }}
              >
                <span className="text-[11px] font-bold" style={{ color: themeHex(item.color) }}>
                  {item.total > 0 ? Math.round((item.value / item.total) * 100) : 0}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Agent error rates */}
        <div className="space-y-1.5">
          {agents
            .filter((a) => a.is_active)
            .sort((a, b) => b.error_rate - a.error_rate)
            .map((agent) => (
              <div
                key={agent.slug}
                className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{ background: 'rgb(var(--aegis-overlay) / 0.02)' }}
              >
                <span className="text-[13px] w-6 text-center">{agent.emoji}</span>
                <span className="text-[11px] text-aegis-text-secondary w-20 truncate font-medium">
                  {agent.name}
                </span>
                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'rgb(var(--aegis-overlay) / 0.04)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max((1 - agent.error_rate) * 100, 5)}%`,
                      background:
                        agent.error_rate > 0.02
                          ? themeHex('danger')
                          : agent.error_rate > 0
                            ? themeHex('warning')
                            : themeHex('success'),
                    }}
                  />
                </div>
                <span
                  className="text-[10px] font-mono w-12 text-right"
                  style={{
                    color:
                      agent.error_rate > 0.02
                        ? themeHex('danger')
                        : agent.error_rate > 0
                          ? themeHex('warning')
                          : themeHex('success'),
                  }}
                >
                  {(100 - agent.error_rate * 100).toFixed(1)}%
                </span>
                <span className="text-[9px] text-aegis-text-dim w-10 text-right">uptime</span>
              </div>
            ))}
        </div>
      </div>

      {/* Recent errors */}
      {agentErrors.errorActivities.length > 0 && (
        <div
          style={GLASS_CARD_STYLE}
          className="rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={15} style={{ color: themeHex('danger') }} />
            <span className="text-[13px] font-semibold text-aegis-text">
              Recent Errors
            </span>
          </div>

          <div className="space-y-2">
            {agentErrors.errorActivities.map((act) => {
              const agent = agents.find((a) => a.slug === act.agent_slug);
              return (
                <div
                  key={act.id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
                  style={{
                    background: themeAlpha('danger', 0.03),
                    border: `1px solid ${themeAlpha('danger', 0.08)}`,
                  }}
                >
                  <XCircle size={14} style={{ color: themeHex('danger') }} className="shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px]">{agent?.emoji || '?'}</span>
                      <span className="text-[11px] font-medium text-aegis-text">
                        {agent?.name || act.agent_slug}
                      </span>
                      <span className="text-[9px] text-aegis-text-dim">
                        {timeAgo(act.created_at)}
                      </span>
                    </div>
                    <div className="text-[10px] text-aegis-text-muted mt-0.5">
                      {act.summary}
                    </div>
                    {act.error_message && (
                      <div
                        className="text-[9px] font-mono mt-1 px-2 py-1 rounded"
                        style={{
                          color: themeHex('danger'),
                          background: themeAlpha('danger', 0.05),
                        }}
                      >
                        {act.error_message}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════

export function OrchestratorPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('agents');

  const seed           = useMissionControlStore((s) => s.seed);
  const agents         = useMissionControlStore((s) => s.agents);
  const activities     = useMissionControlStore((s) => s.activities);
  const scheduledTasks = useMissionControlStore((s) => s.scheduledTasks);
  const costs          = useMissionControlStore((s) => s.costs);

  // Seed store on mount
  useEffect(() => {
    seed();
  }, [seed]);

  return (
    <PageTransition className="p-5 space-y-5 max-w-[1400px] mx-auto overflow-y-auto h-full">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <motion.div
          animate={{
            boxShadow: [
              `0 0 10px ${themeAlpha('accent', 0.1)}`,
              `0 0 22px ${themeAlpha('accent', 0.2)}`,
              `0 0 10px ${themeAlpha('accent', 0.1)}`,
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-aegis-accent/15 to-aegis-accent/5 border border-aegis-accent/20 flex items-center justify-center"
        >
          <GitBranch size={20} className="text-aegis-accent" />
        </motion.div>
        <div>
          <h1 className="text-[18px] font-bold text-aegis-text tracking-tight">
            Orchestrator
          </h1>
          <p className="text-[11px] text-aegis-text-dim">
            Agent management, pipelines, scheduling, costs & system health
          </p>
        </div>
      </div>

      {/* ── Tab Pills ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {TABS.map((tab) => {
          const Icon   = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200',
                active
                  ? 'text-aegis-accent'
                  : 'text-aegis-text-muted hover:text-aegis-text-secondary',
              )}
              style={
                active
                  ? {
                      background: themeAlpha('accent', 0.08),
                      border: `1px solid ${themeAlpha('accent', 0.18)}`,
                      boxShadow: `0 0 12px ${themeAlpha('accent', 0.06)}`,
                    }
                  : {
                      background: 'rgb(var(--aegis-overlay) / 0.025)',
                      border: '1px solid rgb(var(--aegis-overlay) / 0.06)',
                    }
              }
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'agents' && (
          <AgentManagementTab key="agents" agents={agents} />
        )}
        {activeTab === 'pipeline' && (
          <PipelineVisualizationTab
            key="pipeline"
            activities={activities}
            agents={agents}
          />
        )}
        {activeTab === 'cron' && (
          <ScheduledTasksTab
            key="cron"
            tasks={scheduledTasks}
            agents={agents}
          />
        )}
        {activeTab === 'costs' && (
          <CostDashboardTab key="costs" costs={costs} agents={agents} />
        )}
        {activeTab === 'health' && (
          <SystemHealthTab
            key="health"
            agents={agents}
            activities={activities}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
