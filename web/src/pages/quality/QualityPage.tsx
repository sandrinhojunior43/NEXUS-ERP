import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal, Field, inputCls } from '../../components/Modal';
import { Kpi } from '../../components/Kpi';
import { useAuth } from '../../lib/auth';
import { roleAtLeast } from '../../lib/modules';
import { num, fmtDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { InventoryItemRow, ProductionOrderRow, QualityInspectionRow } from '../../types/database';

export function QualityPage() {
  const { profile } = useAuth();
  const canWrite = roleAtLeast(profile?.role, 'operador');
  const qc = useQueryClient();

  const { data: inspections, isLoading } = useQuery({
    queryKey: ['quality_inspections'],
    queryFn: async () => (await supabase.from('quality_inspections').select('*').order('created_at', { ascending: false })).data as QualityInspectionRow[] ?? [],
  });
  const { data: orders } = useQuery({
    queryKey: ['production_orders'],
    queryFn: async () => (await supabase.from('production_orders').select('*')).data as ProductionOrderRow[] ?? [],
  });
  const { data: items } = useQuery({
    queryKey: ['inventory_items'],
    queryFn: async () => (await supabase.from('inventory_items').select('*')).data as InventoryItemRow[] ?? [],
  });
  const orderById = new Map((orders ?? []).map((o) => [o.id, o]));
  const itemById = new Map((items ?? []).map((i) => [i.id, i]));

  const concludedOrders = (orders ?? []).filter((o) => o.status === 'concluida');
  const inspectedOrderIds = new Set((inspections ?? []).map((i) => i.order_id));
  const pendingOrders = concludedOrders.filter((o) => !inspectedOrderIds.has(o.id));

  const taxaMedia =
    (inspections ?? []).length > 0 ? (inspections ?? []).reduce((a, i) => a + Number(i.rate), 0) / (inspections ?? []).length : 0;
  const abaixo95 = (inspections ?? []).filter((i) => Number(i.rate) < 95).length;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ order_id: '', inspected_qty: 0, accepted_qty: 0, inspector: '', notes: '' });
  const [error, setError] = useState<string | null>(null);

  function openNew(orderId?: string) {
    const order = orderId ? orderById.get(orderId) : undefined;
    setForm({ order_id: orderId ?? '', inspected_qty: order?.quantity ?? 0, accepted_qty: order?.quantity ?? 0, inspector: '', notes: '' });
    setError(null);
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.accepted_qty > form.inspected_qty) return setError('Quantidade aceita não pode ser maior que a inspecionada.');
    const rate = form.inspected_qty > 0 ? +((form.accepted_qty / form.inspected_qty) * 100).toFixed(2) : 0;
    const { data: code } = await supabase.rpc('next_code', { p_prefix: 'INS', p_pad: 5 });
    const { error: err } = await supabase.from('quality_inspections').insert({
      code: code ?? `INS${Date.now()}`,
      order_id: form.order_id || null,
      inspected_qty: form.inspected_qty,
      accepted_qty: form.accepted_qty,
      rate,
      inspector: form.inspector,
      notes: form.notes,
    });
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ['quality_inspections'] });
    setOpen(false);
  }

  const columns: Column<QualityInspectionRow>[] = [
    { key: 'code', header: 'Código', render: (r) => r.code },
    {
      key: 'order',
      header: 'Ordem / Produto',
      render: (r) => {
        const o = r.order_id ? orderById.get(r.order_id) : undefined;
        const item = o ? itemById.get(o.product_id) : undefined;
        return o ? `${o.code} — ${item?.description ?? ''}` : '—';
      },
    },
    { key: 'inspected_qty', header: 'Inspecionado', render: (r) => num(r.inspected_qty) },
    { key: 'accepted_qty', header: 'Aceito', render: (r) => num(r.accepted_qty) },
    {
      key: 'rate',
      header: 'Taxa de conformidade',
      render: (r) => (
        <span className={Number(r.rate) < 95 ? 'font-semibold text-rose-600 dark:text-rose-400' : 'font-semibold text-emerald-600 dark:text-emerald-400'}>
          {Number(r.rate).toFixed(2)}%
        </span>
      ),
    },
    { key: 'inspector', header: 'Inspetor', render: (r) => r.inspector || '—' },
    { key: 'created_at', header: 'Data', render: (r) => fmtDateTime(r.created_at) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Qualidade</h1>
          <p className="text-sm text-[var(--nx-text-muted)]">{inspections?.length ?? 0} inspeções registradas</p>
        </div>
        {canWrite && (
          <button onClick={() => openNew()} className="nx-btn nx-btn-primary rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
            + Nova inspeção
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi label="Taxa média de conformidade" value={`${taxaMedia.toFixed(2)}%`} tone={taxaMedia > 0 && taxaMedia < 95 ? 'warning' : 'default'} />
        <Kpi label="Inspeções abaixo de 95%" value={num(abaixo95)} tone={abaixo95 > 0 ? 'danger' : 'default'} />
        <Kpi label="Ordens concluídas aguardando inspeção" value={num(pendingOrders.length)} tone={pendingOrders.length > 0 ? 'warning' : 'default'} />
      </div>

      {canWrite && pendingOrders.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-900/20">
          <p className="mb-2 font-medium text-amber-900 dark:text-amber-200">Ordens concluídas sem inspeção:</p>
          <div className="flex flex-wrap gap-2">
            {pendingOrders.map((o) => (
              <button
                key={o.id}
                onClick={() => openNew(o.id)}
                className="rounded-full border border-amber-400 bg-white px-3 py-1 text-xs text-amber-900 hover:bg-amber-100 dark:bg-transparent dark:text-amber-200"
              >
                {o.code} — {itemById.get(o.product_id)?.description ?? ''}
              </button>
            ))}
          </div>
        </div>
      )}

      <DataTable columns={columns} rows={inspections ?? []} rowKey={(r) => r.id} loading={isLoading} emptyMessage="Nenhuma inspeção registrada ainda." />

      {open && (
        <Modal title="Nova inspeção de qualidade" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <Field label="Ordem de produção concluída">
              <select required className={inputCls} value={form.order_id} onChange={(e) => {
                const order = orderById.get(e.target.value);
                setForm({ ...form, order_id: e.target.value, inspected_qty: order?.quantity ?? form.inspected_qty, accepted_qty: order?.quantity ?? form.accepted_qty });
              }}>
                <option value="">Selecione…</option>
                {concludedOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code} — {itemById.get(o.product_id)?.description ?? ''}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantidade inspecionada">
                <input
                  type="number"
                  min={0}
                  required
                  className={inputCls}
                  value={form.inspected_qty}
                  onChange={(e) => setForm({ ...form, inspected_qty: Number(e.target.value) })}
                />
              </Field>
              <Field label="Quantidade aceita">
                <input
                  type="number"
                  min={0}
                  required
                  className={inputCls}
                  value={form.accepted_qty}
                  onChange={(e) => setForm({ ...form, accepted_qty: Number(e.target.value) })}
                />
              </Field>
            </div>
            <Field label="Inspetor">
              <input className={inputCls} value={form.inspector} onChange={(e) => setForm({ ...form, inspector: e.target.value })} />
            </Field>
            <Field label="Observações">
              <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            {error && <p className="mb-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="nx-btn nx-btn-secondary rounded-md border border-[var(--nx-border)] px-3 py-1.5 text-sm">
                Cancelar
              </button>
              <button type="submit" className="nx-btn nx-btn-primary rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
                Registrar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
