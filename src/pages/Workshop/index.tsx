// ═══════════════════════════════════════════════════════════
// Workshop — Full task & project management system
//
// Layout: Stats Bar → Header → View Toggle → Active View
// Views: Board (Kanban) | Agents (Workload) | List (Table)
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, FileText, Search, Filter, LayoutGrid, Users, List,
  X, Keyboard, Clock, AlertTriangle, Lock, CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { PageTransition } from '@/components/shared/PageTransition';
import { useWorkshopStore } from '@/stores/workshopStore';
import { themeHex, themeAlpha } from '@/utils/theme-colors';
import clsx from 'clsx';

import { BoardView } from './BoardView';
import { AgentView } from './AgentView';
import { ListView } from './ListView';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskDetailPanel } from './TaskDetailPanel';
import { TemplatePickerModal } from './TemplatePickerModal';
import { AGENTS, PRIORITY_CONFIG, getAgentName } from './constants';
import type { ViewMode, TaskPriority, BoardTask, TaskTemplate, WorkshopTask } from './types';

// ── Seed templates on first load ──────────────────────────

function seedTemplatesIfNeeded() {
  const store = useWorkshopStore.getState();
  if (store.templates.length > 0) return;

  store.addTemplate({
    name: 'New Client Onboarding',
    description: 'Full onboarding flow for a new bespoke client — from first consultation through measurement and fabric selection.',
    category: 'client',
    default_priority: 'high',
    default_agent_slug: 'sofia',
    default_estimated_hours: null,
    default_tags: ['onboarding', 'client'],
    subtasks: [
      { title: 'Send welcome email with appointment options', agent_slug: 'sofia', estimated_hours: 0.5 },
      { title: 'Prepare style consultation questionnaire', agent_slug: 'giada', estimated_hours: 1 },
      { title: 'Schedule initial consultation', agent_slug: 'mia', estimated_hours: 0.25 },
      { title: 'Take measurements and record in system', agent_slug: 'rocco', estimated_hours: 1 },
      { title: 'Prepare fabric recommendations based on style profile', agent_slug: 'melana', estimated_hours: 1.5 },
      { title: 'Create customer record and order in system', agent_slug: 'simone', estimated_hours: 0.5 },
    ],
    instructions_md: '## New Client Onboarding\n\nThis is the standard L&S onboarding flow. Every new bespoke client should go through each step to ensure they receive the full concierge experience.\n\n### Key Principles\n- First impressions define the relationship\n- No rush — luxury is patient\n- Document everything in the system',
    is_active: true,
  });

  store.addTemplate({
    name: 'Trunk Show Preparation',
    description: 'End-to-end prep for an L&S trunk show event — venue, invitations, fabric selection, marketing, and follow-up.',
    category: 'marketing',
    default_priority: 'high',
    default_agent_slug: 'marco',
    default_estimated_hours: null,
    default_tags: ['trunk-show', 'event', 'marketing'],
    subtasks: [
      { title: 'Confirm venue and date', agent_slug: 'mia', estimated_hours: 2 },
      { title: 'Curate fabric collection for the show', agent_slug: 'melana', estimated_hours: 4 },
      { title: 'Design and send invitations', agent_slug: 'giovanna', estimated_hours: 3 },
      { title: 'Prepare marketing materials and social posts', agent_slug: 'giovanna', estimated_hours: 4 },
      { title: 'Client outreach — personal invitations to VIPs', agent_slug: 'sofia', estimated_hours: 3 },
      { title: 'Day-of logistics checklist', agent_slug: 'marco', estimated_hours: 2 },
      { title: 'Post-show follow-up with attendees', agent_slug: 'sofia', estimated_hours: 3 },
    ],
    instructions_md: '## Trunk Show Preparation\n\nL&S trunk shows are our premium client acquisition and retention events. Every detail matters.\n\n### Budget\nTrack all expenses through Filo.\n\n### Timeline\nStart preparation at least 6 weeks before the event date.',
    is_active: true,
  });

  store.addTemplate({
    name: 'Fabric Restock Check',
    description: 'Monthly review of fabric inventory levels, reorder thresholds, and supplier follow-ups.',
    category: 'operations',
    default_priority: 'medium',
    default_agent_slug: 'melana',
    default_estimated_hours: null,
    default_tags: ['inventory', 'fabric', 'monthly'],
    subtasks: [
      { title: 'Pull current inventory report', agent_slug: 'melana', estimated_hours: 0.5 },
      { title: 'Identify fabrics below reorder threshold', agent_slug: 'melana', estimated_hours: 0.5 },
      { title: 'Contact suppliers for availability and pricing', agent_slug: 'melana', estimated_hours: 2 },
      { title: 'Submit reorder POs for approval', agent_slug: 'filo', estimated_hours: 1 },
      { title: 'Update inventory records with incoming stock', agent_slug: 'simone', estimated_hours: 0.5 },
    ],
    instructions_md: '## Monthly Fabric Restock\n\nRun this the first week of each month. Focus on seasonal fabrics and anything that moved fast in the last 30 days.',
    is_active: true,
  });
}

// ═══════════════════════════════════════════════════════════
// Stats Bar
// ═══════════════════════════════════════════════════════════

function StatsBar() {
  const stats = useWorkshopStore((s) => s.getStats());

  const items = [
    {
      label: 'Total Open',
      value: stats.total_open,
      colorVar: 'accent',
      icon: LayoutGrid,
    },
    {
      label: 'In Progress',
      value: stats.in_progress,
      colorVar: 'warning',
      icon: TrendingUp,
    },
    {
      label: 'Overdue',
      value: stats.overdue,
      colorVar: 'danger',
      icon: AlertTriangle,
    },
    {
      label: 'Blocked',
      value: stats.blocked,
      colorVar: 'warning',
      icon: Lock,
    },
    {
      label: 'Done This Week',
      value: stats.completed_this_week,
      colorVar: 'success',
      icon: CheckCircle2,
    },
    {
      label: 'Avg Completion',
      value: stats.avg_completion_hours > 0 ? `${stats.avg_completion_hours}h` : '—',
      colorVar: 'primary',
      icon: Clock,
    },
  ];

  return (
    <div className="grid grid-cols-6 gap-2 mb-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2.5 rounded-xl p-3 border border-[rgb(var(--aegis-overlay)/0.06)] transition-colors hover:border-[rgb(var(--aegis-overlay)/0.1)]"
          style={{ background: 'rgb(var(--aegis-overlay) / 0.025)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: themeAlpha(item.colorVar, 0.08),
              border: `1px solid ${themeAlpha(item.colorVar, 0.12)}`,
            }}
          >
            <item.icon size={14} style={{ color: themeHex(item.colorVar as any) }} />
          </div>
          <div className="min-w-0">
            <div
              className="text-[18px] font-bold leading-none"
              style={{ color: themeHex(item.colorVar as any) }}
            >
              {item.value}
            </div>
            <div className="text-[9px] text-aegis-text-dim uppercase tracking-wider mt-0.5 truncate">
              {item.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Shortcuts Overlay
// ═══════════════════════════════════════════════════════════

function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { key: 'N', desc: 'New Task' },
    { key: 'T', desc: 'From Template' },
    { key: '1', desc: 'Board View' },
    { key: '2', desc: 'Agents View' },
    { key: '3', desc: 'List View' },
    { key: '/', desc: 'Focus Search' },
    { key: 'Esc', desc: 'Close Panel/Modal' },
    { key: '?', desc: 'Show Shortcuts' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[360px] rounded-2xl p-6 shadow-2xl"
        style={{
          background: 'var(--aegis-bg)',
          border: '1px solid rgb(var(--aegis-overlay) / 0.08)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-bold text-aegis-text flex items-center gap-2">
            <Keyboard size={16} /> Keyboard Shortcuts
          </h3>
          <button onClick={onClose} className="text-aegis-text-muted">
            <X size={14} />
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-[12px] text-aegis-text-secondary">{s.desc}</span>
              <kbd
                className="text-[11px] font-mono px-2 py-0.5 rounded-md"
                style={{
                  background: 'rgb(var(--aegis-overlay) / 0.06)',
                  border: '1px solid rgb(var(--aegis-overlay) / 0.08)',
                  color: 'rgb(var(--aegis-text-muted))',
                }}
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Workshop Page
// ═══════════════════════════════════════════════════════════

export function WorkshopPage() {
  const { getBoardTasks, getAllTags, incrementTemplateUsage } = useWorkshopStore();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [showSubtasks, setShowSubtasks] = useState(false);

  // Template prefill state
  const [templatePrefill, setTemplatePrefill] = useState<any>(null);

  // Seed templates on first render
  useEffect(() => {
    seedTemplatesIfNeeded();
  }, []);

  // Get all board tasks
  const boardTasks = getBoardTasks();
  const allTags = getAllTags();

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let result = boardTasks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.task_number.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }

    if (filterPriority !== 'all') {
      result = result.filter((t) => t.priority === filterPriority);
    }

    if (filterAgent !== 'all') {
      result = result.filter((t) => t.assigned_agent_slug === filterAgent);
    }

    if (filterTags.length > 0) {
      result = result.filter((t) => filterTags.some((tag) => t.tags.includes(tag)));
    }

    return result;
  }, [boardTasks, searchQuery, filterPriority, filterAgent, filterTags]);

  // Stats for header subtitle
  const activeCount = boardTasks.filter((t) => t.status === 'in_progress').length;
  const queuedCount = boardTasks.filter((t) => t.status === 'queued').length;
  const completeCount = boardTasks.filter((t) => t.status === 'complete').length;

  // Handlers
  const handleTaskClick = useCallback((task: BoardTask | WorkshopTask) => {
    setSelectedTaskId(task.id);
  }, []);

  const handleTemplateSelect = useCallback(
    (template: TaskTemplate) => {
      setTemplatePrefill({
        title: '',
        description: template.instructions_md,
        priority: template.default_priority,
        assigned_agent_slug: template.default_agent_slug,
        estimated_hours: template.default_estimated_hours,
        tags: template.default_tags,
        subtasks: template.subtasks,
      });
      incrementTemplateUsage(template.id);
      setShowCreateModal(true);
    },
    [incrementTemplateUsage],
  );

  const searchInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node && showSearch) node.focus();
  }, [showSearch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        if (e.key === 'Escape') {
          (target as HTMLInputElement).blur();
        }
        return;
      }

      switch (e.key) {
        case 'n':
        case 'N':
          e.preventDefault();
          setShowCreateModal(true);
          break;
        case 't':
        case 'T':
          e.preventDefault();
          setShowTemplateModal(true);
          break;
        case '1':
          setViewMode('board');
          break;
        case '2':
          setViewMode('agents');
          break;
        case '3':
          setViewMode('list');
          break;
        case '/':
          e.preventDefault();
          setShowSearch(true);
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts(true);
          break;
        case 'Escape':
          if (showShortcuts) setShowShortcuts(false);
          else if (selectedTaskId) setSelectedTaskId(null);
          else if (showCreateModal) setShowCreateModal(false);
          else if (showTemplateModal) setShowTemplateModal(false);
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showShortcuts, selectedTaskId, showCreateModal, showTemplateModal]);

  const viewOptions: { key: ViewMode; label: string; icon: any }[] = [
    { key: 'board', label: 'BOARD', icon: LayoutGrid },
    { key: 'agents', label: 'AGENTS', icon: Users },
    { key: 'list', label: 'LIST', icon: List },
  ];

  return (
    <PageTransition className="p-5 h-full flex flex-col overflow-hidden">
      {/* ═══ Stats Bar ═══ */}
      <div className="shrink-0">
        <StatsBar />
      </div>

      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h1 className="text-[24px] font-extrabold text-aegis-text tracking-tight">Workshop</h1>
          <p className="text-[11px] text-aegis-text-dim uppercase tracking-wider mt-0.5">
            <span style={{ color: themeHex('warning') }}>{activeCount} Active</span>
            <span className="mx-1.5 opacity-30">·</span>
            <span style={{ color: themeHex('accent') }}>{queuedCount} Queued</span>
            <span className="mx-1.5 opacity-30">·</span>
            <span style={{ color: themeHex('success') }}>{completeCount} Complete</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors"
            style={{
              border: `1px solid ${themeAlpha('accent', 0.2)}`,
              color: themeHex('accent'),
              background: themeAlpha('accent', 0.04),
            }}
          >
            <FileText size={13} /> From Template
          </button>
          <button
            onClick={() => {
              setTemplatePrefill(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-colors"
            style={{
              background: themeHex('primary'),
              color: 'var(--aegis-bg)',
            }}
          >
            <Plus size={14} /> New Task
          </button>
        </div>
      </div>

      {/* ═══ View Toggle + Filters ═══ */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        {/* View toggle pills */}
        <div
          className="flex rounded-xl p-1"
          style={{ background: 'rgb(var(--aegis-overlay) / 0.03)', border: '1px solid rgb(var(--aegis-overlay) / 0.06)' }}
        >
          {viewOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setViewMode(opt.key)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
                viewMode === opt.key
                  ? 'text-aegis-primary shadow-sm'
                  : 'text-aegis-text-dim hover:text-aegis-text-muted',
              )}
              style={
                viewMode === opt.key
                  ? { background: themeAlpha('primary', 0.08), border: `1px solid ${themeAlpha('primary', 0.12)}` }
                  : { border: '1px solid transparent' }
              }
            >
              <opt.icon size={12} />
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Priority filter */}
          <div className="flex gap-1">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map((p) => {
              const isAll = p === 'all';
              const active = filterPriority === p;
              const cfg = isAll ? null : PRIORITY_CONFIG[p];

              return (
                <button
                  key={p}
                  onClick={() => setFilterPriority(p)}
                  className="text-[9px] px-2 py-1 rounded-lg font-semibold uppercase tracking-wider transition-colors"
                  style={
                    active
                      ? {
                          background: isAll ? themeAlpha('primary', 0.08) : themeAlpha(cfg!.colorVar, 0.1),
                          color: isAll ? themeHex('primary') : themeHex(cfg!.colorVar as any),
                          border: `1px solid ${isAll ? themeAlpha('primary', 0.15) : themeAlpha(cfg!.colorVar, 0.15)}`,
                        }
                      : {
                          border: '1px solid rgb(var(--aegis-overlay) / 0.04)',
                          color: 'rgb(var(--aegis-text-dim))',
                        }
                  }
                >
                  {isAll ? 'All' : cfg!.label}
                </button>
              );
            })}
          </div>

          {/* Agent filter */}
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="text-[11px] px-2 py-1.5 rounded-lg cursor-pointer"
            style={{
              background: 'rgb(var(--aegis-overlay) / 0.03)',
              border: '1px solid rgb(var(--aegis-overlay) / 0.06)',
              color: filterAgent !== 'all' ? themeHex('primary') : 'rgb(var(--aegis-text-dim))',
            }}
          >
            <option value="all">All Agents</option>
            {AGENTS.map((a) => (
              <option key={a.slug} value={a.slug}>{a.emoji} {a.name}</option>
            ))}
            <option value="">Unassigned</option>
          </select>

          {/* Search toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={clsx(
              'p-2 rounded-xl transition-colors',
              showSearch
                ? 'text-aegis-primary bg-aegis-primary/5 border border-aegis-primary/20'
                : 'text-aegis-text-muted border border-[rgb(var(--aegis-overlay)/0.06)]',
            )}
            style={!showSearch ? { background: 'rgb(var(--aegis-overlay) / 0.03)' } : undefined}
          >
            <Search size={13} />
          </button>

          {/* Shortcuts help */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="p-2 rounded-xl text-aegis-text-dim border border-[rgb(var(--aegis-overlay)/0.06)] transition-colors hover:text-aegis-text-muted"
            style={{ background: 'rgb(var(--aegis-overlay) / 0.03)' }}
            title="Keyboard shortcuts (?)"
          >
            <Keyboard size={13} />
          </button>
        </div>
      </div>

      {/* ═══ Search bar ═══ */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden shrink-0 mb-3"
          >
            <div className="relative max-w-md">
              <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-aegis-text-dim" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks by title, description, number, or tag..."
                className="w-full rounded-xl ps-9 pe-3 py-2 text-[12px] text-aegis-text placeholder:text-aegis-text-dim focus:outline-none focus:ring-1 focus:ring-aegis-primary/30"
                style={{
                  background: 'rgb(var(--aegis-overlay) / 0.03)',
                  border: '1px solid rgb(var(--aegis-overlay) / 0.06)',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-aegis-text-dim hover:text-aegis-text-muted"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Active View ═══ */}
      <div className="flex-1 min-h-0 flex flex-col">
        {boardTasks.length === 0 && !searchQuery ? (
          // Empty state
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: themeAlpha('primary', 0.06),
                border: `2px dashed ${themeAlpha('primary', 0.15)}`,
              }}
            >
              <LayoutGrid size={28} style={{ color: themeAlpha('primary', 0.3) }} />
            </div>
            <h3 className="text-[16px] font-bold text-aegis-text mb-1">Your workshop is empty</h3>
            <p className="text-[12px] text-aegis-text-dim mb-4 max-w-sm">
              Create your first task to get started, or use a template for common workflows.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold"
                style={{ background: themeHex('primary'), color: 'var(--aegis-bg)' }}
              >
                <Plus size={14} /> New Task
              </button>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-medium"
                style={{
                  border: `1px solid ${themeAlpha('accent', 0.2)}`,
                  color: themeHex('accent'),
                }}
              >
                <FileText size={13} /> From Template
              </button>
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'board' && (
              <BoardView tasks={filteredTasks} onTaskClick={handleTaskClick} />
            )}
            {viewMode === 'agents' && <AgentView onTaskClick={handleTaskClick} />}
            {viewMode === 'list' && (
              <ListView tasks={filteredTasks} onTaskClick={handleTaskClick} />
            )}
          </>
        )}
      </div>

      {/* ═══ Modals & Panels ═══ */}
      <CreateTaskModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setTemplatePrefill(null);
        }}
        prefill={templatePrefill}
        onCreated={(num) => {
          // Could show a toast here
        }}
      />

      <TemplatePickerModal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={handleTemplateSelect}
      />

      <TaskDetailPanel
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />

      <AnimatePresence>
        {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
      </AnimatePresence>
    </PageTransition>
  );
}
