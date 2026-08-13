import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabaseConfigured } from '../lib/supabase';

export function Login() {
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Já autenticado (login recém-concluído, ou sessão restaurada ao abrir
  // /login diretamente) — não faz sentido mostrar o formulário de novo.
  if (session) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) setError(error);
  }

  return (
    <div className="nx-auth-bg flex min-h-screen items-center justify-center bg-[var(--nx-bg)] p-4">
      <div className="nx-card w-full max-w-sm rounded-xl border border-[var(--nx-border)] bg-[var(--nx-surface)] p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--nx-accent)] font-bold text-[var(--nx-accent-fg)]">N</div>
          <div>
            <div className="text-base font-bold leading-none">NEXUS</div>
            <div className="text-xs leading-none text-[var(--nx-text-muted)]">Enterprise ERP</div>
          </div>
        </div>

        {!supabaseConfigured && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
            Backend não configurado. Copie <code>web/.env.example</code> para <code>web/.env</code> e
            preencha com a URL/anon key do seu projeto Supabase (veja <code>supabase/README.md</code>).
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="mb-3 block text-sm">
            <span className="mb-1 block font-medium text-[var(--nx-text-muted)]">E-mail</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-[var(--nx-border)] bg-[var(--nx-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--nx-accent)]"
              placeholder="voce@empresa.com"
              autoFocus
            />
          </label>
          <label className="mb-4 block text-sm">
            <span className="mb-1 block font-medium text-[var(--nx-text-muted)]">Senha</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-[var(--nx-border)] bg-[var(--nx-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--nx-accent)]"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="mb-4 rounded-md border border-rose-300 bg-rose-50 p-2 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="nx-btn nx-btn-primary w-full rounded-md bg-[var(--nx-accent)] px-3 py-2 text-sm font-medium text-[var(--nx-accent-fg)] disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
