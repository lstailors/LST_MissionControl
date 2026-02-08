import { useState, useEffect } from 'react';
import { X, Wifi, Check, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settingsStore';
import { changeLanguage, getDirection } from '@/i18n';
import clsx from 'clsx';

// ═══════════════════════════════════════════════════════════
// Settings Modal — premium glass design
// ═══════════════════════════════════════════════════════════

export function SettingsModal() {
  const { t } = useTranslation();
  const { settingsOpen, setSettingsOpen, language, setLanguage } = useSettingsStore();
  const dir = getDirection(language);
  const [config, setConfig] = useState<any>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settingsOpen) {
      window.aegis?.config.get().then(setConfig);
      setTestResult(null);
      setSaved(false);
    }
  }, [settingsOpen]);

  useEffect(() => {
    const handler = () => { if (settingsOpen) setSettingsOpen(false); };
    window.addEventListener('aegis:escape', handler);
    return () => window.removeEventListener('aegis:escape', handler);
  }, [settingsOpen, setSettingsOpen]);

  if (!settingsOpen) return null;

  const handleSave = async () => {
    await window.aegis?.config.save({
      gatewayUrl: config.gatewayUrl,
      gatewayToken: config.gatewayToken,
      sharedFolder: config.sharedFolder,
      compressImages: config.compressImages,
      startWithWindows: config.startWithWindows,
      globalHotkey: config.globalHotkey,
      fontSize: config.fontSize,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await window.aegis?.gateway.connect();
      await new Promise((r) => setTimeout(r, 2000));
      const status = await window.aegis?.gateway.status();
      setTestResult({
        success: status?.connected ?? false,
        message: status?.connected ? t('settings.testSuccess') : t('settings.testFailed'),
      });
    } catch (err: any) {
      setTestResult({ success: false, message: `❌ ${err.message}` });
    }
    setTesting(false);
  };

  const handleLanguageChange = (lang: 'ar' | 'en') => {
    setLanguage(lang);
    changeLanguage(lang);
  };

  const update = (key: string, value: any) => setConfig((c: any) => ({ ...c, [key]: value }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={() => setSettingsOpen(false)}
    >
      <div
        className="w-[480px] max-h-[80vh] glass rounded-3xl shadow-float overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        dir={dir}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-aegis-border/20">
          <h2 className="text-[16px] font-semibold text-aegis-text">{t('settings.title')}</h2>
          <button onClick={() => setSettingsOpen(false)}
            className="p-1.5 rounded-xl hover:bg-white/[0.04] transition-colors">
            <X size={16} className="text-aegis-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-5 max-h-[60vh]">
          {/* Language Selector */}
          <div>
            <label className="block text-[12px] text-aegis-text-muted mb-2 font-medium">{t('settings.language')}</label>
            <div className="flex gap-2">
              {(['ar', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={clsx(
                    'flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all border',
                    language === lang
                      ? 'bg-aegis-primary/15 text-aegis-primary border-aegis-primary/30 shadow-glow-sm'
                      : 'bg-aegis-bg/50 text-aegis-text-muted border-aegis-border/30 hover:bg-white/[0.03]'
                  )}
                >
                  {t(`languages.${lang}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Gateway URL */}
          <div>
            <label className="block text-[12px] text-aegis-text-muted mb-2 font-medium">{t('settings.gatewayUrl')}</label>
            <input type="text" value={config.gatewayUrl || ''} onChange={(e) => update('gatewayUrl', e.target.value)}
              className="w-full px-4 py-2.5 bg-aegis-bg/50 border border-aegis-border/30 rounded-xl text-[13px] text-aegis-text focus:outline-none focus:border-aegis-primary/30 focus:shadow-[0_0_0_3px_rgba(139,124,248,0.06)] transition-all"
              dir="ltr" placeholder="ws://127.0.0.1:18789" />
          </div>

          {/* Token */}
          <div>
            <label className="block text-[12px] text-aegis-text-muted mb-2 font-medium">{t('settings.gatewayToken')}</label>
            <input type="password" value={config.gatewayToken || ''} onChange={(e) => update('gatewayToken', e.target.value)}
              className="w-full px-4 py-2.5 bg-aegis-bg/50 border border-aegis-border/30 rounded-xl text-[13px] text-aegis-text focus:outline-none focus:border-aegis-primary/30 focus:shadow-[0_0_0_3px_rgba(139,124,248,0.06)] transition-all"
              dir="ltr" placeholder="Token" />
          </div>

          {/* Shared Folder */}
          <div>
            <label className="block text-[12px] text-aegis-text-muted mb-2 font-medium">{t('settings.sharedFolder')}</label>
            <input type="text" value={config.sharedFolder || ''} onChange={(e) => update('sharedFolder', e.target.value)}
              className="w-full px-4 py-2.5 bg-aegis-bg/50 border border-aegis-border/30 rounded-xl text-[13px] text-aegis-text focus:outline-none focus:border-aegis-primary/30 focus:shadow-[0_0_0_3px_rgba(139,124,248,0.06)] transition-all"
              dir="ltr" />
          </div>

          {/* Global Hotkey */}
          <div>
            <label className="block text-[12px] text-aegis-text-muted mb-2 font-medium">{t('settings.globalHotkey')}</label>
            <input type="text" value={config.globalHotkey || ''} onChange={(e) => update('globalHotkey', e.target.value)}
              className="w-full px-4 py-2.5 bg-aegis-bg/50 border border-aegis-border/30 rounded-xl text-[13px] text-aegis-text focus:outline-none focus:border-aegis-primary/30 focus:shadow-[0_0_0_3px_rgba(139,124,248,0.06)] transition-all"
              dir="ltr" placeholder="Alt+Space" />
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            {[
              { key: 'compressImages', label: t('settings.compressImages'), default: true },
              { key: 'startWithWindows', label: t('settings.startWithWindows'), default: false },
            ].map(({ key, label, default: def }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={config[key] ?? def} onChange={(e) => update(key, e.target.checked)}
                  className="w-4 h-4 rounded accent-aegis-primary" />
                <span className="text-[12px] text-aegis-text-muted group-hover:text-aegis-text-secondary transition-colors">{label}</span>
              </label>
            ))}
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={clsx(
              'px-4 py-3 rounded-xl text-[12px]',
              testResult.success
                ? 'bg-aegis-success-surface text-aegis-success border border-aegis-success/10'
                : 'bg-aegis-danger-surface text-aegis-danger border border-aegis-danger/10'
            )}>
              {testResult.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-aegis-border/20">
          <button onClick={handleTest} disabled={testing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-aegis-bg/50 border border-aegis-border/30 hover:bg-white/[0.03] text-[12px] text-aegis-text-muted transition-colors disabled:opacity-40">
            {testing ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}
            <span>{t('settings.test')}</span>
          </button>
          <button onClick={handleSave}
            className={clsx(
              'flex items-center gap-2 px-6 py-2 rounded-xl text-[12px] font-medium transition-all',
              saved
                ? 'bg-aegis-success/15 text-aegis-success border border-aegis-success/20'
                : 'bg-aegis-primary hover:bg-aegis-primary-hover text-white shadow-glow-sm hover:shadow-glow-md'
            )}>
            {saved ? <Check size={13} /> : null}
            <span>{saved ? t('settings.saved') : t('settings.save')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
