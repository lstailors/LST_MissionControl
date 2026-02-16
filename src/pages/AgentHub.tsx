// ═══════════════════════════════════════════════════════════
// AgentHub v5 — Fully dynamic from Gateway API
// 1. Main Agent — hero card (from sessions)
// 2. Registered Agents — from agents.list API (dynamic)
// 3. Active Workers — isolated sessions (cron + sub-agents)
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RotateCcw, ChevronDown, Zap, AlertCircle, Bot, Search, Code2, Brain, Plus, Pencil, Trash2, Save } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { PageTransition } from '@/components/shared/PageTransition';
import { ProgressRing } from '@/components/shared/ProgressRing';
import { StatusDot } from '@/components/shared/StatusDot';
import { useChatStore } from '@/stores/chatStore';
import { gateway } from '@/services/gateway';
import clsx from 'clsx';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════
interface SessionInfo {
  key: string;
  label: string;
  type: 'main' | 'cron' | 'subagent';
  model: string;
  totalTokens: number;
  contextTokens: number;
  running: boolean;
  updatedAt: number;
  agentId: string;
}

interface AgentInfo {
  id: string;
  name?: string;
  configured: boolean;
}

// ── Smart worker classification by job name ──
interface WorkerMeta {
  icon: string;
  color: string;
  tag: string;
}

const WORKER_PATTERNS: { match: RegExp; meta: WorkerMeta }[] = [
  { match: /sync/i,                    meta: { icon: '🔄', color: '#64FFDA', tag: 'SYNC' } },
  { match: /embed/i,                   meta: { icon: '🧠', color: '#B388FF', tag: 'EMBED' } },
  { match: /maintenance|صيانة/i,       meta: { icon: '🧹', color: '#B388FF', tag: 'MAINTENANCE' } },
  { match: /backup|نسخ/i,             meta: { icon: '💾', color: '#69F0AE', tag: 'BACKUP' } },
  { match: /stats|إحصائ/i,            meta: { icon: '📊', color: '#40C4FF', tag: 'STATS' } },
  { match: /research|بحث|تقرير/i,     meta: { icon: '📰', color: '#FFD740', tag: 'RESEARCH' } },
  { match: /diary|يوميات|journal/i,   meta: { icon: '📔', color: '#FF80AB', tag: 'DIARY' } },
  { match: /monitor|متابعة|price|سعر/i, meta: { icon: '💰', color: '#FF6E40', tag: 'MONITOR' } },
];

const getWorkerMeta = (label: string, type: string): WorkerMeta => {
  for (const p of WORKER_PATTERNS) {
    if (p.match.test(label)) return p.meta;
  }
  if (type === 'subagent') return { icon: '⚡', color: '#FFEA00', tag: 'SUB-AGENT' };
  return { icon: '⏰', color: '#6C9FFF', tag: 'CRON' };
};

// ── Agent display config (auto-detected from agent id/name) ──
interface AgentDisplay {
  icon: React.ReactNode;
  color: string;
  description: string;
}

const AGENT_PATTERNS: { match: RegExp; display: AgentDisplay }[] = [
  { match: /research/i, display: { icon: <Search size={20} />, color: '#FFD740', description: 'Search & Analysis' } },
  { match: /cod(e|er|ing)/i, display: { icon: <Code2 size={20} />, color: '#69F0AE', description: 'Code & Development' } },
  { match: /brain|memory|knowledge/i, display: { icon: <Brain size={20} />, color: '#B388FF', description: 'Knowledge & Memory' } },
];

const getAgentDisplay = (agent: AgentInfo): AgentDisplay => {
  const searchStr = `${agent.id} ${agent.name || ''}`;
  for (const p of AGENT_PATTERNS) {
    if (p.match.test(searchStr)) return p.display;
  }
  return { icon: <Bot size={20} />, color: '#6C9FFF', description: 'General Agent' };
};

// ── Helpers ──
const MAIN_COLOR = '#4EC9B0';

const formatTokens = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);

const timeAgo = (ts?: number) => {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

const getSessionType = (key: string): 'main' | 'cron' | 'subagent' => {
  if (key.includes(':cron:')) return 'cron';
  if (key.includes(':subagent:')) return 'subagent';
  return 'main';
};

function parseSessions(raw: any[]): SessionInfo[] {
  return raw.map((s) => {
    const key = s.key || '';
    const type = getSessionType(key);
    const parts = key.split(':');
    const agentId = parts[1] || 'main';

    let label = s.label || '';
    if (!label) {
      if (type === 'main') label = 'Main Session';
      else if (type === 'cron') label = `Cron: ${parts[3]?.substring(0, 8) || '?'}`;
      else label = key;
    }

    return {
      key, label, type,
      model: s.model || '',
      totalTokens: s.totalTokens || 0,
      contextTokens: s.contextTokens || 200000,
      running: !!s.running,
      updatedAt: s.updatedAt || 0,
      agentId,
    };
  }).sort((a, b) => {
    if (a.running && !b.running) return -1;
    if (!a.running && b.running) return 1;
    return b.updatedAt - a.updatedAt;
  });
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════
export function AgentHubPage() {
  const { t } = useTranslation();
  const { connected } = useChatStore();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);
  const [workerLogs, setWorkerLogs] = useState<Record<string, any[]>>({});
  const [loadingLog, setLoadingLog] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [newAgent, setNewAgent] = useState({ id: '', name: '', model: '', workspace: '' });
  const [editPatch, setEditPatch] = useState<{ model?: string; workspace?: string }>({});

  // ── Load data ──
  const loadData = useCallback(async () => {
    if (!connected) { setLoading(false); return; }
    try {
      const [sessResult, agentResult] = await Promise.all([
        gateway.getSessions(),
        gateway.getAgents(),
      ]);
      const raw = Array.isArray(sessResult?.sessions) ? sessResult.sessions : [];
      setSessions(parseSessions(raw));

      const agentList = Array.isArray(agentResult?.agents) ? agentResult.agents : [];
      setAgents(agentList);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [connected]);

  const handleCreateAgent = async () => {
    if (!newAgent.id.trim()) return;
    try {
      await gateway.createAgent(newAgent);
      setShowAddForm(false);
      setNewAgent({ id: '', name: '', model: '', workspace: '' });
      await loadData();
    } catch (err: any) {
      console.error('[AgentHub] Create failed:', err);
      alert(`Failed to create agent: ${err?.message || err}`);
    }
  };

  const handleUpdateAgent = async (agentId: string) => {
    try {
      await gateway.updateAgent(agentId, editPatch);
      setEditingAgentId(null);
      setEditPatch({});
      await loadData();
    } catch (err: any) {
      console.error('[AgentHub] Update failed:', err);
      alert(`Failed to update agent: ${err?.message || err}`);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (deletingAgentId === agentId) {
      try {
        await gateway.deleteAgent(agentId);
        setDeletingAgentId(null);
        await loadData();
      } catch (err: any) {
        console.error('[AgentHub] Delete failed:', err);
        alert(`Failed to delete agent: ${err?.message || err}`);
        setDeletingAgentId(null);
      }
    } else {
      setDeletingAgentId(agentId);
      // Auto-clear confirm after 3 seconds
      setTimeout(() => setDeletingAgentId(prev => prev === agentId ? null : prev), 3000);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ── Derived data ──
  const mainSession = sessions.find(s => s.agentId === 'main' && s.type === 'main');
  const workers = sessions.filter(s => s !== mainSession && (s.type === 'cron' || s.type === 'subagent'));
  // Filter out 'main' from registered agents — it's shown in the hero
  const registeredAgents = agents.filter(a => a.id !== 'main');

  // Find sessions belonging to registered agents
  const getAgentSessions = (agentId: string) =>
    sessions.filter(s => s.agentId === agentId && s.type !== 'main');

  // ── Expand worker → load history ──
  const handleWorkerClick = async (sessionKey: string) => {
    if (expandedWorker === sessionKey) {
      setExpandedWorker(null);
      return;
    }
    setExpandedWorker(sessionKey);

    if (!workerLogs[sessionKey]) {
      setLoadingLog(sessionKey);
      try {
        const result = await gateway.getHistory(sessionKey, 10);
        const msgs = (result?.messages || [])
          .filter((m: any) => m.role === 'assistant' || m.role === 'user')
          .slice(-6)
          .map((m: any) => ({
            role: m.role,
            content: typeof m.content === 'string'
              ? m.content
              : Array.isArray(m.content)
                ? m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ')
                : JSON.stringify(m.content),
          }));
        setWorkerLogs((prev) => ({ ...prev, [sessionKey]: msgs }));
      } catch { /* silent */ }
      finally { setLoadingLog(null); }
    }
  };

  // ═══════════════════════════════════════════════════════════
  // Render helpers
  // ═══════════════════════════════════════════════════════════

  const renderWorkerCard = (w: SessionInfo, i: number) => {
    const meta = getWorkerMeta(w.label, w.type);
    const color = meta.color;
    const isExpanded = expandedWorker === w.key;
    const usagePct = Math.round((w.totalTokens / w.contextTokens) * 100);
    const logs = workerLogs[w.key] || [];
    const taskMsg = logs.find(l => l.role === 'user');
    const lastResponse = [...logs].reverse().find(l => l.role === 'assistant');

    return (
      <div key={w.key}>
        <GlassCard
          delay={i * 0.02}
          hover
          onClick={() => handleWorkerClick(w.key)}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <StatusDot
              status={w.running ? 'active' : w.totalTokens > 0 ? 'idle' : 'sleeping'}
              size={10}
              glow={w.running}
              beacon={w.running}
            />
            <div
              className="w-[34px] h-[34px] rounded-lg flex items-center justify-center shrink-0 border text-[16px]"
              style={{
                background: `linear-gradient(135deg, ${color}15, ${color}05)`,
                borderColor: `${color}20`,
              }}
            >
              {meta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="px-1.5 py-[1px] rounded text-[8px] font-bold uppercase tracking-wider border"
                  style={{ background: `${color}15`, color, borderColor: `${color}30` }}
                >
                  {meta.tag}
                </span>
                <span className="text-[12px] font-semibold text-aegis-text truncate">
                  {w.label}
                </span>
              </div>
              <div className="text-[10px] text-white/20 mt-0.5 font-mono truncate">
                {w.model.split('/').pop() || '—'}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <ProgressRing percentage={usagePct} size={28} strokeWidth={2} color={color} />
              <div className="text-end">
                <div className="text-[12px] font-semibold text-aegis-text">
                  {formatTokens(w.totalTokens)}
                </div>
                <div className="text-[9px] text-white/20">
                  / {formatTokens(w.contextTokens)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-white/20 w-[55px] text-end">
                {timeAgo(w.updatedAt)}
              </span>
              <ChevronDown
                size={14}
                className={clsx(
                  'text-white/20 transition-transform duration-300',
                  isExpanded && 'rotate-180'
                )}
              />
            </div>
          </div>
        </GlassCard>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mx-2 mt-1 mb-2 rounded-xl border p-4 bg-white/[0.02] border-white/[0.06]">
                {loadingLog === w.key ? (
                  <div className="flex items-center gap-2 py-3 text-[11px] text-white/25">
                    <Loader2 size={12} className="animate-spin" /> Loading...
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-[11px] text-white/20 py-2">
                    {t('agents.noActivity', 'No activity recorded yet')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {taskMsg && (
                      <div>
                        <div className="text-[9px] text-white/30 uppercase tracking-wider font-semibold mb-1">
                          {t('agents.task', 'Task')}
                        </div>
                        <div className="text-[11px] text-aegis-text/70 leading-relaxed bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.05]">
                          {taskMsg.content.length > 500
                            ? taskMsg.content.substring(0, 500) + '…'
                            : taskMsg.content}
                        </div>
                      </div>
                    )}
                    {lastResponse && (
                      <div>
                        <div className="text-[9px] text-white/30 uppercase tracking-wider font-semibold mb-1">
                          {w.running
                            ? t('agents.doing', 'Currently doing')
                            : t('agents.result', 'Result')}
                        </div>
                        <div className="text-[11px] text-aegis-text/60 leading-relaxed bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.05]">
                          {lastResponse.content.length > 600
                            ? lastResponse.content.substring(0, 600) + '…'
                            : lastResponse.content}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-white/25 pt-1 border-t border-white/[0.05]">
                      <span className={clsx(
                        'flex items-center gap-1',
                        w.running ? 'text-aegis-primary' : 'text-white/25'
                      )}>
                        {w.running ? (
                          <><Loader2 size={10} className="animate-spin" /> Running</>
                        ) : (
                          <><AlertCircle size={10} /> Completed</>
                        )}
                      </span>
                      <span>·</span>
                      <span>{formatTokens(w.totalTokens)} tokens</span>
                      <span>·</span>
                      <span>{w.model.split('/').pop()}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <PageTransition className="p-6 space-y-8 max-w-[1200px] mx-auto">

      {/* ══ Header ══ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold text-aegis-text tracking-tight">
            {t('agents.title', 'Agent Hub')}
          </h1>
          <p className="text-[13px] text-aegis-text-dim mt-1">
            {t('agents.subtitle', 'Agents and active workers')}
            <span className="text-white/20 ms-2">
              — {registeredAgents.length} {t('agents.agentsCount', 'agents')} · {workers.length} {t('agents.total', 'workers')}
            </span>
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); loadData(); }}
          className="p-2 rounded-xl hover:bg-white/[0.05] text-aegis-text-dim transition-colors"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-aegis-primary" />
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════ */}
          {/* Section 1: Main Agent — Hero Card                */}
          {/* ══════════════════════════════════════════════════ */}
          <div>
            <div className="text-[11px] text-white/25 uppercase tracking-wider font-semibold mb-3">
              {t('agents.mainAgent', 'Main Agent')}
            </div>

            {mainSession ? (
              <GlassCard delay={0} hover shimmer={mainSession.running}>
                <div className="flex items-center gap-5">
                  <div
                    className="w-[64px] h-[64px] rounded-2xl flex items-center justify-center shrink-0 text-[26px] font-extrabold border-2 relative"
                    style={{
                      background: `linear-gradient(135deg, ${MAIN_COLOR}25, ${MAIN_COLOR}08)`,
                      borderColor: `${MAIN_COLOR}35`,
                      color: MAIN_COLOR,
                    }}
                  >
                    🛡️
                    <div className="absolute -bottom-[3px] -right-[3px]">
                      <StatusDot status="active" size={14} glow beacon={mainSession.running} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[18px] font-extrabold text-aegis-text">
                      {agents.find(a => a.id === 'main')?.name || 'Main Agent'}
                    </div>
                    <div className="text-[11px] text-white/30 font-mono mt-0.5">
                      {mainSession.model.split('/').pop() || '—'}
                    </div>
                    <div className="text-[10px] text-white/20 mt-1">
                      {t('agents.lastActive', 'Last active')}: {timeAgo(mainSession.updatedAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <ProgressRing
                      percentage={Math.round((mainSession.totalTokens / mainSession.contextTokens) * 100)}
                      size={48}
                      strokeWidth={3}
                      color={MAIN_COLOR}
                    />
                    <div className="text-end">
                      <div className="text-[18px] font-bold text-aegis-text">
                        {formatTokens(mainSession.totalTokens)}
                      </div>
                      <div className="text-[10px] text-white/20">
                        / {formatTokens(mainSession.contextTokens)} tokens
                      </div>
                    </div>
                  </div>

                  <div className={clsx(
                    'px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shrink-0',
                    'bg-[rgba(78,201,176,0.1)] text-[#4EC9B0] border-[rgba(78,201,176,0.25)]'
                  )}>
                    {mainSession.running ? 'ACTIVE' : 'ONLINE'}
                  </div>
                </div>
              </GlassCard>
            ) : (
              <GlassCard delay={0}>
                <div className="flex items-center gap-5">
                  <div
                    className="w-[64px] h-[64px] rounded-2xl flex items-center justify-center shrink-0 text-[26px] font-extrabold border-2 relative"
                    style={{
                      background: `linear-gradient(135deg, ${MAIN_COLOR}10, ${MAIN_COLOR}04)`,
                      borderColor: `${MAIN_COLOR}15`,
                      color: `${MAIN_COLOR}50`,
                    }}
                  >
                    🛡️
                    <div className="absolute -bottom-[3px] -right-[3px]">
                      <StatusDot status="sleeping" size={14} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[18px] font-extrabold text-white/30">
                      {agents.find(a => a.id === 'main')?.name || 'Main Agent'}
                    </div>
                    <div className="text-[11px] text-white/15 mt-0.5">{t('agents.notConnected', 'Not connected')}</div>
                  </div>
                  <div className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border bg-white/[0.04] text-white/25 border-white/[0.08]">
                    OFFLINE
                  </div>
                </div>
              </GlassCard>
            )}
          </div>

          {/* ══════════════════════════════════════════════════ */}
          {/* Section 2: Registered Agents (dynamic from API)  */}
          {/* ══════════════════════════════════════════════════ */}
          {registeredAgents.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] text-white/25 uppercase tracking-wider font-semibold">
                  {t('agents.registeredAgents', 'Registered Agents')}
                  <span className="text-white/15 ms-2">— {registeredAgents.length}</span>
                </div>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-aegis-primary/10 border border-aegis-primary/25 text-aegis-primary text-[10px] font-semibold hover:bg-aegis-primary/20 transition-colors"
                >
                  <Plus size={12} /> Add
                </button>
              </div>

              <AnimatePresence>
                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden mb-3"
                  >
                    <GlassCard>
                      <div className="space-y-3">
                        <div className="text-[12px] font-semibold text-aegis-text">Add New Agent</div>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            placeholder="Agent ID *"
                            value={newAgent.id}
                            onChange={e => setNewAgent(p => ({ ...p, id: e.target.value }))}
                            className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-aegis-text placeholder-white/20 focus:border-aegis-primary/50 focus:outline-none"
                          />
                          <input
                            placeholder="Name"
                            value={newAgent.name}
                            onChange={e => setNewAgent(p => ({ ...p, name: e.target.value }))}
                            className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-aegis-text placeholder-white/20 focus:border-aegis-primary/50 focus:outline-none"
                          />
                          <input
                            placeholder="Model (e.g. google/gemini-2.5-pro)"
                            value={newAgent.model}
                            onChange={e => setNewAgent(p => ({ ...p, model: e.target.value }))}
                            className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-aegis-text placeholder-white/20 focus:border-aegis-primary/50 focus:outline-none"
                          />
                          <input
                            placeholder="Workspace path"
                            value={newAgent.workspace}
                            onChange={e => setNewAgent(p => ({ ...p, workspace: e.target.value }))}
                            className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-aegis-text placeholder-white/20 focus:border-aegis-primary/50 focus:outline-none"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setShowAddForm(false); setNewAgent({ id: '', name: '', model: '', workspace: '' }); }}
                            className="px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white/40 text-sm hover:text-white/60 transition-colors"
                          >Cancel</button>
                          <button
                            onClick={handleCreateAgent}
                            disabled={!newAgent.id.trim()}
                            className="px-4 py-2 rounded-lg bg-aegis-primary/20 border border-aegis-primary/30 text-aegis-primary text-sm font-semibold hover:bg-aegis-primary/30 transition-colors disabled:opacity-30"
                          >Create Agent</button>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {registeredAgents.map((agent, i) => {
                  const display = getAgentDisplay(agent);
                  const agentSessions = getAgentSessions(agent.id);
                  const activeSessions = agentSessions.filter(s => s.running);
                  const totalTokens = agentSessions.reduce((sum, s) => sum + s.totalTokens, 0);
                  const lastActive = agentSessions.length > 0
                    ? Math.max(...agentSessions.map(s => s.updatedAt))
                    : 0;

                  return (
                    <div key={agent.id}>
                    <GlassCard delay={i * 0.05} hover>
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div
                          className="w-[48px] h-[48px] rounded-xl flex items-center justify-center shrink-0 border relative"
                          style={{
                            background: `linear-gradient(135deg, ${display.color}20, ${display.color}05)`,
                            borderColor: `${display.color}25`,
                            color: display.color,
                          }}
                        >
                          {display.icon}
                          {activeSessions.length > 0 && (
                            <div className="absolute -bottom-[2px] -right-[2px]">
                              <StatusDot status="active" size={10} glow beacon />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-bold text-aegis-text">
                            {agent.name || agent.id}
                          </div>
                          <div className="text-[10px] text-white/25 mt-0.5">
                            {display.description}
                          </div>

                          {/* Stats row */}
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
                            {activeSessions.length > 0 ? (
                              <span className="flex items-center gap-1 text-aegis-primary">
                                <Loader2 size={9} className="animate-spin" />
                                {activeSessions.length} {t('agents.running', 'running')}
                              </span>
                            ) : (
                              <span className="text-white/20">
                                {t('agents.idle', 'Idle')}
                              </span>
                            )}
                            {totalTokens > 0 && (
                              <>
                                <span className="text-white/10">·</span>
                                <span>{formatTokens(totalTokens)} tokens</span>
                              </>
                            )}
                            {lastActive > 0 && (
                              <>
                                <span className="text-white/10">·</span>
                                <span>{timeAgo(lastActive)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Status badge */}
                        <div
                          className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border shrink-0"
                          style={{
                            background: agent.configured ? `${display.color}10` : 'rgba(255,255,255,0.03)',
                            color: agent.configured ? display.color : 'rgba(255,255,255,0.2)',
                            borderColor: agent.configured ? `${display.color}20` : 'rgba(255,255,255,0.06)',
                          }}
                        >
                          {agent.configured ? t('agents.ready', 'READY') : t('agents.unconfigured', 'SETUP')}
                        </div>

                        {/* Edit & Delete buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); const opening = editingAgentId !== agent.id; setEditingAgentId(opening ? agent.id : null); setEditPatch(opening ? { model: agent.model || '', workspace: agent.workspace || '' } : {}); }}
                            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-aegis-primary hover:border-aegis-primary/30 transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteAgent(agent.id); }}
                            className={clsx(
                              'p-1.5 rounded-lg transition-colors',
                              deletingAgentId === agent.id ? 'text-red-400 bg-red-500/10 border border-red-400/30' : 'text-white/40 hover:text-red-400 bg-white/[0.04] border border-white/[0.08] hover:border-red-400/30'
                            )}
                          >
                            {deletingAgentId === agent.id ? <span className="text-[10px] font-bold">Confirm?</span> : <Trash2 size={13} />}
                          </button>
                        </div>
                      </div>
                    </GlassCard>

                    <AnimatePresence>
                      {editingAgentId === agent.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-1 p-3 rounded-xl border bg-white/[0.02] border-white/[0.06] space-y-2">
                            <input
                              placeholder="Model"
                              key={`model-${agent.id}-${editingAgentId}`}
                              defaultValue={agent.model || ''}
                              onChange={e => setEditPatch(p => ({ ...p, model: e.target.value }))}
                              className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-aegis-text placeholder-white/20 focus:border-aegis-primary/50 focus:outline-none"
                            />
                            <input
                              placeholder="Workspace"
                              key={`ws-${agent.id}-${editingAgentId}`}
                              defaultValue={agent.workspace || ''}
                              onChange={e => setEditPatch(p => ({ ...p, workspace: e.target.value }))}
                              className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-aegis-text placeholder-white/20 focus:border-aegis-primary/50 focus:outline-none"
                            />
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setEditingAgentId(null)} className="px-3 py-1 rounded-lg text-[10px] text-white/30 hover:text-white/50">Cancel</button>
                              <button onClick={() => handleUpdateAgent(agent.id)} className="px-3 py-1 rounded-lg bg-aegis-primary/20 border border-aegis-primary/30 text-aegis-primary text-[10px] font-semibold">
                                <Save size={10} className="inline me-1" />Save
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* Section 3: Active Workers                        */}
          {/* ══════════════════════════════════════════════════ */}
          <div>
            <div className="text-[11px] text-white/25 uppercase tracking-wider font-semibold mb-3">
              {t('agents.workers', 'Active Workers')}
              <span className="text-white/15 ms-2">
                — {workers.filter(w => w.running).length} {t('agents.running', 'running')} · {workers.length} {t('agents.total', 'total')}
              </span>
            </div>

            {workers.length === 0 ? (
              <GlassCard>
                <div className="text-center py-8 text-white/25">
                  <Zap size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-[13px] font-semibold text-aegis-text/40">
                    {t('agents.noWorkers', 'No active workers')}
                  </p>
                  <p className="text-[11px] text-white/20 mt-1">
                    {t('agents.noWorkersHint', 'Cron jobs and sub-agents will appear here when running')}
                  </p>
                </div>
              </GlassCard>
            ) : (
              <div className="space-y-2">
                {workers.map((w, i) => renderWorkerCard(w, i))}
              </div>
            )}
          </div>
        </>
      )}
    </PageTransition>
  );
}
