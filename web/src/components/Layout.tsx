import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ALL_MODULES, CODE_MAP, MODULES, roleAtLeast } from '../lib/modules';
import { toggleTheme, isDark } from '../lib/theme';

export function Layout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [cmd, setCmd] = useState('');
  const [dark, setDark] = useState(isDark());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const visibleGroups = useMemo(
    () =>
      MODULES.map((g) => ({
        ...g,
        items: g.items.filter((m) => roleAtLeast(profile?.role, m.minRole ?? 'consulta')),
      })).filter((g) => g.items.length > 0),
    [profile?.role]
  );

  function runCommand(e: React.FormEvent) {
    e.preventDefault();
    const code = cmd.trim().toUpperCase();
    const path = CODE_MAP[code];
    if (path) {
      navigate(path);
      setCmd('');
    } else {
      const match = ALL_MODULES.find((m) => m.label.toLowerCase().includes(cmd.trim().toLowerCase()) && cmd.trim());
      if (match) {
        navigate(match.path);
        setCmd('');
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-[var(--nx-bg)] text-[var(--nx-text)]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 shrink-0 overflow-y-auto border-r border-[var(--nx-border)] bg-[var(--nx-surface)] p-3 transition-transform lg:static lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-4 flex items-center gap-2 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--nx-accent)] font-bold text-[var(--nx-accent-fg)]">N</div>
          <div>
            <div className="text-sm font-bold leading-none">NEXUS</div>
            <div className="text-[10px] leading-none text-[var(--nx-text-muted)]">ERP</div>
          </div>
        </div>
        <nav className="space-y-4">
          {visibleGroups.map((g) => (
            <div key={g.group}>
              <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--nx-text-muted)]">{g.group}</div>
              <div className="space-y-0.5">
                {g.items.map((m) => (
                  <NavLink
                    key={m.id}
                    to={m.path}
                    end={m.path === '/'}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                        isActive
                          ? 'bg-[var(--nx-accent)] text-[var(--nx-accent-fg)]'
                          : 'text-[var(--nx-text)] hover:bg-black/5 dark:hover:bg-white/10'
                      }`
                    }
                  >
                    <span>{m.label}</span>
                    {!m.ready && <span className="text-[9px] opacity-70">soon</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileNavOpen(false)} />
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--nx-border)] bg-[var(--nx-surface)] px-4 py-2">
          <button className="rounded p-1.5 hover:bg-black/5 dark:hover:bg-white/10 lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Abrir menu">
            ☰
          </button>
          <form onSubmit={runCommand} className="flex-1">
            <input
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              placeholder="Código de transação (EST, PROD, COMP, VEND, FIN...) e Enter"
              className="w-full max-w-sm rounded-md border border-[var(--nx-border)] bg-[var(--nx-bg)] px-3 py-1.5 text-sm outline-none focus:border-[var(--nx-accent)]"
            />
          </form>
          <div className="flex-1" />
          <button
            onClick={() => setDark(toggleTheme())}
            className="rounded-md border border-[var(--nx-border)] px-2 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Alternar tema"
          >
            {dark ? '☀️' : '🌙'}
          </button>
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium leading-tight">{profile?.name ?? '—'}</div>
            <div className="text-xs capitalize leading-tight text-[var(--nx-text-muted)]">{profile?.role ?? ''}</div>
          </div>
          <button
            onClick={() => signOut()}
            className="rounded-md border border-[var(--nx-border)] px-2 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
          >
            Sair
          </button>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
