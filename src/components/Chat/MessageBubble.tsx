import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, User, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CodeBlock } from './CodeBlock';
import { AudioPlayer } from './AudioPlayer';
import type { ChatMessage } from '@/stores/chatStore';
import clsx from 'clsx';

// ═══════════════════════════════════════════════════════════
// Message Bubble — Colors fixed for dark theme visibility
// ═══════════════════════════════════════════════════════════

interface MessageBubbleProps {
  message: ChatMessage;
  onResend?: (content: string) => void;
}

export const MessageBubble = memo(function MessageBubble({ message, onResend }: MessageBubbleProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const extractText = (val: any): string => {
    if (typeof val === 'string') return val;
    if (val == null) return '';
    if (Array.isArray(val)) {
      return val.map((b: any) => {
        if (typeof b === 'string') return b;
        if (b?.type === 'text' && typeof b.text === 'string') return b.text;
        if (typeof b?.text === 'string') return b.text;
        return '';
      }).join('');
    }
    if (typeof val === 'object') {
      if (typeof val.text === 'string') return val.text;
      if (typeof val.content === 'string') return val.content;
      if (Array.isArray(val.content)) return extractText(val.content);
      return JSON.stringify(val);
    }
    return String(val);
  };

  const rawContent = extractText(message.content);

  const cleanContent = isUser
    ? rawContent.replace(/^\[.*?\]\s*/, '').replace(/\n\[message_id:.*?\]$/, '')
    : rawContent;

  const timeStr = (() => {
    try {
      const d = new Date(message.timestamp);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  })();

  return (
    <div
      className={clsx(
        'group flex items-start gap-3 px-5 py-1.5 transition-colors',
        isUser ? 'flex-row-reverse' : '',
        !isUser && 'hover:bg-white/[0.015]'
      )}
      dir="rtl"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: 'rgba(78, 201, 176, 0.15)', border: '1px solid rgba(78, 201, 176, 0.25)' }}>
          <User size={14} className="text-[#4EC9B0]" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#4EC9B0] to-[#6C9FFF] flex items-center justify-center shrink-0 mt-0.5 shadow-glow-sm">
          <span className="text-[10px] font-bold text-white">A</span>
        </div>
      )}

      {/* Message Content */}
      <div className={clsx('flex flex-col max-w-[80%] min-w-0', isUser && 'items-end')}>
        {/* Bubble */}
        <div
          className={clsx(
            'rounded-2xl px-4 py-2.5 relative',
            isUser
              ? 'rounded-tl-md'
              : 'rounded-tr-md',
            isStreaming && 'border-[#4EC9B0]/30'
          )}
          style={isUser
            ? { background: 'rgba(78, 201, 176, 0.12)', border: '1px solid rgba(78, 201, 176, 0.20)' }
            : { background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }
          }
        >
          {/* Streaming shimmer */}
          {isStreaming && (
            <div className="absolute -top-px left-0 right-0 h-[2px] overflow-hidden rounded-full">
              <div className="w-full h-full bg-gradient-to-r from-transparent via-[#4EC9B0]/50 to-transparent animate-shimmer bg-[length:200%_100%]" />
            </div>
          )}

          {/* Audio Player */}
          {message.mediaUrl && !isStreaming && (
            <div className="mb-2">
              <AudioPlayer src={message.mediaUrl} />
            </div>
          )}

          {/* Attached images */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.attachments
                .filter((att) => att.mimeType?.startsWith('image/'))
                .map((att, i) => (
                  <img
                    key={i}
                    src={att.content}
                    alt={att.fileName || 'مرفق'}
                    className="max-w-[280px] max-h-[200px] rounded-xl border border-white/[0.08] cursor-pointer hover:opacity-90 transition-all"
                    loading="lazy"
                    onClick={() => { if (att.content) window.open(att.content, '_blank'); }}
                  />
                ))}
            </div>
          )}

          {isUser ? (
            <p className="text-[14px] leading-relaxed text-aegis-text whitespace-pre-wrap">
              {cleanContent}
            </p>
          ) : (
            <div className="markdown-body text-[14px] leading-relaxed text-aegis-text">
              {(() => {
                try {
                  return (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const codeString = String(children).replace(/\n$/, '');
                          if (match || codeString.includes('\n')) {
                            return <CodeBlock language={match?.[1] || ''} code={codeString} />;
                          }
                          // Inline code — teal tinted
                          return (
                            <code
                              className="text-[13px] font-mono px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(78, 201, 176, 0.12)', color: '#4EC9B0' }}
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                        img({ src, alt }: any) {
                          return (
                            <div className="my-2">
                              <img
                                src={src}
                                alt={alt || ''}
                                className="max-w-full max-h-[400px] rounded-xl border border-white/[0.08] cursor-pointer hover:opacity-90 transition-all"
                                loading="lazy"
                                onClick={() => { if (src) window.open(src, '_blank'); }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                              {alt && <span className="text-[11px] text-white/30 mt-1 block">{alt}</span>}
                            </div>
                          );
                        },
                        a({ href, children }: any) {
                          return (
                            <a
                              href={href}
                              onClick={(e) => { e.preventDefault(); if (href) window.open(href, '_blank'); }}
                              className="text-[#4EC9B0] hover:text-[#3DB89F] underline underline-offset-2"
                            >
                              {children}
                            </a>
                          );
                        },
                      }}
                    >
                      {cleanContent}
                    </ReactMarkdown>
                  );
                } catch {
                  return <p className="whitespace-pre-wrap">{cleanContent}</p>;
                }
              })()}
            </div>
          )}
        </div>

        {/* Footer — Time + Actions (more visible) */}
        <div className="flex items-center gap-2 mt-1 px-1 h-5">
          <span className="text-[10px] text-white/25 font-mono">{timeStr}</span>

          {showActions && !isStreaming && (
            <div className="flex items-center gap-0.5 animate-fade-in">
              <button
                onClick={handleCopy}
                className="p-1 rounded-md hover:bg-white/[0.06] transition-colors"
                title={t('chat.copy')}
              >
                {copied ? (
                  <Check size={11} className="text-emerald-400" />
                ) : (
                  <Copy size={11} className="text-white/25 hover:text-white/50" />
                )}
              </button>
              {isUser && onResend && (
                <button
                  onClick={() => onResend(cleanContent)}
                  className="p-1 rounded-md hover:bg-white/[0.06] transition-colors"
                  title={t('chat.resend')}
                >
                  <RotateCcw size={11} className="text-white/25 hover:text-white/50" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
