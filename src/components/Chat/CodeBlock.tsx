import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// Code Block — premium syntax highlighting
// ═══════════════════════════════════════════════════════════

interface CodeBlockProps {
  language: string;
  code: string;
}

const customTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: 'rgba(10, 10, 20, 0.7)',
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
    <div className="my-2 rounded-xl overflow-hidden border border-aegis-border/40 group shadow-card" dir="ltr">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-aegis-elevated/60 border-b border-aegis-border/30">
        <span className="text-[10px] font-mono font-medium text-aegis-text-dim uppercase tracking-widest">
          {displayLang}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] text-aegis-text-dim hover:text-aegis-text-muted transition-colors"
          title="نسخ الكود"
        >
          {copied ? (
            <>
              <Check size={11} className="text-aegis-success" />
              <span className="text-aegis-success">تم</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">نسخ</span>
            </>
          )}
        </button>
      </div>

      {/* Code */}
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
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
