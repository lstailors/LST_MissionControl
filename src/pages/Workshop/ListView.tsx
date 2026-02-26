// ═══════════════════════════════════════════════════════════
// ListView — Sortable table view for tasks
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Calendar, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { themeHex, themeAlpha } from '@/utils/theme-colors';
import { PRIORITY_CONFIG, STATUS_LABELS, COLUMN_CONFIG, getAgentEmoji, getAgentName } from './constants';
import type { BoardTask, TaskPriority, TaskStatus } from './types';
import { format, formatDistanceToNow } from 'date-fns';

interface ListViewProps {
  tasks: BoardTask[];
  onTaskClick: (task: BoardTask) => void;
}

type SortField = 'task_number' | 'priority' | 'title' | 'status' | 'agent' | 'due_date' | 'created_at';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const STATUS_ORDER: Record<TaskStatus, number> = {
  backlog: 0,
  queued: 1,
  in_progress: 2,
  review: 3,
  complete: 4,
  archived: 5,
};

export function ListView({ tasks, onTaskClick }: ListViewProps) {
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'task_number':
          cmp = a.task_number.localeCompare(b.task_number);
          break;
        case 'priority':
          cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'status':
          cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          break;
        case 'agent':
          cmp = (a.assigned_agent_slug ?? 'zzz').localeCompare(b.assigned_agent_slug ?? 'zzz');
          break;
        case 'due_date':
          cmp = (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999');
          break;
        case 'created_at':
          cmp = a.created_at.localeCompare(b.created_at);
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [tasks, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={10} className="text-aegis-text-dim" />;
    return sortDir === 'asc' ? (
      <ArrowUp size={10} className="text-aegis-primary" />
    ) : (
      <ArrowDown size={10} className="text-aegis-primary" />
    );
  };

  const headerClass =
    'text-[10px] text-aegis-text-dim uppercase tracking-wider font-semibold py-2.5 px-3 cursor-pointer select-none hover:text-aegis-text-muted transition-colors flex items-center gap-1';

  return (
    <div className="flex-1 overflow-auto scrollbar-hidden">
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: 'rgb(var(--aegis-overlay) / 0.015)',
          borderColor: 'rgb(var(--aegis-overlay) / 0.07)',
        }}
      >
        {/* Header */}
        <div
          className="grid grid-cols-[70px_40px_1fr_100px_130px_90px_70px_100px] border-b"
          style={{ borderColor: 'rgb(var(--aegis-overlay) / 0.06)' }}
        >
          <div className={headerClass} onClick={() => toggleSort('task_number')}>
            # <SortIcon field="task_number" />
          </div>
          <div className={headerClass} onClick={() => toggleSort('priority')}>
            <SortIcon field="priority" />
          </div>
          <div className={headerClass} onClick={() => toggleSort('title')}>
            Title <SortIcon field="title" />
          </div>
          <div className={headerClass} onClick={() => toggleSort('status')}>
            Status <SortIcon field="status" />
          </div>
          <div className={headerClass} onClick={() => toggleSort('agent')}>
            Agent <SortIcon field="agent" />
          </div>
          <div className={headerClass} onClick={() => toggleSort('due_date')}>
            Due <SortIcon field="due_date" />
          </div>
          <div className={headerClass}>Subtasks</div>
          <div className={headerClass} onClick={() => toggleSort('created_at')}>
            Created <SortIcon field="created_at" />
          </div>
        </div>

        {/* Rows */}
        {sorted.length === 0 && (
          <div className="py-12 text-center text-[12px] text-aegis-text-dim">
            No tasks match the current filters.
          </div>
        )}
        {sorted.map((task) => {
          const pCfg = PRIORITY_CONFIG[task.priority];
          const colCfg = COLUMN_CONFIG.find((c) => c.key === task.status);

          return (
            <div
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="grid grid-cols-[70px_40px_1fr_100px_130px_90px_70px_100px] border-b cursor-pointer transition-colors hover:bg-[rgb(var(--aegis-overlay)/0.03)]"
              style={{ borderColor: 'rgb(var(--aegis-overlay) / 0.04)' }}
            >
              {/* Task number */}
              <div className="py-2.5 px-3 text-[11px] font-mono text-aegis-text-dim">
                {task.task_number}
              </div>

              {/* Priority dot */}
              <div className="py-2.5 px-3 flex items-center">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: themeHex(pCfg.colorVar as any) }}
                  title={pCfg.label}
                />
              </div>

              {/* Title */}
              <div className="py-2.5 px-3">
                <span
                  className={clsx(
                    'text-[12px] text-aegis-text font-medium',
                    task.status === 'complete' && 'line-through text-aegis-text-muted',
                  )}
                >
                  {task.title}
                </span>
                {task.tags.length > 0 && (
                  <div className="flex gap-1 mt-0.5">
                    {task.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-[8px] px-1 py-[0.5px] rounded"
                        style={{
                          background: themeAlpha('accent', 0.06),
                          color: themeAlpha('accent', 0.6),
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="py-2.5 px-3 flex items-center">
                <span
                  className="text-[9px] px-2 py-[2px] rounded font-bold uppercase"
                  style={{
                    color: colCfg ? themeHex(colCfg.colorVar as any) : undefined,
                    background: colCfg ? themeAlpha(colCfg.colorVar, 0.08) : undefined,
                  }}
                >
                  {STATUS_LABELS[task.status]}
                </span>
              </div>

              {/* Agent */}
              <div className="py-2.5 px-3 flex items-center gap-1.5">
                {task.assigned_agent_slug ? (
                  <>
                    <span className="text-[12px]">{getAgentEmoji(task.assigned_agent_slug)}</span>
                    <span className="text-[11px] text-aegis-text-secondary truncate">
                      {getAgentName(task.assigned_agent_slug)}
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] text-aegis-text-dim italic">—</span>
                )}
              </div>

              {/* Due date */}
              <div className="py-2.5 px-3">
                {task.due_date ? (
                  <span
                    className="text-[11px] font-mono"
                    style={{ color: task.is_overdue ? themeHex('danger') : 'rgb(var(--aegis-text-dim))' }}
                  >
                    {format(new Date(task.due_date), 'MMM d')}
                  </span>
                ) : (
                  <span className="text-[11px] text-aegis-text-dim">—</span>
                )}
              </div>

              {/* Subtasks */}
              <div className="py-2.5 px-3 text-[11px] text-aegis-text-dim font-mono">
                {task.subtask_count > 0 ? `${task.subtask_complete_count}/${task.subtask_count}` : '—'}
              </div>

              {/* Created */}
              <div className="py-2.5 px-3 text-[10px] text-aegis-text-dim">
                {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
