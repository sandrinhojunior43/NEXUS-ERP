import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCrud } from '../../hooks/useCrud';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal, Field, inputCls } from '../../components/Modal';
import { useAuth } from '../../lib/auth';
import { roleAtLeast } from '../../lib/modules';
import { fmtDate, today } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { LoteRow } from '../../types/database';

const empty = { item_id: '', codigo: '', fornecedor_id: '', nf: '', fabricacao: today(), validade: '', obs: '' };

export function LotesPage() {
  const { profile } = useAuth();
  const canWrite = roleAtLeast(profile?.role, 'operador');
  const { data, isLoading, create } = useCrud('lotes');
  const { data: items } = useQuery({ queryKey: ['inventory_items'], queryFn: async () => (await supabase.from('inventory_items').select('*')).data ?? [] });
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);

  const itemById = new Map((items ?? []).map((i) => [i.id, i]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const codigo = form.codigo || `L${Date.now().toString(36).toUpperCase()}`;
    await create.mutateAsync({ ...form, codigo, fornecedor_id: form.fornecedor_id || null, validade: form.validade || null });
    setOpen(false);
    setForm(empty);
  }

  const today0 = today();
  const columns: Column<LoteRow>[] = [
    { key: 'codigo', header: 'Código', render: (r) => r.codigo },
    { key: 'item', header: 'Item', render: (r) => itemById.get(r.item_id)?.description ?? r.item_id },
    { key: 'nf', header: 'NF', render: (r) => r.nf || '—' },
    { key: 'fabricacao', header: 'Fabricação', render: (r) => fmtDate(r.fabricacao) },
    {
      key: 'validade',
      header: 'Validade',
      render: (r) =>
        r.validade ? (
          <span className={r.validade < today0 ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}>{fmtDate(r.validade)}</span>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Lotes e rastreio</h1>
          <p className="text-sm text-[var(--nx-text-muted)]">{data?.length ?? 0} lotes</p>
        </div>
        {canWrite && (
          <button onClick={() => setOpen(true)} className="nx-btn nx-btn-primary rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
            + Novo lote
          </button>
        )}
      </div>

      <DataTable columns={columns} rows={data ?? []} rowKey={(r) => r.id} loading={isLoading} emptyMessage="Nenhum lote registrado ainda." />

      {open && (
        <Modal title="Novo lote" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <Field label="Item">
              <select required className={inputCls} value={form.item_id} onChange={(e) => setForm({ ...form, item_id: e.target.value })}>
                <option value="">Selecione…</option>
                {(items ?? [])
                  .filter((i) => i.controla_lote)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.sku} — {i.description}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Código do lote (opcional)">
              <input className={inputCls} value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
            </Field>
            <Field label="Nota fiscal">
              <input className={inputCls} value={form.nf} onChange={(e) => setForm({ ...form, nf: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fabricação">
                <input type="date" className={inputCls} value={form.fabricacao} onChange={(e) => setForm({ ...form, fabricacao: e.target.value })} />
              </Field>
              <Field label="Validade">
                <input type="date" className={inputCls} value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })} />
              </Field>
            </div>
            <Field label="Observações">
              <input className={inputCls} value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} />
            </Field>
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
