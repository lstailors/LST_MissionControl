import { useState, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '@/stores/chatStore';
import clsx from 'clsx';

// ═══════════════════════════════════════════════════════════
// Title Bar — premium frameless window controls
// ═══════════════════════════════════════════════════════════

export function TitleBar() {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);
  const { connected, connecting } = useChatStore();

  useEffect(() => {
    window.aegis?.window.isMaximized().then(setIsMaximized);
  }, []);

  const handleMinimize = () => window.aegis?.window.minimize();
  const handleMaximize = async () => {
    const result = await window.aegis?.window.maximize();
    setIsMaximized(!!result);
  };
  const handleClose = () => window.aegis?.window.close();

  return (
    <div className="drag-region h-10 flex items-center justify-between bg-aegis-bg/95 backdrop-blur-md border-b border-aegis-border/40 select-none shrink-0 relative">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-aegis-primary/10 to-transparent" />

      {/* Logo + Title + Status */}
      <div className="flex items-center gap-2.5 px-4">
        <div className="relative">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-aegis-primary to-aegis-accent flex items-center justify-center shadow-glow-sm">
            <span className="text-[10px] font-bold text-white">A</span>
          </div>
          <div className={clsx(
            'absolute -bottom-0.5 -left-0.5 w-2 h-2 rounded-full border border-aegis-bg',
            connected ? 'bg-aegis-success' : connecting ? 'bg-aegis-warning animate-pulse-soft' : 'bg-aegis-danger'
          )} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-aegis-text tracking-tight">{t('app.name')}</span>
          <span className="text-[10px] text-aegis-text-dim font-mono">{t('app.version')}</span>
        </div>
      </div>

      {/* Window controls — always on the right for Windows */}
      <div className="no-drag flex items-center">
        <button onClick={handleMinimize}
          className="h-10 w-12 flex items-center justify-center hover:bg-white/[0.04] transition-colors"
          title={t('titlebar.minimize')}>
          <Minus size={14} className="text-aegis-text-dim" />
        </button>
        <button onClick={handleMaximize}
          className="h-10 w-12 flex items-center justify-center hover:bg-white/[0.04] transition-colors"
          title={isMaximized ? t('titlebar.restore') : t('titlebar.maximize')}>
          {isMaximized ? <Copy size={11} className="text-aegis-text-dim" /> : <Square size={11} className="text-aegis-text-dim" />}
        </button>
        <button onClick={handleClose}
          className="h-10 w-12 flex items-center justify-center hover:bg-aegis-danger/80 transition-colors group"
          title={t('titlebar.close')}>
          <X size={14} className="text-aegis-text-dim group-hover:text-white" />
        </button>
      </div>
    </div>
  );
}
