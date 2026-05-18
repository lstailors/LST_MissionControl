import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

// ═══════════════════════════════════════════════════════════
// ProtectedRoute — Redirects to /login if no Supabase session
// ═══════════════════════════════════════════════════════════

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#0A120B] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-aegis-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}
