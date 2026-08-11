import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function ProtectedRoute() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--nx-text-muted)]">
        Carregando…
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-[var(--nx-text-muted)]">
        Sua conta não tem um perfil associado. Peça a um administrador para verificar a tabela
        <code className="mx-1">profiles</code> no Supabase.
      </div>
    );
  }

  if (!profile.active) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-[var(--nx-text-muted)]">
        Sua conta está inativa. Fale com um administrador do NEXUS.
      </div>
    );
  }

  return <Outlet />;
}
