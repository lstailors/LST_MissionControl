import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '@/stores/chatStore';
import clsx from 'clsx';

// ═══════════════════════════════════════════════════════════
// Title Bar — Glass Pills window controls + AEGIS DESKTOP branding
// ═══════════════════════════════════════════════════════════

export function TitleBar() {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);
  const { connected, connecting, tokenUsage } = useChatStore();

  useEffect(() => {
    window.aegis?.window.isMaximized().then(setIsMaximized);
  }, []);

  const handleMinimize = () => window.aegis?.window.minimize();
  const handleMaximize = async () => {
    const result = await window.aegis?.window.maximize();
    setIsMaximized(!!result);
  };
  const handleClose = () => window.aegis?.window.close();

  const usedTokens = tokenUsage?.contextTokens || 0;
  const maxTokens = tokenUsage?.maxTokens || 200000;
  const usedK = Math.round(usedTokens / 1000);
  const maxK = Math.round(maxTokens / 1000);

  return (
    <div dir="ltr" className="drag-region h-[38px] flex items-center justify-between chrome-bg border-b border-aegis-border select-none shrink-0 relative z-10">

      {/* ── Left: Brand + Model + Tokens + Status ── */}
      <div className="flex items-center gap-4 px-4">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-white/50 tracking-[2px]">
            AEGIS
          </span>
          <span className="text-[10px] text-white/15 tracking-[1px]">
            DESKTOP
          </span>
        </div>

        {/* Model + Tokens + Status */}
        <div className="flex items-center gap-4 text-[11px] text-white/25 font-mono">
        <span>Opus 4.6</span>
        <span className="text-white/10">·</span>
        <span>{usedK}K / {maxK}K</span>
        <span className="text-white/10">·</span>
        <span className={clsx(
          'flex items-center gap-[6px]',
          connected ? 'text-aegis-success' : connecting ? 'text-aegis-warning' : 'text-aegis-text-dim'
        )}>
          <span className={clsx(
            'w-[6px] h-[6px] rounded-full',
            connected ? 'bg-aegis-success connected-glow' : connecting ? 'bg-aegis-warning animate-pulse' : 'bg-aegis-text-dim'
          )} />
          {connected ? 'Connected' : connecting ? 'Connecting...' : 'Disconnected'}
        </span>
        </div>
      </div>

      {/* ── Right: Window Controls (Windows style: ─ □ ✕) ── */}
      <div className="no-drag flex items-center gap-1 px-4">
        <button
          onClick={handleMinimize}
          className="w-[32px] h-[22px] rounded-[11px] flex items-center justify-center text-[12px] leading-none transition-all duration-[250ms]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.3)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
          title={t('titlebar.minimize')}
        >─</button>
        <button
          onClick={handleMaximize}
          className="w-[32px] h-[22px] rounded-[11px] flex items-center justify-center text-[10px] leading-none transition-all duration-[250ms]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.3)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(78,201,176,0.15)'; e.currentTarget.style.borderColor = 'rgba(78,201,176,0.3)'; e.currentTarget.style.color = '#4EC9B0'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
          title={isMaximized ? t('titlebar.restore') : t('titlebar.maximize')}
        >□</button>
        <button
          onClick={handleClose}
          className="w-[32px] h-[22px] rounded-[11px] flex items-center justify-center text-[12px] leading-none transition-all duration-[250ms]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.3)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,80,80,0.2)'; e.currentTarget.style.borderColor = 'rgba(255,80,80,0.3)'; e.currentTarget.style.color = '#ff5050'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
          title={t('titlebar.close')}
        >✕</button>
      </div>
    </div>
  );
}
