// ═══════════════════════════════════════════════════════════
// Il Palcoscenico — Trunk Shows & Events
// Layout: Stats Row → Kanban Board → Slide-over Detail Panel
// Kanban columns: planning, confirmed, invitations_sent, active, completed
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Users, DollarSign, Plus, X, ChevronRight,
  TrendingUp, Mail, UserCheck, Target, Clock, Edit3, Save,
  UserPlus, Send, CheckCircle2, Ticket,
  Building, BarChart3, FileText, Star,
} from 'lucide-react';
import { PageTransition } from '@/components/shared/PageTransition';
import { useMissionControlStore } from '@/stores/missionControlStore';
import type { TrunkShow, TrunkShowInvitation } from '@/stores/missionControlStore';
import { themeHex, themeAlpha } from '@/utils/theme-colors';
import clsx from 'clsx';

// ── Constants ─────────────────────────────────────────────

type EventStatus = TrunkShow['status'];

const KANBAN_COLUMNS: {
  key: EventStatus;
  label: string;
  colorVar: string;
  icon: typeof Calendar;
}[] = [
  { key: 'planning', label: 'Planning', colorVar: 'accent', icon: Edit3 },
  { key: 'confirmed', label: 'Confirmed', colorVar: 'primary', icon: CheckCircle2 },
  { key: 'invitations_sent', label: 'Invitations Sent', colorVar: 'warning', icon: Send },
  { key: 'active', label: 'Active', colorVar: 'success', icon: Star },
  { key: 'completed', label: 'Completed', colorVar: 'primary', icon: Target },
];

const ALL_STATUS_OPTIONS: { key: EventStatus; label: string }[] = [
  { key: 'planning', label: 'Planning' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'invitations_sent', label: 'Invitations Sent' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const INVITATION_STATUS_COLORS: Record<string, string> = {
  pending: 'accent',
  sent: 'primary',
  opened: 'warning',
  rsvp_yes: 'success',
  rsvp_no: 'danger',
  attended: 'success',
  no_show: 'danger',
};

// ── Helpers ───────────────────────────────────────────────

const glassStyle = {
  background: 'rgb(var(--aegis-overlay) / 0.025)',
  border: '1px solid rgb(var(--aegis-overlay) / 0.07)',
};

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateRange(start: string, end: string): string {
  const s = formatDateShort(start);
  const e = formatDateShort(end);
  if (s === e) return s;
  return `${s} - ${e}`;
}

function formatCurrency(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `$${n.toLocaleString()}`;
}

function formatCurrencyFull(n: number): string {
  return `$${n.toLocaleString()}`;
}

function progressPercent(actual: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(Math.round((actual / target) * 100), 100);
}

// ═══════════════════════════════════════════════════════════
// Stats Row
// ═══════════════════════════════════════════════════════════

function StatsRow({
  trunkShows,
  invitations,
}: {
  trunkShows: TrunkShow[];
  invitations: TrunkShowInvitation[];
}) {
  const upcoming = trunkShows.filter(
    (ts) => ts.status !== 'completed' && ts.status !== 'cancelled',
  ).length;

  const totalInvitations = invitations.length;

  const rsvps = invitations.filter(
    (i) => i.status === 'rsvp_yes' || i.status === 'attended',
  ).length;

  const projectedRevenue = trunkShows
    .filter((ts) => ts.status !== 'completed' && ts.status !== 'cancelled')
    .reduce((sum, ts) => sum + ts.target_revenue, 0);

  const stats = [
    { label: 'Upcoming Events', value: String(upcoming), colorVar: 'primary', icon: Calendar },
    { label: 'Total Invitations', value: String(totalInvitations), colorVar: 'accent', icon: Mail },
    { label: 'RSVPs', value: String(rsvps), colorVar: 'success', icon: UserCheck },
    {
      label: 'Projected Revenue',
      value: formatCurrency(projectedRevenue),
      colorVar: 'warning',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 rounded-xl p-3 transition-colors"
          style={{
            background: 'rgb(var(--aegis-overlay) / 0.025)',
            border: '1px solid rgb(var(--aegis-overlay) / 0.06)',
          }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: themeAlpha(stat.colorVar, 0.08),
              border: `1px solid ${themeAlpha(stat.colorVar, 0.12)}`,
            }}
          >
            <stat.icon size={16} style={{ color: themeHex(stat.colorVar as any) }} />
          </div>
          <div className="min-w-0">
            <div
              className="text-[20px] font-bold leading-none"
              style={{ color: themeHex(stat.colorVar as any) }}
            >
              {stat.value}
            </div>
            <div className="text-[9px] text-aegis-text-dim uppercase tracking-wider mt-0.5 truncate">
              {stat.label}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Event Card (Kanban)
// ═══════════════════════════════════════════════════════════

interface EventCardProps {
  event: TrunkShow;
  colorVar: string;
  onClick: () => void;
}

function KanbanEventCard({ event, colorVar, onClick }: EventCardProps) {
  const budgetPct = progressPercent(event.actual_spend, event.budget);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="relative rounded-xl p-3.5 cursor-pointer transition-all overflow-hidden group"
      style={glassStyle}
    >
      {/* Top edge light */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Event name */}
      <h4 className="text-[13px] font-semibold text-aegis-text mb-2 pr-4 leading-tight">
        {event.event_name}
      </h4>

      {/* Location and dates */}
      <div className="space-y-1 mb-3">
        <div className="flex items-center gap-1.5 text-[11px] text-aegis-text-secondary">
          <MapPin size={11} className="text-aegis-text-dim shrink-0" />
          <span className="truncate">
            {event.city}, {event.state}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-aegis-text-secondary">
          <Calendar size={11} className="text-aegis-text-dim shrink-0" />
          <span>{formatDateRange(event.start_date, event.end_date)}</span>
        </div>
      </div>

      {/* Invitation / RSVP counts */}
      <div className="flex items-center gap-3 mb-2.5">
        <div className="flex items-center gap-1 text-[10px] text-aegis-text-dim">
          <Mail size={10} /> {event.invitation_count}
        </div>
        <div
          className="flex items-center gap-1 text-[10px]"
          style={{ color: themeHex('success') }}
        >
          <UserCheck size={10} /> {event.rsvp_count}
        </div>
      </div>

      {/* Budget indicator */}
      <div>
        <div className="flex items-center justify-between text-[9px] text-aegis-text-dim mb-1">
          <span>Budget</span>
          <span>
            {formatCurrency(event.actual_spend)} / {formatCurrency(event.budget)}
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgb(var(--aegis-overlay) / 0.06)' }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${budgetPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background:
                budgetPct > 90
                  ? themeHex('danger')
                  : budgetPct > 70
                    ? themeHex('warning')
                    : themeHex(colorVar as any),
            }}
          />
        </div>
      </div>

      {/* Hover arrow */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight size={14} className="text-aegis-text-dim" />
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Create Event Modal
// ═══════════════════════════════════════════════════════════

interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (event: Omit<TrunkShow, 'id' | 'created_at'>) => void;
}

function CreateEventModal({ open, onClose, onSubmit }: CreateEventModalProps) {
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState('trunk_show');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [venueName, setVenueName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [targetRevenue, setTargetRevenue] = useState('');
  const [targetAppointments, setTargetAppointments] = useState('');
  const [targetOrders, setTargetOrders] = useState('');

  const resetForm = () => {
    setEventName('');
    setEventType('trunk_show');
    setCity('');
    setState('');
    setVenueName('');
    setStartDate('');
    setEndDate('');
    setBudget('');
    setTargetRevenue('');
    setTargetAppointments('');
    setTargetOrders('');
  };

  const handleSubmit = () => {
    if (!eventName.trim() || !city.trim() || !startDate) return;
    onSubmit({
      event_name: eventName.trim(),
      event_type: eventType,
      city: city.trim(),
      state: state.trim(),
      venue_name: venueName.trim(),
      start_date: startDate,
      end_date: endDate || startDate,
      status: 'planning',
      budget: Number(budget) || 0,
      actual_spend: 0,
      target_revenue: Number(targetRevenue) || 0,
      actual_revenue: 0,
      target_appointments: Number(targetAppointments) || 0,
      actual_appointments: 0,
      target_orders: Number(targetOrders) || 0,
      actual_orders: 0,
      invitation_count: 0,
      rsvp_count: 0,
      notes: '',
      team_members: [],
    });
    resetForm();
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
            className="w-[520px] max-h-[85vh] overflow-y-auto rounded-2xl p-6 shadow-2xl"
            style={{
              background: 'var(--aegis-bg)',
              border: '1px solid rgb(var(--aegis-overlay) / 0.08)',
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-bold text-aegis-text flex items-center gap-2">
                <Calendar size={18} style={{ color: themeHex('primary') }} />
                New Event
              </h3>
              <button
                onClick={onClose}
                className="text-aegis-text-muted hover:text-aegis-text transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-aegis-text-dim uppercase tracking-wider mb-1 block">
                  Event Name
                </label>
                <input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Greenwich Spring Preview"
                  className="w-full rounded-xl px-3 py-2.5 text-[13px] text-aegis-text placeholder:text-aegis-text-dim focus:outline-none"
                  style={glassStyle}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-aegis-text-dim uppercase tracking-wider mb-1 block">
                  Event Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-[13px] text-aegis-text cursor-pointer focus:outline-none"
                  style={glassStyle}
                >
                  <option value="trunk_show">Trunk Show</option>
                  <option value="private_event">Private Event</option>
                  <option value="pop_up">Pop-Up</option>
                  <option value="fitting_event">Fitting Event</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-aegis-text-dim uppercase tracking-wider mb-1 block">
                    City
                  </label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full rounded-xl px-3 py-2.5 text-[13px] text-aegis-text placeholder:text-aegis-text-dim focus:outline-none"
                    style={glassStyle}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-aegis-text-dim uppercase tracking-wider mb-1 block">
                    State
                  </label>
                  <input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="ST"
                    className="w-full rounded-xl px-3 py-2.5 text-[13px] text-aegis-text placeholder:text-aegis-text-dim focus:outline-none"
                    style={glassStyle}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-aegis-text-dim uppercase tracking-wider mb-1 block">
                    Venue
                  </label>
                  <input
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="Venue"
                    className="w-full rounded-xl px-3 py-2.5 text-[13px] text-aegis-text placeholder:text-aegis-text-dim focus:outline-none"
                    style={glassStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-aegis-text-dim uppercase tracking-wider mb-1 block">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-[13px] text-aegis-text focus:outline-none"
                    style={glassStyle}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-aegis-text-dim uppercase tracking-wider mb-1 block">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-[13px] text-aegis-text focus:outline-none"
                    style={glassStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-aegis-text-dim uppercase tracking-wider mb-1 block">
                    Budget ($)
                  </label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl px-3 py-2.5 text-[13px] text-aegis-text placeholder:text-aegis-text-dim focus:outline-none"
                    style={glassStyle}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-aegis-text-dim uppercase tracking-wider mb-1 block">
                    Target Revenue ($)
                  </label>
                  <input
                    type="number"
                    value={targetRevenue}
                    onChange={(e) => setTargetRevenue(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl px-3 py-2.5 text-[13px] text-aegis-text placeholder:text-aegis-text-dim focus:outline-none"
                    style={glassStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-aegis-text-dim uppercase tracking-wider mb-1 block">
                    Target Appointments
                  </label>
                  <input
                    type="number"
                    value={targetAppointments}
                    onChange={(e) => setTargetAppointments(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl px-3 py-2.5 text-[13px] text-aegis-text placeholder:text-aegis-text-dim focus:outline-none"
                    style={glassStyle}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-aegis-text-dim uppercase tracking-wider mb-1 block">
                    Target Orders
                  </label>
                  <input
                    type="number"
                    value={targetOrders}
                    onChange={(e) => setTargetOrders(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl px-3 py-2.5 text-[13px] text-aegis-text placeholder:text-aegis-text-dim focus:outline-none"
                    style={glassStyle}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-[12px] font-medium text-aegis-text-muted transition-colors"
                style={glassStyle}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!eventName.trim() || !city.trim() || !startDate}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: themeHex('primary'), color: 'var(--aegis-bg)' }}
              >
                <Plus size={14} /> Create Event
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════
// Progress Bar Component
// ═══════════════════════════════════════════════════════════

function ProgressBar({
  actual,
  target,
  label,
  colorVar,
  formatFn = (n: number) => String(n),
}: {
  actual: number;
  target: number;
  label: string;
  colorVar: string;
  formatFn?: (n: number) => string;
}) {
  const pct = progressPercent(actual, target);
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1.5">
        <span className="text-aegis-text-secondary font-medium">{label}</span>
        <span className="text-aegis-text-dim">
          {formatFn(actual)} / {formatFn(target)}{' '}
          <span style={{ color: themeHex(colorVar as any) }}>({pct}%)</span>
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: 'rgb(var(--aegis-overlay) / 0.06)' }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: themeHex(colorVar as any) }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Detail Panel (Slide-over from right, 60% width)
// ═══════════════════════════════════════════════════════════

interface DetailPanelProps {
  event: TrunkShow | null;
  invitations: TrunkShowInvitation[];
  onClose: () => void;
  onUpdateEvent: (id: string, updates: Partial<TrunkShow>) => void;
  onAddInvitation: (inv: Omit<TrunkShowInvitation, 'id' | 'created_at'>) => void;
  onUpdateInvitation: (id: string, updates: Partial<TrunkShowInvitation>) => void;
}

function DetailPanel({
  event,
  invitations,
  onClose,
  onUpdateEvent,
  onAddInvitation,
  onUpdateInvitation,
}: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'guests' | 'notes'>('overview');
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');

  // Reset tab when event changes
  useEffect(() => {
    setActiveTab('overview');
    setShowAddGuest(false);
    setEditingNotes(false);
    if (event) setNotesValue(event.notes);
  }, [event?.id]);

  if (!event) return null;

  const eventInvitations = invitations.filter((i) => i.trunk_show_id === event.id);

  const tabs: { key: 'overview' | 'guests' | 'notes'; label: string; icon: typeof BarChart3 }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'guests', label: 'Guest List', icon: Users },
    { key: 'notes', label: 'Notes', icon: FileText },
  ];

  const handleAddGuest = () => {
    if (!guestName.trim() || !guestEmail.trim()) return;
    onAddInvitation({
      trunk_show_id: event.id,
      invited_name: guestName.trim(),
      invited_email: guestEmail.trim(),
      status: 'pending',
      appointment_time: null,
      order_value: null,
    });
    onUpdateEvent(event.id, { invitation_count: event.invitation_count + 1 });
    setGuestName('');
    setGuestEmail('');
    setShowAddGuest(false);
  };

  const handleSaveNotes = () => {
    onUpdateEvent(event.id, { notes: notesValue });
    setEditingNotes(false);
  };

  const handleStatusChange = (newStatus: EventStatus) => {
    onUpdateEvent(event.id, { status: newStatus });
  };

  const columnCfg = KANBAN_COLUMNS.find((c) => c.key === event.status);
  const statusColorVar = columnCfg?.colorVar || 'primary';

  return (
    <AnimatePresence>
      {event && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-[60%] max-w-[800px] flex flex-col overflow-hidden shadow-2xl"
            style={{
              background: 'var(--aegis-bg)',
              borderLeft: '1px solid rgb(var(--aegis-overlay) / 0.08)',
            }}
          >
            {/* Header */}
            <div
              className="px-6 py-5 shrink-0"
              style={{ borderBottom: '1px solid rgb(var(--aegis-overlay) / 0.06)' }}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-[20px] font-bold text-aegis-text">{event.event_name}</h2>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-[12px] text-aegis-text-secondary">
                      <MapPin size={12} /> {event.city}, {event.state}
                    </span>
                    <span className="flex items-center gap-1 text-[12px] text-aegis-text-secondary">
                      <Building size={12} /> {event.venue_name}
                    </span>
                    <span className="flex items-center gap-1 text-[12px] text-aegis-text-secondary">
                      <Calendar size={12} /> {formatDateRange(event.start_date, event.end_date)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {/* Status dropdown */}
                  <select
                    value={event.status}
                    onChange={(e) => handleStatusChange(e.target.value as EventStatus)}
                    className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg cursor-pointer focus:outline-none"
                    style={{
                      background: themeAlpha(statusColorVar, 0.08),
                      border: `1px solid ${themeAlpha(statusColorVar, 0.15)}`,
                      color: themeHex(statusColorVar as any),
                    }}
                  >
                    {ALL_STATUS_OPTIONS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg transition-colors hover:bg-[rgb(var(--aegis-overlay)/0.05)]"
                  >
                    <X size={16} className="text-aegis-text-muted" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 mt-4">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.key;
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={clsx(
                        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all',
                        isActive
                          ? 'text-aegis-text'
                          : 'text-aegis-text-dim hover:text-aegis-text-muted',
                      )}
                      style={
                        isActive
                          ? {
                              background: themeAlpha('primary', 0.06),
                              border: `1px solid ${themeAlpha('primary', 0.12)}`,
                            }
                          : { border: '1px solid transparent' }
                      }
                    >
                      <TabIcon size={12} />
                      {tab.label}
                      {tab.key === 'guests' && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-md ml-0.5"
                          style={{
                            background: themeAlpha('primary', 0.08),
                            color: themeHex('primary'),
                          }}
                        >
                          {eventInvitations.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
              {/* ── Overview ── */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  {/* Key metrics grid */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      {
                        label: 'Invitations',
                        value: event.invitation_count,
                        icon: Mail,
                        colorVar: 'accent',
                      },
                      {
                        label: 'RSVPs',
                        value: event.rsvp_count,
                        icon: UserCheck,
                        colorVar: 'success',
                      },
                      {
                        label: 'Appointments',
                        value: `${event.actual_appointments}/${event.target_appointments}`,
                        icon: Calendar,
                        colorVar: 'primary',
                      },
                      {
                        label: 'Orders',
                        value: `${event.actual_orders}/${event.target_orders}`,
                        icon: Ticket,
                        colorVar: 'warning',
                      },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-xl p-3 text-center" style={glassStyle}>
                        <metric.icon
                          size={16}
                          className="mx-auto mb-1.5"
                          style={{ color: themeHex(metric.colorVar as any) }}
                        />
                        <div
                          className="text-[18px] font-bold"
                          style={{ color: themeHex(metric.colorVar as any) }}
                        >
                          {metric.value}
                        </div>
                        <div className="text-[9px] text-aegis-text-dim uppercase tracking-wider mt-0.5">
                          {metric.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Budget and revenue progress */}
                  <div className="rounded-xl p-4" style={glassStyle}>
                    <h3 className="text-[12px] font-bold text-aegis-text uppercase tracking-wider mb-4 flex items-center gap-2">
                      <DollarSign size={14} style={{ color: themeHex('warning') }} />
                      Budget &amp; Revenue
                    </h3>
                    <div className="space-y-4">
                      <ProgressBar
                        actual={event.actual_spend}
                        target={event.budget}
                        label="Budget Spent"
                        colorVar={event.actual_spend > event.budget ? 'danger' : 'warning'}
                        formatFn={formatCurrencyFull}
                      />
                      <ProgressBar
                        actual={event.actual_revenue}
                        target={event.target_revenue}
                        label="Revenue"
                        colorVar="success"
                        formatFn={formatCurrencyFull}
                      />
                      <ProgressBar
                        actual={event.actual_appointments}
                        target={event.target_appointments}
                        label="Appointments"
                        colorVar="primary"
                      />
                      <ProgressBar
                        actual={event.actual_orders}
                        target={event.target_orders}
                        label="Orders"
                        colorVar="accent"
                      />
                    </div>
                  </div>

                  {/* Event details card */}
                  <div className="rounded-xl p-4" style={glassStyle}>
                    <h3 className="text-[12px] font-bold text-aegis-text uppercase tracking-wider mb-3 flex items-center gap-2">
                      <FileText size={14} style={{ color: themeHex('primary') }} />
                      Event Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-[12px]">
                      <div>
                        <span className="text-aegis-text-dim">Type</span>
                        <div className="text-aegis-text font-medium mt-0.5 capitalize">
                          {event.event_type.replace(/_/g, ' ')}
                        </div>
                      </div>
                      <div>
                        <span className="text-aegis-text-dim">Venue</span>
                        <div className="text-aegis-text font-medium mt-0.5">{event.venue_name}</div>
                      </div>
                      <div>
                        <span className="text-aegis-text-dim">Start</span>
                        <div className="text-aegis-text font-medium mt-0.5">
                          {new Date(event.start_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                      <div>
                        <span className="text-aegis-text-dim">End</span>
                        <div className="text-aegis-text font-medium mt-0.5">
                          {new Date(event.end_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                      {event.team_members.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-aegis-text-dim">Team</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {event.team_members.map((member) => (
                              <span
                                key={member}
                                className="text-[10px] font-medium px-2 py-0.5 rounded-md text-aegis-text-secondary"
                                style={{
                                  background: 'rgb(var(--aegis-overlay) / 0.04)',
                                  border: '1px solid rgb(var(--aegis-overlay) / 0.06)',
                                }}
                              >
                                {member}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Guest List ── */}
              {activeTab === 'guests' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-bold text-aegis-text">
                      Guest List ({eventInvitations.length})
                    </h3>
                    <button
                      onClick={() => setShowAddGuest(!showAddGuest)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors"
                      style={{
                        background: themeHex('primary'),
                        color: 'var(--aegis-bg)',
                      }}
                    >
                      <UserPlus size={12} /> Add Guest
                    </button>
                  </div>

                  {/* Add guest inline form */}
                  <AnimatePresence>
                    {showAddGuest && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-4"
                      >
                        <div className="rounded-xl p-4" style={glassStyle}>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <input
                              value={guestName}
                              onChange={(e) => setGuestName(e.target.value)}
                              placeholder="Guest name"
                              className="rounded-lg px-3 py-2 text-[12px] text-aegis-text placeholder:text-aegis-text-dim focus:outline-none"
                              style={glassStyle}
                            />
                            <input
                              value={guestEmail}
                              onChange={(e) => setGuestEmail(e.target.value)}
                              placeholder="Email address"
                              className="rounded-lg px-3 py-2 text-[12px] text-aegis-text placeholder:text-aegis-text-dim focus:outline-none"
                              style={glassStyle}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setShowAddGuest(false)}
                              className="px-3 py-1.5 rounded-lg text-[11px] text-aegis-text-muted"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleAddGuest}
                              disabled={!guestName.trim() || !guestEmail.trim()}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-40 transition-colors"
                              style={{
                                background: themeHex('primary'),
                                color: 'var(--aegis-bg)',
                              }}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Invitation table */}
                  {eventInvitations.length === 0 ? (
                    <div className="text-center py-12">
                      <Users size={32} className="mx-auto mb-3 text-aegis-text-dim opacity-30" />
                      <p className="text-[13px] text-aegis-text-dim">No guests added yet.</p>
                      <p className="text-[11px] text-aegis-text-dim mt-1">
                        Click &ldquo;Add Guest&rdquo; to start building your list.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden" style={glassStyle}>
                      <table className="w-full">
                        <thead>
                          <tr
                            style={{
                              borderBottom: '1px solid rgb(var(--aegis-overlay) / 0.06)',
                            }}
                          >
                            <th className="text-left text-[10px] font-bold text-aegis-text-dim uppercase tracking-wider px-4 py-2.5">
                              Name
                            </th>
                            <th className="text-left text-[10px] font-bold text-aegis-text-dim uppercase tracking-wider px-4 py-2.5">
                              Email
                            </th>
                            <th className="text-left text-[10px] font-bold text-aegis-text-dim uppercase tracking-wider px-4 py-2.5">
                              Status
                            </th>
                            <th className="text-right text-[10px] font-bold text-aegis-text-dim uppercase tracking-wider px-4 py-2.5">
                              Order Value
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {eventInvitations.map((inv) => {
                            const statusColor = INVITATION_STATUS_COLORS[inv.status] || 'primary';
                            return (
                              <tr
                                key={inv.id}
                                className="transition-colors hover:bg-[rgb(var(--aegis-overlay)/0.02)]"
                                style={{
                                  borderBottom: '1px solid rgb(var(--aegis-overlay) / 0.04)',
                                }}
                              >
                                <td className="px-4 py-3 text-[12px] text-aegis-text font-medium">
                                  {inv.invited_name}
                                </td>
                                <td className="px-4 py-3 text-[12px] text-aegis-text-secondary">
                                  {inv.invited_email}
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={inv.status}
                                    onChange={(e) =>
                                      onUpdateInvitation(inv.id, {
                                        status: e.target.value as TrunkShowInvitation['status'],
                                      })
                                    }
                                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md cursor-pointer focus:outline-none"
                                    style={{
                                      background: themeAlpha(statusColor, 0.08),
                                      color: themeHex(statusColor as any),
                                      border: `1px solid ${themeAlpha(statusColor, 0.12)}`,
                                    }}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="sent">Sent</option>
                                    <option value="opened">Opened</option>
                                    <option value="rsvp_yes">RSVP Yes</option>
                                    <option value="rsvp_no">RSVP No</option>
                                    <option value="attended">Attended</option>
                                    <option value="no_show">No Show</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3 text-right text-[12px] text-aegis-text-secondary">
                                  {inv.order_value ? formatCurrencyFull(inv.order_value) : '--'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Notes ── */}
              {activeTab === 'notes' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-bold text-aegis-text">Event Notes</h3>
                    {!editingNotes ? (
                      <button
                        onClick={() => {
                          setNotesValue(event.notes);
                          setEditingNotes(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-aegis-text-secondary transition-colors"
                        style={glassStyle}
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingNotes(false)}
                          className="px-3 py-1.5 rounded-lg text-[11px] text-aegis-text-muted"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveNotes}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                          style={{
                            background: themeHex('primary'),
                            color: 'var(--aegis-bg)',
                          }}
                        >
                          <Save size={11} /> Save
                        </button>
                      </div>
                    )}
                  </div>

                  {editingNotes ? (
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      rows={12}
                      className="w-full rounded-xl p-4 text-[13px] text-aegis-text font-mono resize-none focus:outline-none"
                      style={glassStyle}
                      placeholder="Add event notes..."
                    />
                  ) : event.notes ? (
                    <div
                      className="rounded-xl p-4 text-[13px] text-aegis-text-secondary leading-relaxed whitespace-pre-wrap"
                      style={glassStyle}
                    >
                      {event.notes}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText
                        size={32}
                        className="mx-auto mb-3 text-aegis-text-dim opacity-30"
                      />
                      <p className="text-[13px] text-aegis-text-dim">No notes yet.</p>
                      <button
                        onClick={() => {
                          setNotesValue('');
                          setEditingNotes(true);
                        }}
                        className="mt-2 text-[12px] font-medium transition-colors"
                        style={{ color: themeHex('primary') }}
                      >
                        Add notes
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Events Page
// ═══════════════════════════════════════════════════════════

export function EventsPage() {
  const {
    trunkShows,
    invitations,
    seed,
    addTrunkShow,
    updateTrunkShow,
    addInvitation,
    updateInvitation,
  } = useMissionControlStore();

  // Seed on mount
  useEffect(() => {
    seed();
  }, [seed]);

  // Local state
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Selected event object
  const selectedEvent = useMemo(
    () => (selectedEventId ? trunkShows.find((ts) => ts.id === selectedEventId) || null : null),
    [trunkShows, selectedEventId],
  );

  // Group events into kanban columns (exclude cancelled)
  const columns = useMemo(() => {
    return KANBAN_COLUMNS.map((col) => ({
      ...col,
      events: trunkShows.filter((ts) => ts.status === col.key),
    }));
  }, [trunkShows]);

  // Handler for creating new events
  const handleCreateEvent = useCallback(
    (event: Omit<TrunkShow, 'id' | 'created_at'>) => {
      addTrunkShow(event);
    },
    [addTrunkShow],
  );

  return (
    <PageTransition className="p-5 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 shrink-0">
        <div>
          <h1 className="text-[24px] font-extrabold text-aegis-text tracking-tight">
            Il Palcoscenico
          </h1>
          <p className="text-[11px] text-aegis-text-dim uppercase tracking-wider mt-0.5">
            Trunk Shows &amp; Events
            <span className="mx-1.5 opacity-30">&middot;</span>
            <span style={{ color: themeHex('primary') }}>{trunkShows.length} events</span>
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-colors"
          style={{
            background: themeHex('primary'),
            color: 'var(--aegis-bg)',
          }}
        >
          <Plus size={14} /> New Event
        </button>
      </div>

      {/* Stats Row */}
      <div className="shrink-0 mt-3">
        <StatsRow trunkShows={trunkShows} invitations={invitations} />
      </div>

      {/* Kanban Board */}
      <div className="flex-1 min-h-0 flex gap-3 overflow-x-auto pb-2">
        {columns.map((col, colIdx) => (
          <motion.div
            key={col.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: colIdx * 0.05 }}
            className="flex-1 min-w-[220px] max-w-[280px] flex flex-col rounded-2xl overflow-hidden"
            style={glassStyle}
          >
            {/* Column header */}
            <div
              className="px-3.5 py-3 shrink-0 flex items-center justify-between"
              style={{ borderBottom: '1px solid rgb(var(--aegis-overlay) / 0.05)' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: themeAlpha(col.colorVar, 0.1) }}
                >
                  <col.icon size={12} style={{ color: themeHex(col.colorVar as any) }} />
                </div>
                <span className="text-[11px] font-bold text-aegis-text uppercase tracking-wider">
                  {col.label}
                </span>
              </div>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{
                  background: themeAlpha(col.colorVar, 0.08),
                  color: themeHex(col.colorVar as any),
                }}
              >
                {col.events.length}
              </span>
            </div>

            {/* Column cards */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              <AnimatePresence mode="popLayout">
                {col.events.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-8 text-center"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                      style={{
                        background: themeAlpha(col.colorVar, 0.04),
                        border: `1px dashed ${themeAlpha(col.colorVar, 0.12)}`,
                      }}
                    >
                      <col.icon
                        size={16}
                        style={{ color: themeAlpha(col.colorVar, 0.25) }}
                      />
                    </div>
                    <p className="text-[10px] text-aegis-text-dim">No events</p>
                  </motion.div>
                ) : (
                  col.events.map((event) => (
                    <KanbanEventCard
                      key={event.id}
                      event={event}
                      colorVar={col.colorVar}
                      onClick={() => setSelectedEventId(event.id)}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detail Slide-over Panel */}
      <DetailPanel
        event={selectedEvent}
        invitations={invitations}
        onClose={() => setSelectedEventId(null)}
        onUpdateEvent={updateTrunkShow}
        onAddInvitation={addInvitation}
        onUpdateInvitation={updateInvitation}
      />

      {/* Create Event Modal */}
      <CreateEventModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateEvent}
      />
    </PageTransition>
  );
}
