// ═══════════════════════════════════════════════════════════
// NavSidebar — Compact icon-only sidebar (64px)
// Updated with L&S Mission Control navigation structure
// ═══════════════════════════════════════════════════════════

import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Cpu, CheckCircle, Users, ShoppingBag,
  Hammer, Palette, Brain, MessageSquare, Lock, Newspaper,
  BookOpen, MapPin, MessagesSquare, Settings, User,
} from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { getDirection } from '@/i18n';
import clsx from 'clsx';

interface NavItem {
  to: string;
  icon: any;
  label: string;
  section?: string;
  badge?: string;
}

const navItems: NavItem[] = [
  // COMMAND
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', section: 'command' },
  { to: '/orchestrator', icon: Cpu, label: 'Orchestrator', section: 'command' },
  { to: '/approvals', icon: CheckCircle, label: 'Approvals', section: 'command' },
  // OPERATIONS
  { to: '/intelligence', icon: Users, label: 'Clients', section: 'ops' },
  { to: '/workshop', icon: Hammer, label: 'Workshop', section: 'ops' },
  { to: '/events', icon: MapPin, label: 'Events', section: 'ops' },
  // INTELLIGENCE
  { to: '/comms', icon: MessageSquare, label: 'Comms', section: 'intel' },
  { to: '/vault', icon: Lock, label: 'Vault', section: 'intel' },
  // MAESTRO
  { to: '/brief', icon: Newspaper, label: 'Brief', section: 'maestro' },
  { to: '/decisions', icon: BookOpen, label: 'Decisions', section: 'maestro' },
  { to: '/chat', icon: MessagesSquare, label: 'Chat', section: 'maestro' },
  // SYSTEM
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function NavSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { language } = useSettingsStore();
  const dir = getDirection(language);
  const isRTL = dir === 'rtl';

  const borderClass = isRTL ? 'border-l' : 'border-r';

  // Group items by section for visual separators
  let lastSection = '';

  return (
    <div
      className={clsx(
        'w-[64px] shrink-0 flex flex-col items-center',
        'chrome-bg', borderClass, 'border-aegis-border',
        'py-3 relative'
      )}
    >
      {/* Navigation Icons */}
      <nav className="flex-1 flex flex-col items-center gap-0.5 overflow-y-auto scrollbar-hidden">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));

          // Add section divider
          const showDivider = item.section && item.section !== lastSection && lastSection !== '';
          lastSection = item.section || '';

          return (
            <div key={item.to} className="flex flex-col items-center">
              {showDivider && (
                <div className="w-6 h-px my-1 opacity-10" style={{ background: 'rgb(var(--aegis-overlay))' }} />
              )}
              <NavLink
                to={item.to}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'relative w-[42px] h-[42px] rounded-xl',
                  'flex items-center justify-center',
                  'transition-all duration-300 group',
                  isActive
                    ? 'nav-icon-active-glow text-aegis-primary'
                    : 'text-aegis-text-muted hover:text-aegis-text-secondary hover:bg-[rgb(var(--aegis-overlay)/0.04)]'
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="nav-active-bar"
                    className={clsx(
                      'absolute top-1/2 -translate-y-1/2',
                      'w-[3px] h-[20px] rounded-full',
                      'bg-aegis-primary',
                      'shadow-[0_0_12px_rgba(78,201,176,0.4)]',
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
                  <item.icon size={17} className={clsx(isActive && 'icon-halo-teal')} />
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
                  {item.label}
                </div>
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* Bottom: User Avatar */}
      <div className="pt-3">
        <div className={clsx(
          'w-[36px] h-[36px] rounded-xl',
          'bg-gradient-to-br from-aegis-primary/20 to-[rgba(213,0,249,0.15)]',
          'border border-[rgb(var(--aegis-overlay)/0.08)]',
          'flex items-center justify-center',
          'text-aegis-primary'
        )}>
          <User size={16} />
        </div>
      </div>
    </div>
  );
}
