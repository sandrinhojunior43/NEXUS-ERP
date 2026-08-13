import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal, Field, inputCls } from '../../components/Modal';
import { useAuth } from '../../lib/auth';
import { roleAtLeast } from '../../lib/modules';
import { money, fmtDate, today } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { FinancialEntryRow } from '../../types/database';

export function FinancialPage() {
  const { profile } = useAuth();
  const canWrite = roleAtLeast(profile?.role, 'operador');
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['financial_entries'],
    queryFn: async () => (await supabase.from('financial_entries').select('*').order('due_at', { ascending: true })).data ?? [],
  });
  const [filter, setFilter] = useState<'todos' | 'pagar' | 'receber' | 'vencidos'>('todos');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ type: 'pagar' | 'receber'; description: string; amount: number; due_at: string }>({
    type: 'pagar',
    description: '',
    amount: 0,
    due_at: today(),
  });

  const today0 = today();
  const rows = (data ?? []).filter((f) => {
    if (filter === 'pagar') return f.type === 'pagar';
    if (filter === 'receber') return f.type === 'receber';
    if (filter === 'vencidos') return !f.paid_at && f.due_at < today0;
    return true;
  });

  const totalReceber = (data ?? []).filter((f) => f.type === 'receber' && !f.paid_at).reduce((a, f) => a + Number(f.amount), 0);
  const totalPagar = (data ?? []).filter((f) => f.type === 'pagar' && !f.paid_at).reduce((a, f) => a + Number(f.amount), 0);

  async function baixar(row: FinancialEntryRow) {
    await supabase.from('financial_entries').update({ paid_at: today() }).eq('id', row.id);
    qc.invalidateQueries({ queryKey: ['financial_entries'] });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { data: code } = await supabase.rpc('next_code', { p_prefix: 'FIN', p_pad: 5 });
    await supabase.from('financial_entries').insert({ ...form, code: code ?? `FIN${Date.now()}` });
    qc.invalidateQueries({ queryKey: ['financial_entries'] });
    setOpen(false);
    setForm({ type: 'pagar', description: '', amount: 0, due_at: today() });
  }

  const columns: Column<FinancialEntryRow>[] = [
    { key: 'code', header: 'Código', render: (r) => r.code },
    { key: 'type', header: 'Tipo', render: (r) => (r.type === 'pagar' ? 'A pagar' : 'A receber') },
    { key: 'description', header: 'Descrição', render: (r) => r.description },
    { key: 'due_at', header: 'Vencimento', render: (r) => <span className={!r.paid_at && r.due_at < today0 ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}>{fmtDate(r.due_at)}</span> },
    { key: 'amount', header: 'Valor', render: (r) => money(r.amount) },
    { key: 'paid_at', header: 'Status', render: (r) => (r.paid_at ? `Baixado em ${fmtDate(r.paid_at)}` : 'Em aberto') },
  ];
  if (canWrite) {
    columns.push({
      key: 'actions',
      header: '',
      render: (r) =>
        !r.paid_at ? (
          <button onClick={(e) => { e.stopPropagation(); baixar(r); }} className="nx-link text-xs text-[var(--nx-accent)] hover:underline">
            Baixar
          </button>
        ) : null,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Financeiro</h1>
          <p className="text-sm text-[var(--nx-text-muted)]">
            A receber: <span className="font-medium text-[var(--nx-text)]">{money(totalReceber)}</span> · A pagar:{' '}
            <span className="font-medium text-[var(--nx-text)]">{money(totalPagar)}</span>
          </p>
        </div>
        {canWrite && (
          <button onClick={() => setOpen(true)} className="nx-btn nx-btn-primary rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
            + Novo lançamento
          </button>
        )}
      </div>

      <div className="flex gap-2 text-sm">
        {(['todos', 'pagar', 'receber', 'vencidos'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`nx-pill rounded-full border px-3 py-1 ${filter === f ? 'border-[var(--nx-accent)] bg-[var(--nx-accent)] text-[var(--nx-accent-fg)]' : 'border-[var(--nx-border)]'}`}
          >
            {f === 'todos' ? 'Todos' : f === 'pagar' ? 'A pagar' : f === 'receber' ? 'A receber' : 'Vencidos'}
          </button>
        ))}
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} loading={isLoading} />

      {open && (
        <Modal title="Novo lançamento financeiro" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <Field label="Tipo">
              <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'pagar' | 'receber' })}>
                <option value="pagar">A pagar</option>
                <option value="receber">A receber</option>
              </select>
            </Field>
            <Field label="Descrição">
              <input required className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor">
                <input type="number" min={0} step="0.01" required className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              </Field>
              <Field label="Vencimento">
                <input type="date" className={inputCls} value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="nx-btn nx-btn-secondary rounded-md border border-[var(--nx-border)] px-3 py-1.5 text-sm">
                Cancelar
              </button>
              <button type="submit" className="nx-btn nx-btn-primary rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
                Salvar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
