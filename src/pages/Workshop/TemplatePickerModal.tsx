// ═══════════════════════════════════════════════════════════
// TemplatePickerModal — Template selection + management
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Plus, Trash2, Edit3 } from 'lucide-react';
import clsx from 'clsx';
import { themeHex, themeAlpha } from '@/utils/theme-colors';
import { useWorkshopStore } from '@/stores/workshopStore';
import { TEMPLATE_CATEGORIES, AGENTS, PRIORITY_CONFIG } from './constants';
import type { TaskTemplate, TaskPriority, TemplateSubtask } from './types';

interface TemplatePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: TaskTemplate) => void;
}

export function TemplatePickerModal({ open, onClose, onSelect }: TemplatePickerModalProps) {
  const { templates, deleteTemplate } = useWorkshopStore();
  const [showManage, setShowManage] = useState(false);

  const activeTemplates = templates.filter((t) => t.is_active);

  const handleSelect = (template: TaskTemplate) => {
    onSelect(template);
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
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[600px] max-h-[70vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: 'var(--aegis-bg)',
              border: '1px solid rgb(var(--aegis-overlay) / 0.08)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{
                background: themeAlpha('accent', 0.04),
                borderBottom: '1px solid rgb(var(--aegis-overlay) / 0.06)',
              }}
            >
              <h3 className="text-[16px] font-bold text-aegis-text">
                {showManage ? 'Manage Templates' : 'From Template'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowManage(!showManage)}
                  className="text-[11px] text-aegis-text-muted hover:text-aegis-text-secondary flex items-center gap-1"
                >
                  <Settings size={12} />
                  {showManage ? 'Back' : 'Manage'}
                </button>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-[rgb(var(--aegis-overlay)/0.06)] text-aegis-text-muted"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto scrollbar-hidden px-6 py-4">
              {showManage ? (
                <ManageTemplatesView />
              ) : activeTemplates.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {activeTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onClick={() => handleSelect(template)}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-[12px] text-aegis-text-dim mb-2">
                    No templates yet.
                  </p>
                  <button
                    onClick={() => setShowManage(true)}
                    className="text-[12px] text-aegis-primary hover:underline"
                  >
                    Create your first template
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TemplateCard({
  template,
  onClick,
}: {
  template: TaskTemplate;
  onClick: () => void;
}) {
  const cat = TEMPLATE_CATEGORIES[template.category] ?? { label: template.category, colorVar: 'primary' };

  return (
    <div
      onClick={onClick}
      className="rounded-xl border p-4 cursor-pointer transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:border-[rgb(var(--aegis-overlay)/0.12)]"
      style={{
        background: 'rgb(var(--aegis-overlay) / 0.02)',
        borderColor: 'rgb(var(--aegis-overlay) / 0.07)',
      }}
    >
      {/* Category badge */}
      <span
        className="text-[9px] px-2 py-[2px] rounded font-bold uppercase tracking-wider"
        style={{
          color: themeHex(cat.colorVar as any),
          background: themeAlpha(cat.colorVar, 0.1),
        }}
      >
        {cat.label}
      </span>

      <h4 className="text-[13px] font-semibold text-aegis-text mt-2 mb-1">{template.name}</h4>
      <p className="text-[11px] text-aegis-text-muted line-clamp-2 mb-2">{template.description}</p>

      <div className="flex items-center gap-3 text-[10px] text-aegis-text-dim">
        {template.subtasks.length > 0 && (
          <span>{template.subtasks.length} subtasks</span>
        )}
        <span>Used {template.usage_count}x</span>
        {template.default_agent_slug && (
          <span>→ {template.default_agent_slug}</span>
        )}
      </div>
    </div>
  );
}

function ManageTemplatesView() {
  const { templates, addTemplate, deleteTemplate, updateTemplate } = useWorkshopStore();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  if (showCreate || editId) {
    return (
      <TemplateForm
        template={editId ? templates.find((t) => t.id === editId) : undefined}
        onSave={(data) => {
          if (editId) {
            updateTemplate(editId, data);
          } else {
            addTemplate(data as any);
          }
          setShowCreate(false);
          setEditId(null);
        }}
        onCancel={() => {
          setShowCreate(false);
          setEditId(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowCreate(true)}
        className="flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-xl transition-colors w-full justify-center"
        style={{
          color: themeHex('primary'),
          background: themeAlpha('primary', 0.06),
          border: `1px solid ${themeAlpha('primary', 0.12)}`,
        }}
      >
        <Plus size={14} /> New Template
      </button>

      {templates.map((template) => (
        <div
          key={template.id}
          className="flex items-center gap-3 p-3 rounded-xl border"
          style={{
            background: 'rgb(var(--aegis-overlay) / 0.02)',
            borderColor: 'rgb(var(--aegis-overlay) / 0.06)',
          }}
        >
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-aegis-text">{template.name}</div>
            <div className="text-[10px] text-aegis-text-dim">{template.description}</div>
          </div>
          <button
            onClick={() => setEditId(template.id)}
            className="p-1.5 rounded-lg hover:bg-[rgb(var(--aegis-overlay)/0.06)] text-aegis-text-dim"
          >
            <Edit3 size={12} />
          </button>
          <button
            onClick={() => deleteTemplate(template.id)}
            className="p-1.5 rounded-lg hover:bg-aegis-danger/5 text-aegis-text-dim hover:text-aegis-danger"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      {templates.length === 0 && (
        <p className="text-[11px] text-aegis-text-dim text-center py-8">
          No templates created yet.
        </p>
      )}
    </div>
  );
}

function TemplateForm({
  template,
  onSave,
  onCancel,
}: {
  template?: TaskTemplate;
  onSave: (data: Partial<TaskTemplate>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [category, setCategory] = useState(template?.category ?? 'client');
  const [priority, setPriority] = useState<TaskPriority>(template?.default_priority ?? 'medium');
  const [agentSlug, setAgentSlug] = useState(template?.default_agent_slug ?? '');
  const [estimatedHours, setEstimatedHours] = useState(template?.default_estimated_hours?.toString() ?? '');
  const [tags, setTags] = useState(template?.default_tags?.join(', ') ?? '');
  const [instructions, setInstructions] = useState(template?.instructions_md ?? '');
  const [subtasks, setSubtasks] = useState<TemplateSubtask[]>(template?.subtasks ?? []);

  const inputStyle = {
    background: 'rgb(var(--aegis-overlay) / 0.04)',
    border: '1px solid rgb(var(--aegis-overlay) / 0.08)',
  };
  const inputClass =
    'w-full rounded-xl px-3 py-2 text-[12px] text-aegis-text placeholder:text-aegis-text-dim focus:outline-none focus:ring-1 focus:ring-aegis-primary/30';

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      category,
      default_priority: priority,
      default_agent_slug: agentSlug || null,
      default_estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
      default_tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      instructions_md: instructions,
      subtasks,
      is_active: true,
    });
  };

  return (
    <div className="space-y-3">
      <h4 className="text-[13px] font-bold text-aegis-text mb-3">
        {template ? 'Edit Template' : 'New Template'}
      </h4>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Template name"
        className={inputClass}
        style={inputStyle}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={2}
        className={clsx(inputClass, 'resize-none')}
        style={inputStyle}
      />

      <div className="grid grid-cols-2 gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} style={inputStyle}>
          {Object.entries(TEMPLATE_CATEGORIES).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={inputClass} style={inputStyle}>
          {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      <select value={agentSlug} onChange={(e) => setAgentSlug(e.target.value)} className={inputClass} style={inputStyle}>
        <option value="">Default Agent (none)</option>
        {AGENTS.map((a) => (
          <option key={a.slug} value={a.slug}>{a.emoji} {a.name}</option>
        ))}
      </select>

      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Instructions (Markdown)"
        rows={4}
        className={clsx(inputClass, 'resize-none font-mono')}
        style={inputStyle}
      />

      {/* Subtasks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-aegis-text-dim uppercase tracking-wider font-semibold">Subtasks</span>
          <button
            onClick={() => setSubtasks([...subtasks, { title: '', agent_slug: null, estimated_hours: null }])}
            className="text-[10px] text-aegis-primary"
          >
            + Add
          </button>
        </div>
        {subtasks.map((st, i) => (
          <div key={i} className="flex items-center gap-2 mb-1.5">
            <input
              value={st.title}
              onChange={(e) => {
                const upd = [...subtasks];
                upd[i] = { ...upd[i], title: e.target.value };
                setSubtasks(upd);
              }}
              placeholder="Subtask title"
              className="flex-1 rounded-lg px-2 py-1 text-[11px] text-aegis-text focus:outline-none"
              style={inputStyle}
            />
            <select
              value={st.agent_slug ?? ''}
              onChange={(e) => {
                const upd = [...subtasks];
                upd[i] = { ...upd[i], agent_slug: e.target.value || null };
                setSubtasks(upd);
              }}
              className="rounded-lg px-2 py-1 text-[10px] w-24"
              style={inputStyle}
            >
              <option value="">Agent</option>
              {AGENTS.map((a) => (
                <option key={a.slug} value={a.slug}>{a.name}</option>
              ))}
            </select>
            <button
              onClick={() => setSubtasks(subtasks.filter((_, j) => j !== i))}
              className="text-aegis-text-dim hover:text-aegis-danger"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-[12px] text-aegis-text-muted"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="px-4 py-1.5 rounded-xl text-[12px] font-medium disabled:opacity-40"
          style={{ background: themeHex('primary'), color: 'var(--aegis-bg)' }}
        >
          {template ? 'Update' : 'Create'} Template
        </button>
      </div>
    </div>
  );
}
