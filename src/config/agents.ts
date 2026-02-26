import { getAvatarUrl } from '@/lib/avatarHelpers';

// ═══════════════════════════════════════════════════════════
// L&S Agent Roster — 11 agents
// Avatar URLs come from Supabase Storage "avatars" bucket.
// Fallback: the Avatar component shows initials using the accent color.
// ═══════════════════════════════════════════════════════════

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  accent: string;
  avatar: string | null;
}

export const agents: AgentConfig[] = [
  { id: 'maestro', name: 'Maestro', role: 'Orchestrator', accent: '#F0ECD4', avatar: getAvatarUrl('agent', 'maestro') },
  { id: 'simone', name: 'Simone', role: 'Data Pipeline', accent: '#60A5FA', avatar: getAvatarUrl('agent', 'simone') },
  { id: 'marco', name: 'Marco', role: 'Infrastructure Engineer', accent: '#38BDF8', avatar: getAvatarUrl('agent', 'marco') },
  { id: 'sofia', name: 'Sofia', role: 'Client Relations', accent: '#F472B6', avatar: getAvatarUrl('agent', 'sofia') },
  { id: 'mia', name: 'Mia', role: 'Scheduling & Meetings', accent: '#2DD4BF', avatar: getAvatarUrl('agent', 'mia') },
  { id: 'rocco', name: 'Rocco', role: 'Production Manager', accent: '#FB923C', avatar: getAvatarUrl('agent', 'rocco') },
  { id: 'melana', name: 'Melana', role: 'Finance & Accounting', accent: '#4ADE80', avatar: getAvatarUrl('agent', 'melana') },
  { id: 'giovanna', name: 'Giovanna', role: 'Legal & HR', accent: '#FBBF24', avatar: getAvatarUrl('agent', 'giovanna') },
  { id: 'giada', name: 'Giada', role: 'Marketing Engine', accent: '#A78BFA', avatar: getAvatarUrl('agent', 'giada') },
  { id: 'lapenna', name: 'La Penna', role: 'Content Creator', accent: '#E879F9', avatar: getAvatarUrl('agent', 'lapenna') },
  { id: 'filo', name: 'Filo', role: 'Analytics & Intelligence', accent: '#67E8F9', avatar: getAvatarUrl('agent', 'filo') },
];

/** Look up an L&S agent config by ID */
export function findAgent(id: string): AgentConfig | undefined {
  return agents.find((a) => a.id === id);
}
