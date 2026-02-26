// ═══════════════════════════════════════════════════════════
// Il Cassetto — Knowledge Vault
// Layout: Category Sidebar (30%) + Document Viewer (70%)
// File explorer + document viewer with search, upload, pin
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, File, Image, Search, Plus, Pin, Trash2,
  Edit3, X, Grid, List, BookOpen, FolderOpen, Tag,
  Eye, ChevronRight, Upload, Archive, PinOff,
  ScrollText, DollarSign, Users, Ruler, Layout,
  ShieldCheck, GraduationCap, ChefHat, BookMarked,
  Scissors,
} from 'lucide-react';
import { PageTransition } from '@/components/shared/PageTransition';
import { useMissionControlStore } from '@/stores/missionControlStore';
import type { VaultDocument } from '@/stores/missionControlStore';
import { themeHex, themeAlpha } from '@/utils/theme-colors';
import clsx from 'clsx';

// ── Constants ─────────────────────────────────────────────

const CATEGORIES = [
  { key: 'all', label: 'All Documents', icon: FolderOpen },
  { key: 'sop', label: 'SOPs', icon: ScrollText },
  { key: 'pricing', label: 'Pricing', icon: DollarSign },
  { key: 'vendor', label: 'Vendor', icon: Users },
  { key: 'fabric', label: 'Fabric', icon: Scissors },
  { key: 'measurement', label: 'Measurement', icon: Ruler },
  { key: 'template', label: 'Templates', icon: Layout },
  { key: 'policy', label: 'Policy', icon: ShieldCheck },
  { key: 'training', label: 'Training', icon: GraduationCap },
  { key: 'recipe', label: 'Recipes', icon: ChefHat },
  { key: 'reference', label: 'Reference', icon: BookMarked },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]['key'];

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'markdown': return FileText;
    case 'pdf': return File;
    case 'image': return Image;
    default: return FileText;
  }
}

function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    sop: 'primary',
    pricing: 'warning',
    vendor: 'accent',
    fabric: 'success',
    measurement: 'primary',
    template: 'accent',
    policy: 'danger',
    training: 'warning',
    recipe: 'success',
    reference: 'accent',
  };
  return map[category] || 'primary';
}

// ── Glass style helpers ───────────────────────────────────

const glassStyle = {
  background: 'rgb(var(--aegis-overlay) / 0.025)',
  border: '1px solid rgb(var(--aegis-overlay) / 0.07)',
};

const glassStyleHover = {
  background: 'rgb(var(--aegis-overlay) / 0.04)',
  border: '1px solid rgb(var(--aegis-overlay) / 0.1)',
};

// ═══════════════════════════════════════════════════════════
// Upload Modal
// ═══════════════════════════════════════════════════════════

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (doc: {
    title: string;
    category: string;
    tags: string[];
    content_text: string;
    file_type: string;
    subcategory: string;
    author: string;
    source: string;
    is_pinned: boolean;
    is_archived: boolean;
  }) => void;
}

function UploadModal({ open, onClose, onSubmit }: UploadModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('sop');
  const [tagsInput, setTagsInput] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    onSubmit({
      title: title.trim(),
      category,
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      content_text: content,
      file_type: 'markdown',
      subcategory: '',
      author: 'Calogero',
      source: 'manual',
      is_pinned: false,
      is_archived: false,
    });
    setTitle('');
    setCategory('sop');
    setTagsInput('');
    setContent('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[560px] max-h-[80vh] overflow-y-auto rounded-2xl p-6 shadow-2xl"
            style={{
              background: 'var(--aegis-bg)',
              border: '1px solid rgb(var(--aegis-overlay) / 0.08)',
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-bold text-aegis-text flex items-center gap-2">
                <Upload size={18} style={{ color: themeHex('primary') }} />
                Add Document
              </h3>
              <button
                onClick={onClose}
                className="text-aegis-text-muted hover:text-aegis-text transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-[11px] font-semibold text-aegis-text-dim uppercase tracking-wider mb-1.5 block">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Document title..."
                  className="w-full rounded-xl px-3 py-2.5 text-[13px] text-aegis-text placeholder:text-aegis-text-dim focus:outline-none focus:ring-1"
                  style={{
                    ...glassStyle,
                    focusRingColor: themeAlpha('primary', 0.3),
                  }}
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] font-semibold text-aegis-text-dim uppercase tracking-wider mb-1.5 block">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-[13px] text-aegis-text cursor-pointer focus:outline-none"
                  style={glassStyle}
                >
                  {CATEGORIES.filter((c) => c.key !== 'all').map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="text-[11px] font-semibold text-aegis-text-dim uppercase tracking-wider mb-1.5 block">
                  Tags (comma-separated)
                </label>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. fabric, sop, training"
                  className="w-full rounded-xl px-3 py-2.5 text-[13px] text-aegis-text placeholder:text-aegis-text-dim focus:outline-none"
                  style={glassStyle}
                />
              </div>

              {/* Content */}
              <div>
                <label className="text-[11px] font-semibold text-aegis-text-dim uppercase tracking-wider mb-1.5 block">
                  Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write or paste document content..."
                  rows={10}
                  className="w-full rounded-xl px-3 py-2.5 text-[13px] text-aegis-text placeholder:text-aegis-text-dim focus:outline-none resize-none font-mono"
                  style={glassStyle}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-[12px] font-medium text-aegis-text-muted transition-colors hover:text-aegis-text"
                style={glassStyle}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || !content.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: themeHex('primary'),
                  color: 'var(--aegis-bg)',
                }}
              >
                <Plus size={14} /> Add Document
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════
// Document Viewer (inline panel)
// ═══════════════════════════════════════════════════════════

interface DocViewerProps {
  doc: VaultDocument;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<VaultDocument>) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

function DocViewer({ doc, onClose, onUpdate, onDelete, onTogglePin }: DocViewerProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(doc.content_text);

  const handleSave = () => {
    onUpdate(doc.id, { content_text: editContent });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditContent(doc.content_text);
    setEditing(false);
  };

  const colorVar = getCategoryColor(doc.category);
  const FileIcon = getFileIcon(doc.file_type);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col h-full rounded-2xl overflow-hidden"
      style={glassStyle}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between p-5 shrink-0"
        style={{ borderBottom: '1px solid rgb(var(--aegis-overlay) / 0.06)' }}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{
              background: themeAlpha(colorVar, 0.08),
              border: `1px solid ${themeAlpha(colorVar, 0.12)}`,
            }}
          >
            <FileIcon size={18} style={{ color: themeHex(colorVar as any) }} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold text-aegis-text truncate">{doc.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{
                  background: themeAlpha(colorVar, 0.08),
                  color: themeHex(colorVar as any),
                }}
              >
                {doc.category}
              </span>
              {doc.subcategory && (
                <span className="text-[10px] text-aegis-text-dim">{doc.subcategory}</span>
              )}
              <span className="text-[10px] text-aegis-text-dim flex items-center gap-1">
                <Eye size={10} /> {doc.access_count}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-3">
          <button
            onClick={() => onTogglePin(doc.id)}
            className="p-2 rounded-lg transition-colors hover:bg-[rgb(var(--aegis-overlay)/0.05)]"
            title={doc.is_pinned ? 'Unpin' : 'Pin'}
          >
            {doc.is_pinned ? (
              <PinOff size={14} style={{ color: themeHex('warning') }} />
            ) : (
              <Pin size={14} className="text-aegis-text-dim" />
            )}
          </button>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="p-2 rounded-lg transition-colors hover:bg-[rgb(var(--aegis-overlay)/0.05)]"
              title="Edit"
            >
              <Edit3 size={14} className="text-aegis-text-dim" />
            </button>
          ) : (
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg transition-colors hover:bg-[rgb(var(--aegis-overlay)/0.05)]"
              title="Cancel edit"
            >
              <X size={14} className="text-aegis-text-dim" />
            </button>
          )}
          <button
            onClick={() => {
              onDelete(doc.id);
              onClose();
            }}
            className="p-2 rounded-lg transition-colors hover:bg-[rgb(var(--aegis-overlay)/0.05)]"
            title="Delete"
          >
            <Trash2 size={14} style={{ color: themeHex('danger') }} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-[rgb(var(--aegis-overlay)/0.05)]"
            title="Close"
          >
            <X size={14} className="text-aegis-text-muted" />
          </button>
        </div>
      </div>

      {/* Tags */}
      {doc.tags.length > 0 && (
        <div
          className="flex items-center gap-1.5 px-5 py-3 shrink-0 flex-wrap"
          style={{ borderBottom: '1px solid rgb(var(--aegis-overlay) / 0.04)' }}
        >
          <Tag size={11} className="text-aegis-text-dim shrink-0" />
          {doc.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-medium px-2 py-0.5 rounded-md text-aegis-text-secondary"
              style={{
                background: 'rgb(var(--aegis-overlay) / 0.04)',
                border: '1px solid rgb(var(--aegis-overlay) / 0.06)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5">
        {editing ? (
          <div className="flex flex-col h-full">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 w-full rounded-xl p-4 text-[13px] text-aegis-text font-mono resize-none focus:outline-none focus:ring-1"
              style={{
                ...glassStyle,
                minHeight: '200px',
              }}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-aegis-text-muted transition-colors"
                style={glassStyle}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                style={{
                  background: themeHex('primary'),
                  color: 'var(--aegis-bg)',
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div
            className="text-[13px] text-aegis-text-secondary leading-relaxed whitespace-pre-wrap"
            style={{ fontFamily: 'inherit' }}
          >
            {doc.content_text}
          </div>
        )}
      </div>

      {/* Footer meta */}
      <div
        className="px-5 py-3 shrink-0 flex items-center justify-between text-[10px] text-aegis-text-dim"
        style={{ borderTop: '1px solid rgb(var(--aegis-overlay) / 0.04)' }}
      >
        <span>By {doc.author} &middot; {doc.source}</span>
        <span>Updated {new Date(doc.updated_at).toLocaleDateString()}</span>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Document Card
// ═══════════════════════════════════════════════════════════

interface DocCardProps {
  doc: VaultDocument;
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  onClick: () => void;
  onTogglePin: (id: string) => void;
}

function DocCard({ doc, viewMode, isSelected, onClick, onTogglePin }: DocCardProps) {
  const colorVar = getCategoryColor(doc.category);
  const FileIcon = getFileIcon(doc.file_type);

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        whileHover={{ x: 2 }}
        onClick={onClick}
        className={clsx(
          'flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all',
          isSelected && 'ring-1',
        )}
        style={{
          ...(isSelected ? glassStyleHover : glassStyle),
          ...(isSelected ? { ringColor: themeAlpha('primary', 0.3) } : {}),
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: themeAlpha(colorVar, 0.08),
            border: `1px solid ${themeAlpha(colorVar, 0.12)}`,
          }}
        >
          <FileIcon size={14} style={{ color: themeHex(colorVar as any) }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-aegis-text truncate">{doc.title}</span>
            {doc.is_pinned && <Pin size={10} style={{ color: themeHex('warning') }} />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                background: themeAlpha(colorVar, 0.06),
                color: themeHex(colorVar as any),
              }}
            >
              {doc.category}
            </span>
            {doc.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[9px] text-aegis-text-dim">{tag}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-[10px] text-aegis-text-dim">
          <span className="flex items-center gap-1"><Eye size={10} /> {doc.access_count}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(doc.id);
            }}
            className="p-1 rounded-md transition-colors hover:bg-[rgb(var(--aegis-overlay)/0.05)]"
          >
            <Pin
              size={12}
              style={doc.is_pinned ? { color: themeHex('warning') } : undefined}
              className={doc.is_pinned ? '' : 'text-aegis-text-dim'}
            />
          </button>
          <ChevronRight size={12} className="text-aegis-text-dim" />
        </div>
      </motion.div>
    );
  }

  // Grid card
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={clsx(
        'relative rounded-2xl p-4 cursor-pointer transition-all overflow-hidden',
        isSelected && 'ring-1',
      )}
      style={{
        ...(isSelected ? glassStyleHover : glassStyle),
        ...(isSelected ? { ringColor: themeAlpha('primary', 0.3) } : {}),
      }}
    >
      {/* Top light edge */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Pin indicator */}
      {doc.is_pinned && (
        <div className="absolute top-3 right-3">
          <Pin size={12} style={{ color: themeHex('warning') }} />
        </div>
      )}

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{
          background: themeAlpha(colorVar, 0.08),
          border: `1px solid ${themeAlpha(colorVar, 0.12)}`,
        }}
      >
        <FileIcon size={18} style={{ color: themeHex(colorVar as any) }} />
      </div>

      {/* Title */}
      <h3 className="text-[13px] font-semibold text-aegis-text truncate mb-1.5 pr-6">{doc.title}</h3>

      {/* Category badge */}
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{
            background: themeAlpha(colorVar, 0.06),
            color: themeHex(colorVar as any),
          }}
        >
          {doc.category}
        </span>
      </div>

      {/* Tags */}
      {doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {doc.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[9px] font-medium px-1.5 py-0.5 rounded text-aegis-text-dim"
              style={{
                background: 'rgb(var(--aegis-overlay) / 0.04)',
              }}
            >
              {tag}
            </span>
          ))}
          {doc.tags.length > 3 && (
            <span className="text-[9px] text-aegis-text-dim">+{doc.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-aegis-text-dim mt-auto pt-2"
        style={{ borderTop: '1px solid rgb(var(--aegis-overlay) / 0.04)' }}
      >
        <span className="flex items-center gap-1"><Eye size={9} /> {doc.access_count} views</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(doc.id);
          }}
          className="p-1 rounded transition-colors hover:bg-[rgb(var(--aegis-overlay)/0.05)]"
          title={doc.is_pinned ? 'Unpin' : 'Pin'}
        >
          <Pin
            size={11}
            style={doc.is_pinned ? { color: themeHex('warning') } : undefined}
            className={doc.is_pinned ? '' : ''}
          />
        </button>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Vault Page
// ═══════════════════════════════════════════════════════════

export function VaultPage() {
  const {
    vault,
    seed,
    addVaultDoc,
    updateVaultDoc,
    deleteVaultDoc,
    toggleVaultPin,
  } = useMissionControlStore();

  // Seed on mount
  useEffect(() => { seed(); }, [seed]);

  // Local state
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Active docs (exclude archived)
  const activeDocs = useMemo(() => vault.filter((d) => !d.is_archived), [vault]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: activeDocs.length };
    for (const doc of activeDocs) {
      counts[doc.category] = (counts[doc.category] || 0) + 1;
    }
    return counts;
  }, [activeDocs]);

  // Filtered docs
  const filteredDocs = useMemo(() => {
    let result = activeDocs;

    if (activeCategory !== 'all') {
      result = result.filter((d) => d.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q)) ||
          d.content_text.toLowerCase().includes(q),
      );
    }

    return result;
  }, [activeDocs, activeCategory, searchQuery]);

  // Separate pinned & unpinned
  const pinnedDocs = useMemo(() => filteredDocs.filter((d) => d.is_pinned), [filteredDocs]);
  const unpinnedDocs = useMemo(() => filteredDocs.filter((d) => !d.is_pinned), [filteredDocs]);

  // Selected doc
  const selectedDoc = useMemo(
    () => (selectedDocId ? vault.find((d) => d.id === selectedDocId) || null : null),
    [vault, selectedDocId],
  );

  // Handlers
  const handleUpload = useCallback(
    (doc: Parameters<typeof addVaultDoc>[0]) => {
      addVaultDoc(doc);
    },
    [addVaultDoc],
  );

  const handleDocClick = useCallback((docId: string) => {
    setSelectedDocId((prev) => (prev === docId ? null : docId));
    // Increment access count
    updateVaultDoc(docId, {});
  }, [updateVaultDoc]);

  return (
    <PageTransition className="p-5 h-full flex flex-col overflow-hidden">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-[24px] font-extrabold text-aegis-text tracking-tight">
            Il Cassetto
          </h1>
          <p className="text-[11px] text-aegis-text-dim uppercase tracking-wider mt-0.5">
            Knowledge Vault
            <span className="mx-1.5 opacity-30">&middot;</span>
            <span style={{ color: themeHex('primary') }}>{activeDocs.length} documents</span>
          </p>
        </div>
      </div>

      {/* ═══ Main Layout ═══ */}
      <div className="flex-1 min-h-0 flex gap-4">
        {/* ── Sidebar (30%) ── */}
        <div
          className="w-[30%] shrink-0 rounded-2xl flex flex-col overflow-hidden"
          style={glassStyle}
        >
          <div
            className="px-4 py-3 shrink-0"
            style={{ borderBottom: '1px solid rgb(var(--aegis-overlay) / 0.05)' }}
          >
            <h2 className="text-[11px] font-bold text-aegis-text-dim uppercase tracking-wider flex items-center gap-1.5">
              <FolderOpen size={12} /> Categories
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto py-1.5">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.key;
              const count = categoryCounts[cat.key] || 0;
              const CatIcon = cat.icon;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={clsx(
                    'w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all',
                    isActive
                      ? 'text-aegis-text'
                      : 'text-aegis-text-secondary hover:text-aegis-text hover:bg-[rgb(var(--aegis-overlay)/0.03)]',
                  )}
                  style={isActive ? {
                    background: themeAlpha('primary', 0.06),
                    borderRight: `2px solid ${themeHex('primary')}`,
                  } : undefined}
                >
                  <CatIcon
                    size={14}
                    style={isActive ? { color: themeHex('primary') } : undefined}
                    className={isActive ? '' : 'text-aegis-text-dim'}
                  />
                  <span className="text-[12px] font-medium flex-1">{cat.label}</span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md min-w-[22px] text-center"
                    style={isActive ? {
                      background: themeAlpha('primary', 0.1),
                      color: themeHex('primary'),
                    } : {
                      background: 'rgb(var(--aegis-overlay) / 0.04)',
                      color: 'rgb(var(--aegis-text-dim))',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main Content (70%) ── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top bar */}
          <div className="flex items-center gap-2 mb-3 shrink-0">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-aegis-text-dim" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full rounded-xl pl-9 pr-3 py-2.5 text-[12px] text-aegis-text placeholder:text-aegis-text-dim focus:outline-none focus:ring-1"
                style={{
                  ...glassStyle,
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-aegis-text-dim hover:text-aegis-text"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* View toggle */}
            <div
              className="flex rounded-xl p-1"
              style={glassStyle}
            >
              <button
                onClick={() => setViewMode('grid')}
                className={clsx(
                  'p-2 rounded-lg transition-all',
                  viewMode === 'grid' ? 'text-aegis-text' : 'text-aegis-text-dim',
                )}
                style={viewMode === 'grid' ? { background: themeAlpha('primary', 0.08) } : undefined}
              >
                <Grid size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'p-2 rounded-lg transition-all',
                  viewMode === 'list' ? 'text-aegis-text' : 'text-aegis-text-dim',
                )}
                style={viewMode === 'list' ? { background: themeAlpha('primary', 0.08) } : undefined}
              >
                <List size={14} />
              </button>
            </div>

            {/* Upload button */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-colors shrink-0"
              style={{
                background: themeHex('primary'),
                color: 'var(--aegis-bg)',
              }}
            >
              <Plus size={14} /> Upload
            </button>
          </div>

          {/* Document area */}
          <div className="flex-1 min-h-0 flex gap-3">
            {/* Document list */}
            <div
              className={clsx(
                'min-h-0 overflow-y-auto transition-all',
                selectedDoc ? 'w-[45%] shrink-0' : 'w-full',
              )}
            >
              {filteredDocs.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{
                      background: themeAlpha('primary', 0.06),
                      border: `2px dashed ${themeAlpha('primary', 0.15)}`,
                    }}
                  >
                    <BookOpen size={28} style={{ color: themeAlpha('primary', 0.3) }} />
                  </div>
                  <h3 className="text-[16px] font-bold text-aegis-text mb-1">
                    {searchQuery ? 'No documents found' : 'No documents yet'}
                  </h3>
                  <p className="text-[12px] text-aegis-text-dim mb-4 max-w-xs">
                    {searchQuery
                      ? 'Try adjusting your search or category filter.'
                      : 'Add your first document to build your knowledge vault.'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold"
                      style={{ background: themeHex('primary'), color: 'var(--aegis-bg)' }}
                    >
                      <Plus size={14} /> Add Document
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  {/* Pinned section */}
                  {pinnedDocs.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Pin size={12} style={{ color: themeHex('warning') }} />
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider"
                          style={{ color: themeHex('warning') }}
                        >
                          Pinned
                        </span>
                        <div
                          className="flex-1 h-px"
                          style={{ background: themeAlpha('warning', 0.15) }}
                        />
                      </div>
                      <div
                        className={clsx(
                          viewMode === 'grid'
                            ? 'grid grid-cols-2 gap-2'
                            : 'flex flex-col gap-1.5',
                        )}
                      >
                        <AnimatePresence mode="popLayout">
                          {pinnedDocs.map((doc) => (
                            <DocCard
                              key={doc.id}
                              doc={doc}
                              viewMode={viewMode}
                              isSelected={selectedDocId === doc.id}
                              onClick={() => handleDocClick(doc.id)}
                              onTogglePin={toggleVaultPin}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* All/Unpinned docs */}
                  {unpinnedDocs.length > 0 && (
                    <div>
                      {pinnedDocs.length > 0 && (
                        <div className="flex items-center gap-2 mb-2">
                          <FileText size={12} className="text-aegis-text-dim" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-aegis-text-dim">
                            All Documents
                          </span>
                          <div
                            className="flex-1 h-px"
                            style={{ background: 'rgb(var(--aegis-overlay) / 0.06)' }}
                          />
                        </div>
                      )}
                      <div
                        className={clsx(
                          viewMode === 'grid'
                            ? 'grid grid-cols-2 gap-2'
                            : 'flex flex-col gap-1.5',
                        )}
                      >
                        <AnimatePresence mode="popLayout">
                          {unpinnedDocs.map((doc) => (
                            <DocCard
                              key={doc.id}
                              doc={doc}
                              viewMode={viewMode}
                              isSelected={selectedDocId === doc.id}
                              onClick={() => handleDocClick(doc.id)}
                              onTogglePin={toggleVaultPin}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Document viewer panel */}
            <AnimatePresence>
              {selectedDoc && (
                <div className="flex-1 min-w-0">
                  <DocViewer
                    key={selectedDoc.id}
                    doc={selectedDoc}
                    onClose={() => setSelectedDocId(null)}
                    onUpdate={updateVaultDoc}
                    onDelete={deleteVaultDoc}
                    onTogglePin={toggleVaultPin}
                  />
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ═══ Upload Modal ═══ */}
      <UploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSubmit={handleUpload}
      />
    </PageTransition>
  );
}
