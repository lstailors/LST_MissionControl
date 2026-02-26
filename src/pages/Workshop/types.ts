// ═══════════════════════════════════════════════════════════
// Workshop Types
// ═══════════════════════════════════════════════════════════

export type TaskStatus = 'backlog' | 'queued' | 'in_progress' | 'review' | 'complete' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type CommentType = 'comment' | 'status_change' | 'assignment' | 'attachment' | 'note';
export type AuthorType = 'human' | 'agent' | 'system';
export type ViewMode = 'board' | 'agents' | 'list';

export interface WorkshopTask {
  id: string;
  task_number: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_agent_slug: string | null;
  created_by: string;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  linked_customer_id: string | null;
  linked_order_id: string | null;
  blocked_by: string | null;
  parent_task_id: string | null;
  sort_order: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_name: string;
  author_type: AuthorType;
  comment_type: CommentType;
  content: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  is_skill_file: boolean;
  skill_description: string | null;
  uploaded_by: string;
  created_at: string;
  // For local storage, we hold data URL
  data_url?: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  default_priority: TaskPriority;
  default_agent_slug: string | null;
  default_estimated_hours: number | null;
  default_tags: string[];
  subtasks: TemplateSubtask[];
  instructions_md: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateSubtask {
  title: string;
  description?: string;
  agent_slug: string | null;
  estimated_hours: number | null;
}

export interface AgentInfo {
  slug: string;
  name: string;
  role: string;
  emoji: string;
}

// Computed view types
export interface BoardTask extends WorkshopTask {
  subtask_count: number;
  subtask_complete_count: number;
  comment_count: number;
  attachment_count: number;
  is_overdue: boolean;
  is_blocked: boolean;
  blocking_task_title?: string;
}

export interface AgentWorkload {
  slug: string;
  name: string;
  role: string;
  emoji: string;
  active_tasks: number;
  queued_tasks: number;
  total_open: number;
  completed_this_week: number;
  total_estimated_hours: number;
  tasks: WorkshopTask[];
}

export interface WorkshopStats {
  total_open: number;
  in_progress: number;
  overdue: number;
  blocked: number;
  completed_this_week: number;
  avg_completion_hours: number;
}
