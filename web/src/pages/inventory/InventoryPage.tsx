import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCrud } from '../../hooks/useCrud';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal, Field, inputCls } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../lib/auth';
import { roleAtLeast } from '../../lib/modules';
import { money, num } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { InventoryItemRow } from '../../types/database';

interface InventoryForm {
  sku: string;
  description: string;
  category: string;
  type: InventoryItemRow['type'];
  min_quantity: number;
  unit_price: number;
  supplier_id: string;
  ncm: string;
  unidade: string;
  aliq_ipi: number;
  controla_lote: boolean;
}

const empty: InventoryForm = {
  sku: '',
  description: '',
  category: '',
  type: 'materia',
  min_quantity: 0,
  unit_price: 0,
  supplier_id: '',
  ncm: '',
  unidade: 'UN',
  aliq_ipi: 0,
  controla_lote: false,
};

export function InventoryPage() {
  const { profile } = useAuth();
  const canWrite = roleAtLeast(profile?.role, 'operador');
  const { data, isLoading, create, update, remove } = useCrud('inventory_items', 'sku');
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await supabase.from('suppliers').select('*')).data ?? [],
  });
  const [editing, setEditing] = useState<InventoryItemRow | null>(null);
  const [form, setForm] = useState(empty);
  const [initialQty, setInitialQty] = useState(0);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'todos' | 'materia' | 'produto' | 'baixo'>('todos');

  function openNew() {
    setEditing(null);
    setForm(empty);
    setInitialQty(0);
    setOpen(true);
  }
  function openEdit(row: InventoryItemRow) {
    setEditing(row);
    setForm({ ...row, category: row.category ?? '', supplier_id: row.supplier_id ?? '' });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      await update.mutateAsync({ id: editing.id, values: { ...form, supplier_id: form.supplier_id || null } });
    } else {
      const sku = form.sku || `${form.type === 'materia' ? 'MP' : 'PA'}${String(Date.now()).slice(-6)}`;
      const created = await create.mutateAsync({ ...form, sku, supplier_id: form.supplier_id || null });
      if (initialQty > 0 && created) {
        const { data: wh } = await supabase
          .from('warehouses')
          .select('*')
          .eq('aceita', form.type)
          .order('principal', { ascending: false })
          .limit(1);
        const warehouseId = wh?.[0]?.id ?? (await supabase.from('warehouses').select('id').limit(1)).data?.[0]?.id;
        if (warehouseId) {
          await supabase.from('stock_balances').insert({ item_id: created.id, warehouse_id: warehouseId, quantity: initialQty });
        }
      }
    }
    setOpen(false);
  }

  const rows = (data ?? []).filter((r) => {
    if (filter === 'materia') return r.type === 'materia';
    if (filter === 'produto') return r.type === 'produto';
    if (filter === 'baixo') return r.quantity <= r.min_quantity;
    return true;
  });

  const columns: Column<InventoryItemRow>[] = [
    { key: 'sku', header: 'SKU', render: (r) => r.sku },
    { key: 'description', header: 'Descrição', render: (r) => r.description },
    { key: 'category', header: 'Categoria', render: (r) => r.category || '—' },
    { key: 'type', header: 'Tipo', render: (r) => <StatusBadge status={r.type === 'materia' ? 'Matéria-prima' : 'Produto'} /> },
    {
      key: 'quantity',
      header: 'Saldo',
      render: (r) => (
        <span className={r.quantity <= r.min_quantity ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}>
          {num(r.quantity)} {r.unidade}
        </span>
      ),
    },
    { key: 'min_quantity', header: 'Mínimo', render: (r) => num(r.min_quantity) },
    { key: 'unit_price', header: 'Preço unit.', render: (r) => money(r.unit_price) },
  ];
  if (canWrite) {
    columns.push({
      key: 'actions',
      header: '',
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Remover item ${r.sku}? Isso também remove saldos e lotes associados.`)) remove.mutate(r.id);
          }}
          className="text-xs text-rose-600 hover:underline"
        >
          Remover
        </button>
      ),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Estoque</h1>
          <p className="text-sm text-[var(--nx-text-muted)]">{data?.length ?? 0} itens cadastrados</p>
        </div>
        {canWrite && (
          <button onClick={openNew} className="rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
            + Novo item
          </button>
        )}
      </div>

      <div className="flex gap-2 text-sm">
        {(['todos', 'materia', 'produto', 'baixo'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 ${
              filter === f ? 'border-[var(--nx-accent)] bg-[var(--nx-accent)] text-[var(--nx-accent-fg)]' : 'border-[var(--nx-border)]'
            }`}
          >
            {f === 'todos' ? 'Todos' : f === 'materia' ? 'Matéria-prima' : f === 'produto' ? 'Produtos' : 'Abaixo do mínimo'}
          </button>
        ))}
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} loading={isLoading} onRowClick={canWrite ? openEdit : undefined} />

      {open && (
        <Modal title={editing ? `Editar ${editing.sku}` : 'Novo item de estoque'} onClose={() => setOpen(false)} wide>
          <form onSubmit={submit}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Descrição">
                <input required className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <Field label="Categoria">
                <input className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Tipo">
                <select
                  disabled={!!editing}
                  className={inputCls}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as InventoryItemRow['type'] })}
                >
                  <option value="materia">Matéria-prima</option>
                  <option value="produto">Produto acabado</option>
                </select>
              </Field>
              <Field label="Unidade">
                <input className={inputCls} value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="NCM">
                <input className={inputCls} value={form.ncm} onChange={(e) => setForm({ ...form, ncm: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Estoque mínimo">
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={form.min_quantity}
                  onChange={(e) => setForm({ ...form, min_quantity: Number(e.target.value) })}
                />
              </Field>
              <Field label="Preço unitário">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className={inputCls}
                  value={form.unit_price}
                  onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })}
                />
              </Field>
              <Field label="Alíquota IPI (%)">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className={inputCls}
                  value={form.aliq_ipi}
                  onChange={(e) => setForm({ ...form, aliq_ipi: Number(e.target.value) })}
                />
              </Field>
            </div>
            {form.type === 'materia' && (
              <Field label="Fornecedor principal">
                <select className={inputCls} value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
                  <option value="">—</option>
                  {(suppliers ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {!editing && (
              <Field label="Saldo inicial (opcional)">
                <input type="number" min={0} className={inputCls} value={initialQty} onChange={(e) => setInitialQty(Number(e.target.value))} />
              </Field>
            )}
            <label className="mb-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.controla_lote} onChange={(e) => setForm({ ...form, controla_lote: e.target.checked })} />
              Controla lote/rastreabilidade
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-[var(--nx-border)] px-3 py-1.5 text-sm">
                Cancelar
              </button>
              <button type="submit" className="rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
                Salvar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
