import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal, Field, inputCls } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../lib/auth';
import { roleAtLeast } from '../../lib/modules';
import { money, fmtDate, today } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { applyStockMove } from '../../lib/stock';
import type { SaleRow } from '../../types/database';

interface LineForm {
  item_id: string;
  quantity: number;
  unit_price: number;
}

export function SalesPage() {
  const { profile } = useAuth();
  const canWrite = roleAtLeast(profile?.role, 'operador');
  const qc = useQueryClient();

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => (await supabase.from('sales').select('*').order('created_at', { ascending: false })).data ?? [],
  });
  const { data: lines } = useQuery({ queryKey: ['sales_lines'], queryFn: async () => (await supabase.from('sales_lines').select('*')).data ?? [] });
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: async () => (await supabase.from('customers').select('*')).data ?? [] });
  const { data: items } = useQuery({ queryKey: ['inventory_items'], queryFn: async () => (await supabase.from('inventory_items').select('*')).data ?? [] });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: async () => (await supabase.from('warehouses').select('*')).data ?? [] });

  const customerById = new Map((customers ?? []).map((c) => [c.id, c]));
  const itemById = new Map((items ?? []).map((i) => [i.id, i]));
  const linesBySale = new Map<string, LineForm[]>();
  (lines ?? []).forEach((l) => {
    const arr = linesBySale.get(l.sale_id) ?? [];
    arr.push(l);
    linesBySale.set(l.sale_id, arr);
  });
  const totalOf = (id: string) => (linesBySale.get(id) ?? []).reduce((a, l) => a + l.quantity * l.unit_price, 0);

  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [formLines, setFormLines] = useState<LineForm[]>([{ item_id: '', quantity: 0, unit_price: 0 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setCustomerId('');
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
      const { data: code } = await supabase.rpc('next_code', { p_prefix: 'PV', p_pad: 5 });
      const { data: sale, error: sErr } = await supabase
        .from('sales')
        .insert({ code: code ?? `PV${Date.now()}`, customer_id: customerId, status: 'aberto' })
        .select()
        .single();
      if (sErr) throw sErr;
      const { error: lErr } = await supabase.from('sales_lines').insert(validLines.map((l) => ({ ...l, sale_id: sale.id })));
      if (lErr) throw lErr;
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['sales_lines'] });
      setOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar pedido de venda.');
    } finally {
      setSaving(false);
    }
  }

  async function faturar(s: SaleRow) {
    if (!confirm(`Faturar ${s.code}? Isso vai baixar o estoque de produtos.`)) return;
    const acb = (warehouses ?? []).find((w) => w.aceita === 'produto' && w.principal) ?? (warehouses ?? [])[0];
    if (!acb) return alert('Nenhum depósito cadastrado.');
    try {
      for (const l of linesBySale.get(s.id) ?? []) {
        await applyStockMove({
          itemId: l.item_id,
          warehouseId: acb.id,
          type: 'saida',
          quantity: l.quantity,
          refType: 'venda',
          refCode: s.code,
          note: `Faturamento ${s.code}`,
          createdBy: profile?.id,
        });
      }
      await supabase.from('sales').update({ status: 'faturado', stock_applied: true }).eq('id', s.id);
      const { data: finCode } = await supabase.rpc('next_code', { p_prefix: 'FIN', p_pad: 5 });
      await supabase.from('financial_entries').insert({
        code: finCode ?? `FIN${Date.now()}`,
        type: 'receber',
        description: `Venda ${s.code}`,
        amount: totalOf(s.id),
        due_at: today(),
        ref_type: 'venda',
        ref_id: s.id,
      });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['inventory_items'] });
      qc.invalidateQueries({ queryKey: ['financial_entries'] });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao faturar. Verifique se há saldo suficiente.');
    }
  }

  const columns: Column<SaleRow>[] = [
    { key: 'code', header: 'Pedido', render: (r) => r.code },
    { key: 'customer', header: 'Cliente', render: (r) => customerById.get(r.customer_id)?.name ?? '—' },
    { key: 'created_at', header: 'Data', render: (r) => fmtDate(r.created_at) },
    { key: 'total', header: 'Total', render: (r) => money(totalOf(r.id)) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];
  if (canWrite) {
    columns.push({
      key: 'actions',
      header: '',
      render: (r) =>
        r.status === 'aberto' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              faturar(r);
            }}
            className="nx-link text-xs text-[var(--nx-accent)] hover:underline"
          >
            Faturar
          </button>
        ) : null,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Vendas</h1>
          <p className="text-sm text-[var(--nx-text-muted)]">{sales?.length ?? 0} pedidos</p>
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

      <DataTable columns={columns} rows={sales ?? []} rowKey={(r) => r.id} loading={isLoading} />

      {open && (
        <Modal title="Novo pedido de venda" onClose={() => setOpen(false)} wide>
          <form onSubmit={submit}>
            <Field label="Cliente">
              <select required className={inputCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Selecione…</option>
                {(customers ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

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
                      .filter((i) => i.type === 'produto')
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

            <p className="mb-3 text-sm font-medium">Total: {money(formLines.reduce((a, l) => a + l.quantity * l.unit_price, 0))}</p>

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
    </div>
  );
}
