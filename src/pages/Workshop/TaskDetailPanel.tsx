// ═══════════════════════════════════════════════════════════
// TaskDetailPanel — Slide-over panel for task details
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MoreVertical, Trash2, Copy, Archive,
  CheckCircle2, Send, Lock, ChevronDown, ChevronRight,
  Plus,
} from 'lucide-react';
import clsx from 'clsx';
import { themeHex, themeAlpha } from '@/utils/theme-colors';
import { useWorkshopStore } from '@/stores/workshopStore';
import { AGENTS, PRIORITY_CONFIG, STATUS_LABELS, getAgentEmoji, getAgentName } from './constants';
import type { TaskPriority, TaskStatus, WorkshopTask, TaskComment } from './types';
import { format, formatDistanceToNow } from 'date-fns';

interface TaskDetailPanelProps {
  taskId: string | null;
  onClose: () => void;
}

export function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
  const {
    getTaskById, updateTask, deleteTask, moveTask,
    getSubtasks, getTaskComments, getTaskAttachments,
    addComment, addSystemComment, bulkAddSubtasks, addTask,
  } = useWorkshopStore();

  const task = taskId ? getTaskById(taskId) : null;
  const subtasks = taskId ? getSubtasks(taskId) : [];
  const comments = taskId ? getTaskComments(taskId) : [];
  const attachments = taskId ? getTaskAttachments(taskId) : [];

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [showComments, setShowComments] = useState(true);
  const [saved, setSaved] = useState(false);

  const commentEndRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (task) {
      setTitleValue(task.title);
      setDescValue(task.description);
    }
  }, [task?.id]);

  const showSavedIndicator = useCallback(() => {
    setSaved(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 2000);
  }, []);

  const debouncedUpdate = useCallback(
    (field: string, value: any) => {
      if (!taskId) return;
      updateTask(taskId, { [field]: value });
      showSavedIndicator();
    },
    [taskId, updateTask, showSavedIndicator],
  );

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (!taskId || !task) return;
    moveTask(taskId, newStatus);
    showSavedIndicator();
  };

  const handlePriorityChange = (p: TaskPriority) => {
    if (!taskId || !task) return;
    const old = task.priority;
    updateTask(taskId, { priority: p });
    addSystemComment(taskId, `Priority changed from ${old} to ${p}`, 'status_change', old, p);
    showSavedIndicator();
  };

  const handleAgentChange = (slug: string) => {
    if (!taskId || !task) return;
    const newSlug = slug || null;
    const oldName = getAgentName(task.assigned_agent_slug);
    const newName = getAgentName(newSlug);
    updateTask(taskId, { assigned_agent_slug: newSlug });
    addSystemComment(taskId, `Assigned to ${newName} (was ${oldName})`, 'assignment');
    showSavedIndicator();
  };

  const handleAddComment = () => {
    if (!taskId || !commentText.trim()) return;
    addComment(taskId, commentText.trim());
    setCommentText('');
    setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleDelete = () => {
    if (!taskId) return;
    deleteTask(taskId);
    onClose();
  };

  const handleDuplicate = () => {
    if (!task) return;
    addTask({
      title: `${task.title} (copy)`,
      description: task.description,
      priority: task.priority,
      assigned_agent_slug: task.assigned_agent_slug,
      tags: task.tags,
      estimated_hours: task.estimated_hours,
    });
    setShowMenu(false);
  };

  const handleToggleSubtask = (subtask: WorkshopTask) => {
    const newStatus: TaskStatus = subtask.status === 'complete' ? 'backlog' : 'complete';
    moveTask(subtask.id, newStatus);
  };

  const handleAddSubtask = () => {
    if (!taskId) return;
    bulkAddSubtasks(taskId, [{ title: 'New subtask', agent_slug: null, estimated_hours: null }]);
  };

  if (!task) return null;

  const inputStyle = {
    background: 'rgb(var(--aegis-overlay) / 0.04)',
    border: '1px solid rgb(var(--aegis-overlay) / 0.08)',
  };

  return (
    <AnimatePresence>
      {taskId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.3)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-[60%] min-w-[480px] max-w-[800px] flex flex-col"
            style={{
              background: 'var(--aegis-bg)',
              borderLeft: '1px solid rgb(var(--aegis-overlay) / 0.08)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderBottom: '1px solid rgb(var(--aegis-overlay) / 0.06)' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-aegis-text-dim">{task.task_number}</span>
                <span
                  className="text-[9px] px-2 py-[2px] rounded font-bold uppercase"
                  style={{
                    color: themeHex(PRIORITY_CONFIG[task.priority].colorVar as any),
                    background: themeAlpha(PRIORITY_CONFIG[task.priority].colorVar, 0.1),
                  }}
                >
                  {PRIORITY_CONFIG[task.priority].label}
                </span>
                {/* Saved indicator */}
                <AnimatePresence>
                  {saved && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px] text-aegis-success font-medium"
                    >
                      Saved
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-2">
                {/* Status dropdown */}
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  className="text-[11px] px-2 py-1 rounded-lg cursor-pointer font-semibold"
                  style={inputStyle}
                >
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>

                {/* Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1.5 rounded-lg hover:bg-[rgb(var(--aegis-overlay)/0.06)] text-aegis-text-muted"
                  >
                    <MoreVertical size={14} />
                  </button>
                  {showMenu && (
                    <div
                      className="absolute right-0 top-full mt-1 w-48 rounded-xl py-1 shadow-xl z-50"
                      style={{
                        background: 'var(--aegis-bg)',
                        border: '1px solid rgb(var(--aegis-overlay) / 0.1)',
                      }}
                    >
                      <button
                        onClick={handleDuplicate}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-aegis-text-secondary hover:bg-[rgb(var(--aegis-overlay)/0.04)]"
                      >
                        <Copy size={13} /> Duplicate Task
                      </button>
                      <button
                        onClick={() => {
                          if (taskId) moveTask(taskId, 'archived');
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-aegis-text-secondary hover:bg-[rgb(var(--aegis-overlay)/0.04)]"
                      >
                        <Archive size={13} /> Archive
                      </button>
                      <div className="mx-2 my-1 h-px" style={{ background: 'rgb(var(--aegis-overlay) / 0.06)' }} />
                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-aegis-danger hover:bg-aegis-danger/5"
                      >
                        <Trash2 size={13} /> Delete Task
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-[rgb(var(--aegis-overlay)/0.06)] text-aegis-text-muted"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hidden">
              <div className="flex min-h-full">
                {/* Left column (65%) */}
                <div className="flex-[65] p-6 space-y-5 overflow-y-auto" style={{ borderRight: '1px solid rgb(var(--aegis-overlay) / 0.06)' }}>
                  {/* Title */}
                  {editingTitle ? (
                    <input
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                      onBlur={() => {
                        setEditingTitle(false);
                        if (titleValue.trim() && titleValue !== task.title) {
                          debouncedUpdate('title', titleValue.trim());
                        }
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      autoFocus
                      className="text-[20px] font-bold text-aegis-text w-full focus:outline-none bg-transparent border-b border-aegis-primary/30 pb-1"
                    />
                  ) : (
                    <h2
                      onClick={() => setEditingTitle(true)}
                      className="text-[20px] font-bold text-aegis-text cursor-pointer hover:text-aegis-text-secondary transition-colors"
                    >
                      {task.title}
                    </h2>
                  )}

                  {/* Description */}
                  <div>
                    <label className="text-[10px] text-aegis-text-dim uppercase tracking-wider font-semibold mb-1 block">
                      Description
                    </label>
                    {editingDesc ? (
                      <textarea
                        value={descValue}
                        onChange={(e) => setDescValue(e.target.value)}
                        onBlur={() => {
                          setEditingDesc(false);
                          if (descValue !== task.description) {
                            debouncedUpdate('description', descValue);
                          }
                        }}
                        autoFocus
                        rows={6}
                        className="w-full rounded-xl px-4 py-2.5 text-[13px] text-aegis-text focus:outline-none focus:ring-1 focus:ring-aegis-primary/30 resize-none"
                        style={inputStyle}
                      />
                    ) : (
                      <div
                        onClick={() => setEditingDesc(true)}
                        className={clsx(
                          'text-[13px] leading-relaxed cursor-pointer rounded-xl px-4 py-3 min-h-[60px] whitespace-pre-wrap',
                          task.description ? 'text-aegis-text-secondary' : 'text-aegis-text-dim italic',
                        )}
                        style={inputStyle}
                      >
                        {task.description || 'Click to add a description...'}
                      </div>
                    )}
                  </div>

                  {/* Subtasks */}
                  <div>
                    <button
                      onClick={() => setShowSubtasks(!showSubtasks)}
                      className="flex items-center gap-1.5 text-[11px] text-aegis-text-muted uppercase tracking-wider font-semibold mb-2"
                    >
                      {showSubtasks ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      Subtasks
                      {subtasks.length > 0 && (
                        <span className="text-aegis-text-dim">
                          ({subtasks.filter((s) => s.status === 'complete').length}/{subtasks.length})
                        </span>
                      )}
                    </button>

                    {showSubtasks && (
                      <>
                        {subtasks.length > 0 && (
                          <div className="mb-2">
                            <div
                              className="h-[3px] rounded-full overflow-hidden"
                              style={{ background: 'rgb(var(--aegis-overlay) / 0.06)' }}
                            >
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${(subtasks.filter((s) => s.status === 'complete').length / subtasks.length) * 100}%`,
                                  background: themeHex('success'),
                                }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          {subtasks.map((st) => (
                            <div
                              key={st.id}
                              className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[rgb(var(--aegis-overlay)/0.03)] group"
                            >
                              <button onClick={() => handleToggleSubtask(st)}>
                                <CheckCircle2
                                  size={16}
                                  className={clsx(
                                    'transition-colors',
                                    st.status === 'complete'
                                      ? 'text-aegis-success'
                                      : 'text-aegis-text-dim group-hover:text-aegis-text-muted',
                                  )}
                                  fill={st.status === 'complete' ? themeHex('success') : 'none'}
                                />
                              </button>
                              <span
                                className={clsx(
                                  'text-[12px] flex-1',
                                  st.status === 'complete'
                                    ? 'text-aegis-text-dim line-through'
                                    : 'text-aegis-text-secondary',
                                )}
                              >
                                {st.title}
                              </span>
                              {st.assigned_agent_slug && (
                                <span className="text-[10px]">{getAgentEmoji(st.assigned_agent_slug)}</span>
                              )}
                              {st.estimated_hours && (
                                <span className="text-[10px] text-aegis-text-dim font-mono">
                                  {st.estimated_hours}h
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={handleAddSubtask}
                          className="flex items-center gap-1 text-[11px] text-aegis-primary mt-2 hover:underline"
                        >
                          <Plus size={12} /> Add Subtask
                        </button>
                      </>
                    )}
                  </div>

                  {/* Activity & Comments */}
                  <div>
                    <button
                      onClick={() => setShowComments(!showComments)}
                      className="flex items-center gap-1.5 text-[11px] text-aegis-text-muted uppercase tracking-wider font-semibold mb-2"
                    >
                      {showComments ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      Activity & Comments
                      <span className="text-aegis-text-dim">({comments.length})</span>
                    </button>

                    {showComments && (
                      <>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hidden mb-3">
                          {comments.length === 0 && (
                            <p className="text-[11px] text-aegis-text-dim italic py-4 text-center">
                              No activity yet. Comments and status changes will appear here.
                            </p>
                          )}
                          {comments.map((c) => (
                            <CommentBubble key={c.id} comment={c} />
                          ))}
                          <div ref={commentEndRef} />
                        </div>

                        {/* Comment input */}
                        <div className="flex items-center gap-2">
                          <input
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                            placeholder="Add a comment..."
                            className="flex-1 rounded-xl px-3 py-2 text-[12px] text-aegis-text placeholder:text-aegis-text-dim focus:outline-none focus:ring-1 focus:ring-aegis-primary/30"
                            style={inputStyle}
                          />
                          <button
                            onClick={handleAddComment}
                            disabled={!commentText.trim()}
                            className="p-2 rounded-xl disabled:opacity-30 transition-colors"
                            style={{ background: themeAlpha('primary', 0.1), color: themeHex('primary') }}
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Right column (35%) — Properties */}
                <div className="flex-[35] p-5 space-y-4">
                  {/* Priority */}
                  <PropertyField label="Priority">
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG['medium']][]).map(
                        ([key, cfg]) => (
                          <button
                            key={key}
                            onClick={() => handlePriorityChange(key)}
                            className="text-[10px] px-2 py-1 rounded-full transition-colors capitalize font-medium"
                            style={
                              task.priority === key
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
                  </PropertyField>

                  {/* Agent */}
                  <PropertyField label="Assigned Agent">
                    <select
                      value={task.assigned_agent_slug ?? ''}
                      onChange={(e) => handleAgentChange(e.target.value)}
                      className="w-full text-[12px] px-2 py-1.5 rounded-lg cursor-pointer"
                      style={inputStyle}
                    >
                      <option value="">Unassigned</option>
                      {AGENTS.map((a) => (
                        <option key={a.slug} value={a.slug}>
                          {a.emoji} {a.name}
                        </option>
                      ))}
                    </select>
                  </PropertyField>

                  {/* Due Date */}
                  <PropertyField label="Due Date">
                    <input
                      type="date"
                      value={task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : ''}
                      onChange={(e) =>
                        debouncedUpdate('due_date', e.target.value ? new Date(e.target.value).toISOString() : null)
                      }
                      className={clsx(
                        'w-full text-[12px] px-2 py-1.5 rounded-lg',
                        task.due_date && new Date(task.due_date) < new Date() && task.status !== 'complete'
                          ? 'text-aegis-danger'
                          : '',
                      )}
                      style={inputStyle}
                    />
                  </PropertyField>

                  {/* Estimated Hours */}
                  <PropertyField label="Estimated Hours">
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={task.estimated_hours ?? ''}
                      onChange={(e) =>
                        debouncedUpdate('estimated_hours', e.target.value ? parseFloat(e.target.value) : null)
                      }
                      className="w-full text-[12px] px-2 py-1.5 rounded-lg"
                      style={inputStyle}
                    />
                  </PropertyField>

                  {/* Actual Hours */}
                  <PropertyField label="Actual Hours">
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={task.actual_hours ?? ''}
                      onChange={(e) =>
                        debouncedUpdate('actual_hours', e.target.value ? parseFloat(e.target.value) : null)
                      }
                      className="w-full text-[12px] px-2 py-1.5 rounded-lg"
                      style={inputStyle}
                    />
                  </PropertyField>

                  {/* Tags */}
                  <PropertyField label="Tags">
                    <input
                      value={task.tags.join(', ')}
                      onChange={(e) => {
                        const tags = e.target.value
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean);
                        debouncedUpdate('tags', tags);
                      }}
                      placeholder="tag1, tag2..."
                      className="w-full text-[12px] px-2 py-1.5 rounded-lg"
                      style={inputStyle}
                    />
                  </PropertyField>

                  {/* Blocked By */}
                  {task.blocked_by && (
                    <PropertyField label="Blocked By">
                      <div className="flex items-center gap-1.5 text-[12px]">
                        <Lock size={12} className="text-aegis-warning" />
                        <span className="text-aegis-text-secondary">
                          {useWorkshopStore.getState().getTaskById(task.blocked_by)?.title ?? task.blocked_by}
                        </span>
                      </div>
                    </PropertyField>
                  )}

                  {/* Timestamps */}
                  <div className="pt-3" style={{ borderTop: '1px solid rgb(var(--aegis-overlay) / 0.06)' }}>
                    <PropertyField label="Created">
                      <span className="text-[11px] text-aegis-text-dim font-mono">
                        {format(new Date(task.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </PropertyField>
                    {task.started_at && (
                      <PropertyField label="Started">
                        <span className="text-[11px] text-aegis-text-dim font-mono">
                          {format(new Date(task.started_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </PropertyField>
                    )}
                    {task.completed_at && (
                      <PropertyField label="Completed">
                        <span className="text-[11px] text-aegis-text-dim font-mono">
                          {format(new Date(task.completed_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </PropertyField>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Helper Components ────────────────────────────────────

function PropertyField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="text-[10px] text-aegis-text-dim uppercase tracking-wider font-semibold mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}

function CommentBubble({ comment }: { comment: TaskComment }) {
  const isSystem = comment.author_type === 'system';
  const isHuman = comment.author_type === 'human';

  if (isSystem) {
    return (
      <div className="flex items-center gap-2 py-1.5 text-[10px] text-aegis-text-dim italic">
        <div className="w-1 h-1 rounded-full bg-aegis-text-dim/30" />
        <span>{comment.content}</span>
        <span className="ml-auto font-mono text-[9px]">
          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
        </span>
      </div>
    );
  }

  return (
    <div className={clsx('flex', isHuman ? 'justify-end' : 'justify-start')}>
      <div
        className="max-w-[85%] rounded-xl px-3 py-2"
        style={{
          background: isHuman ? themeAlpha('primary', 0.08) : 'rgb(var(--aegis-overlay) / 0.04)',
          border: `1px solid ${isHuman ? themeAlpha('primary', 0.12) : 'rgb(var(--aegis-overlay) / 0.06)'}`,
        }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] font-semibold text-aegis-text">{comment.author_name}</span>
          <span className="text-[9px] text-aegis-text-dim font-mono">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-[12px] text-aegis-text-secondary leading-relaxed whitespace-pre-wrap">
          {comment.content}
        </p>
      </div>
    </div>
  );
}
