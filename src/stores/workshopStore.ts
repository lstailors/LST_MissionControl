import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  WorkshopTask, TaskComment, TaskAttachment, TaskTemplate,
  TaskStatus, TaskPriority, BoardTask, AgentWorkload, WorkshopStats,
  CommentType, AuthorType, TemplateSubtask,
} from '@/pages/Workshop/types';
import { AGENTS } from '@/pages/Workshop/constants';

// ═══════════════════════════════════════════════════════════
// Workshop Store — Full task management with comments,
// attachments, templates, and computed views
// ═══════════════════════════════════════════════════════════

let taskSeq = 0;

function nextTaskNumber(): string {
  taskSeq += 1;
  return `WS-${String(taskSeq).padStart(4, '0')}`;
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

interface WorkshopState {
  tasks: WorkshopTask[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  templates: TaskTemplate[];
  _seqCounter: number;

  // ── Task CRUD ──
  addTask: (partial: Partial<WorkshopTask> & { title: string }) => WorkshopTask;
  updateTask: (id: string, updates: Partial<WorkshopTask>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newStatus: TaskStatus) => void;
  reorderTasks: (status: TaskStatus, orderedIds: string[]) => void;
  bulkAddSubtasks: (parentId: string, subtasks: TemplateSubtask[]) => void;

  // ── Comments ──
  addComment: (taskId: string, content: string, authorName?: string, authorType?: AuthorType) => void;
  addSystemComment: (taskId: string, content: string, commentType?: CommentType, oldValue?: string, newValue?: string) => void;

  // ── Attachments ──
  addAttachment: (attachment: Omit<TaskAttachment, 'id' | 'created_at'>) => void;
  removeAttachment: (id: string) => void;

  // ── Templates ──
  addTemplate: (template: Omit<TaskTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>) => void;
  updateTemplate: (id: string, updates: Partial<TaskTemplate>) => void;
  deleteTemplate: (id: string) => void;
  incrementTemplateUsage: (id: string) => void;

  // ── Computed selectors ──
  getBoardTasks: () => BoardTask[];
  getTasksByStatus: (status: TaskStatus) => BoardTask[];
  getSubtasks: (parentId: string) => WorkshopTask[];
  getTaskComments: (taskId: string) => TaskComment[];
  getTaskAttachments: (taskId: string) => TaskAttachment[];
  getAgentWorkloads: () => AgentWorkload[];
  getStats: () => WorkshopStats;
  getTaskById: (id: string) => WorkshopTask | undefined;
  getAllTags: () => string[];
}

export const useWorkshopStore = create<WorkshopState>()(
  persist(
    (set, get) => ({
      tasks: [],
      comments: [],
      attachments: [],
      templates: [],
      _seqCounter: 0,

      // ── Task CRUD ──────────────────────────────────

      addTask: (partial) => {
        const state = get();
        const seq = state._seqCounter + 1;
        const taskNumber = `WS-${String(seq).padStart(4, '0')}`;
        const task: WorkshopTask = {
          id: uid(),
          task_number: taskNumber,
          title: partial.title,
          description: partial.description ?? '',
          status: partial.status ?? 'backlog',
          priority: partial.priority ?? 'medium',
          assigned_agent_slug: partial.assigned_agent_slug ?? null,
          created_by: partial.created_by ?? 'Calogero',
          due_date: partial.due_date ?? null,
          started_at: partial.started_at ?? null,
          completed_at: partial.completed_at ?? null,
          estimated_hours: partial.estimated_hours ?? null,
          actual_hours: partial.actual_hours ?? null,
          linked_customer_id: partial.linked_customer_id ?? null,
          linked_order_id: partial.linked_order_id ?? null,
          blocked_by: partial.blocked_by ?? null,
          parent_task_id: partial.parent_task_id ?? null,
          sort_order: partial.sort_order ?? 0,
          tags: partial.tags ?? [],
          created_at: now(),
          updated_at: now(),
        };

        set((s) => ({
          tasks: [...s.tasks, task],
          _seqCounter: seq,
          comments: [
            ...s.comments,
            {
              id: uid(),
              task_id: task.id,
              author_name: 'System',
              author_type: 'system' as AuthorType,
              comment_type: 'status_change' as CommentType,
              content: `Task created by ${task.created_by}`,
              old_value: null,
              new_value: null,
              created_at: now(),
            },
          ],
        }));

        return task;
      },

      updateTask: (id, updates) => {
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const updated = { ...t, ...updates, updated_at: now() };
            // Auto timestamps
            if (updates.status === 'in_progress' && t.status !== 'in_progress' && !updated.started_at) {
              updated.started_at = now();
            }
            if (updates.status === 'complete' && t.status !== 'complete' && !updated.completed_at) {
              updated.completed_at = now();
            }
            return updated;
          }),
        }));
      },

      deleteTask: (id) => {
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id && t.parent_task_id !== id),
          comments: s.comments.filter((c) => c.task_id !== id),
          attachments: s.attachments.filter((a) => a.task_id !== id),
        }));
      },

      moveTask: (id, newStatus) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task || task.status === newStatus) return;

        const oldStatus = task.status;
        get().updateTask(id, { status: newStatus });
        get().addSystemComment(
          id,
          `Status changed from ${oldStatus} to ${newStatus}`,
          'status_change',
          oldStatus,
          newStatus,
        );
      },

      reorderTasks: (status, orderedIds) => {
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.status !== status) return t;
            const idx = orderedIds.indexOf(t.id);
            return idx >= 0 ? { ...t, sort_order: idx } : t;
          }),
        }));
      },

      bulkAddSubtasks: (parentId, subtasks) => {
        const state = get();
        let seq = state._seqCounter;
        const newTasks: WorkshopTask[] = subtasks.map((st, i) => {
          seq += 1;
          return {
            id: uid(),
            task_number: `WS-${String(seq).padStart(4, '0')}`,
            title: st.title,
            description: st.description ?? '',
            status: 'backlog' as TaskStatus,
            priority: 'medium' as TaskPriority,
            assigned_agent_slug: st.agent_slug,
            created_by: 'Calogero',
            due_date: null,
            started_at: null,
            completed_at: null,
            estimated_hours: st.estimated_hours,
            actual_hours: null,
            linked_customer_id: null,
            linked_order_id: null,
            blocked_by: null,
            parent_task_id: parentId,
            sort_order: i,
            tags: [],
            created_at: now(),
            updated_at: now(),
          };
        });

        set((s) => ({
          tasks: [...s.tasks, ...newTasks],
          _seqCounter: seq,
        }));
      },

      // ── Comments ───────────────────────────────────

      addComment: (taskId, content, authorName = 'Calogero', authorType = 'human') => {
        set((s) => ({
          comments: [
            ...s.comments,
            {
              id: uid(),
              task_id: taskId,
              author_name: authorName,
              author_type: authorType,
              comment_type: 'comment' as CommentType,
              content,
              old_value: null,
              new_value: null,
              created_at: now(),
            },
          ],
        }));
      },

      addSystemComment: (taskId, content, commentType = 'status_change', oldValue = null, newValue = null) => {
        set((s) => ({
          comments: [
            ...s.comments,
            {
              id: uid(),
              task_id: taskId,
              author_name: 'System',
              author_type: 'system' as AuthorType,
              comment_type: commentType,
              content,
              old_value: oldValue,
              new_value: newValue,
              created_at: now(),
            },
          ],
        }));
      },

      // ── Attachments ────────────────────────────────

      addAttachment: (attachment) => {
        set((s) => ({
          attachments: [
            ...s.attachments,
            { ...attachment, id: uid(), created_at: now() },
          ],
        }));
      },

      removeAttachment: (id) => {
        set((s) => ({
          attachments: s.attachments.filter((a) => a.id !== id),
        }));
      },

      // ── Templates ──────────────────────────────────

      addTemplate: (template) => {
        set((s) => ({
          templates: [
            ...s.templates,
            { ...template, id: uid(), usage_count: 0, created_at: now(), updated_at: now() },
          ],
        }));
      },

      updateTemplate: (id, updates) => {
        set((s) => ({
          templates: s.templates.map((t) =>
            t.id === id ? { ...t, ...updates, updated_at: now() } : t,
          ),
        }));
      },

      deleteTemplate: (id) => {
        set((s) => ({
          templates: s.templates.filter((t) => t.id !== id),
        }));
      },

      incrementTemplateUsage: (id) => {
        set((s) => ({
          templates: s.templates.map((t) =>
            t.id === id ? { ...t, usage_count: t.usage_count + 1 } : t,
          ),
        }));
      },

      // ── Computed selectors ─────────────────────────

      getBoardTasks: () => {
        const { tasks, comments, attachments } = get();
        const topLevel = tasks.filter((t) => !t.parent_task_id);

        return topLevel.map((t): BoardTask => {
          const subtasks = tasks.filter((st) => st.parent_task_id === t.id);
          const taskComments = comments.filter((c) => c.task_id === t.id);
          const taskAttachments = attachments.filter((a) => a.task_id === t.id);
          const blockerTask = t.blocked_by ? tasks.find((bt) => bt.id === t.blocked_by) : null;

          return {
            ...t,
            subtask_count: subtasks.length,
            subtask_complete_count: subtasks.filter((st) => st.status === 'complete').length,
            comment_count: taskComments.length,
            attachment_count: taskAttachments.length,
            is_overdue: !!(t.due_date && new Date(t.due_date) < new Date() && t.status !== 'complete' && t.status !== 'archived'),
            is_blocked: !!(blockerTask && blockerTask.status !== 'complete'),
            blocking_task_title: blockerTask?.title,
          };
        }).sort((a, b) => a.sort_order - b.sort_order);
      },

      getTasksByStatus: (status) => {
        return get().getBoardTasks().filter((t) => t.status === status);
      },

      getSubtasks: (parentId) => {
        return get().tasks
          .filter((t) => t.parent_task_id === parentId)
          .sort((a, b) => a.sort_order - b.sort_order);
      },

      getTaskComments: (taskId) => {
        return get().comments
          .filter((c) => c.task_id === taskId)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      },

      getTaskAttachments: (taskId) => {
        return get().attachments.filter((a) => a.task_id === taskId);
      },

      getAgentWorkloads: () => {
        const { tasks } = get();
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        return AGENTS.map((agent): AgentWorkload => {
          const agentTasks = tasks.filter(
            (t) => t.assigned_agent_slug === agent.slug && !t.parent_task_id,
          );
          return {
            ...agent,
            active_tasks: agentTasks.filter((t) => t.status === 'in_progress').length,
            queued_tasks: agentTasks.filter((t) => t.status === 'queued').length,
            total_open: agentTasks.filter((t) => t.status !== 'complete' && t.status !== 'archived').length,
            completed_this_week: agentTasks.filter(
              (t) => t.status === 'complete' && t.completed_at && t.completed_at > weekAgo,
            ).length,
            total_estimated_hours: agentTasks
              .filter((t) => t.status !== 'complete' && t.status !== 'archived')
              .reduce((sum, t) => sum + (t.estimated_hours ?? 0), 0),
            tasks: agentTasks.filter((t) => t.status === 'in_progress' || t.status === 'queued'),
          };
        });
      },

      getStats: () => {
        const { tasks } = get();
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const topLevel = tasks.filter((t) => !t.parent_task_id);

        const completedTasks = topLevel.filter(
          (t) => t.status === 'complete' && t.started_at && t.completed_at,
        );
        const avgHours = completedTasks.length > 0
          ? completedTasks.reduce((sum, t) => {
              const start = new Date(t.started_at!).getTime();
              const end = new Date(t.completed_at!).getTime();
              return sum + (end - start) / (1000 * 60 * 60);
            }, 0) / completedTasks.length
          : 0;

        const blockedCount = topLevel.filter((t) => {
          if (!t.blocked_by || t.status === 'complete' || t.status === 'archived') return false;
          const blocker = tasks.find((bt) => bt.id === t.blocked_by);
          return blocker && blocker.status !== 'complete';
        }).length;

        return {
          total_open: topLevel.filter((t) => t.status !== 'complete' && t.status !== 'archived').length,
          in_progress: topLevel.filter((t) => t.status === 'in_progress').length,
          overdue: topLevel.filter(
            (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'complete' && t.status !== 'archived',
          ).length,
          blocked: blockedCount,
          completed_this_week: topLevel.filter(
            (t) => t.status === 'complete' && t.completed_at && t.completed_at > weekAgo,
          ).length,
          avg_completion_hours: Math.round(avgHours * 10) / 10,
        };
      },

      getTaskById: (id) => get().tasks.find((t) => t.id === id),

      getAllTags: () => {
        const allTags = new Set<string>();
        get().tasks.forEach((t) => t.tags.forEach((tag) => allTags.add(tag)));
        return Array.from(allTags).sort();
      },
    }),
    {
      name: 'aegis-workshop-v2',
      version: 2,
      onRehydrate: () => {
        return (state) => {
          if (state) {
            // Restore sequence counter
            const maxNum = state.tasks.reduce((max, t) => {
              const num = parseInt(t.task_number.replace('WS-', ''), 10);
              return isNaN(num) ? max : Math.max(max, num);
            }, 0);
            state._seqCounter = Math.max(state._seqCounter, maxNum);
            taskSeq = state._seqCounter;
          }
        };
      },
    },
  ),
);

// Re-export types for convenience
export type { WorkshopTask, TaskComment, TaskAttachment, TaskTemplate, BoardTask } from '@/pages/Workshop/types';
export type { TaskStatus, TaskPriority, CommentType, AuthorType, ViewMode } from '@/pages/Workshop/types';
