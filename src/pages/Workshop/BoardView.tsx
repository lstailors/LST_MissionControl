// ═══════════════════════════════════════════════════════════
// BoardView — Kanban board with dnd-kit drag-and-drop
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { themeHex, themeAlpha } from '@/utils/theme-colors';
import { useWorkshopStore } from '@/stores/workshopStore';
import { COLUMN_CONFIG } from './constants';
import { TaskCard } from './TaskCard';
import type { BoardTask, TaskStatus } from './types';
import clsx from 'clsx';

interface BoardViewProps {
  tasks: BoardTask[];
  onTaskClick: (task: BoardTask) => void;
}

function DroppableColumn({
  status,
  label,
  colorVar,
  tasks,
  onTaskClick,
  isArchived,
}: {
  status: TaskStatus;
  label: string;
  colorVar: string;
  tasks: BoardTask[];
  onTaskClick: (task: BoardTask) => void;
  isArchived?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [collapsed, setCollapsed] = useState(isArchived ?? false);

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <div
      className={clsx(
        'flex flex-col min-h-0 min-w-[260px]',
        collapsed && 'min-w-[52px] max-w-[52px]',
      )}
    >
      <div
        className={clsx(
          'flex flex-col rounded-2xl overflow-hidden h-full transition-all',
          isOver && 'ring-1 ring-aegis-primary/30',
        )}
        style={{
          background: 'rgb(var(--aegis-overlay) / 0.025)',
          border: `1px solid ${isOver ? themeAlpha('primary', 0.2) : 'rgb(var(--aegis-overlay) / 0.07)'}`,
        }}
      >
        {/* Column header */}
        <div
          className={clsx(
            'flex items-center gap-2.5 px-4 py-3 shrink-0 cursor-pointer',
            collapsed && 'flex-col px-2 py-4',
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: themeHex(colorVar as any) }}
          />
          {!collapsed && (
            <>
              <span className="text-[11px] font-bold text-aegis-text uppercase tracking-wider flex-1">
                {label}
              </span>
              <span
                className="text-[11px] font-semibold w-[22px] h-[22px] flex items-center justify-center rounded-full"
                style={{
                  color: themeHex(colorVar as any),
                  background: themeAlpha(colorVar, 0.1),
                }}
              >
                {tasks.length}
              </span>
            </>
          )}
          {collapsed && (
            <>
              <span
                className="text-[10px] font-bold text-aegis-text-muted [writing-mode:vertical-lr] rotate-180 tracking-wider uppercase"
              >
                {label}
              </span>
              <span
                className="text-[10px] font-semibold mt-1"
                style={{ color: themeHex(colorVar as any) }}
              >
                {tasks.length}
              </span>
            </>
          )}
        </div>

        {/* Color separator */}
        <div
          className="mx-3 h-px shrink-0"
          style={{
            background: `linear-gradient(90deg, transparent, ${themeAlpha(colorVar, 0.4)}, transparent)`,
          }}
        />

        {/* Column body */}
        {!collapsed && (
          <div ref={setNodeRef} className="flex-1 overflow-y-auto scrollbar-hidden px-2.5 py-2.5 min-h-[80px]">
            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
              {tasks.length > 0 ? (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} onClick={onTaskClick} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4 h-full">
                  <div
                    className="w-8 h-8 rounded-xl border-2 border-dashed flex items-center justify-center mb-2"
                    style={{ borderColor: themeAlpha(colorVar, 0.15) }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: themeAlpha(colorVar, 0.2) }} />
                  </div>
                  <span className="text-[10px] text-aegis-text-dim">No tasks in {label}</span>
                </div>
              )}
            </SortableContext>
          </div>
        )}
      </div>
    </div>
  );
}

export function BoardView({ tasks, onTaskClick }: BoardViewProps) {
  const { moveTask, reorderTasks } = useWorkshopStore();
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const tasksByColumn = useMemo(() => {
    const map: Record<TaskStatus, BoardTask[]> = {
      backlog: [],
      queued: [],
      in_progress: [],
      review: [],
      complete: [],
      archived: [],
    };
    tasks.forEach((t) => {
      if (map[t.status]) map[t.status].push(t);
    });
    // Sort each column by sort_order
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.sort_order - b.sort_order));
    return map;
  }, [tasks]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }, [tasks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column (status)
    const isColumnDrop = COLUMN_CONFIG.some((c) => c.key === overId);
    if (isColumnDrop) {
      const newStatus = overId as TaskStatus;
      moveTask(activeId, newStatus);
      return;
    }

    // Dropped on another task
    const overTask = tasks.find((t) => t.id === overId);
    const activeTaskData = tasks.find((t) => t.id === activeId);
    if (!overTask || !activeTaskData) return;

    // If different columns, move to that column
    if (activeTaskData.status !== overTask.status) {
      moveTask(activeId, overTask.status);
    }

    // Reorder within the column
    const column = overTask.status;
    const columnTasks = tasksByColumn[column].map((t) => t.id);
    const oldIndex = columnTasks.indexOf(activeId);
    const newIndex = columnTasks.indexOf(overId);

    if (oldIndex === -1) {
      // Coming from another column, insert at position
      columnTasks.splice(newIndex, 0, activeId);
    } else if (oldIndex !== newIndex) {
      columnTasks.splice(oldIndex, 1);
      columnTasks.splice(newIndex, 0, activeId);
    }

    reorderTasks(column, columnTasks);
  }, [tasks, tasksByColumn, moveTask, reorderTasks]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto flex-1 min-h-0 pb-2">
        {COLUMN_CONFIG.map((col) => (
          <DroppableColumn
            key={col.key}
            status={col.key}
            label={col.label}
            colorVar={col.colorVar}
            tasks={tasksByColumn[col.key]}
            onTaskClick={onTaskClick}
            isArchived={col.key === 'archived'}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div
            className="rounded-xl border p-3 shadow-[0_8px_32px_rgba(0,0,0,0.3)] scale-[1.02]"
            style={{
              background: 'var(--aegis-bg)',
              borderColor: themeAlpha('primary', 0.2),
              width: 260,
            }}
          >
            <div className="text-[12px] font-semibold text-aegis-text leading-snug">
              {activeTask.title}
            </div>
            <div className="text-[10px] text-aegis-text-dim mt-1 font-mono">
              {activeTask.task_number}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
