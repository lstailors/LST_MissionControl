// ═══════════════════════════════════════════════════════════
// Mission Control Store — Unified data for all new L&S pages
// Domains: Briefs, Decisions, Activity, Comms, Vault, Events,
//          Intelligence, Orchestrator
// ═══════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function now(): string {
  return new Date().toISOString();
}
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

// ── Types ────────────────────────────────────────────────

export interface DailyBrief {
  id: string;
  brief_date: string;
  headline: string;
  body_text: string;
  metrics_snapshot: {
    revenue_yesterday: number;
    active_orders: number;
    pending_approvals: number;
    overdue_orders: number;
    fittings_today: number;
    agent_tasks_completed: number;
  };
  agent_highlights: { agent_slug: string; summary: string; tasks_completed: number }[];
  priority_items: { type: string; title: string; description: string; urgency: string }[];
  client_events: { name: string; event_type: string; event_date: string; details: string }[];
  is_read: boolean;
  created_at: string;
}

export interface DecisionEntry {
  id: string;
  decision: 'approved' | 'rejected' | 'revised';
  category: string;
  agent_slug: string;
  title: string;
  summary: string;
  reasoning: string;
  amount: number | null;
  auto_decision: boolean;
  time_to_decision_seconds: number;
  tags: string[];
  decided_at: string;
}

export interface DecisionPattern {
  id: string;
  category: string;
  agent_slug: string;
  pattern_name: string;
  auto_action: 'approve' | 'reject' | 'flag';
  confidence_score: number;
  total_matches: number;
  total_overrides: number;
  is_active: boolean;
}

export interface ActivityEntry {
  id: string;
  agent_slug: string;
  action_type: string;
  domain: string;
  summary: string;
  status: 'success' | 'failure' | 'warning' | 'in_progress';
  duration_ms: number;
  error_message: string | null;
  triggered_by: string;
  created_at: string;
}

export interface ScheduledTask {
  id: string;
  agent_slug: string;
  task_name: string;
  description: string;
  cron_expression: string;
  human_schedule: string;
  is_active: boolean;
  last_run_at: string | null;
  last_run_status: 'success' | 'failure' | 'skipped' | null;
  last_run_duration_ms: number | null;
  last_error: string | null;
  next_run_at: string | null;
  run_count: number;
  failure_count: number;
}

export interface CostEntry {
  id: string;
  agent_slug: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  request_type: string;
  created_at: string;
}

export interface VaultDocument {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  content_text: string;
  file_type: string;
  tags: string[];
  author: string;
  source: string;
  is_pinned: boolean;
  is_archived: boolean;
  access_count: number;
  created_at: string;
  updated_at: string;
}

export interface TrunkShow {
  id: string;
  event_name: string;
  event_type: string;
  city: string;
  state: string;
  venue_name: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'confirmed' | 'invitations_sent' | 'active' | 'completed' | 'cancelled';
  budget: number;
  actual_spend: number;
  target_revenue: number;
  actual_revenue: number;
  target_appointments: number;
  actual_appointments: number;
  target_orders: number;
  actual_orders: number;
  invitation_count: number;
  rsvp_count: number;
  notes: string;
  team_members: string[];
  created_at: string;
}

export interface TrunkShowInvitation {
  id: string;
  trunk_show_id: string;
  invited_name: string;
  invited_email: string;
  status: 'pending' | 'sent' | 'opened' | 'rsvp_yes' | 'rsvp_no' | 'attended' | 'no_show';
  appointment_time: string | null;
  order_value: number | null;
  created_at: string;
}

export interface Communication {
  id: string;
  customer_id: string;
  customer_name: string;
  channel: 'email' | 'sms' | 'call' | 'note';
  direction: 'inbound' | 'outbound';
  subject: string;
  body: string;
  from_address: string;
  to_address: string;
  agent_slug: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ClientIntelRecord {
  id: string;
  name: string;
  email: string;
  city: string;
  state: string;
  vip_tier: string;
  total_orders: number;
  lifetime_value: number;
  last_order_date: string;
  avg_order_value: number;
  trend: number;
  birthday: string | null;
  anniversary: string | null;
}

export interface MaestroAgent {
  slug: string;
  name: string;
  role: string;
  emoji: string;
  is_active: boolean;
  status: 'active' | 'idle' | 'error';
  model: string;
  temperature: number;
  current_task: string;
  tasks_today: number;
  error_rate: number;
  cost_today: number;
}

// ── Store ────────────────────────────────────────────────

interface MissionControlState {
  // Data
  briefs: DailyBrief[];
  decisions: DecisionEntry[];
  patterns: DecisionPattern[];
  activities: ActivityEntry[];
  scheduledTasks: ScheduledTask[];
  costs: CostEntry[];
  vault: VaultDocument[];
  trunkShows: TrunkShow[];
  invitations: TrunkShowInvitation[];
  communications: Communication[];
  clients: ClientIntelRecord[];
  agents: MaestroAgent[];
  _seeded: boolean;

  // Actions
  seed: () => void;
  addBrief: (b: Omit<DailyBrief, 'id' | 'created_at'>) => void;
  markBriefRead: (id: string) => void;
  addDecision: (d: Omit<DecisionEntry, 'id'>) => void;
  addActivity: (a: Omit<ActivityEntry, 'id'>) => void;
  toggleScheduledTask: (id: string) => void;
  addVaultDoc: (d: Omit<VaultDocument, 'id' | 'created_at' | 'updated_at' | 'access_count'>) => void;
  updateVaultDoc: (id: string, updates: Partial<VaultDocument>) => void;
  deleteVaultDoc: (id: string) => void;
  toggleVaultPin: (id: string) => void;
  addTrunkShow: (t: Omit<TrunkShow, 'id' | 'created_at'>) => void;
  updateTrunkShow: (id: string, updates: Partial<TrunkShow>) => void;
  addInvitation: (inv: Omit<TrunkShowInvitation, 'id' | 'created_at'>) => void;
  updateInvitation: (id: string, updates: Partial<TrunkShowInvitation>) => void;
  addCommunication: (c: Omit<Communication, 'id'>) => void;
  toggleAgentActive: (slug: string) => void;
  updateAgent: (slug: string, updates: Partial<MaestroAgent>) => void;
  togglePattern: (id: string) => void;
}

export const useMissionControlStore = create<MissionControlState>()(
  persist(
    (set, get) => ({
      briefs: [],
      decisions: [],
      patterns: [],
      activities: [],
      scheduledTasks: [],
      costs: [],
      vault: [],
      trunkShows: [],
      invitations: [],
      communications: [],
      clients: [],
      agents: [],
      _seeded: false,

      seed: () => {
        if (get()._seeded) return;
        set({
          _seeded: true,
          agents: SEED_AGENTS,
          briefs: SEED_BRIEFS,
          decisions: SEED_DECISIONS,
          patterns: SEED_PATTERNS,
          activities: SEED_ACTIVITIES,
          scheduledTasks: SEED_SCHEDULED_TASKS,
          costs: SEED_COSTS,
          vault: SEED_VAULT,
          trunkShows: SEED_TRUNK_SHOWS,
          invitations: SEED_INVITATIONS,
          communications: SEED_COMMS,
          clients: SEED_CLIENTS,
        });
      },

      addBrief: (b) => set((s) => ({ briefs: [{ ...b, id: uid(), created_at: now() }, ...s.briefs] })),
      markBriefRead: (id) => set((s) => ({ briefs: s.briefs.map((b) => b.id === id ? { ...b, is_read: true } : b) })),
      addDecision: (d) => set((s) => ({ decisions: [{ ...d, id: uid() }, ...s.decisions] })),
      addActivity: (a) => set((s) => ({ activities: [{ ...a, id: uid() }, ...s.activities] })),
      toggleScheduledTask: (id) => set((s) => ({
        scheduledTasks: s.scheduledTasks.map((t) => t.id === id ? { ...t, is_active: !t.is_active } : t),
      })),
      addVaultDoc: (d) => set((s) => ({
        vault: [{ ...d, id: uid(), access_count: 0, created_at: now(), updated_at: now() }, ...s.vault],
      })),
      updateVaultDoc: (id, updates) => set((s) => ({
        vault: s.vault.map((d) => d.id === id ? { ...d, ...updates, updated_at: now() } : d),
      })),
      deleteVaultDoc: (id) => set((s) => ({ vault: s.vault.filter((d) => d.id !== id) })),
      toggleVaultPin: (id) => set((s) => ({
        vault: s.vault.map((d) => d.id === id ? { ...d, is_pinned: !d.is_pinned } : d),
      })),
      addTrunkShow: (t) => set((s) => ({ trunkShows: [{ ...t, id: uid(), created_at: now() }, ...s.trunkShows] })),
      updateTrunkShow: (id, updates) => set((s) => ({
        trunkShows: s.trunkShows.map((t) => t.id === id ? { ...t, ...updates } : t),
      })),
      addInvitation: (inv) => set((s) => ({
        invitations: [...s.invitations, { ...inv, id: uid(), created_at: now() }],
      })),
      updateInvitation: (id, updates) => set((s) => ({
        invitations: s.invitations.map((i) => i.id === id ? { ...i, ...updates } : i),
      })),
      addCommunication: (c) => set((s) => ({
        communications: [{ ...c, id: uid() }, ...s.communications],
      })),
      toggleAgentActive: (slug) => set((s) => ({
        agents: s.agents.map((a) => a.slug === slug ? { ...a, is_active: !a.is_active } : a),
      })),
      updateAgent: (slug, updates) => set((s) => ({
        agents: s.agents.map((a) => a.slug === slug ? { ...a, ...updates } : a),
      })),
      togglePattern: (id) => set((s) => ({
        patterns: s.patterns.map((p) => p.id === id ? { ...p, is_active: !p.is_active } : p),
      })),
    }),
    { name: 'aegis-mission-control-v1', version: 1 },
  ),
);

// ═══════════════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════════════

const SEED_AGENTS: MaestroAgent[] = [
  { slug: 'maestro', name: 'Maestro', role: 'Orchestrator & CEO Brain', emoji: '🎯', is_active: true, status: 'active', model: 'claude-sonnet-4-5-20250929', temperature: 0.7, current_task: 'Monitoring all agent activity', tasks_today: 24, error_rate: 0.01, cost_today: 2.45 },
  { slug: 'simone', name: 'Simone', role: 'Data Librarian', emoji: '💻', is_active: true, status: 'active', model: 'claude-sonnet-4-5-20250929', temperature: 0.3, current_task: 'Syncing customer records', tasks_today: 12, error_rate: 0, cost_today: 0.89 },
  { slug: 'sofia', name: 'Sofia', role: 'Client Relations', emoji: '👩‍💼', is_active: true, status: 'active', model: 'claude-sonnet-4-5-20250929', temperature: 0.8, current_task: 'Drafting follow-up email for Mr. Harrison', tasks_today: 8, error_rate: 0.02, cost_today: 1.23 },
  { slug: 'rocco', name: 'Rocco', role: 'Production & Manufacturing', emoji: '✂️', is_active: true, status: 'idle', model: 'claude-sonnet-4-5-20250929', temperature: 0.4, current_task: 'Idle — awaiting production updates', tasks_today: 5, error_rate: 0, cost_today: 0.67 },
  { slug: 'filo', name: 'Filo', role: 'Finance & Analytics', emoji: '💰', is_active: true, status: 'active', model: 'claude-sonnet-4-5-20250929', temperature: 0.2, current_task: 'Generating daily P&L snapshot', tasks_today: 7, error_rate: 0, cost_today: 0.95 },
  { slug: 'marco', name: 'Marco', role: 'Sales & Business Dev', emoji: '📋', is_active: true, status: 'active', model: 'claude-sonnet-4-5-20250929', temperature: 0.6, current_task: 'Scoring new leads from website', tasks_today: 11, error_rate: 0.03, cost_today: 1.10 },
  { slug: 'melana', name: 'Melana', role: 'Fabric & Materials', emoji: '🧵', is_active: true, status: 'idle', model: 'claude-sonnet-4-5-20250929', temperature: 0.3, current_task: 'Idle', tasks_today: 3, error_rate: 0, cost_today: 0.42 },
  { slug: 'giovanna', name: 'Giovanna', role: 'Marketing & Content', emoji: '🎨', is_active: true, status: 'active', model: 'claude-sonnet-4-5-20250929', temperature: 0.9, current_task: 'Creating social media content', tasks_today: 6, error_rate: 0.01, cost_today: 0.88 },
  { slug: 'giada', name: 'Giada', role: 'Design & Style', emoji: '👗', is_active: true, status: 'idle', model: 'claude-sonnet-4-5-20250929', temperature: 0.7, current_task: 'Idle', tasks_today: 2, error_rate: 0, cost_today: 0.31 },
  { slug: 'mia', name: 'Mia', role: 'Scheduling & Calendar', emoji: '📅', is_active: true, status: 'active', model: 'claude-haiku-4-5-20251001', temperature: 0.3, current_task: 'Confirming tomorrow\'s fittings', tasks_today: 15, error_rate: 0, cost_today: 0.18 },
  { slug: 'lapenna', name: 'La Penna', role: 'Legal & Compliance', emoji: '⚖️', is_active: true, status: 'idle', model: 'claude-sonnet-4-5-20250929', temperature: 0.2, current_task: 'Idle', tasks_today: 1, error_rate: 0, cost_today: 0.12 },
];

const SEED_BRIEFS: DailyBrief[] = [
  {
    id: 'brief-1', brief_date: new Date().toISOString().slice(0, 10),
    headline: 'Strong Wednesday — Revenue Up, Three VIP Fittings Confirmed',
    body_text: `Good morning, Calogero.\n\nYesterday was a strong day. We closed $4,280 across 3 orders — two bespoke suits for returning client Jonathan Park, and a sport coat for a referral from Dr. Castellano. The factory confirmed shipment of the Greenfield wedding party order (6 suits), expected arrival Friday.\n\nSofia drafted and sent follow-up emails to 4 clients who visited during last week's trunk show in Greenwich. Two have already replied requesting appointments.\n\nRocco flagged that the Loro Piana navy S130s we need for the Mendez order is running low at Holland & Sherry. Melana is checking alternate sources.\n\nToday's schedule: 3 fittings (Harrison 10am, Park 2pm, new client referral 4pm). Mia has confirmed all three.\n\nThe approval queue is clear. Seven tasks completed across the team yesterday. No errors logged.`,
    metrics_snapshot: { revenue_yesterday: 4280, active_orders: 47, pending_approvals: 0, overdue_orders: 2, fittings_today: 3, agent_tasks_completed: 7 },
    agent_highlights: [
      { agent_slug: 'sofia', summary: 'Sent 4 trunk show follow-up emails, 2 replies received', tasks_completed: 4 },
      { agent_slug: 'rocco', summary: 'Flagged low fabric inventory for Mendez order', tasks_completed: 2 },
      { agent_slug: 'mia', summary: 'Confirmed 3 fittings for today, rescheduled 1 for Friday', tasks_completed: 3 },
      { agent_slug: 'filo', summary: 'Generated daily P&L, MTD revenue at $38,450', tasks_completed: 1 },
    ],
    priority_items: [
      { type: 'fabric', title: 'Loro Piana S130s Running Low', description: 'Need alternate source for Mendez order', urgency: 'high' },
      { type: 'delivery', title: '2 Orders Overdue', description: 'Greenfield (3 days) and Torres (1 day) — factory delays', urgency: 'medium' },
    ],
    client_events: [
      { name: 'Michael Chen', event_type: 'Birthday', event_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), details: 'Diamond tier client, 12 orders lifetime' },
      { name: 'Robert & Angela Castellano', event_type: 'Anniversary', event_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), details: 'Referred 4 clients this year' },
    ],
    is_read: false, created_at: now(),
  },
  {
    id: 'brief-2', brief_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    headline: 'Quiet Tuesday — Focus on Production Pipeline',
    body_text: 'Good morning, Calogero.\n\nA quieter day on the revenue front — $1,850 from a single alterations order. But the production side was busy. Rocco processed 4 garment milestone updates from the factory, moving the Patterson and Kim orders to final pressing.\n\nGiovanna completed the March social content calendar and submitted it for your review.\n\nNo urgent items today. The team is focused and efficient.',
    metrics_snapshot: { revenue_yesterday: 1850, active_orders: 48, pending_approvals: 1, overdue_orders: 2, fittings_today: 1, agent_tasks_completed: 9 },
    agent_highlights: [
      { agent_slug: 'rocco', summary: 'Processed 4 garment milestone updates', tasks_completed: 4 },
      { agent_slug: 'giovanna', summary: 'Completed March social content calendar', tasks_completed: 2 },
    ],
    priority_items: [],
    client_events: [],
    is_read: true, created_at: daysAgo(1),
  },
];

const SEED_DECISIONS: DecisionEntry[] = [
  { id: 'd1', decision: 'approved', category: 'email_draft', agent_slug: 'sofia', title: 'Follow-up email to Jonathan Park', summary: 'Post-fitting follow-up with fabric recommendations', reasoning: 'Tone is perfect, personal touches are good', amount: null, auto_decision: false, time_to_decision_seconds: 28, tags: ['client', 'email'], decided_at: daysAgo(0) },
  { id: 'd2', decision: 'approved', category: 'invoice', agent_slug: 'filo', title: 'Invoice #INV-2025-0342 for Greenfield', summary: '$12,450 for 6 bespoke suits — wedding party', reasoning: '', amount: 12450, auto_decision: false, time_to_decision_seconds: 15, tags: ['invoice', 'wedding'], decided_at: daysAgo(0) },
  { id: 'd3', decision: 'rejected', category: 'social_post', agent_slug: 'giovanna', title: 'Instagram post — Behind the Scenes', summary: 'Draft shows factory floor with visible client names on tags', reasoning: 'Client names visible in photo — privacy concern', amount: null, auto_decision: false, time_to_decision_seconds: 45, tags: ['social', 'privacy'], decided_at: daysAgo(1) },
  { id: 'd4', decision: 'approved', category: 'fabric_restock', agent_slug: 'melana', title: 'Restock Holland & Sherry Navy S130s', summary: '15 yards at $185/yard', reasoning: 'Essential stock, good price', amount: 2775, auto_decision: false, time_to_decision_seconds: 12, tags: ['fabric', 'restock'], decided_at: daysAgo(1) },
  { id: 'd5', decision: 'approved', category: 'email_draft', agent_slug: 'sofia', title: 'Birthday greeting to Michael Chen', summary: 'Personalized birthday email with VIP offer', reasoning: '', amount: null, auto_decision: true, auto_decision_rule: 'Auto-approve Sofia email drafts to Diamond clients', time_to_decision_seconds: 0, tags: ['client', 'birthday'], decided_at: daysAgo(2) },
  { id: 'd6', decision: 'revised', category: 'marketing', agent_slug: 'giovanna', title: 'Spring campaign email subject lines', summary: 'A/B test variants for spring trunk show promotion', reasoning: 'Changed "SALE" to "Private Preview" — we don\'t do sales', amount: null, auto_decision: false, time_to_decision_seconds: 120, tags: ['marketing', 'email'], decided_at: daysAgo(3) },
  { id: 'd7', decision: 'approved', category: 'invoice', agent_slug: 'filo', title: 'Invoice #INV-2025-0341 for Dr. Patel', summary: '$3,200 bespoke suit', reasoning: '', amount: 3200, auto_decision: false, time_to_decision_seconds: 8, tags: ['invoice'], decided_at: daysAgo(3) },
  { id: 'd8', decision: 'approved', category: 'email_draft', agent_slug: 'sofia', title: 'Trunk show recap to Greenwich attendees', summary: 'Batch follow-up to 12 attendees', reasoning: 'Good personalization per client', amount: null, auto_decision: false, time_to_decision_seconds: 90, tags: ['client', 'trunk-show'], decided_at: daysAgo(4) },
];

const SEED_PATTERNS: DecisionPattern[] = [
  { id: 'p1', category: 'email_draft', agent_slug: 'sofia', pattern_name: 'Auto-approve Sofia emails to Diamond clients', auto_action: 'approve', confidence_score: 0.94, total_matches: 23, total_overrides: 1, is_active: true },
  { id: 'p2', category: 'invoice', agent_slug: 'filo', pattern_name: 'Auto-approve invoices under $5,000', auto_action: 'approve', confidence_score: 0.88, total_matches: 15, total_overrides: 2, is_active: false },
  { id: 'p3', category: 'fabric_restock', agent_slug: 'melana', pattern_name: 'Auto-approve restocks under $2,000', auto_action: 'approve', confidence_score: 0.91, total_matches: 8, total_overrides: 0, is_active: false },
];

const SEED_ACTIVITIES: ActivityEntry[] = [
  { id: 'a1', agent_slug: 'sofia', action_type: 'email_sent', domain: 'client', summary: 'Sent follow-up email to Jonathan Park after fitting', status: 'success', duration_ms: 2340, error_message: null, triggered_by: 'cron', created_at: daysAgo(0) },
  { id: 'a2', agent_slug: 'mia', action_type: 'task_completed', domain: 'scheduling', summary: 'Confirmed 3 fitting appointments for today', status: 'success', duration_ms: 1200, error_message: null, triggered_by: 'cron', created_at: daysAgo(0) },
  { id: 'a3', agent_slug: 'filo', action_type: 'report_generated', domain: 'finance', summary: 'Generated daily P&L snapshot — MTD revenue $38,450', status: 'success', duration_ms: 4500, error_message: null, triggered_by: 'cron', created_at: daysAgo(0) },
  { id: 'a4', agent_slug: 'rocco', action_type: 'task_completed', domain: 'production', summary: 'Updated 4 garment milestones from factory status report', status: 'success', duration_ms: 3200, error_message: null, triggered_by: 'agent', created_at: daysAgo(0) },
  { id: 'a5', agent_slug: 'melana', action_type: 'alert_triggered', domain: 'fabric', summary: 'Low stock alert: Loro Piana Navy S130s below threshold', status: 'warning', duration_ms: 800, error_message: null, triggered_by: 'cron', created_at: daysAgo(0) },
  { id: 'a6', agent_slug: 'giovanna', action_type: 'task_completed', domain: 'marketing', summary: 'Created 3 Instagram posts for next week', status: 'success', duration_ms: 15000, error_message: null, triggered_by: 'cron', created_at: daysAgo(0) },
  { id: 'a7', agent_slug: 'marco', action_type: 'task_completed', domain: 'client', summary: 'Scored 5 new leads — 2 marked high-priority', status: 'success', duration_ms: 6700, error_message: null, triggered_by: 'cron', created_at: daysAgo(0) },
  { id: 'a8', agent_slug: 'simone', action_type: 'task_completed', domain: 'system', summary: 'Data integrity scan complete — 0 issues found', status: 'success', duration_ms: 12000, error_message: null, triggered_by: 'cron', created_at: daysAgo(1) },
  { id: 'a9', agent_slug: 'maestro', action_type: 'task_completed', domain: 'system', summary: 'Generated daily brief for February 25', status: 'success', duration_ms: 8900, error_message: null, triggered_by: 'cron', created_at: daysAgo(1) },
  { id: 'a10', agent_slug: 'lapenna', action_type: 'task_completed', domain: 'legal', summary: 'Compliance calendar check — no upcoming deadlines', status: 'success', duration_ms: 2100, error_message: null, triggered_by: 'cron', created_at: daysAgo(2) },
  { id: 'a11', agent_slug: 'sofia', action_type: 'error', domain: 'client', summary: 'Failed to send SMS to client — invalid phone format', status: 'failure', duration_ms: 500, error_message: 'Invalid phone number format for +1-555-INVALID', triggered_by: 'agent', created_at: daysAgo(3) },
];

const SEED_SCHEDULED_TASKS: ScheduledTask[] = [
  { id: 'st1', agent_slug: 'mia', task_name: 'Morning Schedule Post', description: 'Posts today\'s fitting schedule', cron_expression: '30 12 * * 1-6', human_schedule: 'Weekdays at 7:30am EST', is_active: true, last_run_at: daysAgo(0), last_run_status: 'success', last_run_duration_ms: 1200, last_error: null, next_run_at: new Date(Date.now() + 86400000).toISOString(), run_count: 142, failure_count: 2 },
  { id: 'st2', agent_slug: 'filo', task_name: 'Daily P&L Snapshot', description: 'Calculates daily financial metrics', cron_expression: '0 4 * * *', human_schedule: 'Daily at 11pm EST', is_active: true, last_run_at: daysAgo(0), last_run_status: 'success', last_run_duration_ms: 4500, last_error: null, next_run_at: new Date(Date.now() + 43200000).toISOString(), run_count: 365, failure_count: 3 },
  { id: 'st3', agent_slug: 'sofia', task_name: 'Client Birthday Check', description: 'Checks upcoming birthdays and queues outreach', cron_expression: '0 13 * * 1', human_schedule: 'Mondays at 8am EST', is_active: true, last_run_at: daysAgo(3), last_run_status: 'success', last_run_duration_ms: 3800, last_error: null, next_run_at: new Date(Date.now() + 4 * 86400000).toISOString(), run_count: 48, failure_count: 0 },
  { id: 'st4', agent_slug: 'rocco', task_name: 'Production Status Update', description: 'Checks factory updates and garment milestones', cron_expression: '0 15 * * 1-5', human_schedule: 'Weekdays at 10am EST', is_active: true, last_run_at: daysAgo(0), last_run_status: 'success', last_run_duration_ms: 3200, last_error: null, next_run_at: new Date(Date.now() + 86400000).toISOString(), run_count: 230, failure_count: 5 },
  { id: 'st5', agent_slug: 'maestro', task_name: 'Generate Daily Brief', description: 'Generates Il Giornale morning brief', cron_expression: '30 11 * * 1-6', human_schedule: 'Weekdays at 6:30am EST', is_active: true, last_run_at: daysAgo(0), last_run_status: 'success', last_run_duration_ms: 8900, last_error: null, next_run_at: new Date(Date.now() + 86400000).toISOString(), run_count: 140, failure_count: 1 },
  { id: 'st6', agent_slug: 'giovanna', task_name: 'Content Performance Sync', description: 'Pulls social media engagement metrics', cron_expression: '0 17 * * *', human_schedule: 'Daily at 12pm EST', is_active: true, last_run_at: daysAgo(0), last_run_status: 'success', last_run_duration_ms: 5600, last_error: null, next_run_at: new Date(Date.now() + 86400000).toISOString(), run_count: 180, failure_count: 8 },
  { id: 'st7', agent_slug: 'marco', task_name: 'Lead Score Refresh', description: 'Recalculates lead scores', cron_expression: '0 13 * * 1-5', human_schedule: 'Weekdays at 8am EST', is_active: true, last_run_at: daysAgo(0), last_run_status: 'success', last_run_duration_ms: 6700, last_error: null, next_run_at: new Date(Date.now() + 86400000).toISOString(), run_count: 210, failure_count: 3 },
  { id: 'st8', agent_slug: 'simone', task_name: 'Data Integrity Scan', description: 'Scans for data quality issues', cron_expression: '0 5 * * 0', human_schedule: 'Sundays at midnight EST', is_active: true, last_run_at: daysAgo(5), last_run_status: 'success', last_run_duration_ms: 12000, last_error: null, next_run_at: new Date(Date.now() + 2 * 86400000).toISOString(), run_count: 48, failure_count: 0 },
  { id: 'st9', agent_slug: 'lapenna', task_name: 'Compliance Calendar Check', description: 'Checks filing deadlines', cron_expression: '0 14 * * 1', human_schedule: 'Mondays at 9am EST', is_active: true, last_run_at: daysAgo(3), last_run_status: 'success', last_run_duration_ms: 2100, last_error: null, next_run_at: new Date(Date.now() + 4 * 86400000).toISOString(), run_count: 45, failure_count: 0 },
  { id: 'st10', agent_slug: 'giada', task_name: 'Social Content Queue', description: 'Generates weekly content drafts', cron_expression: '0 14 * * 0', human_schedule: 'Sundays at 9am EST', is_active: true, last_run_at: daysAgo(5), last_run_status: 'success', last_run_duration_ms: 15000, last_error: null, next_run_at: new Date(Date.now() + 2 * 86400000).toISOString(), run_count: 24, failure_count: 1 },
  { id: 'st11', agent_slug: 'melana', task_name: 'Fabric Inventory Alert', description: 'Checks stock levels against thresholds', cron_expression: '0 22 * * 5', human_schedule: 'Fridays at 5pm EST', is_active: true, last_run_at: daysAgo(4), last_run_status: 'warning', last_run_duration_ms: 2800, last_error: null, next_run_at: new Date(Date.now() + 3 * 86400000).toISOString(), run_count: 48, failure_count: 0 },
];

const SEED_COSTS: CostEntry[] = Array.from({ length: 30 }, (_, i) => ({
  id: `cost-${i}`, agent_slug: SEED_AGENTS[i % SEED_AGENTS.length].slug,
  model: i % 3 === 0 ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-5-20250929',
  input_tokens: 1000 + Math.floor(Math.random() * 5000),
  output_tokens: 500 + Math.floor(Math.random() * 3000),
  total_tokens: 0, cost_usd: 0, request_type: 'chat',
  created_at: new Date(Date.now() - i * 3600000).toISOString(),
})).map((c) => ({ ...c, total_tokens: c.input_tokens + c.output_tokens, cost_usd: parseFloat(((c.input_tokens * 0.003 + c.output_tokens * 0.015) / 1000).toFixed(4)) }));

const SEED_VAULT: VaultDocument[] = [
  { id: 'v1', title: 'Measurement Taking Guide', category: 'sop', subcategory: 'measurements', content_text: '# Standard Measurement Guide\n\nAlways begin with the client standing naturally. Use the cloth tape measure, never metal.\n\n## Key Measurements\n1. Chest — over fullest part\n2. Waist — natural waist\n3. Hips — widest point\n4. Shoulder width — seam to seam\n5. Sleeve length — shoulder to wrist with arm slightly bent\n6. Back length — base of collar to waist\n7. Inseam — crotch to ankle bone\n\n## Notes\n- Always measure twice\n- Record in inches, convert to cm for factory\n- Note any asymmetries', file_type: 'markdown', tags: ['measurement', 'sop', 'training'], author: 'Calogero', source: 'manual', is_pinned: true, is_archived: false, access_count: 47, created_at: daysAgo(90), updated_at: daysAgo(5) },
  { id: 'v2', title: 'YongZheng Factory Pricing 2025', category: 'pricing', subcategory: 'manufacturing', content_text: '# YongZheng Factory Pricing\n\n## Suit Pricing Tiers\n- Standard: $380-420\n- Premium: $450-520\n- Luxury: $550-680\n\n## Turnaround\n- Standard: 6-8 weeks\n- Rush (2-week premium): +35%\n- Super Rush (1-week): +60%, availability limited', file_type: 'markdown', tags: ['factory', 'pricing', 'yz'], author: 'Calogero', source: 'manual', is_pinned: true, is_archived: false, access_count: 23, created_at: daysAgo(60), updated_at: daysAgo(15) },
  { id: 'v3', title: 'Holland & Sherry Vendor Agreement', category: 'vendor', subcategory: 'fabric', content_text: '# Holland & Sherry — Vendor Terms\n\nAccount #: HS-NYC-4521\nRep: James Whitfield\n\n## Terms\n- Net 30 payment\n- 5% discount on orders over 50 yards\n- Free swatching for new collections\n- Returns within 14 days for unmade fabric only', file_type: 'markdown', tags: ['vendor', 'fabric', 'h&s'], author: 'Calogero', source: 'email', is_pinned: false, is_archived: false, access_count: 12, created_at: daysAgo(120), updated_at: daysAgo(30) },
  { id: 'v4', title: 'Client Greeting Protocol', category: 'sop', subcategory: 'client-experience', content_text: '# Client Greeting Protocol\n\n1. Greet by name within 5 seconds of entry\n2. Offer espresso or water immediately\n3. Review their file before they arrive\n4. Never discuss pricing in the main showroom\n5. Walk them to the consultation room\n6. Begin with a genuine personal question — not business', file_type: 'markdown', tags: ['sop', 'client', 'consultation'], author: 'Calogero', source: 'manual', is_pinned: true, is_archived: false, access_count: 31, created_at: daysAgo(180), updated_at: daysAgo(10) },
  { id: 'v5', title: 'Commission Structure 2025', category: 'policy', subcategory: 'compensation', content_text: '# Sales Commission Tiers\n\n- Tier 1 ($0-50K/mo): 8%\n- Tier 2 ($50K-100K/mo): 10%\n- Tier 3 ($100K+/mo): 12%\n\nReferral bonus: $200 per new client order\nTrunk show bonus: 2% on all event orders', file_type: 'markdown', tags: ['commission', 'policy', 'sales'], author: 'Calogero', source: 'manual', is_pinned: false, is_archived: false, access_count: 8, created_at: daysAgo(45), updated_at: daysAgo(45) },
];

const SEED_TRUNK_SHOWS: TrunkShow[] = [
  { id: 'ts1', event_name: 'Greenwich Spring Preview', event_type: 'trunk_show', city: 'Greenwich', state: 'CT', venue_name: 'The Delamar Hotel', start_date: '2026-03-15', end_date: '2026-03-16', status: 'confirmed', budget: 8500, actual_spend: 3200, target_revenue: 45000, actual_revenue: 0, target_appointments: 25, actual_appointments: 0, target_orders: 12, actual_orders: 0, invitation_count: 85, rsvp_count: 18, notes: 'Focus on spring/summer fabrics. Bring the new Loro Piana linen collection.', team_members: ['Calogero', 'Sofia', 'Rocco'], created_at: daysAgo(30) },
  { id: 'ts2', event_name: 'DC Power Player Event', event_type: 'private_event', city: 'Washington', state: 'DC', venue_name: 'The Hay-Adams', start_date: '2026-04-10', end_date: '2026-04-11', status: 'planning', budget: 12000, actual_spend: 0, target_revenue: 65000, actual_revenue: 0, target_appointments: 30, actual_appointments: 0, target_orders: 15, actual_orders: 0, invitation_count: 0, rsvp_count: 0, notes: 'Corporate/political clientele. Conservative luxury positioning.', team_members: ['Calogero', 'Marco'], created_at: daysAgo(14) },
  { id: 'ts3', event_name: 'Palm Beach Winter Season', event_type: 'trunk_show', city: 'Palm Beach', state: 'FL', venue_name: 'The Breakers', start_date: '2026-01-18', end_date: '2026-01-20', status: 'completed', budget: 15000, actual_spend: 13200, target_revenue: 80000, actual_revenue: 92500, target_appointments: 40, actual_appointments: 38, target_orders: 18, actual_orders: 22, invitation_count: 120, rsvp_count: 45, notes: 'Best trunk show of the season. 22 orders, exceeded target by 22%.', team_members: ['Calogero', 'Sofia', 'Marco', 'Rocco'], created_at: daysAgo(90) },
];

const SEED_INVITATIONS: TrunkShowInvitation[] = [
  { id: 'inv1', trunk_show_id: 'ts1', invited_name: 'Jonathan Park', invited_email: 'jpark@email.com', status: 'rsvp_yes', appointment_time: '2026-03-15T14:00:00', order_value: null, created_at: daysAgo(10) },
  { id: 'inv2', trunk_show_id: 'ts1', invited_name: 'Michael Chen', invited_email: 'mchen@email.com', status: 'sent', appointment_time: null, order_value: null, created_at: daysAgo(10) },
  { id: 'inv3', trunk_show_id: 'ts1', invited_name: 'Dr. Anthony Patel', invited_email: 'apatel@email.com', status: 'rsvp_yes', appointment_time: '2026-03-15T16:00:00', order_value: null, created_at: daysAgo(10) },
  { id: 'inv4', trunk_show_id: 'ts3', invited_name: 'Robert Castellano', invited_email: 'rcast@email.com', status: 'attended', appointment_time: '2026-01-18T10:00:00', order_value: 4800, created_at: daysAgo(60) },
  { id: 'inv5', trunk_show_id: 'ts3', invited_name: 'William Morrison', invited_email: 'wmorrison@email.com', status: 'attended', appointment_time: '2026-01-19T11:00:00', order_value: 6200, created_at: daysAgo(60) },
];

const SEED_COMMS: Communication[] = [
  { id: 'c1', customer_id: 'cust-1', customer_name: 'Jonathan Park', channel: 'email', direction: 'outbound', subject: 'Your Fitting Confirmation — Thursday 2pm', body: 'Dear Jonathan,\n\nThis is a reminder of your fitting appointment this Thursday at 2:00 PM. We\'ll be reviewing the progress on your navy pinstripe and grey flannel suits.\n\nPlease arrive 5 minutes early so we can have everything prepared.\n\nLooking forward to seeing you.\n\nWarm regards,\nL&S Custom Tailors', from_address: 'appointments@lstailors.com', to_address: 'jpark@email.com', agent_slug: 'sofia', is_read: true, created_at: daysAgo(1) },
  { id: 'c2', customer_id: 'cust-1', customer_name: 'Jonathan Park', channel: 'email', direction: 'inbound', subject: 'Re: Your Fitting Confirmation', body: 'Thank you! I\'ll be there. Quick question — can I bring a friend who might be interested in getting measured for a suit?', from_address: 'jpark@email.com', to_address: 'appointments@lstailors.com', agent_slug: null, is_read: true, created_at: daysAgo(1) },
  { id: 'c3', customer_id: 'cust-2', customer_name: 'Michael Chen', channel: 'sms', direction: 'outbound', subject: '', body: 'Happy birthday, Michael! 🎂 We hope you have a wonderful day. As a Diamond client, we\'d love to offer you a complimentary shirt with your next order. — L&S', from_address: 'lstailors', to_address: '+1-212-555-0142', agent_slug: 'sofia', is_read: true, created_at: daysAgo(0) },
  { id: 'c4', customer_id: 'cust-2', customer_name: 'Michael Chen', channel: 'sms', direction: 'inbound', subject: '', body: 'That\'s so thoughtful, thank you! I was actually thinking about ordering a new blazer. Can I come in next week?', from_address: '+1-212-555-0142', to_address: 'lstailors', agent_slug: null, is_read: false, created_at: daysAgo(0) },
  { id: 'c5', customer_id: 'cust-3', customer_name: 'Dr. Anthony Patel', channel: 'call', direction: 'inbound', subject: 'Inquiry about trunk show', body: 'Dr. Patel called asking about the Greenwich trunk show dates. Interested in bringing his wife for a consultation as well. Mentioned wanting to explore lighter weight fabrics for summer travel.', from_address: '+1-914-555-0198', to_address: 'store', agent_slug: null, is_read: true, created_at: daysAgo(2) },
  { id: 'c6', customer_id: 'cust-4', customer_name: 'Robert Castellano', channel: 'email', direction: 'outbound', subject: 'Your Anniversary Gift', body: 'Dear Robert and Angela,\n\nOn behalf of the entire L&S team, we want to wish you a very happy anniversary. Your loyalty and friendship mean the world to us.\n\nAs a token of our appreciation, we\'d like to offer you a complimentary monogramming upgrade on your next order.\n\nWarmest regards,\nCalogero', from_address: 'calogero@lstailors.com', to_address: 'rcastellano@email.com', agent_slug: 'sofia', is_read: true, created_at: daysAgo(5) },
];

const SEED_CLIENTS: ClientIntelRecord[] = [
  { id: 'ci1', name: 'Jonathan Park', email: 'jpark@email.com', city: 'New York', state: 'NY', vip_tier: 'Gold', total_orders: 8, lifetime_value: 28400, last_order_date: daysAgo(15), avg_order_value: 3550, trend: 12, birthday: '1978-06-15', anniversary: null },
  { id: 'ci2', name: 'Michael Chen', email: 'mchen@email.com', city: 'New York', state: 'NY', vip_tier: 'Diamond', total_orders: 12, lifetime_value: 52800, last_order_date: daysAgo(30), avg_order_value: 4400, trend: 8, birthday: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), anniversary: null },
  { id: 'ci3', name: 'Dr. Anthony Patel', email: 'apatel@email.com', city: 'Greenwich', state: 'CT', vip_tier: 'Gold', total_orders: 6, lifetime_value: 19200, last_order_date: daysAgo(45), avg_order_value: 3200, trend: 15, birthday: '1982-11-03', anniversary: null },
  { id: 'ci4', name: 'Robert Castellano', email: 'rcast@email.com', city: 'Scarsdale', state: 'NY', vip_tier: 'Diamond', total_orders: 15, lifetime_value: 67500, last_order_date: daysAgo(20), avg_order_value: 4500, trend: 5, birthday: '1965-03-22', anniversary: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) },
  { id: 'ci5', name: 'William Morrison', email: 'wmorrison@email.com', city: 'Palm Beach', state: 'FL', vip_tier: 'Diamond', total_orders: 22, lifetime_value: 98000, last_order_date: daysAgo(40), avg_order_value: 4454, trend: -3, birthday: '1958-09-10', anniversary: null },
  { id: 'ci6', name: 'James Whitfield III', email: 'jwiii@email.com', city: 'Washington', state: 'DC', vip_tier: 'Gold', total_orders: 5, lifetime_value: 18500, last_order_date: daysAgo(90), avg_order_value: 3700, trend: -8, birthday: '1972-01-28', anniversary: null },
  { id: 'ci7', name: 'Thomas Greenfield', email: 'tgreen@email.com', city: 'New York', state: 'NY', vip_tier: 'Silver', total_orders: 3, lifetime_value: 12450, last_order_date: daysAgo(10), avg_order_value: 4150, trend: 42, birthday: '1990-05-18', anniversary: '2026-06-15' },
  { id: 'ci8', name: 'David Torres', email: 'dtorres@email.com', city: 'Miami', state: 'FL', vip_tier: 'Silver', total_orders: 2, lifetime_value: 7200, last_order_date: daysAgo(120), avg_order_value: 3600, trend: 0, birthday: '1985-12-01', anniversary: null },
  { id: 'ci9', name: 'Richard Kim', email: 'rkim@email.com', city: 'Los Angeles', state: 'CA', vip_tier: 'Gold', total_orders: 7, lifetime_value: 31500, last_order_date: daysAgo(55), avg_order_value: 4500, trend: 6, birthday: '1975-08-22', anniversary: null },
  { id: 'ci10', name: 'Alexander Petrov', email: 'apetrov@email.com', city: 'New York', state: 'NY', vip_tier: 'Bronze', total_orders: 1, lifetime_value: 3200, last_order_date: daysAgo(180), avg_order_value: 3200, trend: 0, birthday: '1988-04-15', anniversary: null },
];
