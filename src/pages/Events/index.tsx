// ═══════════════════════════════════════════════════════════
// Il Palcoscenico — Trunk Shows & Events
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, DollarSign, Users, Target,
  ShoppingBag, Mail, ChevronDown, ChevronRight,
  Plus, Eye, CheckCircle, XCircle, Clock, Star,
  TrendingUp, AlertTriangle, X,
} from 'lucide-react';
import clsx from 'clsx';
import { PageTransition } from '@/components/shared/PageTransition';
import { GlassCard } from '@/components/shared/GlassCard';
import { themeHex, themeAlpha } from '@/utils/theme-colors';
import { useMissionControlStore } from '@/stores/missionControlStore';
import type { TrunkShow, TrunkShowInvitation } from '@/stores/missionControlStore';
import { format, differenceInDays, isPast } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; colorVar: string }> = {
  planning: { label: 'Planning', colorVar: 'primary' },
  confirmed: { label: 'Confirmed', colorVar: 'accent' },
  invitations_sent: { label: 'Invitations Sent', colorVar: 'warning' },
  active: { label: 'Active', colorVar: 'success' },
  completed: { label: 'Completed', colorVar: 'primary' },
  cancelled: { label: 'Cancelled', colorVar: 'danger' },
};

const INVITE_STATUS_CONFIG: Record<string, { label: string; colorVar: string }> = {
  pending: { label: 'Pending', colorVar: 'primary' },
  sent: { label: 'Sent', colorVar: 'accent' },
  opened: { label: 'Opened', colorVar: 'warning' },
  rsvp_yes: { label: 'RSVP Yes', colorVar: 'success' },
  rsvp_no: { label: 'RSVP No', colorVar: 'danger' },
  attended: { label: 'Attended', colorVar: 'success' },
  no_show: { label: 'No Show', colorVar: 'danger' },
};

export function EventsPage() {
  const { trunkShows, invitations, seed } = useMissionControlStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => { seed(); }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    return trunkShows.filter((ts) => {
      if (viewFilter === 'upcoming') return new Date(ts.start_date) >= now || ts.status === 'active';
      if (viewFilter === 'past') return ts.status === 'completed' || ts.status === 'cancelled';
      return true;
    });
  }, [trunkShows, viewFilter]);

  const selected = selectedId ? trunkShows.find((t) => t.id === selectedId) : null;
  const selectedInvitations = selected
    ? invitations.filter((inv) => inv.trunk_show_id === selected.id)
    : [];

  // Stats
  const totalRevenue = trunkShows.reduce((s, t) => s + t.actual_revenue, 0);
  const totalOrders = trunkShows.reduce((s, t) => s + t.actual_orders, 0);
  const upcoming = trunkShows.filter((t) => !['completed', 'cancelled'].includes(t.status)).length;

  return (
    <PageTransition className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: themeAlpha('accent', 0.1), border: `1px solid ${themeAlpha('accent', 0.15)}` }}
            >
              <MapPin size={20} style={{ color: themeHex('accent') }} />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-aegis-text">Il Palcoscenico</h1>
              <p className="text-[11px] text-aegis-text-dim">Trunk Shows & Events</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <StatCard label="Total Events" value={trunkShows.length.toString()} icon={Calendar} color="primary" />
          <StatCard label="Upcoming" value={upcoming.toString()} icon={Clock} color="accent" />
          <StatCard label="Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} color="success" />
          <StatCard label="Orders" value={totalOrders.toString()} icon={ShoppingBag} color="warning" />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-4">
          {(['all', 'upcoming', 'past'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setViewFilter(f)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                viewFilter === f ? 'text-aegis-text' : 'text-aegis-text-muted',
              )}
              style={viewFilter === f ? {
                background: themeAlpha('accent', 0.08),
                border: `1px solid ${themeAlpha('accent', 0.12)}`,
              } : { border: '1px solid transparent' }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hidden">
          {selected ? (
            <EventDetail
              show={selected}
              invitations={selectedInvitations}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((show, i) => (
                <EventCard
                  key={show.id}
                  show={show}
                  invitationCount={invitations.filter((inv) => inv.trunk_show_id === show.id).length}
                  delay={i * 0.05}
                  onClick={() => setSelectedId(show.id)}
                />
              ))}
              {filtered.length === 0 && (
                <div className="col-span-2 text-center py-12 text-[12px] text-aegis-text-dim">
                  No events match this filter.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

function EventCard({
  show,
  invitationCount,
  delay,
  onClick,
}: {
  show: TrunkShow;
  invitationCount: number;
  delay: number;
  onClick: () => void;
}) {
  const statusCfg = STATUS_CONFIG[show.status] || STATUS_CONFIG.planning;
  const daysUntil = differenceInDays(new Date(show.start_date), new Date());
  const isUpcoming = daysUntil > 0;
  const revenueProgress = show.target_revenue > 0
    ? Math.min((show.actual_revenue / show.target_revenue) * 100, 100)
    : 0;

  return (
    <GlassCard delay={delay} onClick={onClick} className="!p-0">
      <div className="p-5">
        {/* Top: Status + Date */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[9px] font-bold uppercase px-2 py-[2px] rounded tracking-wider"
            style={{
              color: themeHex(statusCfg.colorVar as any),
              background: themeAlpha(statusCfg.colorVar, 0.1),
              border: `1px solid ${themeAlpha(statusCfg.colorVar, 0.15)}`,
            }}
          >
            {statusCfg.label}
          </span>
          {isUpcoming && (
            <span className="text-[10px] text-aegis-text-dim">
              {daysUntil} days away
            </span>
          )}
        </div>

        {/* Name + Location */}
        <h3 className="text-[15px] font-bold text-aegis-text mb-1">{show.event_name}</h3>
        <div className="flex items-center gap-1.5 text-[11px] text-aegis-text-muted mb-3">
          <MapPin size={11} />
          <span>{show.venue_name} · {show.city}, {show.state}</span>
        </div>

        {/* Dates */}
        <div className="text-[11px] text-aegis-text-dim mb-3 flex items-center gap-1">
          <Calendar size={11} />
          {format(new Date(show.start_date), 'MMM d')} — {format(new Date(show.end_date), 'MMM d, yyyy')}
        </div>

        {/* Revenue progress */}
        {show.target_revenue > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-aegis-text-dim">Revenue</span>
              <span className="text-[10px] text-aegis-text-muted font-mono">
                ${show.actual_revenue.toLocaleString()} / ${show.target_revenue.toLocaleString()}
              </span>
            </div>
            <div className="h-[4px] rounded-full overflow-hidden" style={{ background: 'rgb(var(--aegis-overlay) / 0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${revenueProgress}%`, background: themeHex('success') }}
              />
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 text-[10px] text-aegis-text-dim">
          <span className="flex items-center gap-1"><Mail size={10} /> {show.invitation_count} invited</span>
          <span className="flex items-center gap-1"><CheckCircle size={10} /> {show.rsvp_count} RSVP</span>
          <span className="flex items-center gap-1"><ShoppingBag size={10} /> {show.actual_orders} orders</span>
          <span className="flex items-center gap-1"><DollarSign size={10} /> ${show.actual_spend.toLocaleString()} spent</span>
        </div>
      </div>
    </GlassCard>
  );
}

function EventDetail({
  show,
  invitations,
  onBack,
}: {
  show: TrunkShow;
  invitations: TrunkShowInvitation[];
  onBack: () => void;
}) {
  const statusCfg = STATUS_CONFIG[show.status] || STATUS_CONFIG.planning;

  const rsvpYes = invitations.filter((i) => i.status === 'rsvp_yes' || i.status === 'attended').length;
  const attended = invitations.filter((i) => i.status === 'attended').length;
  const totalOrderValue = invitations.reduce((s, i) => s + (i.order_value || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back */}
      <button
        onClick={onBack}
        className="text-[12px] text-aegis-text-muted hover:text-aegis-text mb-4 flex items-center gap-1"
      >
        ← Back to Events
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-[22px] font-bold text-aegis-text">{show.event_name}</h1>
            <span
              className="text-[9px] font-bold uppercase px-2 py-[2px] rounded tracking-wider"
              style={{
                color: themeHex(statusCfg.colorVar as any),
                background: themeAlpha(statusCfg.colorVar, 0.1),
              }}
            >
              {statusCfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-aegis-text-muted">
            <span className="flex items-center gap-1"><MapPin size={12} /> {show.venue_name} · {show.city}, {show.state}</span>
            <span className="flex items-center gap-1"><Calendar size={12} /> {format(new Date(show.start_date), 'MMM d')} — {format(new Date(show.end_date), 'MMM d, yyyy')}</span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <MetricCard label="Budget" value={`$${show.budget.toLocaleString()}`} sub={`$${show.actual_spend.toLocaleString()} spent`} color="warning" />
        <MetricCard label="Revenue" value={`$${show.actual_revenue.toLocaleString()}`} sub={`$${show.target_revenue.toLocaleString()} target`} color="success" />
        <MetricCard label="Appointments" value={`${show.actual_appointments}`} sub={`${show.target_appointments} target`} color="primary" />
        <MetricCard label="Orders" value={`${show.actual_orders}`} sub={`${show.target_orders} target`} color="accent" />
        <MetricCard label="Invitations" value={show.invitation_count.toString()} sub={`${show.rsvp_count} RSVP'd`} color="primary" />
        <MetricCard label="ROI" value={show.actual_spend > 0 ? `${((show.actual_revenue / show.actual_spend) * 100).toFixed(0)}%` : '—'} sub="revenue/spend" color="success" />
      </div>

      {/* Notes */}
      {show.notes && (
        <GlassCard className="mb-6">
          <div className="text-[10px] text-aegis-text-dim uppercase tracking-wider mb-1 font-semibold">Notes</div>
          <div className="text-[12px] text-aegis-text-muted leading-relaxed">{show.notes}</div>
        </GlassCard>
      )}

      {/* Team */}
      {show.team_members.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[12px] font-bold text-aegis-text uppercase tracking-wider mb-3">Team</h3>
          <div className="flex items-center gap-2">
            {show.team_members.map((m) => (
              <span
                key={m}
                className="text-[11px] px-3 py-1.5 rounded-lg"
                style={{
                  background: 'rgb(var(--aegis-overlay) / 0.04)',
                  border: '1px solid rgb(var(--aegis-overlay) / 0.08)',
                  color: 'rgb(var(--aegis-text-secondary))',
                }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Guest List */}
      <div>
        <h3 className="text-[12px] font-bold text-aegis-text uppercase tracking-wider mb-3">
          Guest List ({invitations.length})
        </h3>

        {invitations.length > 0 ? (
          <div className="space-y-2">
            {invitations.map((inv) => {
              const invCfg = INVITE_STATUS_CONFIG[inv.status] || INVITE_STATUS_CONFIG.pending;
              return (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{
                    background: 'rgb(var(--aegis-overlay) / 0.025)',
                    border: '1px solid rgb(var(--aegis-overlay) / 0.07)',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-aegis-text">{inv.invited_name}</div>
                    <div className="text-[10px] text-aegis-text-dim">{inv.invited_email}</div>
                  </div>
                  {inv.appointment_time && (
                    <span className="text-[10px] text-aegis-text-dim flex items-center gap-1 shrink-0">
                      <Clock size={10} /> {format(new Date(inv.appointment_time), 'MMM d, h:mm a')}
                    </span>
                  )}
                  {inv.order_value && (
                    <span className="text-[11px] font-mono shrink-0" style={{ color: themeHex('success') }}>
                      ${inv.order_value.toLocaleString()}
                    </span>
                  )}
                  <span
                    className="text-[9px] font-bold uppercase px-1.5 py-[2px] rounded shrink-0"
                    style={{
                      color: themeHex(invCfg.colorVar as any),
                      background: themeAlpha(invCfg.colorVar, 0.1),
                    }}
                  >
                    {invCfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-[12px] text-aegis-text-dim">
            No invitations sent yet.
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: 'rgb(var(--aegis-overlay) / 0.025)',
        border: '1px solid rgb(var(--aegis-overlay) / 0.07)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon size={12} style={{ color: themeHex(color as any) }} />
        <span className="text-[10px] text-aegis-text-dim uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-[18px] font-bold text-aegis-text">{value}</div>
    </div>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: 'rgb(var(--aegis-overlay) / 0.025)',
        border: '1px solid rgb(var(--aegis-overlay) / 0.07)',
      }}
    >
      <div className="text-[9px] text-aegis-text-dim uppercase tracking-wider mb-1">{label}</div>
      <div className="text-[16px] font-bold text-aegis-text">{value}</div>
      <div className="text-[9px] text-aegis-text-dim">{sub}</div>
    </div>
  );
}
