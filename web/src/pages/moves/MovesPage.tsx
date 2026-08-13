import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal, Field, inputCls } from '../../components/Modal';
import { useAuth } from '../../lib/auth';
import { roleAtLeast } from '../../lib/modules';
import { fmtDateTime, num } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { applyStockMove } from '../../lib/stock';
import type { StockMoveRow } from '../../types/database';

export function MovesPage() {
  const { profile } = useAuth();
  const canWrite = roleAtLeast(profile?.role, 'operador');
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['stock_moves'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stock_moves').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  const { data: items } = useQuery({ queryKey: ['inventory_items'], queryFn: async () => (await supabase.from('inventory_items').select('*')).data ?? [] });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: async () => (await supabase.from('warehouses').select('*')).data ?? [] });

  const itemById = new Map((items ?? []).map((i) => [i.id, i]));
  const whById = new Map((warehouses ?? []).map((w) => [w.id, w]));

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ item_id: string; warehouse_id: string; type: 'entrada' | 'saida'; quantity: number; note: string }>({
    item_id: '',
    warehouse_id: '',
    type: 'entrada',
    quantity: 0,
    note: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await applyStockMove({
        itemId: form.item_id,
        warehouseId: form.warehouse_id,
        type: form.type,
        quantity: form.quantity,
        refType: 'ajuste',
        note: form.note,
        createdBy: profile?.id,
      });
      qc.invalidateQueries({ queryKey: ['stock_moves'] });
      qc.invalidateQueries({ queryKey: ['inventory_items'] });
      setOpen(false);
      setForm({ item_id: '', warehouse_id: '', type: 'entrada', quantity: 0, note: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar movimentação.');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<StockMoveRow>[] = [
    { key: 'created_at', header: 'Quando', render: (r) => fmtDateTime(r.created_at) },
    { key: 'item', header: 'Item', render: (r) => itemById.get(r.item_id)?.description ?? r.item_id },
    { key: 'type', header: 'Tipo', render: (r) => (r.type === 'entrada' ? '↓ Entrada' : '↑ Saída') },
    { key: 'quantity', header: 'Quantidade', render: (r) => num(r.quantity) },
    { key: 'warehouse', header: 'Depósito', render: (r) => (r.warehouse_id ? whById.get(r.warehouse_id)?.nome ?? '—' : '—') },
    { key: 'ref', header: 'Origem', render: (r) => [r.ref_type, r.ref_code].filter(Boolean).join(' · ') || '—' },
    { key: 'note', header: 'Observação', render: (r) => r.note || '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Movimentações</h1>
          <p className="text-sm text-[var(--nx-text-muted)]">Últimos 200 lançamentos de estoque</p>
        </div>
        {canWrite && (
          <button onClick={() => setOpen(true)} className="nx-btn nx-btn-primary rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
            + Novo ajuste
          </button>
        )}
      </div>

      <DataTable columns={columns} rows={data ?? []} rowKey={(r) => r.id} loading={isLoading} />

      {open && (
        <Modal title="Novo ajuste de estoque" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <Field label="Item">
              <select required className={inputCls} value={form.item_id} onChange={(e) => setForm({ ...form, item_id: e.target.value })}>
                <option value="">Selecione…</option>
                {(items ?? []).map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.sku} — {i.description}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Depósito">
              <select required className={inputCls} value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}>
                <option value="">Selecione…</option>
                {(warehouses ?? []).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.nome}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'entrada' | 'saida' })}>
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </Field>
              <Field label="Quantidade">
                <input
                  type="number"
                  min={0.001}
                  step="0.001"
                  required
                  className={inputCls}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                />
              </Field>
            </div>
            <Field label="Observação">
              <input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </Field>
            {error && <p className="mb-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="nx-btn nx-btn-secondary rounded-md border border-[var(--nx-border)] px-3 py-1.5 text-sm">
                Cancelar
              </button>
              <button disabled={saving} type="submit" className="nx-btn nx-btn-primary rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)] disabled:opacity-60">
                {saving ? 'Salvando…' : 'Registrar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
