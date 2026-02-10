import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// Code Block — Dark theme matching AEGIS design
// ═══════════════════════════════════════════════════════════

interface CodeBlockProps {
  language: string;
  code: string;
}

// Force solid dark background — override any inherited light styles
const customTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: '#0d1117',
    margin: 0,
    padding: '1em',
    borderRadius: 0,
    fontSize: '0.87em',
    direction: 'ltr' as const,
    textAlign: 'left' as const,
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'transparent',
    direction: 'ltr' as const,
    textAlign: 'left' as const,
  },
};

export function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayLang = language || 'text';

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-white/[0.08] group" dir="ltr"
      style={{ background: '#0d1117' }}>
      {/* Header — solid dark */}
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-white/[0.06]"
        style={{ background: '#161b22' }}>
        <span className="text-[10px] font-mono font-medium text-white/40 uppercase tracking-widest">
          {displayLang}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors"
          title="نسخ الكود"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" />
              <span className="text-emerald-400">تم</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">نسخ</span>
            </>
          )}
        </button>
      </div>

      {/* Code — solid dark background */}
      <SyntaxHighlighter
        language={language || 'text'}
        style={customTheme}
        showLineNumbers={code.split('\n').length > 3}
        lineNumberStyle={{
          color: 'rgba(139, 124, 248, 0.15)',
          fontSize: '0.78em',
          paddingRight: '1em',
          minWidth: '2.5em',
          textAlign: 'right',
        }}
        wrapLongLines
        customStyle={{
          background: '#0d1117',
          margin: 0,
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
