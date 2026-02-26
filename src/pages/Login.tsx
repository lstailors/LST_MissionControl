import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

// ═══════════════════════════════════════════════════════════
// Login Page — Full-screen glass login card
// ═══════════════════════════════════════════════════════════

export function LoginPage() {
  const { isAuthenticated } = useAuthStore();
  const signIn = useAuthStore((s) => s.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // TODO: Re-enable auth gate once Supabase network connectivity is resolved
  // if (isAuthenticated) return <Navigate to="/" replace />;
  return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setError(null);
    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.error) setError(result.error);
  };

  return (
    <div className="fixed inset-0 bg-[#0A120B] flex items-center justify-center overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(75,140,80,0.06)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-[-300px] left-[-100px] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(240,236,212,0.04)_0%,transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-[380px] rounded-2xl border border-aegis-border bg-aegis-card backdrop-blur-xl overflow-hidden"
      >
        {/* Top light edge */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="p-8">
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="text-[10px] font-bold tracking-[4px] text-aegis-text-muted mb-1">
              L&S CUSTOM TAILORS
            </div>
            <h1 className="text-[22px] font-serif font-bold text-[#F0ECD4] tracking-tight">
              Mission Control
            </h1>
            <p className="text-[11px] text-aegis-text-dim mt-1">
              Sign in to continue
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-aegis-danger-surface border border-[rgb(var(--aegis-danger)/0.2)] text-[12px] text-aegis-danger"
            >
              <AlertCircle size={14} />
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] text-aegis-text-muted font-medium mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@lscustomtailors.com"
                autoFocus
                disabled={loading}
                className="w-full px-3 py-2.5 rounded-xl text-[13px]
                  bg-[rgb(var(--aegis-overlay)/0.04)] border border-aegis-border
                  text-aegis-text placeholder:text-aegis-text-dim
                  outline-none focus:border-aegis-primary/40 focus:bg-[rgb(var(--aegis-overlay)/0.06)]
                  transition-all disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-[11px] text-aegis-text-muted font-medium mb-1.5 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full px-3 py-2.5 rounded-xl text-[13px]
                  bg-[rgb(var(--aegis-overlay)/0.04)] border border-aegis-border
                  text-aegis-text placeholder:text-aegis-text-dim
                  outline-none focus:border-aegis-primary/40 focus:bg-[rgb(var(--aegis-overlay)/0.06)]
                  transition-all disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className="w-full py-2.5 rounded-xl text-[13px] font-semibold
                bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/25
                hover:bg-[#4ADE80]/25 hover:border-[#4ADE80]/40
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-[10px] text-aegis-text-dim text-center mt-6">
            Admin-managed accounts only
          </p>
        </div>
      </motion.div>
    </div>
  );
}
