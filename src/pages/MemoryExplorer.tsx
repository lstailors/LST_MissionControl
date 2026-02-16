// ═══════════════════════════════════════════════════════════
// MemoryExplorer — Matches conceptual design:
// Search bar with inline filter pills → Memory cards with
// color bar + key (mono) + badge + content + age
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Search, Loader2, Plus, Pencil, Trash2, RefreshCw, FlaskConical, Settings } from 'lucide-react';
import { PageTransition } from '@/components/shared/PageTransition';
import { useSettingsStore } from '@/stores/settingsStore';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

interface Memory {
  id: number;
  content: string;
  category: string;
  importance: number;
  tags: string[];
  created_at: string;
  similarity?: number;
}

// ── Category config (conceptual: fewer, solid-colored pills) ──
const FILTER_PILLS = [
  { key: 'all',         label: 'All',        color: '#4EC9B0', bg: 'rgba(78,201,176,0.15)',  border: 'rgba(78,201,176,0.3)' },
  { key: 'general',     label: 'General',    color: '#8b949e', bg: 'rgba(139,148,158,0.12)', border: 'rgba(139,148,158,0.25)' },
  { key: 'projects',    label: 'Project',    color: '#00e676', bg: 'rgba(0,230,118,0.12)',   border: 'rgba(0,230,118,0.3)' },
  { key: 'preferences', label: 'Preference', color: '#ff5252', bg: 'rgba(255,82,82,0.12)',   border: 'rgba(255,82,82,0.3)' },
  { key: 'skills',      label: 'Skill',      color: '#00e5ff', bg: 'rgba(0,229,255,0.12)',   border: 'rgba(0,229,255,0.3)' },
  { key: 'technical',   label: 'Technical',  color: '#448aff', bg: 'rgba(68,138,255,0.12)',  border: 'rgba(68,138,255,0.3)' },
  { key: 'events',      label: 'Event',      color: '#ffea00', bg: 'rgba(255,234,0,0.12)',   border: 'rgba(255,234,0,0.3)' },
  { key: 'decisions',   label: 'Decision',   color: '#ff9100', bg: 'rgba(255,145,0,0.12)',   border: 'rgba(255,145,0,0.3)' },
  { key: 'people',      label: 'People',     color: '#d500f9', bg: 'rgba(213,0,249,0.12)',   border: 'rgba(213,0,249,0.3)' },
] as const;

// Bar + badge colors per category
const CATEGORY_COLORS: Record<string, { bar: string; color: string; bg: string; border: string }> = {
  projects:    { bar: '#00e676', color: '#00e676', bg: 'rgba(0,230,118,0.15)',   border: 'rgba(0,230,118,0.3)' },
  technical:   { bar: '#448aff', color: '#448aff', bg: 'rgba(68,138,255,0.15)',  border: 'rgba(68,138,255,0.3)' },
  preferences: { bar: '#ff5252', color: '#ff5252', bg: 'rgba(255,82,82,0.15)',   border: 'rgba(255,82,82,0.3)' },
  decisions:   { bar: '#ff9100', color: '#ff9100', bg: 'rgba(255,145,0,0.15)',   border: 'rgba(255,145,0,0.3)' },
  people:      { bar: '#d500f9', color: '#d500f9', bg: 'rgba(213,0,249,0.15)',   border: 'rgba(213,0,249,0.3)' },
  skills:      { bar: '#00e5ff', color: '#00e5ff', bg: 'rgba(0,229,255,0.15)',   border: 'rgba(0,229,255,0.3)' },
  events:      { bar: '#ffea00', color: '#ffea00', bg: 'rgba(255,234,0,0.15)',   border: 'rgba(255,234,0,0.3)' },
  general:     { bar: '#8b949e', color: '#8b949e', bg: 'rgba(139,148,158,0.12)', border: 'rgba(139,148,158,0.25)' },
};

function getCatColors(cat: string) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.general;
}

const BADGE_LABELS: Record<string, string> = {
  projects: 'PROJECT', technical: 'TECHNICAL', preferences: 'PREFERENCE',
  decisions: 'DECISION', people: 'PEOPLE', skills: 'SKILL',
  events: 'EVENT', general: 'GENERAL',
};

/** Build a short key from tags or content */
function extractKey(mem: Memory): string {
  if (mem.tags?.length > 0) {
    return mem.tags[0].replace(/_/g, '.').toLowerCase();
  }
  const words = mem.content.replace(/[#*\->\n]/g, ' ').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 3).join('_').toLowerCase().substring(0, 30);
}

/** Relative time: "2d", "14d", "30d" */
function timeAgoShort(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

// ── Memory Form Modal ──
function MemoryModal({ memory, onSave, onClose }: {
  memory?: Memory | null;
  onSave: (data: { content: string; category: string; importance: number; tags: string[] }) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [content, setContent] = useState(memory?.content || '');
  const [category, setCategory] = useState(memory?.category || 'general');
  const [importance, setImportance] = useState(memory?.importance || 7);
  const [tagsStr, setTagsStr] = useState(memory?.tags?.join(', ') || '');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[500px] p-6 rounded-2xl bg-aegis-bg border border-aegis-border/30 shadow-2xl">
        <h3 className="text-[16px] font-bold text-aegis-text mb-4">
          {memory ? t('memory.edit', 'تعديل ذاكرة') : t('memory.add', 'إضافة ذاكرة')}
        </h3>
        <div className="space-y-3">
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="المحتوى..." rows={4} dir="auto"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-aegis-text placeholder:text-white/20 focus:outline-none focus:border-aegis-primary/40 resize-none" autoFocus />
          <div>
            <label className="text-[11px] text-white/30 mb-1.5 block">التصنيف</label>
            <div className="flex flex-wrap gap-1.5">
              {FILTER_PILLS.filter(c => c.key !== 'all').map((c) => (
                <button key={c.key} onClick={() => setCategory(c.key)}
                  className="text-[10px] px-2.5 py-1 rounded-full border transition-colors"
                  style={category === c.key
                    ? { background: c.bg, borderColor: c.border, color: c.color }
                    : { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }
                  }>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-white/30 mb-1.5 block">
              الأهمية: <span className="text-aegis-primary font-bold">{importance}</span>/10
            </label>
            <input type="range" min={1} max={10} value={importance} onChange={(e) => setImportance(Number(e.target.value))}
              className="w-full accent-aegis-primary" />
          </div>
          <input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)}
            placeholder="tags مفصولة بفاصلة"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-aegis-text placeholder:text-white/20 focus:outline-none focus:border-aegis-primary/40" />
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-[13px] text-white/40 hover:text-white/60">إلغاء</button>
          <button onClick={() => onSave({
            content, category, importance,
            tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
          })} disabled={!content.trim()}
            className="px-4 py-2 rounded-xl bg-aegis-primary text-white text-[13px] font-medium hover:bg-aegis-primary/80 disabled:opacity-40">
            حفظ
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════
function MemoryDisabledView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <PageTransition>
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-aegis-primary/10 border border-aegis-primary/20 flex items-center justify-center mx-auto mb-5">
            <Brain size={28} className="text-aegis-primary" />
          </div>
          <h2 className="text-[20px] font-bold text-aegis-text mb-3">Memory Explorer</h2>
          <p className="text-[13px] text-aegis-text-dim/70 mb-6 leading-relaxed">
            {t('memory.experimentalDesc', 'Browse, search, and manage your agent\'s memories. Connect to a Memory API server or point to your local workspace folder containing .md files.')}
          </p>

          {/* Two options */}
          <div className="flex items-stretch gap-3 mb-6 max-w-md mx-auto">
            <div className="flex-1 p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
              <div className="text-[20px] mb-2">📁</div>
              <div className="text-[12px] font-semibold text-aegis-text mb-1">{t('memory.localOption', 'Local Files')}</div>
              <div className="text-[11px] text-white/30 leading-relaxed">
                {t('memory.localOptionDesc', 'Select your workspace folder with MEMORY.md and memory/ files')}
              </div>
            </div>
            <div className="flex-1 p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
              <div className="text-[20px] mb-2">🔌</div>
              <div className="text-[12px] font-semibold text-aegis-text mb-1">{t('memory.apiOption', 'API Server')}</div>
              <div className="text-[11px] text-white/30 leading-relaxed">
                {t('memory.apiOptionDesc', 'Connect to a Memory API server for semantic search and management')}
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/settings')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-aegis-primary/15 border border-aegis-primary/30 text-aegis-primary text-[13px] font-semibold hover:bg-aegis-primary/25 transition-colors"
          >
            <Settings size={16} />
            {t('memory.goToSettings', 'Enable in Settings')}
          </button>
        </div>
      </div>
    </PageTransition>
  );
}

export function MemoryExplorerPage() {
  const { memoryExplorerEnabled, memoryMode, memoryApiUrl, memoryLocalPath } = useSettingsStore();
  if (!memoryExplorerEnabled) return <MemoryDisabledView />;

  const { t } = useTranslation();
  const API = memoryApiUrl || 'http://localhost:3040';
  const isLocal = memoryMode === 'local';
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searching, setSearching] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // ── Parse local .md file into Memory object ──
  const parseLocalFile = (file: { name: string; content: string; modified: string; size: number }, idx: number): Memory => {
    // Try to detect category from filename/path
    let category = 'general';
    if (file.name.startsWith('memory/')) category = 'general';
    if (file.name === 'MEMORY.md') category = 'general';
    if (file.content.toLowerCase().includes('project')) category = 'projects';
    if (file.content.toLowerCase().includes('decision')) category = 'decisions';
    if (file.content.toLowerCase().includes('preference')) category = 'preferences';
    if (file.content.toLowerCase().includes('technical')) category = 'technical';

    // Extract tags from frontmatter
    const tagsMatch = file.content.match(/tags:\s*\[([^\]]*)\]/);
    const tags = tagsMatch ? tagsMatch[1].replace(/['"]/g, '').split(',').map((t: string) => t.trim()).filter(Boolean) : [];

    return {
      id: idx + 1,
      content: file.content.slice(0, 2000),
      category,
      importance: file.name === 'MEMORY.md' ? 10 : 5,
      tags: tags.length ? tags : [file.name.replace('.md', '')],
      created_at: file.modified,
    };
  };

  // ── Load ──
  const loadMemories = useCallback(async () => {
    setLoading(true);
    try {
      if (isLocal) {
        if (!memoryLocalPath) { setMemories([]); setLoading(false); return; }
        const result = await (window as any).aegis?.memory?.readLocal(memoryLocalPath);
        if (result?.success && result.files) {
          setMemories(result.files.map(parseLocalFile));
        } else { setMemories([]); }
      } else {
        const res = await fetch(`${API}/memories?limit=200`);
        const data = await res.json();
        setMemories(Array.isArray(data) ? data : data.memories || data.results || []);
      }
    } catch { setMemories([]); }
    finally { setLoading(false); }
  }, [isLocal, memoryLocalPath, API]);

  useEffect(() => { loadMemories(); }, [loadMemories]);

  // ── Search ──
  const handleSearch = useCallback(async () => {
    if (!query.trim()) { loadMemories(); return; }
    setSearching(true);
    try {
      if (isLocal) {
        // Simple text search for local files
        if (!memoryLocalPath) { setSearching(false); return; }
        const result = await (window as any).aegis?.memory?.readLocal(memoryLocalPath);
        if (result?.success && result.files) {
          const q = query.toLowerCase();
          const filtered = result.files
            .filter((f: any) => f.content.toLowerCase().includes(q) || f.name.toLowerCase().includes(q))
            .map(parseLocalFile);
          setMemories(filtered);
        }
      } else {
        const res = await fetch(`${API}/search?q=${encodeURIComponent(query)}&limit=50`);
        const data = await res.json();
        setMemories(data.memories || data.results || []);
      }
    } catch { /* silent */ }
    finally { setSearching(false); }
  }, [query, loadMemories, isLocal, memoryLocalPath, API]);

  // ── CRUD ──
  const handleSave = async (data: { content: string; category: string; importance: number; tags: string[] }) => {
    try {
      if (editingMemory) {
        await fetch(`${API}/memories/${editingMemory.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
        });
      } else {
        await fetch(`${API}/memories`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
        });
      }
      setModalOpen(false); setEditingMemory(null); loadMemories();
    } catch { /* silent */ }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${API}/memories/${id}`, { method: 'DELETE' });
      setMemories((prev) => prev.filter((m) => m.id !== id));
      setConfirmDelete(null);
    } catch { /* silent */ }
  };

  // ── Filter ──
  const filtered = memories.filter((m) => {
    if (activeCategory !== 'all' && m.category !== activeCategory) return false;
    return true;
  });

  // ── Count per category ──
  const categoryCounts: Record<string, number> = { all: memories.length };
  memories.forEach((m) => { categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1; });

  return (
    <PageTransition className="p-6 space-y-5 max-w-[1100px] mx-auto">

      {/* ══ Header ══ */}
      <h1 className="text-[28px] font-extrabold text-aegis-text tracking-tight">
        Memory Explorer
      </h1>

      {/* ══ Search bar with inline filter pills (conceptual design) ══ */}
      <div className="flex items-center gap-3 rounded-2xl bg-white/[0.025] border border-white/[0.06] px-4 py-2.5">
        {/* Search icon + input */}
        <Search size={16} className="text-white/20 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search memories..."
          className="flex-1 bg-transparent text-[14px] text-aegis-text placeholder:text-white/20 focus:outline-none"
          dir="auto"
        />
        {searching && <Loader2 size={16} className="animate-spin text-aegis-primary shrink-0" />}

        {/* Filter pills — inline on the right (conceptual design) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {FILTER_PILLS.map((pill) => {
            const isActive = activeCategory === pill.key;
            const count = categoryCounts[pill.key] || 0;
            // Only show pills that have items (or 'all')
            if (pill.key !== 'all' && count === 0) return null;

            return (
              <button
                key={pill.key}
                onClick={() => setActiveCategory(pill.key)}
                className="text-[11px] px-2.5 py-1 rounded-md font-semibold transition-all whitespace-nowrap"
                style={isActive
                  ? { background: pill.bg, color: pill.color, boxShadow: `0 0 8px ${pill.border}` }
                  : { color: 'rgba(255,255,255,0.2)' }
                }
              >
                {pill.label}
                {pill.key === 'all' && count > 0 && (
                  <span className="ms-1 opacity-60">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ Action bar (add + refresh) ══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditingMemory(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-aegis-primary text-white text-[11px] font-semibold hover:bg-aegis-primary/80 transition-colors"
          >
            <Plus size={14} />
            {t('memory.add', 'إضافة ذاكرة')}
          </button>
          <button
            onClick={loadMemories}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/20 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {filtered.length > 0 && (
          <span className="text-[11px] text-white/15">
            {filtered.length} ذاكرة
          </span>
        )}
      </div>

      {/* ══ Loading ══ */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={24} className="animate-spin text-aegis-primary" />
        </div>
      )}

      {/* ══ Empty state ══ */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Brain size={44} className="mx-auto mb-3 text-white/10" />
          <p className="text-[14px] text-white/20">
            {memories.length === 0 ? 'لا توجد ذكريات — تأكد من اتصال Memory API' : 'لا توجد نتائج لهذا الفلتر'}
          </p>
        </div>
      )}

      {/* ══ Memory Cards (conceptual: bar + key + badge + content + age) ══ */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2.5">
          {filtered.map((mem, i) => {
            const cat = getCatColors(mem.category);
            const key = extractKey(mem);
            const badge = BADGE_LABELS[mem.category] || mem.category.toUpperCase();

            return (
              <motion.div
                key={mem.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                className="group relative flex items-stretch rounded-xl border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.03] transition-all overflow-hidden"
              >
                {/* ① Color bar (left edge) */}
                <div
                  className="w-[3px] shrink-0"
                  style={{ background: cat.bar }}
                />

                {/* ② Content area */}
                <div className="flex-1 px-4 py-3.5 min-w-0">
                  {/* Key + Badge row */}
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span
                      className="text-[12px] font-mono font-semibold px-2 py-0.5 rounded"
                      style={{ color: cat.color, background: cat.bg }}
                    >
                      {key}
                    </span>
                    <span
                      className="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider"
                      style={{ color: cat.color, background: cat.bg, border: `1px solid ${cat.border}` }}
                    >
                      {badge}
                    </span>
                    {mem.importance >= 9 && <span className="text-[10px]">⭐</span>}
                  </div>

                  {/* Content text */}
                  <p className="text-[13px] text-white/50 leading-relaxed line-clamp-2" dir="auto">
                    {mem.content}
                  </p>

                  {/* Tags */}
                  {mem.tags?.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {mem.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{ background: cat.bg, color: cat.color, opacity: 0.6 }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ③ Right: age + hover actions */}
                <div className="flex items-center gap-2 px-4 shrink-0">
                  {/* Edit/Delete — hover only */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingMemory(mem); setModalOpen(true); }}
                      className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/15 hover:text-aegis-primary transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    {confirmDelete === mem.id ? (
                      <button
                        onClick={() => handleDelete(mem.id)}
                        className="text-[9px] px-2 py-1 rounded-lg bg-red-500/15 text-red-400 font-medium"
                      >
                        تأكيد
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(mem.id)}
                        className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/15 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Age */}
                  <span className="text-[11px] text-white/15 font-mono min-w-[28px] text-start">
                    {mem.created_at ? timeAgoShort(mem.created_at) : '—'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ══ CRUD Modal ══ */}
      <AnimatePresence>
        {modalOpen && (
          <MemoryModal
            memory={editingMemory}
            onSave={handleSave}
            onClose={() => { setModalOpen(false); setEditingMemory(null); }}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
