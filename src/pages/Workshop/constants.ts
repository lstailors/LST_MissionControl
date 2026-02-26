// ═══════════════════════════════════════════════════════════
// Workshop Constants
// ═══════════════════════════════════════════════════════════

import type { TaskStatus, TaskPriority, AgentInfo } from './types';

export const COLUMN_CONFIG: {
  key: TaskStatus;
  label: string;
  colorVar: string;
  hex: string;
}[] = [
  { key: 'backlog',     label: 'Backlog',     colorVar: 'text-muted', hex: '#7A7568' },
  { key: 'queued',      label: 'Queued',       colorVar: 'accent',     hex: '#5B8EC4' },
  { key: 'in_progress', label: 'In Progress', colorVar: 'warning',    hex: '#B8955A' },
  { key: 'review',      label: 'Review',       colorVar: 'primary',    hex: '#8B6EC4' },
  { key: 'complete',    label: 'Complete',     colorVar: 'success',    hex: '#5BA67A' },
  { key: 'archived',    label: 'Archived',     colorVar: 'text-dim',   hex: '#7A7568' },
];

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; colorVar: string; hex: string }> = {
  critical: { label: 'Critical', colorVar: 'danger',  hex: '#8B2020' },
  high:     { label: 'High',     colorVar: 'warning', hex: '#D4A843' },
  medium:   { label: 'Medium',   colorVar: 'accent',  hex: '#B8955A' },
  low:      { label: 'Low',      colorVar: 'primary', hex: '#2D4A35' },
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  queued: 'Queued',
  in_progress: 'In Progress',
  review: 'Review',
  complete: 'Complete',
  archived: 'Archived',
};

export const AGENTS: AgentInfo[] = [
  { slug: 'sofia',    name: 'Sofia',    role: 'Client Relations',      emoji: '👩‍💼' },
  { slug: 'rocco',    name: 'Rocco',    role: 'Master Tailor',         emoji: '✂️' },
  { slug: 'giada',    name: 'Giada',    role: 'Style Consultant',      emoji: '👗' },
  { slug: 'mia',      name: 'Mia',      role: 'Scheduling',            emoji: '📅' },
  { slug: 'melana',   name: 'Melana',   role: 'Fabric Specialist',     emoji: '🧵' },
  { slug: 'simone',   name: 'Simone',   role: 'Data & Systems',        emoji: '💻' },
  { slug: 'marco',    name: 'Marco',    role: 'Operations',            emoji: '📋' },
  { slug: 'giovanna', name: 'Giovanna', role: 'Marketing & Design',    emoji: '🎨' },
  { slug: 'filo',     name: 'Filo',     role: 'Finance',               emoji: '💰' },
  { slug: 'maestro',  name: 'Maestro',  role: 'AI Orchestrator',       emoji: '🎯' },
];

export function getAgent(slug: string | null): AgentInfo | undefined {
  if (!slug) return undefined;
  return AGENTS.find((a) => a.slug === slug);
}

export function getAgentName(slug: string | null): string {
  const agent = getAgent(slug);
  return agent?.name ?? slug ?? 'Unassigned';
}

export function getAgentEmoji(slug: string | null): string {
  const agent = getAgent(slug);
  return agent?.emoji ?? '🤖';
}

export const TEMPLATE_CATEGORIES: Record<string, { label: string; colorVar: string }> = {
  client:     { label: 'Client',     colorVar: 'primary' },
  production: { label: 'Production', colorVar: 'warning' },
  marketing:  { label: 'Marketing',  colorVar: 'accent' },
  operations: { label: 'Operations', colorVar: 'success' },
  finance:    { label: 'Finance',    colorVar: 'danger' },
};
