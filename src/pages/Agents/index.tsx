// ═══════════════════════════════════════════════════════════
// Agents Page — Maestro AI Operations
// Model Assignment & Status for all 11 sub-agents
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { PageTransition } from '@/components/shared/PageTransition';
import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface AiModel {
  id: string;
  provider: string;
  model_id: string;
  display_name: string;
  context_window: number;
  cost_per_1k_input: number;
  cost_per_1k_output: number;
  capabilities: Record<string, any>;
  tier: 'flagship' | 'standard' | 'fast' | 'economy';
  is_active: boolean;
  created_at: string;
}

interface MaestroAgent {
  id: string;
  slug: string;
  name: string;
  full_name: string;
  role: string;
  department: string;
  description: string;
  avatar_path: string | null;
  default_model_id: string | null;
  active_model_id: string | null;
  system_prompt: string | null;
  temperature: number;
  max_tokens: number | null;
  status: 'active' | 'idle' | 'offline' | 'error';
  priority: number;
  capabilities: Record<string, any>;
  created_at: string;
  updated_at: string;
  active_model?: AiModel | null;
}

// ═══════════════════════════════════════════════════════════
// Provider Config
// ═══════════════════════════════════════════════════════════

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: '#F0ECD4',
  openai: '#10A37F',
  google: '#4285F4',
  mistral: '#FF7000',
  meta: '#0668E1',
};

const PROVIDER_ICONS: Record<string, string> = {
  anthropic: 'A',
  openai: 'O',
  google: 'G',
  mistral: 'M',
  meta: 'L',
};

const TIER_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  flagship: { bg: 'rgba(240,236,212,0.12)', border: 'rgba(240,236,212,0.25)', text: '#F0ECD4' },
  standard: { bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)', text: '#60A5FA' },
  fast:     { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.25)', text: '#4ADE80' },
  economy:  { bg: 'rgba(240,236,212,0.06)', border: 'rgba(240,236,212,0.10)', text: 'rgba(240,236,212,0.45)' },
};

// ═══════════════════════════════════════════════════════════
// Status Light Component
// ═══════════════════════════════════════════════════════════

function StatusLight({ status }: { status: MaestroAgent['status'] }) {
  if (status === 'active') {
    return (
      <div className="flex items-center gap-1.5">
        <div className="relative flex items-center justify-center" style={{ width: 10, height: 10 }}>
          {/* Glow halo */}
          <div className="absolute inset-0 rounded-full agent-status-active-halo" />
          {/* Outer ring pulse */}
          <div className="absolute inset-[-2px] rounded-full agent-status-active-ring" />
          {/* Core dot */}
          <div
            className="relative w-[8px] h-[8px] rounded-full"
            style={{
              backgroundColor: '#4ADE80',
              boxShadow: '0 0 8px #4ADE8088, 0 0 16px #4ADE8044',
            }}
          />
        </div>
        <span
          className="font-mono tracking-wider"
          style={{ fontSize: 9, color: '#4ADE80' }}
        >
          ACTIVE
        </span>
      </div>
    );
  }

  if (status === 'idle') {
    return (
      <div className="flex items-center gap-1.5">
        <div className="relative flex items-center justify-center" style={{ width: 10, height: 10 }}>
          {/* Slower pulse ring */}
          <div className="absolute inset-[-1px] rounded-full agent-status-idle-ring" />
          {/* Core dot */}
          <div
            className="relative w-[8px] h-[8px] rounded-full"
            style={{
              backgroundColor: '#FBBF24',
              boxShadow: '0 0 6px #FBBF2466',
            }}
          />
        </div>
        <span
          className="font-mono tracking-wider"
          style={{ fontSize: 9, color: '#FBBF24' }}
        >
          IDLE
        </span>
      </div>
    );
  }

  // offline / error
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-[8px] h-[8px] rounded-full"
        style={{ backgroundColor: 'rgba(240,236,212,0.35)' }}
      />
      <span
        className="font-mono tracking-wider"
        style={{ fontSize: 9, color: 'rgba(240,236,212,0.35)' }}
      >
        OFFLINE
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tier Badge Component
// ═══════════════════════════════════════════════════════════

function TierBadge({ tier }: { tier: string }) {
  const style = TIER_STYLES[tier] || TIER_STYLES.economy;
  return (
    <span
      className="font-mono tracking-wider px-1.5 py-0.5 rounded"
      style={{
        fontSize: 8,
        fontWeight: 700,
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        color: style.text,
      }}
    >
      {tier.toUpperCase()}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════
// Model Selector Dropdown
// ═══════════════════════════════════════════════════════════

function ModelSelector({
  agent,
  models,
  onSelect,
}: {
  agent: MaestroAgent;
  models: AiModel[];
  onSelect: (agentId: string, modelId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currentModel = agent.active_model;
  const providerColor = currentModel ? (PROVIDER_COLORS[currentModel.provider] || '#F0ECD4') : 'rgba(240,236,212,0.35)';

  // Group models by provider
  const grouped = useMemo(() => {
    const map = new Map<string, AiModel[]>();
    for (const m of models) {
      const existing = map.get(m.provider) || [];
      existing.push(m);
      map.set(m.provider, existing);
    }
    return map;
  }, [models]);

  const fmtContext = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`;

  return (
    <div ref={ref} className="relative mt-3">
      {/* Collapsed button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200"
        style={{
          background: 'rgba(38,59,40,0.25)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(240,236,212,0.08)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(240,236,212,0.15)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(240,236,212,0.08)';
        }}
      >
        {/* Provider icon */}
        <div
          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: currentModel ? `${providerColor}15` : 'rgba(240,236,212,0.06)',
            color: providerColor,
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "'Playfair Display', serif",
          }}
        >
          {currentModel ? (PROVIDER_ICONS[currentModel.provider] || '?') : '?'}
        </div>

        {/* Model name */}
        <div className="flex-1 text-left min-w-0">
          <div
            className="truncate"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 12,
              color: '#F0ECD4',
              fontWeight: 500,
            }}
          >
            {currentModel?.display_name || 'No model assigned'}
          </div>
          {currentModel && (
            <div
              className="flex items-center gap-2 mt-0.5"
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'rgba(240,236,212,0.45)' }}
            >
              <span>{fmtContext(currentModel.context_window)}ctx</span>
              <span>${currentModel.cost_per_1k_input}/1Ki</span>
            </div>
          )}
        </div>

        {/* Tier badge */}
        {currentModel && <TierBadge tier={currentModel.tier} />}

        {/* Chevron */}
        <ChevronDown
          size={14}
          className="flex-shrink-0 transition-transform duration-200"
          style={{
            color: 'rgba(240,236,212,0.45)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden z-50"
            style={{
              background: 'rgba(15,26,17,0.95)',
              backdropFilter: 'blur(40px)',
              border: '1px solid rgba(240,236,212,0.10)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              maxHeight: 320,
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div
              className="px-3 pt-3 pb-2"
              style={{
                fontFamily: "'Playfair Display SC', serif",
                fontSize: 9,
                letterSpacing: '0.15em',
                color: 'rgba(240,236,212,0.45)',
              }}
            >
              SELECT AI MODEL
            </div>

            {/* Models grouped by provider */}
            {[...grouped.entries()].map(([provider, providerModels]) => (
              <div key={provider}>
                {/* Provider label */}
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center"
                    style={{
                      backgroundColor: `${PROVIDER_COLORS[provider] || '#F0ECD4'}15`,
                      color: PROVIDER_COLORS[provider] || '#F0ECD4',
                      fontSize: 8,
                      fontWeight: 700,
                      fontFamily: "'Playfair Display', serif",
                    }}
                  >
                    {PROVIDER_ICONS[provider] || '?'}
                  </div>
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 10,
                      fontWeight: 600,
                      color: PROVIDER_COLORS[provider] || '#F0ECD4',
                      textTransform: 'capitalize',
                    }}
                  >
                    {provider}
                  </span>
                </div>

                {/* Model rows */}
                {providerModels.map((model) => {
                  const isActive = model.id === agent.active_model_id;
                  return (
                    <button
                      key={model.id}
                      onClick={() => {
                        onSelect(agent.id, model.id);
                        setOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 transition-colors duration-150 hover:bg-[rgba(38,59,40,0.3)]"
                      style={{
                        borderLeft: isActive ? '3px solid #F0ECD4' : '3px solid transparent',
                      }}
                    >
                      <div className="flex-1 text-left min-w-0">
                        <div
                          className="truncate"
                          style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: 11,
                            color: isActive ? '#F0ECD4' : 'rgba(240,236,212,0.70)',
                            fontWeight: isActive ? 600 : 400,
                          }}
                        >
                          {model.display_name}
                        </div>
                        <div
                          className="flex items-center gap-2 mt-0.5"
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 9,
                            color: 'rgba(240,236,212,0.35)',
                          }}
                        >
                          <span>{fmtContext(model.context_window)}ctx</span>
                          <span>${model.cost_per_1k_input}/1Ki</span>
                          <span>${model.cost_per_1k_output}/1Ko</span>
                        </div>
                      </div>
                      <TierBadge tier={model.tier} />
                      {isActive && (
                        <Check size={12} style={{ color: '#F0ECD4', flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Agent Card Component
// ═══════════════════════════════════════════════════════════

function AgentCard({
  agent,
  models,
  index,
  onModelSelect,
}: {
  agent: MaestroAgent;
  models: AiModel[];
  index: number;
  onModelSelect: (agentId: string, modelId: string) => void;
}) {
  const initial = agent.name.charAt(0).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: 'rgba(38,59,40,0.25)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(240,236,212,0.08)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(240,236,212,0.03)',
      }}
    >
      {/* Top cream highlight line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(240,236,212,0.12), transparent)',
        }}
      />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(38,59,40,0.6), rgba(74,222,128,0.12))',
                border: '1px solid rgba(240,236,212,0.08)',
              }}
            >
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#F0ECD4',
                }}
              >
                {initial}
              </span>
            </div>

            {/* Name + Role */}
            <div>
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#F0ECD4',
                  lineHeight: 1.2,
                }}
              >
                {agent.name}
              </h3>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  color: 'rgba(240,236,212,0.60)',
                  marginTop: 2,
                }}
              >
                {agent.role}
              </p>
            </div>
          </div>

          {/* Status light */}
          <StatusLight status={agent.status} />
        </div>

        {/* Description */}
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            color: 'rgba(240,236,212,0.60)',
            lineHeight: 1.45,
          }}
        >
          {agent.description}
        </p>

        {/* Model selector */}
        <ModelSelector
          agent={agent}
          models={models}
          onSelect={onModelSelect}
        />
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Agents Page
// ═══════════════════════════════════════════════════════════

export function AgentsPage() {
  const [agents, setAgents] = useState<MaestroAgent[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch agents and models
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [agentsRes, modelsRes] = await Promise.all([
        supabase
          .from('maestro_agents')
          .select('*, active_model:ai_models!active_model_id(*)')
          .order('priority', { ascending: true }),
        supabase
          .from('ai_models')
          .select('*')
          .eq('is_active', true)
          .order('provider')
          .order('display_name'),
      ]);

      if (agentsRes.data) setAgents(agentsRes.data);
      if (modelsRes.data) setModels(modelsRes.data);
    } catch (err) {
      console.error('[Agents] Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Update model assignment
  const handleModelSelect = useCallback(async (agentId: string, modelId: string) => {
    // Optimistic update
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId
          ? {
              ...a,
              active_model_id: modelId,
              active_model: models.find((m) => m.id === modelId) || null,
            }
          : a
      )
    );

    try {
      await supabase
        .from('maestro_agents')
        .update({ active_model_id: modelId, updated_at: new Date().toISOString() })
        .eq('id', agentId);
    } catch (err) {
      console.error('[Agents] Failed to update model:', err);
      fetchData(); // Revert on error
    }
  }, [models, fetchData]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = { active: 0, idle: 0, offline: 0 };
    for (const a of agents) {
      if (a.status === 'active') counts.active++;
      else if (a.status === 'idle') counts.idle++;
      else counts.offline++;
    }
    return counts;
  }, [agents]);

  // Unique models in use
  const uniqueModelCount = useMemo(() => {
    const ids = new Set(agents.map((a) => a.active_model_id).filter(Boolean));
    return ids.size;
  }, [agents]);

  return (
    <PageTransition className="p-5 space-y-5 max-w-[1400px] mx-auto overflow-y-auto h-full">
      {/* Page header */}
      <div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 32,
            fontWeight: 700,
            color: '#F0ECD4',
            lineHeight: 1.2,
          }}
        >
          Agents
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: 'rgba(240,236,212,0.60)',
            marginTop: 4,
          }}
        >
          Maestro AI Operations — Model Assignment & Status
        </p>
      </div>

      {/* Status summary bar */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: 'rgba(38,59,40,0.25)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(240,236,212,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(240,236,212,0.03)',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(240,236,212,0.12), transparent)' }} />
        <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            {/* Active count */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center" style={{ width: 10, height: 10 }}>
                <div className="absolute inset-[-2px] rounded-full agent-status-active-ring" />
                <div className="w-[8px] h-[8px] rounded-full" style={{ backgroundColor: '#4ADE80', boxShadow: '0 0 8px #4ADE8088' }} />
              </div>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#4ADE80', fontWeight: 600 }}>
                {statusCounts.active} Active
              </span>
            </div>
            {/* Idle count */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center" style={{ width: 10, height: 10 }}>
                <div className="absolute inset-[-1px] rounded-full agent-status-idle-ring" />
                <div className="w-[8px] h-[8px] rounded-full" style={{ backgroundColor: '#FBBF24', boxShadow: '0 0 6px #FBBF2466' }} />
              </div>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#FBBF24', fontWeight: 600 }}>
                {statusCounts.idle} Idle
              </span>
            </div>
            {/* Offline count */}
            <div className="flex items-center gap-2">
              <div className="w-[8px] h-[8px] rounded-full" style={{ backgroundColor: 'rgba(240,236,212,0.35)' }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(240,236,212,0.35)', fontWeight: 600 }}>
                {statusCounts.offline} Offline
              </span>
            </div>
          </div>
          {/* Unique models */}
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              color: 'rgba(240,236,212,0.45)',
            }}
          >
            {uniqueModelCount} unique models
          </span>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl animate-pulse"
              style={{
                height: 240,
                background: 'rgba(38,59,40,0.15)',
                border: '1px solid rgba(240,236,212,0.04)',
              }}
            />
          ))}
        </div>
      )}

      {/* Agent cards grid */}
      {!loading && (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
        >
          {agents.map((agent, index) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              models={models}
              index={index}
              onModelSelect={handleModelSelect}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && agents.length === 0 && (
        <div
          className="text-center py-16"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            color: 'rgba(240,236,212,0.35)',
          }}
        >
          No agents found. Check your Supabase connection.
        </div>
      )}

      {/* Footer */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: 'rgba(38,59,40,0.25)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(240,236,212,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(240,236,212,0.03)',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(240,236,212,0.12), transparent)' }} />
        <p
          className="text-center py-3"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            color: 'rgba(240,236,212,0.35)',
          }}
        >
          L&S Custom Tailors · Est. 1974 · Maestro v2.0 · Powered by Claude API on Mac Mini M4
        </p>
      </div>
    </PageTransition>
  );
}
