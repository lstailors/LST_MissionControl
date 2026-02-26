// ═══════════════════════════════════════════════════════════
// NavSidebar — Compact icon-only sidebar (64px)
// L&S Mission Control: logo + nav icons + user avatar
// ═══════════════════════════════════════════════════════════

import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, MessageCircle, Kanban, DollarSign,
  Clock, Bot, Settings, Brain, Activity, User, Puzzle,
  Terminal, LogOut,
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
}

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/chat', icon: MessageCircle, labelKey: 'nav.chat' },
  { to: '/workshop', icon: Kanban, labelKey: 'nav.workshop' },
  { to: '/cron', icon: Clock, labelKey: 'nav.cron' },
  { to: '/agents', icon: Bot, labelKey: 'nav.agents' },
  { to: '/costs', icon: DollarSign, labelKey: 'nav.costs' },
  { to: '/skills', icon: Puzzle, labelKey: 'nav.skills' },
  { to: '/terminal', icon: Terminal, labelKey: 'nav.terminal' },
  { to: '/memory', icon: Brain, labelKey: 'nav.memory', badge: '🧪' },
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
      <nav className="flex-1 flex flex-col items-center gap-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'relative w-[44px] h-[44px] rounded-xl',
                'flex items-center justify-center',
                'transition-all duration-300 group',
                isActive
                  ? 'nav-icon-active-glow text-aegis-primary'
                  : 'text-aegis-text-muted hover:text-aegis-text-secondary hover:bg-[rgb(var(--aegis-overlay)/0.04)]'
              )}
            >
              {/* Active indicator bar — animated slide */}
              {isActive && (
                <motion.div
                  layoutId="nav-active-bar"
                  className={clsx(
                    'absolute top-1/2 -translate-y-1/2',
                    'w-[3px] h-[20px] rounded-full',
                    'bg-aegis-primary',
                    'shadow-[0_0_12px_rgba(75,140,80,0.4)]',
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
