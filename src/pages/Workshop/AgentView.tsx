// ═══════════════════════════════════════════════════════════
// AgentView — Workload view grouped by agent
// ═══════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { themeHex, themeAlpha } from '@/utils/theme-colors';
import { useWorkshopStore } from '@/stores/workshopStore';
import { PRIORITY_CONFIG, getAgentEmoji } from './constants';
import type { AgentWorkload, BoardTask, WorkshopTask } from './types';
import clsx from 'clsx';

interface AgentViewProps {
  onTaskClick: (task: BoardTask | WorkshopTask) => void;
}

export function AgentView({ onTaskClick }: AgentViewProps) {
  const { getAgentWorkloads, getBoardTasks } = useWorkshopStore();

  const workloads = getAgentWorkloads();
  const allBoardTasks = getBoardTasks();

  const unassignedTasks = useMemo(
    () => allBoardTasks.filter((t) => !t.assigned_agent_slug && t.status !== 'complete' && t.status !== 'archived'),
    [allBoardTasks],
  );

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hidden space-y-5 pb-4">
      {/* Agent grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {workloads.map((agent, i) => (
          <AgentCard
            key={agent.slug}
            agent={agent}
            delay={i * 0.04}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      {/* Unassigned tasks */}
      {unassignedTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg border-2 border-dashed border-[rgb(var(--aegis-overlay)/0.12)] flex items-center justify-center">
              <span className="text-[10px] text-aegis-text-dim">?</span>
            </div>
            <span className="text-[11px] font-bold text-aegis-text-muted uppercase tracking-wider">
              Unassigned
            </span>
            <span className="text-[10px] text-aegis-text-dim">({unassignedTasks.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {unassignedTasks.map((task) => (
              <MiniTaskRow key={task.id} task={task} onClick={() => onTaskClick(task)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentCard({
  agent,
  delay,
  onTaskClick,
}: {
  agent: AgentWorkload;
  delay: number;
  onTaskClick: (task: WorkshopTask) => void;
}) {
  const utilization = agent.active_tasks / 5;
  const barColor =
    utilization > 0.8
      ? themeHex('danger')
      : utilization > 0.6
        ? themeHex('warning')
        : themeHex('success');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border transition-all hover:border-[rgb(var(--aegis-overlay)/0.12)]"
      style={{
        background: 'rgb(var(--aegis-overlay) / 0.025)',
        borderColor: 'rgb(var(--aegis-overlay) / 0.07)',
      }}
    >
      <div className="p-4">
        {/* Agent header */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{
              background: themeAlpha('primary', 0.08),
              border: `1px solid ${themeAlpha('primary', 0.12)}`,
            }}
          >
            {agent.emoji}
          </div>
          <div>
            <div className="text-[14px] font-bold text-aegis-text">{agent.name}</div>
            <div className="text-[10px] text-aegis-text-dim uppercase tracking-wider">{agent.role}</div>
          </div>
        </div>

        {/* Bandwidth bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-aegis-text-dim">Bandwidth</span>
            <span className="text-[10px] font-mono" style={{ color: barColor }}>
              {agent.active_tasks}/5
            </span>
          </div>
          <div
            className="h-[4px] rounded-full overflow-hidden"
            style={{ background: 'rgb(var(--aegis-overlay) / 0.06)' }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(utilization * 100, 100)}%` }}
              transition={{ duration: 0.8, delay: delay + 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full"
              style={{ background: barColor }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[10px] text-aegis-text-muted mb-3">
          <span>
            <strong className="text-aegis-text">{agent.active_tasks}</strong> active
          </span>
          <span className="opacity-30">·</span>
          <span>
            <strong className="text-aegis-text">{agent.queued_tasks}</strong> queued
          </span>
          <span className="opacity-30">·</span>
          <span>
            <strong className="text-aegis-success">{agent.completed_this_week}</strong> done this week
          </span>
        </div>

        {/* Estimated hours */}
        {agent.total_estimated_hours > 0 && (
          <div className="text-[10px] text-aegis-text-dim mb-3 font-mono">
            ~{agent.total_estimated_hours}h estimated work remaining
          </div>
        )}

        {/* Task list */}
        {agent.tasks.length > 0 && (
          <div className="space-y-1">
            {agent.tasks.slice(0, 5).map((task) => (
              <MiniTaskRow key={task.id} task={task} onClick={() => onTaskClick(task)} />
            ))}
            {agent.tasks.length > 5 && (
              <span className="text-[10px] text-aegis-text-dim">
                +{agent.tasks.length - 5} more
              </span>
            )}
          </div>
        )}

        {agent.tasks.length === 0 && agent.total_open === 0 && (
          <div className="text-[10px] text-aegis-text-dim italic text-center py-3">
            No active tasks
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MiniTaskRow({
  task,
  onClick,
}: {
  task: WorkshopTask;
  onClick: () => void;
}) {
  const cfg = PRIORITY_CONFIG[task.priority];
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-[rgb(var(--aegis-overlay)/0.04)] transition-colors"
    >
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: themeHex(cfg.colorVar as any) }}
      />
      <span className="text-[11px] text-aegis-text-secondary truncate flex-1">{task.title}</span>
      <span
        className="text-[9px] px-1.5 py-[1px] rounded font-bold uppercase shrink-0"
        style={{
          color: task.status === 'in_progress' ? themeHex('warning') : themeHex('accent'),
          background:
            task.status === 'in_progress' ? themeAlpha('warning', 0.08) : themeAlpha('accent', 0.08),
        }}
      >
        {task.status === 'in_progress' ? 'Active' : 'Queued'}
      </span>
    </div>
  );
}
