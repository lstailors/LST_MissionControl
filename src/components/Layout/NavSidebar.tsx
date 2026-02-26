// ═══════════════════════════════════════════════════════════
// NavSidebar — Compact icon-only sidebar (64px)
// L&S Mission Control: logo + nav icons + user avatar
// ═══════════════════════════════════════════════════════════

import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, MessageCircle, Kanban, DollarSign,
  Bot, Settings, Brain, LogOut, ClipboardList, Users,
  Receipt, Calendar, Scissors, Factory, CheckCircle,
} from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/shared/Avatar';
import { getAvatarUrl } from '@/lib/avatarHelpers';
import { getDirection } from '@/i18n';
import clsx from 'clsx';

interface NavItem {
  to: string;
  icon: any;
  labelKey: string;
  badge?: string;
  dividerBefore?: boolean;
}

const navItems: NavItem[] = [
  // Primary nav
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/agents', icon: Bot, labelKey: 'nav.agents' },
  { to: '/chat', icon: MessageCircle, labelKey: 'nav.chat' },
  { to: '/finance', icon: DollarSign, labelKey: 'nav.finance' },
  { to: '/workshop', icon: Kanban, labelKey: 'nav.workshop' },
  { to: '/invoices', icon: Receipt, labelKey: 'nav.invoices' },
  { to: '/orders', icon: ClipboardList, labelKey: 'nav.orders' },
  { to: '/customers', icon: Users, labelKey: 'nav.customers' },
  // Secondary nav (after divider)
  { to: '/fittings', icon: Calendar, labelKey: 'nav.fittings', dividerBefore: true },
  { to: '/fabrics', icon: Scissors, labelKey: 'nav.fabrics' },
  { to: '/manufacturing', icon: Factory, labelKey: 'nav.manufacturing' },
  { to: '/approvals', icon: CheckCircle, labelKey: 'nav.approvals' },
  { to: '/analytics', icon: Brain, labelKey: 'nav.analytics' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export function NavSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useSettingsStore();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const dir = getDirection(language);
  const isRTL = dir === 'rtl';

  const userEmail = user?.email || '';
  const userId = user?.id || '';
  const avatarUrl = userId ? getAvatarUrl('user', userId) : null;

  const borderClass = isRTL ? 'border-l' : 'border-r';

  return (
    <div
      className={clsx(
        'w-[64px] shrink-0 flex flex-col items-center',
        'chrome-bg', borderClass, 'border-aegis-border',
        'py-3 relative'
      )}
    >
      {/* L&S Logo */}
      <div className="flex flex-col items-center mb-3 pb-3 border-b border-aegis-border">
        <img
          src="/ls-logo.png"
          alt="L&S"
          className="w-[60px] h-auto"
        />
        <span
          className="text-aegis-text-muted mt-1"
          style={{
            fontSize: '7px',
            fontVariant: 'all-small-caps',
            letterSpacing: '0.3em',
            whiteSpace: 'nowrap',
          }}
        >
          MISSION CONTROL
        </span>
      </div>

      {/* Navigation Icons */}
      <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden flex flex-col items-center gap-0.5 py-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));

          return (
            <React.Fragment key={item.to}>
              {/* Divider before secondary nav */}
              {item.dividerBefore && (
                <div className="w-[28px] my-1.5 h-px bg-gradient-to-r from-transparent via-[rgba(240,236,212,0.10)] to-transparent" />
              )}
              <NavLink
                to={item.to}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'relative w-[40px] h-[40px] rounded-xl flex-shrink-0',
                  'flex items-center justify-center',
                  'transition-all duration-300 group',
                  isActive
                    ? 'bg-[rgba(38,59,40,0.40)] text-[#F0ECD4]'
                    : 'text-aegis-text-muted hover:text-aegis-text-secondary hover:bg-[rgb(var(--aegis-overlay)/0.04)]'
                )}
              >
                {/* Active indicator bar — cream 3px left border */}
                {isActive && (
                  <motion.div
                    layoutId="nav-active-bar"
                    className={clsx(
                      'absolute top-1/2 -translate-y-1/2',
                      'w-[3px] h-[20px] rounded-full',
                      'bg-[#F0ECD4]',
                      'shadow-[0_0_12px_rgba(240,236,212,0.3)]',
                      isRTL ? '-right-[12px]' : '-left-[12px]'
                    )}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 30,
                    }}
                  />
                )}

                <div className="relative">
                  <item.icon size={18} className={clsx(isActive && 'icon-halo-teal')} />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-2 text-[8px]">{item.badge}</span>
                  )}
                </div>

                {/* Tooltip on hover */}
                <div className={clsx(
                  'absolute top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg',
                  'bg-aegis-elevated-solid border border-aegis-border shadow-lg',
                  'text-aegis-text text-[11px] font-medium whitespace-nowrap',
                  'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50',
                  isRTL ? 'right-full mr-3' : 'left-full ml-3'
                )}>
                  {t(item.labelKey)}
                </div>
              </NavLink>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Bottom: User Avatar + Sign Out */}
      <div className="pt-3 border-t border-aegis-border flex flex-col items-center gap-2">
        <div className="relative group">
          <Avatar
            src={avatarUrl}
            name={userEmail}
            size={32}
            accentColor="#4B8C50"
          />
          {/* Email tooltip on hover */}
          <div className={clsx(
            'absolute top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg',
            'bg-aegis-elevated-solid border border-aegis-border shadow-lg',
            'text-aegis-text text-[10px] font-mono whitespace-nowrap',
            'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50',
            isRTL ? 'right-full mr-3' : 'left-full ml-3'
          )}>
            {userEmail || 'User'}
          </div>
        </div>
        <button
          onClick={async () => { await signOut(); navigate('/login'); }}
          className="w-[32px] h-[32px] rounded-lg flex items-center justify-center text-aegis-text-dim hover:text-aegis-danger hover:bg-aegis-danger-surface transition-colors group relative"
          title="Sign Out"
        >
          <LogOut size={14} />
          <div className={clsx(
            'absolute top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg',
            'bg-aegis-elevated-solid border border-aegis-border shadow-lg',
            'text-aegis-text text-[10px] font-medium whitespace-nowrap',
            'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50',
            isRTL ? 'right-full mr-3' : 'left-full ml-3'
          )}>
            Sign Out
          </div>
        </button>
      </div>
    </div>
  );
}
