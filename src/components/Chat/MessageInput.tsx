import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Camera, Mic, X, Loader2, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { gateway } from '@/services/gateway';
import { ScreenshotPicker } from './ScreenshotPicker';
import { VoiceRecorder } from './VoiceRecorder';
import { EmojiPicker } from './EmojiPicker';
import { getDirection } from '@/i18n';
import clsx from 'clsx';

// ═══════════════════════════════════════════════════════════
// Message Input — premium input with attachments
// ═══════════════════════════════════════════════════════════

interface PendingFile {
  name: string;
  base64: string;
  mimeType: string;
  isImage: boolean;
  size: number;
  preview?: string;
}

export function MessageInput() {
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  const dir = getDirection(language);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isSending, setIsSending, connected, addMessage, setIsTyping, isTyping } = useChatStore();

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 180);
    el.style.height = newHeight + 'px';
  }, [text]);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if ((!trimmed && files.length === 0) || isSending || !connected) return;
    setIsSending(true);

    const userAttachments = files
      .filter((f) => f.isImage && f.preview)
      .map((f) => ({ mimeType: f.mimeType, content: f.preview!, fileName: f.name }));

    const userMsg = {
      id: `user-${Date.now()}`, role: 'user' as const,
      content: trimmed || (files.length > 0 ? `📎 ${files.map((f) => f.name).join(', ')}` : ''),
      timestamp: new Date().toISOString(),
      ...(userAttachments.length > 0 ? { attachments: userAttachments } : {}),
    };
    addMessage(userMsg);

    const attachments = files.map((f) => ({
      type: 'base64', mimeType: f.mimeType, content: f.base64, fileName: f.name,
    }));

    setText('');
    setFiles([]);
    setIsTyping(true);

    try {
      const messageText = trimmed || (attachments.length > 0 ? `📎 ${files.map((f) => f.name).join(', ')}` : '');
      await gateway.sendMessage(messageText, attachments.length > 0 ? attachments : undefined);
    } catch (err) {
      console.error('[Send] Error:', err);
    } finally {
      setIsSending(false);
    }
  }, [text, files, isSending, connected, addMessage, setIsSending, setIsTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const isImageMime = (mime: string) => mime.startsWith('image/');

  const handleFileSelect = async () => {
    const result = await window.aegis?.file.openDialog();
    if (result?.canceled || !result?.filePaths?.length) return;
    for (const filePath of result.filePaths) {
      const file = await window.aegis.file.read(filePath);
      if (file) {
        if (!isImageMime(file.mimeType)) {
          alert(t('input.imageOnly') + `\n\n"${file.name}" (${file.mimeType})`);
          continue;
        }
        setFiles((prev) => [...prev, {
          name: file.name, base64: file.base64, mimeType: file.mimeType,
          isImage: file.isImage, size: file.size,
          preview: file.isImage ? `data:${file.mimeType};base64,${file.base64}` : undefined,
        }]);
      }
    }
  };

  const handleScreenshotCapture = (dataUrl: string) => {
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    setFiles((prev) => [...prev, {
      name: `screenshot-${Date.now()}.png`, base64, mimeType: 'image/png',
      isImage: true, size: base64.length * 0.75, preview: dataUrl,
    }]);
    textareaRef.current?.focus();
  };

  const handleVoiceSend = useCallback(async (base64: string, mimeType: string, durationSec: number, localUrl: string) => {
    setVoiceMode(false);
    addMessage({
      id: `user-${Date.now()}`, role: 'user',
      content: t('voice.voiceMessage', { seconds: durationSec }),
      timestamp: new Date().toISOString(),
      mediaUrl: localUrl, mediaType: 'audio',
    });
    setIsTyping(true);
    setIsSending(true);
    try {
      const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
      const filename = `voice-${Date.now()}.${ext}`;
      let savedPath = '';
      if (window.aegis?.voice?.save) {
        savedPath = await window.aegis.voice.save(filename, base64) || '';
      }
      if (savedPath) {
        await gateway.sendMessage(`🎤 [voice] ${savedPath} (${durationSec}s)`);
      } else {
        await gateway.sendMessage(`🎤 [voice:${mimeType}:base64] ${base64.substring(0, 50)}... (${durationSec}s)`);
      }
    } catch (err) { console.error('[Voice] Send error:', err); }
    finally { setIsSending(false); }
  }, [addMessage, setIsTyping, setIsSending, t]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
          setFiles((prev) => [...prev, {
            name: 'clipboard.png', base64, mimeType: 'image/png',
            isImage: true, size: blob.size, preview: dataUrl,
          }]);
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    for (const file of Array.from(e.dataTransfer.files)) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
        setFiles((prev) => [...prev, {
          name: file.name, base64, mimeType: file.type || 'application/octet-stream',
          isImage: file.type.startsWith('image/'), size: file.size,
          preview: file.type.startsWith('image/') ? dataUrl : undefined,
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  return (
    <div className="shrink-0 border-t border-aegis-border/20 bg-aegis-bg/95 backdrop-blur-md">
      {/* File Previews */}
      {files.length > 0 && (
        <div className="flex gap-2 px-4 pt-3 overflow-x-auto scrollbar-hidden">
          {files.map((file, i) => (
            <div key={i} className="relative shrink-0 w-[72px] h-[72px] rounded-xl border border-aegis-border/40 overflow-hidden bg-aegis-surface group">
              {file.isImage && file.preview ? (
                <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-1">
                  <span className="text-xl">📄</span>
                  <span className="text-[8px] text-aegis-text-dim truncate w-full text-center mt-0.5">{file.name}</span>
                </div>
              )}
              <button onClick={() => removeFile(i)}
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-aegis-danger/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={9} className="text-white" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[7px] text-center text-white/80 py-0.5">
                {formatSize(file.size)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      {voiceMode ? (
        <VoiceRecorder onSendVoice={handleVoiceSend} onCancel={() => setVoiceMode(false)} disabled={!connected} />
      ) : (
        <div className="flex items-end gap-2 p-3" dir={dir}>
          {/* Action Buttons */}
          <div className="flex items-center gap-0.5 pb-1">
            <EmojiPicker
              onSelect={(emoji) => { setText((prev) => prev + emoji); textareaRef.current?.focus(); }}
              disabled={!connected}
            />
            {[
              { icon: Paperclip, action: handleFileSelect, title: t('input.attachImage') },
              { icon: Camera, action: () => setScreenshotOpen(true), title: t('input.screenshot') },
              { icon: Mic, action: () => setVoiceMode(true), title: t('input.voiceRecord'), disabled: !connected },
            ].map(({ icon: Icon, action, title, disabled }) => (
              <button key={title} onClick={action} disabled={disabled}
                className="p-2 rounded-xl hover:bg-white/[0.04] text-aegis-text-dim hover:text-aegis-text-muted transition-colors disabled:opacity-30"
                title={title}>
                <Icon size={17} />
              </button>
            ))}
          </div>

          {/* Text Input */}
          <div className="flex-1 relative" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
            <textarea ref={textareaRef} value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown} onPaste={handlePaste}
              placeholder={connected ? t('input.placeholder') : t('input.placeholderDisconnected')}
              disabled={!connected}
              className={clsx(
                'w-full resize-none rounded-2xl px-4 py-2.5 text-[14px]',
                'bg-aegis-surface/60 border border-aegis-border/30',
                'text-aegis-text placeholder:text-aegis-text-dim/50',
                'focus:outline-none focus:border-aegis-primary/30 focus:bg-aegis-surface/80',
                'focus:shadow-[0_0_0_3px_rgba(139,124,248,0.06)]',
                'transition-all duration-200',
                'max-h-[180px] scrollbar-hidden',
                !connected && 'opacity-40 cursor-not-allowed'
              )}
              dir="auto" rows={1} />
          </div>

          {/* Send / Stop Button */}
          {isTyping || isSending ? (
            <button onClick={async () => {
              try { await gateway.abortChat(); setIsTyping(false); setIsSending(false); }
              catch (err) { console.error('[Abort] Error:', err); }
            }}
              className="p-2.5 rounded-2xl transition-all duration-200 mb-0.5 bg-aegis-danger/80 hover:bg-aegis-danger text-white shadow-glow-sm"
              title={t('input.stop')}>
              <Square size={17} fill="currentColor" />
            </button>
          ) : (
            <button onClick={handleSend}
              disabled={(!text.trim() && files.length === 0) || !connected}
              className={clsx(
                'p-2.5 rounded-2xl transition-all duration-200 mb-0.5',
                text.trim() || files.length > 0
                  ? 'bg-aegis-primary hover:bg-aegis-primary-hover text-white shadow-glow-sm hover:shadow-glow-md'
                  : 'bg-aegis-elevated/50 text-aegis-text-dim',
                'disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none'
              )}
              title={t('input.send')}>
              <Send size={17} className={dir === 'rtl' ? 'rotate-180' : ''} />
            </button>
          )}
        </div>
      )}

      <ScreenshotPicker open={screenshotOpen} onClose={() => setScreenshotOpen(false)} onCapture={handleScreenshotCapture} />
    </div>
  );
}
