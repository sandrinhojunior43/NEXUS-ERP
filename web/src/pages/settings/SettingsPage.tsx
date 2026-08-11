import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export function SettingsPage() {
  const { profile } = useAuth();
  const { data: empresa } = useQuery({
    queryKey: ['empresa'],
    queryFn: async () => (await supabase.from('empresa').select('*').limit(1).maybeSingle()).data,
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-[var(--nx-text-muted)]">Dados da empresa e da sua conta.</p>
      </div>

      <div className="rounded-xl border border-[var(--nx-border)] bg-[var(--nx-surface)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--nx-text-muted)]">Empresa</h2>
        {empresa ? (
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-[var(--nx-text-muted)]">Razão social</dt>
            <dd>{empresa.razao}</dd>
            <dt className="text-[var(--nx-text-muted)]">CNPJ</dt>
            <dd>{empresa.cnpj}</dd>
            <dt className="text-[var(--nx-text-muted)]">Município/UF</dt>
            <dd>{empresa.municipio}/{empresa.uf}</dd>
            <dt className="text-[var(--nx-text-muted)]">Regime tributário</dt>
            <dd className="capitalize">{empresa.regime}</dd>
          </dl>
        ) : (
          <p className="text-sm text-[var(--nx-text-muted)]">
            Nenhuma empresa cadastrada ainda — rode <code>supabase/seed.sql</code> ou cadastre manualmente na tabela
            <code className="mx-1">empresa</code>.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--nx-border)] bg-[var(--nx-surface)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--nx-text-muted)]">Sua conta</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-[var(--nx-text-muted)]">Nome</dt>
          <dd>{profile?.name}</dd>
          <dt className="text-[var(--nx-text-muted)]">E-mail</dt>
          <dd>{profile?.email}</dd>
          <dt className="text-[var(--nx-text-muted)]">Papel</dt>
          <dd className="capitalize">{profile?.role}</dd>
        </dl>
      </div>

      <div className="rounded-xl border border-[var(--nx-border)] bg-[var(--nx-surface)] p-4 text-xs text-[var(--nx-text-muted)]">
        NEXUS ERP — backend real em Supabase (Postgres + Auth + RLS). Veja <code>NEXUS_ARCHITECTURE.md</code> na raiz do
        repositório para detalhes técnicos e <code>NEXUS_ROADMAP.md</code> para o que falta implementar.
      </div>
    </div>
  );
}
