-- ============================================================
-- L&S Mission Control — Mega Build Database Migrations
-- Run these migrations on Supabase when connecting
-- ============================================================

-- Daily briefs (Il Giornale)
CREATE TABLE IF NOT EXISTS daily_briefs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  brief_date date NOT NULL UNIQUE,
  headline text,
  body_html text,
  body_text text,
  metrics_snapshot jsonb DEFAULT '{}',
  agent_highlights jsonb DEFAULT '[]',
  priority_items jsonb DEFAULT '[]',
  client_events jsonb DEFAULT '[]',
  model_used text DEFAULT 'claude-sonnet-4-5-20250929',
  token_usage jsonb,
  generated_at timestamptz DEFAULT now(),
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Decision log (Il Registro)
CREATE TABLE IF NOT EXISTS decision_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  approval_id uuid,
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected', 'revised')),
  category text,
  agent_slug text,
  title text NOT NULL,
  summary text,
  reasoning text,
  amount numeric(12,2),
  auto_decision boolean DEFAULT false,
  auto_decision_rule text,
  time_to_decision_seconds integer,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  decided_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decision_log_category ON decision_log(category);
CREATE INDEX IF NOT EXISTS idx_decision_log_agent ON decision_log(agent_slug);
CREATE INDEX IF NOT EXISTS idx_decision_log_decided ON decision_log(decided_at DESC);

-- Decision patterns
CREATE TABLE IF NOT EXISTS decision_patterns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  agent_slug text,
  pattern_name text NOT NULL,
  conditions jsonb NOT NULL,
  auto_action text NOT NULL CHECK (auto_action IN ('approve', 'reject', 'flag')),
  confidence_score numeric(3,2) DEFAULT 0,
  total_matches integer DEFAULT 0,
  total_overrides integer DEFAULT 0,
  is_active boolean DEFAULT false,
  activated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Agent activity log
CREATE TABLE IF NOT EXISTS agent_activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_slug text NOT NULL,
  action_type text NOT NULL,
  domain text,
  summary text NOT NULL,
  details jsonb DEFAULT '{}',
  duration_ms integer,
  status text DEFAULT 'success' CHECK (status IN ('success', 'failure', 'warning', 'in_progress')),
  error_message text,
  linked_customer_id uuid,
  linked_order_id uuid,
  triggered_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_activity_agent ON agent_activity_log(agent_slug);
CREATE INDEX IF NOT EXISTS idx_agent_activity_created ON agent_activity_log(created_at DESC);

-- Scheduled tasks registry
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_slug text NOT NULL,
  task_name text NOT NULL,
  description text,
  cron_expression text NOT NULL,
  human_schedule text NOT NULL,
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  last_run_status text CHECK (last_run_status IN ('success', 'failure', 'skipped')),
  last_run_duration_ms integer,
  last_error text,
  next_run_at timestamptz,
  run_count integer DEFAULT 0,
  failure_count integer DEFAULT 0,
  consecutive_failures integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- API cost tracking
CREATE TABLE IF NOT EXISTS api_cost_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_slug text,
  model text NOT NULL,
  provider text DEFAULT 'anthropic',
  input_tokens integer DEFAULT 0,
  output_tokens integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  cost_usd numeric(10,6) DEFAULT 0,
  request_type text,
  latency_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_cost_agent ON api_cost_log(agent_slug);
CREATE INDEX IF NOT EXISTS idx_api_cost_created ON api_cost_log(created_at DESC);

-- Knowledge vault
CREATE TABLE IF NOT EXISTS knowledge_vault (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL,
  subcategory text,
  content_text text,
  file_path text,
  file_type text,
  file_size_bytes integer,
  tags text[] DEFAULT '{}',
  author text DEFAULT 'Calogero',
  source text,
  version integer DEFAULT 1,
  is_pinned boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  last_accessed_at timestamptz,
  access_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_category ON knowledge_vault(category);
CREATE INDEX IF NOT EXISTS idx_vault_tags ON knowledge_vault USING gin(tags);

-- Trunk shows / events
CREATE TABLE IF NOT EXISTS trunk_shows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name text NOT NULL,
  event_type text DEFAULT 'trunk_show',
  city text NOT NULL,
  state text,
  venue_name text,
  venue_address text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'planning' CHECK (status IN ('planning', 'confirmed', 'invitations_sent', 'active', 'completed', 'cancelled')),
  budget numeric(12,2),
  actual_spend numeric(12,2),
  target_revenue numeric(12,2),
  actual_revenue numeric(12,2),
  target_appointments integer,
  actual_appointments integer,
  target_orders integer,
  actual_orders integer,
  invitation_count integer DEFAULT 0,
  rsvp_count integer DEFAULT 0,
  notes text,
  packing_list jsonb DEFAULT '[]',
  travel_details jsonb DEFAULT '{}',
  team_members text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trunk show invitations
CREATE TABLE IF NOT EXISTS trunk_show_invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trunk_show_id uuid REFERENCES trunk_shows(id) ON DELETE CASCADE,
  customer_id uuid,
  invited_name text,
  invited_email text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'rsvp_yes', 'rsvp_no', 'attended', 'no_show')),
  invitation_sent_at timestamptz,
  rsvp_at timestamptz,
  appointment_time timestamptz,
  notes text,
  order_value numeric(12,2),
  created_at timestamptz DEFAULT now()
);

-- Customer communications
CREATE TABLE IF NOT EXISTS customer_communications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid,
  customer_name text,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'call', 'note')),
  direction text CHECK (direction IN ('inbound', 'outbound')),
  subject text,
  body text,
  from_address text,
  to_address text,
  call_duration_seconds integer,
  call_transcript text,
  sentiment text,
  agent_slug text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE daily_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_cost_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE trunk_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE trunk_show_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_communications ENABLE ROW LEVEL SECURITY;
