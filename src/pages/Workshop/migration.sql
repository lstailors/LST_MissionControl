-- ============================================================
-- WORKSHOP TASKS — Core task table
-- Run this migration when connecting to Supabase
-- ============================================================
CREATE TABLE workshop_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'queued', 'in_progress', 'review', 'complete', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_agent_id UUID REFERENCES maestro_agents(id),
  assigned_agent_slug TEXT,
  created_by TEXT DEFAULT 'calogero',
  due_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_hours NUMERIC(6,2),
  actual_hours NUMERIC(6,2),
  linked_customer_id UUID,
  linked_order_id UUID,
  linked_approval_id UUID,
  blocked_by UUID REFERENCES workshop_tasks(id),
  parent_task_id UUID REFERENCES workshop_tasks(id),
  sort_order INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE workshop_task_seq START 1;

CREATE OR REPLACE FUNCTION generate_task_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.task_number := 'WS-' || LPAD(nextval('workshop_task_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_task_number
  BEFORE INSERT ON workshop_tasks
  FOR EACH ROW
  WHEN (NEW.task_number IS NULL)
  EXECUTE FUNCTION generate_task_number();

CREATE OR REPLACE FUNCTION update_workshop_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workshop_updated
  BEFORE UPDATE ON workshop_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_workshop_timestamp();

CREATE OR REPLACE FUNCTION auto_set_task_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' AND NEW.started_at IS NULL THEN
    NEW.started_at = now();
  END IF;
  IF NEW.status = 'complete' AND OLD.status != 'complete' AND NEW.completed_at IS NULL THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_task_auto_timestamps
  BEFORE UPDATE ON workshop_tasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_task_timestamps();

-- ============================================================
-- TASK COMMENTS / ACTIVITY LOG
-- ============================================================
CREATE TABLE workshop_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES workshop_tasks(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_type TEXT DEFAULT 'human'
    CHECK (author_type IN ('human', 'agent', 'system')),
  comment_type TEXT DEFAULT 'comment'
    CHECK (comment_type IN ('comment', 'status_change', 'assignment', 'attachment', 'note')),
  content TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TASK ATTACHMENTS
-- ============================================================
CREATE TABLE workshop_task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES workshop_tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  is_skill_file BOOLEAN DEFAULT false,
  skill_description TEXT,
  uploaded_by TEXT DEFAULT 'calogero',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TASK TEMPLATES
-- ============================================================
CREATE TABLE workshop_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  default_priority TEXT DEFAULT 'medium',
  default_agent_slug TEXT,
  default_estimated_hours NUMERIC(6,2),
  default_tags TEXT[] DEFAULT '{}',
  subtasks JSONB DEFAULT '[]',
  default_attachments JSONB DEFAULT '[]',
  instructions_md TEXT,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_tasks_status ON workshop_tasks(status);
CREATE INDEX idx_tasks_priority ON workshop_tasks(priority);
CREATE INDEX idx_tasks_assigned ON workshop_tasks(assigned_agent_slug);
CREATE INDEX idx_tasks_parent ON workshop_tasks(parent_task_id);
CREATE INDEX idx_tasks_blocked ON workshop_tasks(blocked_by);
CREATE INDEX idx_tasks_due ON workshop_tasks(due_date);
CREATE INDEX idx_tasks_sort ON workshop_tasks(status, sort_order);
CREATE INDEX idx_task_comments_task ON workshop_task_comments(task_id);
CREATE INDEX idx_task_attachments_task ON workshop_task_attachments(task_id);

-- ============================================================
-- VIEWS
-- ============================================================
CREATE VIEW v_workshop_board AS
SELECT
  t.*,
  a.name AS agent_name,
  a.avatar_path AS agent_avatar,
  a.role AS agent_role,
  (SELECT COUNT(*) FROM workshop_tasks st WHERE st.parent_task_id = t.id) AS subtask_count,
  (SELECT COUNT(*) FROM workshop_tasks st WHERE st.parent_task_id = t.id AND st.status = 'complete') AS subtask_complete_count,
  (SELECT COUNT(*) FROM workshop_task_comments c WHERE c.task_id = t.id) AS comment_count,
  (SELECT COUNT(*) FROM workshop_task_attachments att WHERE att.task_id = t.id) AS attachment_count,
  CASE
    WHEN t.due_date IS NOT NULL AND t.due_date < now() AND t.status NOT IN ('complete', 'archived')
    THEN true ELSE false
  END AS is_overdue,
  CASE
    WHEN t.blocked_by IS NOT NULL THEN (
      SELECT bs.status != 'complete' FROM workshop_tasks bs WHERE bs.id = t.blocked_by
    )
    ELSE false
  END AS is_blocked
FROM workshop_tasks t
LEFT JOIN maestro_agents a ON t.assigned_agent_id = a.id
WHERE t.parent_task_id IS NULL;

CREATE VIEW v_agent_workload AS
SELECT
  a.id AS agent_id,
  a.slug,
  a.name,
  a.role,
  a.avatar_path,
  COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS active_tasks,
  COUNT(t.id) FILTER (WHERE t.status = 'queued') AS queued_tasks,
  COUNT(t.id) FILTER (WHERE t.status NOT IN ('complete', 'archived')) AS total_open,
  COUNT(t.id) FILTER (WHERE t.status = 'complete' AND t.completed_at > now() - interval '7 days') AS completed_this_week,
  SUM(t.estimated_hours) FILTER (WHERE t.status NOT IN ('complete', 'archived')) AS total_estimated_hours,
  AVG(EXTRACT(EPOCH FROM (t.completed_at - t.started_at)) / 3600)
    FILTER (WHERE t.status = 'complete' AND t.started_at IS NOT NULL) AS avg_completion_hours
FROM maestro_agents a
LEFT JOIN workshop_tasks t ON t.assigned_agent_id = a.id
WHERE a.is_active = true
GROUP BY a.id, a.slug, a.name, a.role, a.avatar_path;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE workshop_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON workshop_tasks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON workshop_task_comments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON workshop_task_attachments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON workshop_task_templates FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- SEED DATA — 3 Sample Templates
-- ============================================================
INSERT INTO workshop_task_templates (name, description, category, default_priority, default_agent_slug, subtasks, instructions_md) VALUES
(
  'New Client Onboarding',
  'Full onboarding flow for a new bespoke client.',
  'client',
  'high',
  'sofia',
  '[{"title":"Send welcome email","agent_slug":"sofia","estimated_hours":0.5},{"title":"Prepare questionnaire","agent_slug":"giada","estimated_hours":1},{"title":"Schedule consultation","agent_slug":"mia","estimated_hours":0.25},{"title":"Take measurements","agent_slug":"rocco","estimated_hours":1},{"title":"Fabric recommendations","agent_slug":"melana","estimated_hours":1.5},{"title":"Create records","agent_slug":"simone","estimated_hours":0.5}]',
  '## New Client Onboarding\n\nStandard L&S onboarding flow.'
),
(
  'Trunk Show Preparation',
  'End-to-end prep for an L&S trunk show event.',
  'marketing',
  'high',
  'marco',
  '[{"title":"Confirm venue","agent_slug":"mia","estimated_hours":2},{"title":"Curate fabrics","agent_slug":"melana","estimated_hours":4},{"title":"Design invitations","agent_slug":"giovanna","estimated_hours":3},{"title":"Marketing materials","agent_slug":"giovanna","estimated_hours":4},{"title":"VIP outreach","agent_slug":"sofia","estimated_hours":3},{"title":"Day-of logistics","agent_slug":"marco","estimated_hours":2},{"title":"Post-show follow-up","agent_slug":"sofia","estimated_hours":3}]',
  '## Trunk Show Preparation\n\nStart at least 6 weeks before.'
),
(
  'Fabric Restock Check',
  'Monthly fabric inventory review.',
  'operations',
  'medium',
  'melana',
  '[{"title":"Pull inventory report","agent_slug":"melana","estimated_hours":0.5},{"title":"Identify low stock","agent_slug":"melana","estimated_hours":0.5},{"title":"Contact suppliers","agent_slug":"melana","estimated_hours":2},{"title":"Submit POs","agent_slug":"filo","estimated_hours":1},{"title":"Update records","agent_slug":"simone","estimated_hours":0.5}]',
  '## Monthly Fabric Restock\n\nRun the first week of each month.'
);
