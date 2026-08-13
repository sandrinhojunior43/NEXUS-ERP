import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal, Field, inputCls } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../lib/auth';
import { roleAtLeast } from '../../lib/modules';
import { money, num, fmtDate, today } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { applyStockMove } from '../../lib/stock';
import type { PurchaseRow } from '../../types/database';

interface LineForm {
  item_id: string;
  quantity: number;
  unit_price: number;
}

export function PurchasesPage() {
  const { profile } = useAuth();
  const canWrite = roleAtLeast(profile?.role, 'operador');
  const qc = useQueryClient();

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => (await supabase.from('purchases').select('*').order('created_at', { ascending: false })).data ?? [],
  });
  const { data: lines } = useQuery({
    queryKey: ['purchase_lines'],
    queryFn: async () => (await supabase.from('purchase_lines').select('*')).data ?? [],
  });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: async () => (await supabase.from('suppliers').select('*')).data ?? [] });
  const { data: items } = useQuery({ queryKey: ['inventory_items'], queryFn: async () => (await supabase.from('inventory_items').select('*')).data ?? [] });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: async () => (await supabase.from('warehouses').select('*')).data ?? [] });

  const supplierById = new Map((suppliers ?? []).map((s) => [s.id, s]));
  const itemById = new Map((items ?? []).map((i) => [i.id, i]));
  const linesByPurchase = new Map<string, LineForm[]>();
  (lines ?? []).forEach((l) => {
    const arr = linesByPurchase.get(l.purchase_id) ?? [];
    arr.push(l);
    linesByPurchase.set(l.purchase_id, arr);
  });
  const totalOf = (id: string) => (linesByPurchase.get(id) ?? []).reduce((a, l) => a + l.quantity * l.unit_price, 0);

  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [expectedAt, setExpectedAt] = useState(today());
  const [formLines, setFormLines] = useState<LineForm[]>([{ item_id: '', quantity: 0, unit_price: 0 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setSupplierId('');
    setExpectedAt(today());
    setFormLines([{ item_id: '', quantity: 0, unit_price: 0 }]);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const validLines = formLines.filter((l) => l.item_id && l.quantity > 0);
      if (!validLines.length) throw new Error('Adicione ao menos uma linha válida.');
      const { data: code } = await supabase.rpc('next_code', { p_prefix: 'PC', p_pad: 5 });
      const { data: purchase, error: pErr } = await supabase
        .from('purchases')
        .insert({ code: code ?? `PC${Date.now()}`, supplier_id: supplierId, status: 'rascunho', expected_at: expectedAt })
        .select()
        .single();
      if (pErr) throw pErr;
      const { error: lErr } = await supabase.from('purchase_lines').insert(validLines.map((l) => ({ ...l, purchase_id: purchase.id })));
      if (lErr) throw lErr;
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['purchase_lines'] });
      setOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar pedido de compra.');
    } finally {
      setSaving(false);
    }
  }

  async function receber(p: PurchaseRow) {
    if (!confirm(`Confirmar recebimento de ${p.code}? Isso vai dar entrada no estoque.`)) return;
    const alm = (warehouses ?? []).find((w) => w.aceita === 'materia' && w.principal) ?? (warehouses ?? [])[0];
    if (!alm) return alert('Nenhum depósito cadastrado.');
    try {
      for (const l of linesByPurchase.get(p.id) ?? []) {
        await applyStockMove({
          itemId: l.item_id,
          warehouseId: alm.id,
          type: 'entrada',
          quantity: l.quantity,
          refType: 'compra',
          refCode: p.code,
          note: `Recebimento ${p.code}`,
          createdBy: profile?.id,
        });
      }
      await supabase.from('purchases').update({ status: 'recebido', stock_applied: true }).eq('id', p.id);
      const { data: finCode } = await supabase.rpc('next_code', { p_prefix: 'FIN', p_pad: 5 });
      await supabase.from('financial_entries').insert({
        code: finCode ?? `FIN${Date.now()}`,
        type: 'pagar',
        description: `Compra ${p.code}`,
        amount: totalOf(p.id),
        due_at: today(),
        ref_type: 'compra',
        ref_id: p.id,
      });
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['inventory_items'] });
      qc.invalidateQueries({ queryKey: ['financial_entries'] });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao dar entrada no estoque.');
    }
  }

  const columns: Column<PurchaseRow>[] = [
    { key: 'code', header: 'Pedido', render: (r) => r.code },
    { key: 'supplier', header: 'Fornecedor', render: (r) => supplierById.get(r.supplier_id)?.name ?? '—' },
    { key: 'expected_at', header: 'Previsão', render: (r) => fmtDate(r.expected_at) },
    { key: 'total', header: 'Total', render: (r) => money(totalOf(r.id)) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];
  if (canWrite) {
    columns.push({
      key: 'actions',
      header: '',
      render: (r) =>
        r.status === 'rascunho' || r.status === 'enviado' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              receber(r);
            }}
            className="nx-link text-xs text-[var(--nx-accent)] hover:underline"
          >
            Receber
          </button>
        ) : null,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Compras</h1>
          <p className="text-sm text-[var(--nx-text-muted)]">{purchases?.length ?? 0} pedidos</p>
        </div>
        {canWrite && (
          <button
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
            className="nx-btn nx-btn-primary rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]"
          >
            + Novo pedido
          </button>
        )}
      </div>

      <DataTable columns={columns} rows={purchases ?? []} rowKey={(r) => r.id} loading={isLoading} />

      {open && (
        <Modal title="Novo pedido de compra" onClose={() => setOpen(false)} wide>
          <form onSubmit={submit}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fornecedor">
                <select required className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">Selecione…</option>
                  {(suppliers ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Previsão de entrega">
                <input type="date" className={inputCls} value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} />
              </Field>
            </div>

            <div className="mb-3">
              <span className="mb-1 block text-sm font-medium text-[var(--nx-text-muted)]">Itens</span>
              {formLines.map((l, idx) => (
                <div key={idx} className="mb-2 flex gap-2">
                  <select
                    className={inputCls}
                    value={l.item_id}
                    onChange={(e) => {
                      const next = [...formLines];
                      const item = itemById.get(e.target.value);
                      next[idx] = { ...next[idx], item_id: e.target.value, unit_price: item?.unit_price ?? 0 };
                      setFormLines(next);
                    }}
                  >
                    <option value="">Item…</option>
                    {(items ?? [])
                      .filter((i) => i.type === 'materia')
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.sku} — {i.description}
                        </option>
                      ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    placeholder="Qtd"
                    className={`${inputCls} w-24`}
                    value={l.quantity || ''}
                    onChange={(e) => {
                      const next = [...formLines];
                      next[idx] = { ...next[idx], quantity: Number(e.target.value) };
                      setFormLines(next);
                    }}
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Preço"
                    className={`${inputCls} w-28`}
                    value={l.unit_price || ''}
                    onChange={(e) => {
                      const next = [...formLines];
                      next[idx] = { ...next[idx], unit_price: Number(e.target.value) };
                      setFormLines(next);
                    }}
                  />
                  <button type="button" onClick={() => setFormLines(formLines.filter((_, i) => i !== idx))} className="px-2 text-rose-600">
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFormLines([...formLines, { item_id: '', quantity: 0, unit_price: 0 }])}
                className="nx-link text-xs text-[var(--nx-accent)] hover:underline"
              >
                + adicionar item
              </button>
            </div>

            <p className="mb-3 text-sm font-medium">
              Total: {money(formLines.reduce((a, l) => a + l.quantity * l.unit_price, 0))}
            </p>

            {error && <p className="mb-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="nx-btn nx-btn-secondary rounded-md border border-[var(--nx-border)] px-3 py-1.5 text-sm">
                Cancelar
              </button>
              <button disabled={saving} type="submit" className="nx-btn nx-btn-primary rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)] disabled:opacity-60">
                {saving ? 'Salvando…' : 'Criar pedido'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      <p className="text-xs text-[var(--nx-text-muted)]">Total geral no estoque: {num((items ?? []).length)} itens cadastrados.</p>
    </div>
  );
}
