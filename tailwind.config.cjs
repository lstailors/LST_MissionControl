/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aegis: {
          // ── Core Background ──
          bg: '#141422',
          surface: '#1b1b2e',
          elevated: '#242440',
          card: '#1e1e35',

          // ── Borders ──
          border: '#2e2e50',
          'border-hover': '#3c3c64',
          'border-active': '#4e4e7a',

          // ── Text ──
          text: '#ededf8',
          'text-secondary': '#bdbdd8',
          'text-muted': '#8e8eb4',
          'text-dim': '#5e5e88',

          // ── Primary (Royal Purple) ──
          primary: '#9388ff',
          'primary-hover': '#8378f5',
          'primary-deep': '#7568f0',
          'primary-glow': 'rgba(147, 136, 255, 0.14)',
          'primary-surface': 'rgba(147, 136, 255, 0.10)',

          // ── Accent (Cyan/Teal) ──
          accent: '#10f0c8',
          'accent-hover': '#00d8b0',
          'accent-glow': 'rgba(16, 240, 200, 0.14)',

          // ── Status ──
          danger: '#ff6b8a',
          'danger-surface': 'rgba(255, 107, 138, 0.10)',
          warning: '#ffb844',
          'warning-surface': 'rgba(255, 184, 68, 0.10)',
          success: '#10f0c8',
          'success-surface': 'rgba(16, 240, 200, 0.10)',

          // ── Message-specific ──
          'user-bubble': 'rgba(147, 136, 255, 0.12)',
          'user-border': 'rgba(147, 136, 255, 0.22)',
          'bot-bubble': '#1a1a32',
          'bot-border': 'rgba(46, 46, 80, 0.7)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        arabic: ['Noto Sans Arabic', 'Segoe UI', 'Tahoma', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(147, 136, 255, 0.18)',
        'glow-md': '0 0 24px rgba(147, 136, 255, 0.24)',
        'glow-lg': '0 4px 40px rgba(147, 136, 255, 0.28)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.3), 0 0 1px rgba(255, 255, 255, 0.05)',
        'float': '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-subtle': 'linear-gradient(135deg, rgba(147, 136, 255, 0.04) 0%, rgba(16, 240, 200, 0.04) 100%)',
        'gradient-surface': 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(147, 136, 255, 0.10) 50%, transparent 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'fade-in-slow': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'pulse-ring': 'pulseRing 1.5s ease-out infinite',
        'typing-dot': 'typingDot 1.4s ease-in-out infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-subtle': 'bounceSubtle 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.95)', opacity: '1' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        typingDot: {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%': { transform: 'translateY(-6px)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceSubtle: {
          '0%': { transform: 'scale(0.95)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(147, 136, 255, 0.12)' },
          '50%': { boxShadow: '0 0 24px rgba(147, 136, 255, 0.28)' },
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
