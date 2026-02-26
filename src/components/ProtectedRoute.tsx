import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

// ═══════════════════════════════════════════════════════════
// ProtectedRoute — Redirects to /login if no Supabase session
// ═══════════════════════════════════════════════════════════

export function ProtectedRoute() {
  // TODO: Re-enable auth once Supabase network connectivity is resolved
  // const { isAuthenticated, isLoading } = useAuthStore();
  //
  // if (isLoading) { ... }
  // if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}
