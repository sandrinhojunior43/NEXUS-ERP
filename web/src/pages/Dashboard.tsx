import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '../lib/supabase';
import { Kpi } from '../components/Kpi';
import { money, num, fmtDate } from '../lib/format';

export function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [items, production, sales, financial] = await Promise.all([
        supabase.from('inventory_items').select('*'),
        supabase.from('production_orders').select('*'),
        supabase.from('sales').select('*'),
        supabase.from('financial_entries').select('*'),
      ]);
      if (items.error) throw items.error;
      if (production.error) throw production.error;
      if (sales.error) throw sales.error;
      if (financial.error) throw financial.error;
      return {
        items: items.data ?? [],
        production: production.data ?? [],
        sales: sales.data ?? [],
        financial: financial.data ?? [],
      };
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  const abaixoMinimo = data?.items.filter((i) => i.quantity <= i.min_quantity).length ?? 0;
  const emProducao = data?.production.filter((o) => o.status === 'em producao' || o.status === 'planejada').length ?? 0;
  const atrasadas = data?.production.filter((o) => o.status !== 'concluida' && o.due_at && o.due_at < today).length ?? 0;
  const vendasAbertas = data?.sales.filter((s) => s.status === 'aberto').length ?? 0;
  const faturamento = data?.sales.filter((s) => s.status === 'faturado').length ?? 0;

  const aReceber = data?.financial.filter((f) => f.type === 'receber' && !f.paid_at).reduce((a, f) => a + Number(f.amount), 0) ?? 0;
  const aPagar = data?.financial.filter((f) => f.type === 'pagar' && !f.paid_at).reduce((a, f) => a + Number(f.amount), 0) ?? 0;
  const vencidos = data?.financial.filter((f) => !f.paid_at && f.due_at < today).length ?? 0;

  const porCategoria = Object.entries(
    (data?.items ?? []).reduce<Record<string, number>>((acc, i) => {
      const cat = i.category ?? 'Sem categoria';
      acc[cat] = (acc[cat] ?? 0) + Number(i.quantity);
      return acc;
    }, {})
  ).map(([categoria, quantidade]) => ({ categoria, quantidade }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Painel geral</h1>
        <p className="text-sm text-[var(--nx-text-muted)]">Visão consolidada em tempo real — dados vêm direto do Supabase.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Kpi label="Itens abaixo do mínimo" value={num(abaixoMinimo)} tone={abaixoMinimo > 0 ? 'warning' : 'default'} />
        <Kpi label="Ordens em produção" value={num(emProducao)} hint={atrasadas > 0 ? `${atrasadas} com prazo vencido` : undefined} tone={atrasadas > 0 ? 'danger' : 'default'} />
        <Kpi label="Vendas em aberto" value={num(vendasAbertas)} hint={`${faturamento} faturadas`} />
        <Kpi label="Contas a receber" value={money(aReceber)} />
        <Kpi label="Contas a pagar" value={money(aPagar)} />
        <Kpi label="Títulos vencidos" value={num(vencidos)} tone={vencidos > 0 ? 'danger' : 'default'} />
      </div>

      <div className="rounded-xl border border-[var(--nx-border)] bg-[var(--nx-surface)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--nx-text-muted)]">Estoque por categoria</h2>
        {isLoading ? (
          <div className="py-10 text-center text-sm text-[var(--nx-text-muted)]">Carregando…</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={porCategoria}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--nx-border)" />
              <XAxis dataKey="categoria" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => num(Number(v))} />
              <Bar dataKey="quantidade" fill="var(--nx-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-xs text-[var(--nx-text-muted)]">Atualizado em {fmtDate(today)}.</p>
    </div>
  );
}
