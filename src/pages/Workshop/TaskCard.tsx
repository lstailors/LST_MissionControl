// ═══════════════════════════════════════════════════════════
// TaskCard — Board card for a single task
// ═══════════════════════════════════════════════════════════

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, Paperclip, Lock, AlertTriangle, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { themeHex, themeAlpha } from '@/utils/theme-colors';
import { PRIORITY_CONFIG, getAgentEmoji, getAgentName } from './constants';
import type { BoardTask } from './types';
import { format, differenceInDays } from 'date-fns';

interface TaskCardProps {
  task: BoardTask;
  onClick: (task: BoardTask) => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityCfg = PRIORITY_CONFIG[task.priority];
  const isComplete = task.status === 'complete';

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      className={clsx(
        'rounded-xl border cursor-pointer transition-all group',
        'hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)]',
        isDragging && 'shadow-[0_8px_32px_rgba(0,0,0,0.3)] scale-[1.02]',
        isComplete && 'opacity-70',
      )}
      style={{
        ...style,
        background: 'rgb(var(--aegis-overlay) / 0.025)',
        borderColor: 'rgb(var(--aegis-overlay) / 0.07)',
      }}
    >
      <div className="p-3">
        {/* Top row: priority + task number */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: themeHex(priorityCfg.colorVar as any) }}
            />
            <span className="text-[10px] font-mono text-aegis-text-dim">
              {task.task_number}
            </span>
          </div>
          <span
            className="text-[8px] px-1.5 py-[1px] rounded font-bold uppercase tracking-wider"
            style={{
              color: themeHex(priorityCfg.colorVar as any),
              background: themeAlpha(priorityCfg.colorVar, 0.1),
              border: `1px solid ${themeAlpha(priorityCfg.colorVar, 0.15)}`,
            }}
          >
            {priorityCfg.label}
          </span>
        </div>

        {/* Title */}
        <div
          className={clsx(
            'text-[12px] font-semibold text-aegis-text leading-snug mb-2 line-clamp-2',
            isComplete && 'line-through decoration-[rgb(var(--aegis-overlay)/0.15)]',
          )}
        >
          {task.title}
        </div>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-[1px] rounded"
                style={{
                  background: themeAlpha('accent', 0.08),
                  color: themeAlpha('accent', 0.7),
                  border: `1px solid ${themeAlpha('accent', 0.12)}`,
                }}
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="text-[9px] text-aegis-text-dim">+{task.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Subtask progress */}
        {task.subtask_count > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-aegis-text-dim">
                {task.subtask_complete_count}/{task.subtask_count} subtasks
              </span>
            </div>
            <div
              className="h-[3px] rounded-full overflow-hidden"
              style={{ background: 'rgb(var(--aegis-overlay) / 0.06)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(task.subtask_complete_count / task.subtask_count) * 100}%`,
                  background: themeHex('warning'),
                }}
              />
            </div>
          </div>
        )}

        {/* Overdue / Blocked badges */}
        {(task.is_overdue || task.is_blocked) && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.is_overdue && (
              <span
                className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-[2px] rounded"
                style={{
                  color: themeHex('danger'),
                  background: themeAlpha('danger', 0.1),
                  border: `1px solid ${themeAlpha('danger', 0.15)}`,
                }}
              >
                <AlertTriangle size={9} />
                OVERDUE {task.due_date && `${differenceInDays(new Date(), new Date(task.due_date))}d`}
              </span>
            )}
            {task.is_blocked && (
              <span
                className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-[2px] rounded"
                style={{
                  color: themeHex('warning'),
                  background: themeAlpha('warning', 0.1),
                  border: `1px solid ${themeAlpha('warning', 0.15)}`,
                }}
              >
                <Lock size={9} />
                BLOCKED
              </span>
            )}
          </div>
        )}

        {/* Bottom row: agent + due date + counts */}
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1.5">
            {task.assigned_agent_slug ? (
              <>
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]"
                  style={{
                    background: 'rgb(var(--aegis-overlay) / 0.05)',
                    border: '1px solid rgb(var(--aegis-overlay) / 0.08)',
                  }}
                >
                  {getAgentEmoji(task.assigned_agent_slug)}
                </div>
                <span className="text-[10px] text-aegis-text-muted">
                  {getAgentName(task.assigned_agent_slug)}
                </span>
              </>
            ) : (
              <span className="text-[10px] text-aegis-text-dim italic flex items-center gap-1">
                <div className="w-5 h-5 rounded-md border border-dashed border-[rgb(var(--aegis-overlay)/0.12)] flex items-center justify-center">
                  <span className="text-[8px]">?</span>
                </div>
                Unassigned
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {task.due_date && (
              <span
                className="text-[9px] flex items-center gap-0.5"
                style={{
                  color: task.is_overdue ? themeHex('danger') : 'rgb(var(--aegis-text-dim))',
                }}
              >
                <Calendar size={9} />
                {format(new Date(task.due_date), 'MMM d')}
              </span>
            )}
            {task.comment_count > 0 && (
              <span className="text-[9px] text-aegis-text-dim flex items-center gap-0.5">
                <MessageSquare size={9} />
                {task.comment_count}
              </span>
            )}
            {task.attachment_count > 0 && (
              <span className="text-[9px] text-aegis-text-dim flex items-center gap-0.5">
                <Paperclip size={9} />
                {task.attachment_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
