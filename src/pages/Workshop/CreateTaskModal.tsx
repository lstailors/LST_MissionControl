// ═══════════════════════════════════════════════════════════
// CreateTaskModal — Full task creation form
// ═══════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import clsx from 'clsx';
import { themeHex, themeAlpha } from '@/utils/theme-colors';
import { useWorkshopStore } from '@/stores/workshopStore';
import { AGENTS, PRIORITY_CONFIG } from './constants';
import type { TaskPriority, TaskStatus, TemplateSubtask } from './types';

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  prefill?: {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    assigned_agent_slug?: string | null;
    estimated_hours?: number | null;
    tags?: string[];
    subtasks?: TemplateSubtask[];
  };
  onCreated?: (taskNumber: string) => void;
}

export function CreateTaskModal({ open, onClose, prefill, onCreated }: CreateTaskModalProps) {
  const { addTask, bulkAddSubtasks } = useWorkshopStore();

  const [title, setTitle] = useState(prefill?.title ?? '');
  const [description, setDescription] = useState(prefill?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(prefill?.priority ?? 'medium');
  const [status, setStatus] = useState<TaskStatus>(prefill?.status ?? 'backlog');
  const [agentSlug, setAgentSlug] = useState(prefill?.assigned_agent_slug ?? '');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(prefill?.estimated_hours?.toString() ?? '');
  const [tagsInput, setTagsInput] = useState(prefill?.tags?.join(', ') ?? '');
  const [blockedBy, setBlockedBy] = useState('');
  const [subtasks, setSubtasks] = useState<TemplateSubtask[]>(prefill?.subtasks ?? []);

  const resetForm = useCallback(() => {
    setTitle(prefill?.title ?? '');
    setDescription(prefill?.description ?? '');
    setPriority(prefill?.priority ?? 'medium');
    setStatus(prefill?.status ?? 'backlog');
    setAgentSlug(prefill?.assigned_agent_slug ?? '');
    setDueDate('');
    setEstimatedHours(prefill?.estimated_hours?.toString() ?? '');
    setTagsInput(prefill?.tags?.join(', ') ?? '');
    setBlockedBy('');
    setSubtasks(prefill?.subtasks ?? []);
  }, [prefill]);

  const handleSubmit = () => {
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const task = addTask({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      assigned_agent_slug: agentSlug || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
      tags,
      blocked_by: blockedBy || null,
    });

    if (subtasks.length > 0) {
      bulkAddSubtasks(task.id, subtasks);
    }

    onCreated?.(task.task_number);
    resetForm();
    onClose();
  };

  const addSubtask = () => {
    setSubtasks([...subtasks, { title: '', agent_slug: null, estimated_hours: null }]);
  };

  const updateSubtask = (index: number, updates: Partial<TemplateSubtask>) => {
    setSubtasks(subtasks.map((st, i) => (i === index ? { ...st, ...updates } : st)));
  };

  const removeSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const inputStyle = {
    background: 'rgb(var(--aegis-overlay) / 0.04)',
    border: '1px solid rgb(var(--aegis-overlay) / 0.08)',
  };

  const inputClass =
    'w-full rounded-xl px-4 py-2.5 text-[13px] text-aegis-text placeholder:text-aegis-text-dim focus:outline-none focus:ring-1 focus:ring-aegis-primary/30';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[560px] max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: 'var(--aegis-bg)',
              border: '1px solid rgb(var(--aegis-overlay) / 0.08)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{
                background: themeAlpha('primary', 0.04),
                borderBottom: `1px solid rgb(var(--aegis-overlay) / 0.06)`,
              }}
            >
              <h3 className="text-[16px] font-bold text-aegis-text">New Task</h3>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-[rgb(var(--aegis-overlay)/0.06)] text-aegis-text-muted"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto scrollbar-hidden px-6 py-4 space-y-4">
              {/* Title */}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                autoFocus
                className={clsx(inputClass, 'text-[15px] font-semibold')}
                style={inputStyle}
              />

              {/* Description */}
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details, context, instructions..."
                rows={4}
                className={clsx(inputClass, 'resize-none')}
                style={inputStyle}
              />

              {/* Priority pills */}
              <div>
                <label className="text-[11px] text-aegis-text-muted uppercase tracking-wider font-semibold mb-2 block">
                  Priority
                </label>
                <div className="flex gap-2">
                  {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG['medium']][]).map(
                    ([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => setPriority(key)}
                        className="text-[11px] px-3 py-1.5 rounded-full transition-colors capitalize font-medium"
                        style={
                          priority === key
                            ? {
                                background: themeAlpha(cfg.colorVar, 0.12),
                                color: themeHex(cfg.colorVar as any),
                                border: `1px solid ${themeAlpha(cfg.colorVar, 0.2)}`,
                              }
                            : {
                                border: '1px solid rgb(var(--aegis-overlay) / 0.06)',
                                color: 'rgb(var(--aegis-text-dim))',
                              }
                        }
                      >
                        {cfg.label}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Status + Agent row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-aegis-text-muted uppercase tracking-wider font-semibold mb-2 block">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className={clsx(inputClass, 'cursor-pointer')}
                    style={inputStyle}
                  >
                    <option value="backlog">Backlog</option>
                    <option value="queued">Queued</option>
                    <option value="in_progress">In Progress</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-aegis-text-muted uppercase tracking-wider font-semibold mb-2 block">
                    Assign Agent
                  </label>
                  <select
                    value={agentSlug}
                    onChange={(e) => setAgentSlug(e.target.value)}
                    className={clsx(inputClass, 'cursor-pointer')}
                    style={inputStyle}
                  >
                    <option value="">Unassigned</option>
                    {AGENTS.map((a) => (
                      <option key={a.slug} value={a.slug}>
                        {a.emoji} {a.name} — {a.role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due date + Estimated hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-aegis-text-muted uppercase tracking-wider font-semibold mb-2 block">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-aegis-text-muted uppercase tracking-wider font-semibold mb-2 block">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    placeholder="0"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-[11px] text-aegis-text-muted uppercase tracking-wider font-semibold mb-2 block">
                  Tags
                </label>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="tag1, tag2, tag3..."
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              {/* Subtasks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] text-aegis-text-muted uppercase tracking-wider font-semibold">
                    Subtasks
                  </label>
                  <button
                    onClick={addSubtask}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-colors"
                    style={{
                      color: themeHex('primary'),
                      background: themeAlpha('primary', 0.06),
                    }}
                  >
                    <Plus size={12} /> Add Subtask
                  </button>
                </div>
                {subtasks.length > 0 && (
                  <div className="space-y-2">
                    {subtasks.map((st, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-2 rounded-lg"
                        style={{ background: 'rgb(var(--aegis-overlay) / 0.02)' }}
                      >
                        <GripVertical size={12} className="text-aegis-text-dim shrink-0" />
                        <input
                          value={st.title}
                          onChange={(e) => updateSubtask(i, { title: e.target.value })}
                          placeholder="Subtask title"
                          className="flex-1 rounded-lg px-2 py-1 text-[12px] text-aegis-text focus:outline-none"
                          style={inputStyle}
                        />
                        <select
                          value={st.agent_slug ?? ''}
                          onChange={(e) => updateSubtask(i, { agent_slug: e.target.value || null })}
                          className="rounded-lg px-2 py-1 text-[11px] text-aegis-text focus:outline-none w-28 cursor-pointer"
                          style={inputStyle}
                        >
                          <option value="">Agent</option>
                          {AGENTS.map((a) => (
                            <option key={a.slug} value={a.slug}>
                              {a.emoji} {a.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="0.25"
                          value={st.estimated_hours ?? ''}
                          onChange={(e) =>
                            updateSubtask(i, {
                              estimated_hours: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          placeholder="Hrs"
                          className="rounded-lg px-2 py-1 text-[11px] text-aegis-text focus:outline-none w-16"
                          style={inputStyle}
                        />
                        <button
                          onClick={() => removeSubtask(i)}
                          className="p-1 rounded-lg text-aegis-text-dim hover:text-aegis-danger transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-2 px-6 py-4 shrink-0"
              style={{ borderTop: '1px solid rgb(var(--aegis-overlay) / 0.06)' }}
            >
              <button
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-[13px] text-aegis-text-muted hover:text-aegis-text-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim()}
                className="px-5 py-2 rounded-xl text-[13px] font-medium disabled:opacity-40 transition-colors"
                style={{ background: themeHex('primary'), color: 'var(--aegis-bg)' }}
              >
                Create Task
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
