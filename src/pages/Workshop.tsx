// ═══════════════════════════════════════════════════════════
// Workshop — Kanban matching conceptual design:
// 3 columns (Queue / In Progress / Done)
// Cards: Title + Agent badge + Priority badge
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, X, Search } from 'lucide-react';
import { PageTransition } from '@/components/shared/PageTransition';
import { useWorkshopStore, Task } from '@/stores/workshopStore';
import clsx from 'clsx';

// ── Column config (conceptual: colored dots + English titles) ──
const COLUMNS = [
  { key: 'queue',      label: 'Queue',       dot: '#ff9100' },
  { key: 'inProgress', label: 'In Progress', dot: '#448aff' },
  { key: 'done',       label: 'Done',        dot: '#00e676' },
] as const;

// ── Priority badge styles ──
const PRIORITY_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  high:   { color: '#F47067', bg: 'rgba(244,112,103,0.12)', border: 'rgba(244,112,103,0.25)' },
  medium: { color: '#E8B84E', bg: 'rgba(232,184,78,0.12)',  border: 'rgba(232,184,78,0.25)' },
  low:    { color: '#4EC9B0', bg: 'rgba(78,201,176,0.12)',   border: 'rgba(78,201,176,0.25)' },
};

const PROGRESS_PRESETS = [25, 50, 75, 100];

// ══════════════════════════════════════════════════
// Task Card (conceptual: name + agent + priority inline)
// ══════════════════════════════════════════════════
function TaskCard({ task, onMove, onDelete, onProgress }: {
  task: Task;
  onMove: (id: string, status: Task['status']) => void;
  onDelete: (id: string) => void;
  onProgress: (id: string, p: number) => void;
}) {
  const { t } = useTranslation();
  const agentName = task.assignedAgent || null;
  const pStyle = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium;

  return (
    <Reorder.Item
      value={task.id}
      className="p-3 rounded-lg border border-white/[0.06] hover:border-white/[0.10] transition-all group cursor-grab active:cursor-grabbing"
      style={{ background: 'rgba(255,255,255,0.025)' }}
      whileDrag={{ scale: 1.03, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 50 }}
    >
      {/* Title */}
      <div className="text-[13px] font-semibold text-aegis-text mb-1.5" dir="auto">
        {task.title}
      </div>

      {/* Agent + Priority row */}
      <div className="flex items-center justify-between">
        {agentName ? (
          <span
            className="text-[10px] px-1.5 py-[2px] rounded-md font-medium"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}
          >
            {agentName}
          </span>
        ) : (
          <span />
        )}
        <span
          className="text-[9px] px-2 py-[2px] rounded font-bold uppercase tracking-wider"
          style={{ color: pStyle.color, background: pStyle.bg, border: `1px solid ${pStyle.border}` }}
        >
          {task.priority}
        </span>
      </div>

      {/* Progress bar for inProgress */}
      {task.status === 'inProgress' && (
        <div className="mt-2">
          <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${task.progress || 0}%`,
                background: (task.progress || 0) >= 100 ? '#00e676' : '#4EC9B0',
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            {/* Progress presets (hover only) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {PROGRESS_PRESETS.map((p) => (
                <button key={p} onClick={() => onProgress(task.id, p)}
                  className="text-[9px] px-1.5 py-0.5 rounded transition-colors"
                  style={(task.progress || 0) >= p
                    ? { background: 'rgba(78,201,176,0.12)', color: '#4EC9B0' }
                    : { color: 'rgba(255,255,255,0.15)' }
                  }
                >
                  {p}%
                </button>
              ))}
            </div>
            <span className="text-[11px] text-white/25 font-mono">{task.progress || 0}%</span>
          </div>
          {(task.progress || 0) >= 100 && (
            <button onClick={() => onMove(task.id, 'done')}
              className="text-[10px] mt-1 hover:underline" style={{ color: '#00e676' }}>
              ✓ {t('workshop.moveToDone', 'نقل لمكتمل')}
            </button>
          )}
        </div>
      )}

      {/* Move actions (hover only) */}
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {task.status !== 'queue' && (
          <button onClick={() => onMove(task.id, 'queue')}
            className="text-[10px] px-2 py-1 rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}>
            ← Queue
          </button>
        )}
        {task.status !== 'inProgress' && (
          <button onClick={() => onMove(task.id, 'inProgress')}
            className="text-[10px] px-2 py-1 rounded-lg transition-colors"
            style={{ background: 'rgba(78,201,176,0.08)', color: '#4EC9B0' }}>
            {task.status === 'queue' ? '→' : '←'} In Progress
          </button>
        )}
        {task.status !== 'done' && (
          <button onClick={() => onMove(task.id, 'done')}
            className="text-[10px] px-2 py-1 rounded-lg transition-colors"
            style={{ background: 'rgba(0,230,118,0.08)', color: '#00e676' }}>
            ✓ Done
          </button>
        )}
        <button onClick={() => onDelete(task.id)}
          className="text-[10px] p-1 rounded-lg ms-auto transition-colors"
          style={{ color: 'rgba(244,112,103,0.4)' }}>
          <X size={12} />
        </button>
      </div>
    </Reorder.Item>
  );
}

// ══════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════
export function WorkshopPage() {
  const { t } = useTranslation();
  const { tasks, addTask, moveTask, deleteTask, reorderInColumn, setProgress } = useWorkshopStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' as const, assignedAgent: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }, [tasks, searchQuery]);

  const handleAdd = () => {
    if (!newTask.title.trim()) return;
    addTask({ title: newTask.title, description: newTask.description, priority: newTask.priority, assignedAgent: newTask.assignedAgent || undefined } as any);
    setNewTask({ title: '', description: '', priority: 'medium', assignedAgent: '' });
    setShowAddModal(false);
  };

  return (
    <PageTransition className="p-6 h-full flex flex-col">

      {/* ── Header (conceptual: title left + new task button right) ── */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-extrabold text-aegis-text tracking-tight">
          Workshop
        </h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold transition-all"
          style={{
            color: '#4EC9B0',
            border: '1px solid rgba(78,201,176,0.3)',
            background: 'rgba(78,201,176,0.06)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(78,201,176,0.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(78,201,176,0.06)'; }}
        >
          + New Task
        </button>
      </div>

      {/* ── Search (compact, only when needed) ── */}
      {tasks.length > 4 && (
        <div className="relative max-w-[300px] mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/15" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full rounded-xl pl-9 pr-3 py-2 text-[12px] text-aegis-text placeholder:text-white/20 focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            dir="auto" />
        </div>
      )}

      {/* ── Kanban Grid (3 columns) ── */}
      <div className="flex-1 grid grid-cols-3 gap-5 min-h-0">
        {COLUMNS.map(({ key, label, dot }) => {
          const columnTasks = filteredTasks.filter((t) => t.status === key);
          const columnIds = columnTasks.map((t) => t.id);

          return (
            <div key={key} className="flex flex-col min-h-0">
              {/* Glass column container */}
              <div
                className="flex flex-col rounded-2xl overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {/* Column header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="w-[8px] h-[8px] rounded-full shrink-0"
                    style={{ background: dot }}
                  />
                  <span className="text-[15px] font-bold text-aegis-text flex-1">
                    {label}
                  </span>
                  <span
                    className="text-[11px] font-semibold min-w-[24px] h-[24px] flex items-center justify-center rounded-full"
                    style={{ color: '#4EC9B0', background: 'rgba(78,201,176,0.1)', border: '1px solid rgba(78,201,176,0.2)' }}
                  >
                    {columnTasks.length}
                  </span>
                </div>

                {/* Colored separator line between header and tasks */}
                <div className="mx-3 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${dot}60, transparent)` }} />

                {/* Column body */}
                {columnTasks.length > 0 ? (
                  <Reorder.Group
                    axis="y"
                    values={columnIds}
                    onReorder={(newOrder) => reorderInColumn(key, newOrder)}
                    className="space-y-2 overflow-y-auto scrollbar-hidden px-3 py-3"
                  >
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onMove={moveTask}
                        onDelete={deleteTask}
                        onProgress={setProgress}
                      />
                    ))}
                  </Reorder.Group>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                    <div
                      className="w-[6px] h-[6px] rounded-full mb-3 opacity-20"
                      style={{ background: dot }}
                    />
                    <span className="text-[12px] text-white/15">{t('workshop.empty')}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add Task Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[420px] p-6 rounded-2xl shadow-2xl"
              style={{ background: '#0c1015', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <h3 className="text-[16px] font-bold text-aegis-text mb-4">{t('workshop.newTask')}</h3>
              <div className="space-y-3">
                <input
                  value={newTask.title}
                  onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
                  placeholder={t('workshop.taskTitle')}
                  dir="auto" autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  className="w-full rounded-xl px-4 py-2.5 text-[13px] text-aegis-text placeholder:text-white/20 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
                  placeholder={t('workshop.taskDescription')}
                  rows={3} dir="auto"
                  className="w-full rounded-xl px-4 py-2.5 text-[13px] text-aegis-text placeholder:text-white/20 focus:outline-none resize-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-white/30">{t('workshop.priority')}:</span>
                  {(['low', 'medium', 'high'] as const).map((p) => {
                    const ps = PRIORITY_STYLE[p];
                    return (
                      <button key={p} onClick={() => setNewTask((prev) => ({ ...prev, priority: p }))}
                        className="text-[11px] px-3 py-1 rounded-full transition-colors"
                        style={newTask.priority === p
                          ? { background: ps.bg, color: ps.color, border: `1px solid ${ps.border}` }
                          : { border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }
                        }
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-white/30">{t('workshop.agent', 'وكيل')}:</span>
                  <input
                    type="text"
                    value={newTask.assignedAgent || ''}
                    onChange={(e) => setNewTask((p) => ({ ...p, assignedAgent: e.target.value }))}
                    placeholder={t('workshop.noAgent', 'None')}
                    className="rounded-lg px-2 py-1 text-[11px] text-aegis-text focus:outline-none w-24"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-5">
                <button onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-[13px] text-white/30 hover:text-white/50">
                  {t('common.cancel')}
                </button>
                <button onClick={handleAdd} disabled={!newTask.title.trim()}
                  className="px-4 py-2 rounded-xl text-[13px] font-medium disabled:opacity-40 transition-colors"
                  style={{ background: '#4EC9B0', color: '#0c1015' }}>
                  {t('workshop.create')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
