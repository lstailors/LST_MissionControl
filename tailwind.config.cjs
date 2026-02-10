/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aegis: {
          // ── Core Background (Glass-dark — matches conceptual design) ──
          bg: '#0c1015',               // Deep background
          surface: 'rgba(255,255,255,0.02)',  // Raised surface (glass)
          elevated: 'rgba(255,255,255,0.035)',// Cards, modals (glass)
          card: 'rgba(255,255,255,0.025)',    // Panels (glass)

          // ── Solid variants (for elements that need solid bg) ──
          'bg-solid': '#0c1015',
          'surface-solid': '#111921',
          'elevated-solid': '#161f2b',
          'card-solid': '#131a24',

          // ── Chrome (titlebar, sidebar — slightly lighter) ──
          chrome: 'rgba(255,255,255,0.025)',

          // ── Borders (subtle glass edges) ──
          border: 'rgba(255,255,255,0.05)',
          'border-hover': 'rgba(255,255,255,0.1)',
          'border-active': 'rgba(255,255,255,0.15)',

          // ── Text ──
          text: '#e6edf3',
          'text-secondary': '#b1bac4',
          'text-muted': '#8b949e',
          'text-dim': '#5a6370',

          // ── Primary (Teal — AEGIS identity) ──
          primary: '#4EC9B0',
          'primary-hover': '#3DB89F',
          'primary-deep': '#2CA78E',
          'primary-glow': 'rgba(78, 201, 176, 0.16)',
          'primary-surface': 'rgba(78, 201, 176, 0.08)',

          // ── Accent (Electric Blue) ──
          accent: '#6C9FFF',
          'accent-hover': '#5A8FFF',
          'accent-glow': 'rgba(108, 159, 255, 0.14)',

          // ── Status ──
          danger: '#F47067',
          'danger-surface': 'rgba(244, 112, 103, 0.10)',
          warning: '#E8B84E',
          'warning-surface': 'rgba(232, 184, 78, 0.10)',
          success: '#3fb950',
          'success-surface': 'rgba(63, 185, 80, 0.10)',

          // ── Message-specific ──
          'user-bubble': 'rgba(78, 201, 176, 0.12)',
          'user-border': 'rgba(78, 201, 176, 0.20)',
          'bot-bubble': 'rgba(255, 255, 255, 0.03)',
          'bot-border': 'rgba(255, 255, 255, 0.05)',

          // ── Glass effect ──
          'glass': 'rgba(255, 255, 255, 0.03)',
          'glass-border': 'rgba(255, 255, 255, 0.05)',
          'glass-hover': 'rgba(255, 255, 255, 0.06)',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans Arabic', 'SF Pro Display', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', 'monospace'],
        arabic: ['IBM Plex Sans Arabic', 'Segoe UI', 'Tahoma', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(78, 201, 176, 0.18)',
        'glow-md': '0 0 24px rgba(78, 201, 176, 0.24)',
        'glow-lg': '0 4px 40px rgba(78, 201, 176, 0.28)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.25), 0 0 1px rgba(255, 255, 255, 0.04)',
        'float': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-subtle': 'linear-gradient(135deg, rgba(78, 201, 176, 0.04) 0%, rgba(108, 159, 255, 0.04) 100%)',
        'gradient-surface': 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(78, 201, 176, 0.10) 50%, transparent 100%)',
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
        // ── Conceptual Design Animations ──
        'glow-teal': 'glowTeal 2.5s ease-in-out infinite',
        'glow-green': 'glowGreen 2s ease-in-out infinite',
        'glow-accent': 'glowAccent 3s ease-in-out infinite',
        'dot-pulse': 'dotPulse 2s ease-in-out infinite',
        'beacon': 'beacon 2s ease-in-out infinite',
        'shimmer-edge': 'shimmerEdge 3s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'icon-glow': 'iconGlow 2.5s ease-in-out infinite',
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
          '0%, 100%': { boxShadow: '0 0 12px rgba(78, 201, 176, 0.12)' },
          '50%': { boxShadow: '0 0 24px rgba(78, 201, 176, 0.28)' },
        },
        // ── Conceptual Design Keyframes ──
        glowTeal: {
          '0%, 100%': { boxShadow: '0 0 6px rgba(78, 201, 176, 0.2), 0 0 12px rgba(78, 201, 176, 0.1)' },
          '50%': { boxShadow: '0 0 12px rgba(78, 201, 176, 0.4), 0 0 24px rgba(78, 201, 176, 0.2)' },
        },
        glowGreen: {
          '0%, 100%': { boxShadow: '0 0 4px rgba(63, 185, 80, 0.3)', opacity: '1' },
          '50%': { boxShadow: '0 0 10px rgba(63, 185, 80, 0.6)', opacity: '0.7' },
        },
        glowAccent: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(108, 159, 255, 0.15)' },
          '50%': { boxShadow: '0 0 20px rgba(108, 159, 255, 0.3)' },
        },
        dotPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.3)', opacity: '0.6' },
        },
        beacon: {
          '0%': { boxShadow: '0 0 0 0 rgba(78, 201, 176, 0.4)' },
          '70%': { boxShadow: '0 0 0 10px rgba(78, 201, 176, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(78, 201, 176, 0)' },
        },
        shimmerEdge: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        iconGlow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 2px rgba(78, 201, 176, 0.3))' },
          '50%': { filter: 'drop-shadow(0 0 6px rgba(78, 201, 176, 0.6))' },
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
