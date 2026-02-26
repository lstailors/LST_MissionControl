// ═══════════════════════════════════════════════════════════
// Comms Hub — Unified communications inbox (email client style)
// Left: customer list grouped by name · Right: conversation timeline
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, MessageSquare, Phone, StickyNote, Search,
  Send, ChevronDown, Inbox, MessageCircle, Clock, User,
  ArrowDownLeft, ArrowUpRight, Filter,
} from 'lucide-react';
import clsx from 'clsx';
import { GlassCard } from '@/components/shared/GlassCard';
import { PageTransition } from '@/components/shared/PageTransition';
import {
  useMissionControlStore,
  type Communication,
} from '@/stores/missionControlStore';
import { themeHex } from '@/utils/theme-colors';

// ── Types ────────────────────────────────────────────────

type ChannelFilter = 'all' | 'email' | 'sms' | 'call';

interface CustomerGroup {
  customer_id: string;
  customer_name: string;
  messages: Communication[];
  latest: Communication;
  unreadCount: number;
}

// ── Helpers ──────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const CHANNEL_ICON: Record<Communication['channel'], typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  call: Phone,
  note: StickyNote,
};

const CHANNEL_COLOR: Record<Communication['channel'], string> = {
  email: 'text-aegis-primary',
  sms: 'text-emerald-400',
  call: 'text-yellow-400',
  note: 'text-aegis-text-muted',
};

const CHANNEL_BG: Record<Communication['channel'], string> = {
  email: 'bg-aegis-primary/10',
  sms: 'bg-emerald-400/10',
  call: 'bg-yellow-400/10',
  note: 'bg-[rgb(var(--aegis-overlay)/0.04)]',
};

const CHANNEL_LABELS: { key: ChannelFilter; label: string; icon: typeof Mail }[] = [
  { key: 'all',   label: 'All',    icon: Inbox },
  { key: 'email', label: 'Email',  icon: Mail },
  { key: 'sms',   label: 'SMS',    icon: MessageSquare },
  { key: 'call',  label: 'Calls',  icon: Phone },
];

// ── Glass style constants ────────────────────────────────

const GLASS_STYLE = {
  background: 'rgb(var(--aegis-overlay) / 0.025)',
  border: '1px solid rgb(var(--aegis-overlay) / 0.07)',
};

// ── Sub-components ───────────────────────────────────────

/** Single customer row in the left panel */
function CustomerRow({
  group,
  isActive,
  onClick,
}: {
  group: CustomerGroup;
  isActive: boolean;
  onClick: () => void;
}) {
  const ChannelIcon = CHANNEL_ICON[group.latest.channel];
  const preview = group.latest.subject || group.latest.body;
  const truncated = preview.length > 60 ? preview.slice(0, 60) + '...' : preview;

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className={clsx(
        'w-full text-left px-3 py-3 rounded-xl transition-all duration-200',
        'border border-transparent',
        isActive
          ? 'bg-aegis-primary/[0.06] border-aegis-primary/15'
          : 'hover:bg-[rgb(var(--aegis-overlay)/0.03)]',
        group.unreadCount > 0 && !isActive && 'bg-[rgb(var(--aegis-overlay)/0.015)]',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={clsx(
          'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold',
          isActive
            ? 'bg-aegis-primary/15 text-aegis-primary'
            : 'bg-[rgb(var(--aegis-overlay)/0.05)] text-aegis-text-dim',
        )}>
          {group.customer_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={clsx(
              'text-[12px] font-semibold truncate',
              group.unreadCount > 0 ? 'text-aegis-text' : 'text-aegis-text-dim',
            )}>
              {group.customer_name}
            </span>
            <span className="text-[9px] text-aegis-text-muted whitespace-nowrap shrink-0">
              {timeAgo(group.latest.created_at)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <ChannelIcon size={11} className={CHANNEL_COLOR[group.latest.channel]} />
            <span className={clsx(
              'text-[11px] truncate',
              group.unreadCount > 0 ? 'text-aegis-text-dim font-medium' : 'text-aegis-text-muted',
            )}>
              {truncated}
            </span>
          </div>
        </div>

        {/* Unread badge */}
        {group.unreadCount > 0 && (
          <span className="mt-1 w-5 h-5 rounded-full bg-aegis-primary text-white text-[9px] font-bold flex items-center justify-center shrink-0">
            {group.unreadCount}
          </span>
        )}
      </div>
    </motion.button>
  );
}

/** Email message in the right panel timeline */
function EmailMessage({ comm }: { comm: Communication }) {
  const isOutbound = comm.direction === 'outbound';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4"
      style={GLASS_STYLE}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={clsx(
            'w-7 h-7 rounded-lg flex items-center justify-center',
            CHANNEL_BG.email,
          )}>
            <Mail size={14} className={CHANNEL_COLOR.email} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              {isOutbound
                ? <ArrowUpRight size={11} className="text-aegis-primary" />
                : <ArrowDownLeft size={11} className="text-emerald-400" />
              }
              <span className="text-[11px] font-semibold text-aegis-text">
                {isOutbound ? 'Sent' : 'Received'}
              </span>
              {comm.agent_slug && (
                <span className="text-[9px] text-aegis-text-muted bg-aegis-primary/8 px-1.5 py-0.5 rounded-md border border-aegis-primary/10">
                  via {comm.agent_slug}
                </span>
              )}
            </div>
            <div className="text-[10px] text-aegis-text-muted">
              {isOutbound ? comm.from_address : comm.from_address} &rarr; {comm.to_address}
            </div>
          </div>
        </div>
        <span className="text-[9px] text-aegis-text-muted whitespace-nowrap">
          {fmtTimestamp(comm.created_at)}
        </span>
      </div>

      {comm.subject && (
        <div className="text-[12px] font-semibold text-aegis-text mb-1.5">{comm.subject}</div>
      )}
      <div className="text-[11.5px] text-aegis-text-dim whitespace-pre-line leading-relaxed">
        {comm.body}
      </div>
    </motion.div>
  );
}

/** SMS message as a chat bubble */
function SmsBubble({ comm }: { comm: Communication }) {
  const isOutbound = comm.direction === 'outbound';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('flex', isOutbound ? 'justify-end' : 'justify-start')}
    >
      <div className={clsx('max-w-[75%] space-y-1')}>
        <div
          className={clsx(
            'rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed',
            isOutbound
              ? 'bg-aegis-primary/15 text-aegis-text rounded-br-md'
              : 'text-aegis-text rounded-bl-md',
          )}
          style={isOutbound ? undefined : GLASS_STYLE}
        >
          {comm.body}
        </div>
        <div className={clsx(
          'flex items-center gap-1.5 text-[9px] text-aegis-text-muted',
          isOutbound ? 'justify-end' : 'justify-start',
        )}>
          {comm.agent_slug && (
            <span className="bg-aegis-primary/8 px-1.5 py-0.5 rounded-md border border-aegis-primary/10">
              {comm.agent_slug}
            </span>
          )}
          <span>{fmtTimestamp(comm.created_at)}</span>
        </div>
      </div>
    </motion.div>
  );
}

/** Call summary card */
function CallCard({ comm }: { comm: Communication }) {
  const isOutbound = comm.direction === 'outbound';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-3.5 flex items-start gap-3"
      style={GLASS_STYLE}
    >
      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', CHANNEL_BG.call)}>
        <Phone size={15} className={CHANNEL_COLOR.call} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          {isOutbound
            ? <ArrowUpRight size={11} className="text-aegis-primary" />
            : <ArrowDownLeft size={11} className="text-emerald-400" />
          }
          <span className="text-[11px] font-semibold text-aegis-text">
            {isOutbound ? 'Outgoing Call' : 'Incoming Call'}
          </span>
          <span className="text-[9px] text-aegis-text-muted">{fmtTimestamp(comm.created_at)}</span>
        </div>
        {comm.subject && (
          <div className="text-[11px] font-medium text-aegis-text-dim mb-1">{comm.subject}</div>
        )}
        <div className="text-[11px] text-aegis-text-muted leading-relaxed">{comm.body}</div>
      </div>
    </motion.div>
  );
}

/** Note card */
function NoteCard({ comm }: { comm: Communication }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-3.5 flex items-start gap-3 border-l-2 border-aegis-text-muted/20"
      style={GLASS_STYLE}
    >
      <StickyNote size={14} className="text-aegis-text-muted shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[11px] font-semibold text-aegis-text">Internal Note</span>
          <span className="text-[9px] text-aegis-text-muted">{fmtTimestamp(comm.created_at)}</span>
        </div>
        <div className="text-[11px] text-aegis-text-dim leading-relaxed">{comm.body}</div>
      </div>
    </motion.div>
  );
}

/** Compose bar at the bottom of the right panel */
function ComposeBar({
  customerName,
  onSend,
}: {
  customerName: string;
  onSend: (channel: Communication['channel'], subject: string, body: string) => void;
}) {
  const [channel, setChannel] = useState<Communication['channel']>('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showChannelPicker, setShowChannelPicker] = useState(false);

  const handleSend = () => {
    if (!body.trim()) return;
    onSend(channel, subject, body);
    setSubject('');
    setBody('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const ChannelIcon = CHANNEL_ICON[channel];

  return (
    <div className="rounded-xl p-3" style={GLASS_STYLE}>
      {/* Channel selector row */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative">
          <button
            onClick={() => setShowChannelPicker(!showChannelPicker)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
              'border border-[rgb(var(--aegis-overlay)/0.08)] hover:bg-[rgb(var(--aegis-overlay)/0.03)]',
              CHANNEL_COLOR[channel],
            )}
          >
            <ChannelIcon size={13} />
            {channel === 'sms' ? 'SMS' : channel.charAt(0).toUpperCase() + channel.slice(1)}
            <ChevronDown size={11} className="text-aegis-text-muted" />
          </button>

          <AnimatePresence>
            {showChannelPicker && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-0 mb-1 z-20 rounded-lg overflow-hidden shadow-lg border border-[rgb(var(--aegis-overlay)/0.1)]"
                style={{ background: 'rgb(var(--aegis-card))' }}
              >
                {(['email', 'sms', 'call', 'note'] as const).map((ch) => {
                  const Icon = CHANNEL_ICON[ch];
                  return (
                    <button
                      key={ch}
                      onClick={() => { setChannel(ch); setShowChannelPicker(false); }}
                      className={clsx(
                        'flex items-center gap-2 w-full px-3 py-2 text-[11px] font-medium hover:bg-[rgb(var(--aegis-overlay)/0.04)] transition-colors',
                        ch === channel ? 'text-aegis-primary' : 'text-aegis-text-dim',
                      )}
                    >
                      <Icon size={13} className={CHANNEL_COLOR[ch]} />
                      {ch === 'sms' ? 'SMS' : ch.charAt(0).toUpperCase() + ch.slice(1)}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <span className="text-[10px] text-aegis-text-muted">
          to <span className="text-aegis-text-dim font-medium">{customerName}</span>
        </span>
      </div>

      {/* Subject line for emails */}
      {channel === 'email' && (
        <input
          type="text"
          placeholder="Subject..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full bg-transparent text-[12px] text-aegis-text placeholder:text-aegis-text-muted/50 outline-none mb-2 pb-2 border-b border-[rgb(var(--aegis-overlay)/0.05)]"
        />
      )}

      {/* Body textarea */}
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Type your ${channel === 'call' ? 'call notes' : 'message'}...`}
          rows={2}
          className="flex-1 bg-transparent text-[12px] text-aegis-text placeholder:text-aegis-text-muted/50 outline-none resize-none leading-relaxed"
        />
        <button
          onClick={handleSend}
          disabled={!body.trim()}
          className={clsx(
            'p-2 rounded-lg transition-all duration-200 shrink-0',
            body.trim()
              ? 'bg-aegis-primary/15 text-aegis-primary hover:bg-aegis-primary/25'
              : 'bg-[rgb(var(--aegis-overlay)/0.03)] text-aegis-text-muted cursor-not-allowed',
          )}
        >
          <Send size={15} />
        </button>
      </div>

      <div className="text-[9px] text-aegis-text-muted mt-1.5">
        Press Ctrl+Enter to send
      </div>
    </div>
  );
}

/** Empty state for right panel */
function EmptyDetail() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="w-16 h-16 rounded-2xl bg-aegis-primary/8 flex items-center justify-center mx-auto mb-4">
          <MessageCircle size={28} className="text-aegis-primary/40" />
        </div>
        <h3 className="text-[15px] font-semibold text-aegis-text-dim mb-1.5">
          Select a Conversation
        </h3>
        <p className="text-[12px] text-aegis-text-muted max-w-[260px]">
          Choose a customer from the left panel to view their full communication history.
        </p>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CommsPage — Main Component
// ═══════════════════════════════════════════════════════════

export function CommsPage() {
  const { communications, addCommunication, seed } = useMissionControlStore();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const timelineEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { seed(); }, [seed]);

  // ── Group communications by customer ───────────────────
  const customerGroups = useMemo(() => {
    const map = new Map<string, CustomerGroup>();
    // Sort all comms newest first for picking latest
    const sorted = [...communications].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    for (const comm of sorted) {
      const existing = map.get(comm.customer_id);
      if (existing) {
        existing.messages.push(comm);
        if (!comm.is_read) existing.unreadCount++;
      } else {
        map.set(comm.customer_id, {
          customer_id: comm.customer_id,
          customer_name: comm.customer_name,
          messages: [comm],
          latest: comm,
          unreadCount: comm.is_read ? 0 : 1,
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime(),
    );
  }, [communications]);

  // ── Filter groups by channel + search ──────────────────
  const filteredGroups = useMemo(() => {
    return customerGroups.filter((group) => {
      // Channel filter
      if (channelFilter !== 'all') {
        const hasChannel = group.messages.some((m) => m.channel === channelFilter);
        if (!hasChannel) return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = group.customer_name.toLowerCase().includes(q);
        const matchMsg = group.messages.some(
          (m) =>
            m.subject.toLowerCase().includes(q) ||
            m.body.toLowerCase().includes(q),
        );
        return matchName || matchMsg;
      }
      return true;
    });
  }, [customerGroups, channelFilter, searchQuery]);

  // ── Selected customer's timeline ───────────────────────
  const selectedGroup = useMemo(
    () => customerGroups.find((g) => g.customer_id === selectedCustomerId) || null,
    [customerGroups, selectedCustomerId],
  );

  const timeline = useMemo(() => {
    if (!selectedGroup) return [];
    // Chronological order (oldest first)
    return [...selectedGroup.messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [selectedGroup]);

  // Auto-scroll timeline when new messages arrive or selection changes
  useEffect(() => {
    if (timelineEndRef.current) {
      timelineEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [timeline.length, selectedCustomerId]);

  // ── Send handler ───────────────────────────────────────
  const handleSend = (channel: Communication['channel'], subject: string, body: string) => {
    if (!selectedGroup) return;
    addCommunication({
      customer_id: selectedGroup.customer_id,
      customer_name: selectedGroup.customer_name,
      channel,
      direction: 'outbound',
      subject,
      body,
      from_address: channel === 'email' ? 'calogero@lstailors.com' : 'lstailors',
      to_address: selectedGroup.latest.direction === 'inbound'
        ? selectedGroup.latest.from_address
        : selectedGroup.latest.to_address,
      agent_slug: null,
      is_read: true,
      created_at: new Date().toISOString(),
    });
  };

  // ── Totals for header ──────────────────────────────────
  const totalUnread = useMemo(
    () => customerGroups.reduce((n, g) => n + g.unreadCount, 0),
    [customerGroups],
  );

  // ── Render ─────────────────────────────────────────────
  return (
    <PageTransition className="h-full flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[22px] font-extrabold text-aegis-text tracking-tight flex items-center gap-3">
            <Inbox size={22} className="text-aegis-accent" />
            Comms Hub
            {totalUnread > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-aegis-primary text-white">
                {totalUnread} unread
              </span>
            )}
          </h1>
          <p className="text-[12px] text-aegis-text-muted mt-0.5">
            Unified communications &middot; {communications.length} messages across {customerGroups.length} conversations
          </p>
        </div>
      </div>

      {/* ── Main layout: Left panel (35%) | Right panel (65%) ── */}
      <div className="flex-1 flex gap-3 px-5 pb-5 overflow-hidden min-h-0">

        {/* ════ LEFT PANEL — Customer List ════ */}
        <div
          className="w-[35%] shrink-0 rounded-2xl flex flex-col overflow-hidden"
          style={GLASS_STYLE}
        >
          {/* Search bar */}
          <div className="p-3 border-b border-[rgb(var(--aegis-overlay)/0.06)] shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-aegis-text-muted" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[rgb(var(--aegis-overlay)/0.03)] border border-[rgb(var(--aegis-overlay)/0.06)] text-[12px] text-aegis-text placeholder:text-aegis-text-muted/50 outline-none focus:border-aegis-primary/30 transition-colors"
              />
            </div>
          </div>

          {/* Channel filter tabs */}
          <div className="flex items-center gap-0.5 px-3 pt-2 pb-1 shrink-0">
            {CHANNEL_LABELS.map((ch) => {
              const Icon = ch.icon;
              const isActive = channelFilter === ch.key;
              return (
                <button
                  key={ch.key}
                  onClick={() => setChannelFilter(ch.key)}
                  className={clsx(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all',
                    isActive
                      ? 'bg-aegis-primary/10 text-aegis-primary border border-aegis-primary/20'
                      : 'text-aegis-text-muted hover:text-aegis-text-dim hover:bg-[rgb(var(--aegis-overlay)/0.03)]',
                  )}
                >
                  <Icon size={11} />
                  {ch.label}
                </button>
              );
            })}
          </div>

          {/* Customer list */}
          <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-hidden">
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <CustomerRow
                  key={group.customer_id}
                  group={group}
                  isActive={selectedCustomerId === group.customer_id}
                  onClick={() => setSelectedCustomerId(group.customer_id)}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Filter size={20} className="text-aegis-text-dim mb-2" />
                <span className="text-[12px] text-aegis-text-dim">No conversations found</span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[11px] text-aegis-primary mt-1 hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ════ RIGHT PANEL — Conversation Detail ════ */}
        <div
          className="flex-1 rounded-2xl flex flex-col overflow-hidden min-w-0"
          style={GLASS_STYLE}
        >
          {selectedGroup ? (
            <>
              {/* Customer header */}
              <div className="px-4 py-3 border-b border-[rgb(var(--aegis-overlay)/0.06)] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-aegis-primary/12 flex items-center justify-center text-[13px] font-bold text-aegis-primary">
                    {selectedGroup.customer_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-aegis-text">
                      {selectedGroup.customer_name}
                    </h2>
                    <div className="flex items-center gap-2 text-[10px] text-aegis-text-muted">
                      <span>{selectedGroup.messages.length} messages</span>
                      <span className="opacity-30">&middot;</span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        Last: {timeAgo(selectedGroup.latest.created_at)}
                      </span>
                      <span className="opacity-30">&middot;</span>
                      {/* Channel summary */}
                      {(['email', 'sms', 'call', 'note'] as const).map((ch) => {
                        const count = selectedGroup.messages.filter((m) => m.channel === ch).length;
                        if (count === 0) return null;
                        const Icon = CHANNEL_ICON[ch];
                        return (
                          <span key={ch} className={clsx('flex items-center gap-0.5', CHANNEL_COLOR[ch])}>
                            <Icon size={10} />
                            {count}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hidden min-h-0">
                <AnimatePresence mode="popLayout">
                  {timeline.map((comm) => {
                    switch (comm.channel) {
                      case 'email':
                        return <EmailMessage key={comm.id} comm={comm} />;
                      case 'sms':
                        return <SmsBubble key={comm.id} comm={comm} />;
                      case 'call':
                        return <CallCard key={comm.id} comm={comm} />;
                      case 'note':
                        return <NoteCard key={comm.id} comm={comm} />;
                      default:
                        return null;
                    }
                  })}
                </AnimatePresence>
                <div ref={timelineEndRef} />
              </div>

              {/* Compose bar */}
              <div className="px-4 pb-4 pt-2 shrink-0">
                <ComposeBar
                  customerName={selectedGroup.customer_name}
                  onSend={handleSend}
                />
              </div>
            </>
          ) : (
            <EmptyDetail />
          )}
        </div>
      </div>

    </PageTransition>
  );
}
