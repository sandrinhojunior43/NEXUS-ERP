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
import type { ProductionOrderRow } from '../../types/database';

interface BomLineForm {
  item_id: string;
  quantity: number;
  perda_pct: number;
}

export function ProductionPage() {
  const { profile } = useAuth();
  const canWrite = roleAtLeast(profile?.role, 'operador');
  const qc = useQueryClient();
  const [tab, setTab] = useState<'ordens' | 'fichas'>('ordens');

  const { data: items } = useQuery({ queryKey: ['inventory_items'], queryFn: async () => (await supabase.from('inventory_items').select('*')).data ?? [] });
  const { data: boms } = useQuery({ queryKey: ['boms'], queryFn: async () => (await supabase.from('boms').select('*')).data ?? [] });
  const { data: bomLines } = useQuery({ queryKey: ['bom_lines'], queryFn: async () => (await supabase.from('bom_lines').select('*')).data ?? [] });
  const { data: orders, isLoading } = useQuery({
    queryKey: ['production_orders'],
    queryFn: async () => (await supabase.from('production_orders').select('*').order('created_at', { ascending: false })).data ?? [],
  });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: async () => (await supabase.from('warehouses').select('*')).data ?? [] });

  const itemById = new Map((items ?? []).map((i) => [i.id, i]));
  const activeBoms = (boms ?? []).filter((b) => b.ativa);
  const linesByBom = new Map<string, BomLineForm[]>();
  (bomLines ?? []).forEach((l) => {
    const arr = linesByBom.get(l.bom_id) ?? [];
    arr.push(l);
    linesByBom.set(l.bom_id, arr);
  });

  // ---- Ordens de produção ----
  const [openOrder, setOpenOrder] = useState(false);
  const [orderForm, setOrderForm] = useState({ product_id: '', quantity: 0, machine: '', due_at: today() });
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const bom = activeBoms.find((b) => b.product_id === orderForm.product_id);
    if (!bom) return setError('Este produto não tem ficha técnica ativa.');
    const { data: code } = await supabase.rpc('next_code', { p_prefix: 'OP', p_pad: 5 });
    const { error: err } = await supabase.from('production_orders').insert({
      code: code ?? `OP${Date.now()}`,
      product_id: orderForm.product_id,
      bom_id: bom.id,
      quantity: orderForm.quantity,
      machine: orderForm.machine,
      status: 'planejada',
      progress: 0,
      due_at: orderForm.due_at,
    });
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ['production_orders'] });
    setOpenOrder(false);
    setOrderForm({ product_id: '', quantity: 0, machine: '', due_at: today() });
  }

  async function iniciar(o: ProductionOrderRow) {
    await supabase.from('production_orders').update({ status: 'em producao', progress: 10 }).eq('id', o.id);
    qc.invalidateQueries({ queryKey: ['production_orders'] });
  }

  async function concluir(o: ProductionOrderRow) {
    if (!confirm(`Concluir ${o.code}? Isso consome os materiais da ficha técnica e dá entrada no produto acabado.`)) return;
    setBusyId(o.id);
    try {
      const alm = (warehouses ?? []).find((w) => w.aceita === 'materia' && w.principal) ?? (warehouses ?? [])[0];
      const acb = (warehouses ?? []).find((w) => w.aceita === 'produto' && w.principal) ?? (warehouses ?? [])[0];
      if (!alm || !acb) throw new Error('Depósitos não configurados.');
      const bomL = o.bom_id ? linesByBom.get(o.bom_id) ?? [] : [];
      let custoMaterial = 0;
      for (const l of bomL) {
        const qty = Math.ceil(o.quantity * l.quantity * (1 + l.perda_pct / 100));
        const item = itemById.get(l.item_id);
        custoMaterial += qty * (item?.unit_price ?? 0);
        await applyStockMove({
          itemId: l.item_id,
          warehouseId: alm.id,
          type: 'saida',
          quantity: qty,
          refType: 'producao',
          refCode: o.code,
          note: `Consumo da OP ${o.code}`,
          createdBy: profile?.id,
        });
        await supabase.from('production_consumo').insert({ order_id: o.id, item_id: l.item_id, quantity: qty });
      }
      await applyStockMove({
        itemId: o.product_id,
        warehouseId: acb.id,
        type: 'entrada',
        quantity: o.quantity,
        refType: 'producao',
        refCode: o.code,
        note: `Entrada de produção ${o.code}`,
        createdBy: profile?.id,
      });
      await supabase
        .from('production_orders')
        .update({ status: 'concluida', progress: 100, stock_applied: true, custo_material: custoMaterial, concluida_em: today() })
        .eq('id', o.id);
      qc.invalidateQueries({ queryKey: ['production_orders'] });
      qc.invalidateQueries({ queryKey: ['inventory_items'] });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao concluir ordem — verifique o saldo de materiais.');
    } finally {
      setBusyId(null);
    }
  }

  const orderColumns: Column<ProductionOrderRow>[] = [
    { key: 'code', header: 'OP', render: (r) => r.code },
    { key: 'product', header: 'Produto', render: (r) => itemById.get(r.product_id)?.description ?? '—' },
    { key: 'quantity', header: 'Quantidade', render: (r) => num(r.quantity) },
    { key: 'progress', header: 'Progresso', render: (r) => `${r.progress}%` },
    { key: 'due_at', header: 'Prazo', render: (r) => fmtDate(r.due_at) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];
  if (canWrite) {
    orderColumns.push({
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex gap-2">
          {r.status === 'planejada' && (
            <button onClick={(e) => { e.stopPropagation(); iniciar(r); }} className="text-xs text-[var(--nx-accent)] hover:underline">
              Iniciar
            </button>
          )}
          {(r.status === 'planejada' || r.status === 'em producao') && (
            <button
              disabled={busyId === r.id}
              onClick={(e) => { e.stopPropagation(); concluir(r); }}
              className="text-xs text-emerald-600 hover:underline disabled:opacity-50"
            >
              {busyId === r.id ? 'Processando…' : 'Concluir'}
            </button>
          )}
        </div>
      ),
    });
  }

  // ---- Fichas técnicas ----
  const [openBom, setOpenBom] = useState(false);
  const [bomProduct, setBomProduct] = useState('');
  const [bomFormLines, setBomFormLines] = useState<BomLineForm[]>([{ item_id: '', quantity: 0, perda_pct: 2 }]);

  async function submitBom(e: React.FormEvent) {
    e.preventDefault();
    const valid = bomFormLines.filter((l) => l.item_id && l.quantity > 0);
    if (!valid.length) return setError('Adicione ao menos um componente.');
    await supabase.from('boms').update({ ativa: false }).eq('product_id', bomProduct).eq('ativa', true);
    const { data: bom, error: bErr } = await supabase.from('boms').insert({ product_id: bomProduct, versao: 1, ativa: true }).select().single();
    if (bErr) return setError(bErr.message);
    await supabase.from('bom_lines').insert(valid.map((l) => ({ ...l, bom_id: bom.id })));
    qc.invalidateQueries({ queryKey: ['boms'] });
    qc.invalidateQueries({ queryKey: ['bom_lines'] });
    setOpenBom(false);
    setBomProduct('');
    setBomFormLines([{ item_id: '', quantity: 0, perda_pct: 2 }]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Produção</h1>
          <p className="text-sm text-[var(--nx-text-muted)]">Ordens de produção e fichas técnicas (BOM)</p>
        </div>
        {canWrite && tab === 'ordens' && (
          <button onClick={() => setOpenOrder(true)} className="rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
            + Nova ordem
          </button>
        )}
        {canWrite && tab === 'fichas' && (
          <button onClick={() => setOpenBom(true)} className="rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
            + Nova ficha técnica
          </button>
        )}
      </div>

      <div className="flex gap-2 text-sm">
        <button onClick={() => setTab('ordens')} className={`rounded-full border px-3 py-1 ${tab === 'ordens' ? 'border-[var(--nx-accent)] bg-[var(--nx-accent)] text-[var(--nx-accent-fg)]' : 'border-[var(--nx-border)]'}`}>
          Ordens
        </button>
        <button onClick={() => setTab('fichas')} className={`rounded-full border px-3 py-1 ${tab === 'fichas' ? 'border-[var(--nx-accent)] bg-[var(--nx-accent)] text-[var(--nx-accent-fg)]' : 'border-[var(--nx-border)]'}`}>
          Fichas técnicas
        </button>
      </div>

      {tab === 'ordens' && <DataTable columns={orderColumns} rows={orders ?? []} rowKey={(r) => r.id} loading={isLoading} />}

      {tab === 'fichas' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {activeBoms.map((b) => {
            const prod = itemById.get(b.product_id);
            const ls = linesByBom.get(b.id) ?? [];
            const custo = ls.reduce((a, l) => a + (itemById.get(l.item_id)?.unit_price ?? 0) * l.quantity * (1 + l.perda_pct / 100), 0);
            return (
              <div key={b.id} className="rounded-xl border border-[var(--nx-border)] bg-[var(--nx-surface)] p-4">
                <h3 className="text-sm font-semibold">{prod?.description ?? '—'}</h3>
                <p className="text-xs text-[var(--nx-text-muted)]">v{b.versao} · {ls.length} componentes</p>
                <ul className="mt-2 space-y-1 text-xs">
                  {ls.map((l) => (
                    <li key={l.item_id} className="flex justify-between">
                      <span>{itemById.get(l.item_id)?.description ?? l.item_id}</span>
                      <span className="text-[var(--nx-text-muted)]">{l.quantity}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs font-medium">Custo de material estimado: {money(custo)}</p>
              </div>
            );
          })}
        </div>
      )}

      {openOrder && (
        <Modal title="Nova ordem de produção" onClose={() => setOpenOrder(false)}>
          <form onSubmit={submitOrder}>
            <Field label="Produto (precisa de ficha técnica ativa)">
              <select required className={inputCls} value={orderForm.product_id} onChange={(e) => setOrderForm({ ...orderForm, product_id: e.target.value })}>
                <option value="">Selecione…</option>
                {activeBoms.map((b) => (
                  <option key={b.id} value={b.product_id}>
                    {itemById.get(b.product_id)?.description ?? b.product_id}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantidade">
                <input type="number" min={1} required className={inputCls} value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: Number(e.target.value) })} />
              </Field>
              <Field label="Máquina">
                <input className={inputCls} value={orderForm.machine} onChange={(e) => setOrderForm({ ...orderForm, machine: e.target.value })} />
              </Field>
            </div>
            <Field label="Prazo">
              <input type="date" className={inputCls} value={orderForm.due_at} onChange={(e) => setOrderForm({ ...orderForm, due_at: e.target.value })} />
            </Field>
            {error && <p className="mb-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpenOrder(false)} className="rounded-md border border-[var(--nx-border)] px-3 py-1.5 text-sm">
                Cancelar
              </button>
              <button type="submit" className="rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
                Criar ordem
              </button>
            </div>
          </form>
        </Modal>
      )}

      {openBom && (
        <Modal title="Nova ficha técnica" onClose={() => setOpenBom(false)} wide>
          <form onSubmit={submitBom}>
            <Field label="Produto acabado">
              <select required className={inputCls} value={bomProduct} onChange={(e) => setBomProduct(e.target.value)}>
                <option value="">Selecione…</option>
                {(items ?? [])
                  .filter((i) => i.type === 'produto')
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.description}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="mb-3">
              <span className="mb-1 block text-sm font-medium text-[var(--nx-text-muted)]">Componentes (matéria-prima)</span>
              {bomFormLines.map((l, idx) => (
                <div key={idx} className="mb-2 flex gap-2">
                  <select
                    className={inputCls}
                    value={l.item_id}
                    onChange={(e) => {
                      const next = [...bomFormLines];
                      next[idx] = { ...next[idx], item_id: e.target.value };
                      setBomFormLines(next);
                    }}
                  >
                    <option value="">Componente…</option>
                    {(items ?? [])
                      .filter((i) => i.type === 'materia')
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.description}
                        </option>
                      ))}
                  </select>
                  <input
                    type="number"
                    step="0.001"
                    min={0}
                    placeholder="Qtd/un."
                    className={`${inputCls} w-24`}
                    value={l.quantity || ''}
                    onChange={(e) => {
                      const next = [...bomFormLines];
                      next[idx] = { ...next[idx], quantity: Number(e.target.value) };
                      setBomFormLines(next);
                    }}
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Perda %"
                    className={`${inputCls} w-24`}
                    value={l.perda_pct || ''}
                    onChange={(e) => {
                      const next = [...bomFormLines];
                      next[idx] = { ...next[idx], perda_pct: Number(e.target.value) };
                      setBomFormLines(next);
                    }}
                  />
                  <button type="button" onClick={() => setBomFormLines(bomFormLines.filter((_, i) => i !== idx))} className="px-2 text-rose-600">
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setBomFormLines([...bomFormLines, { item_id: '', quantity: 0, perda_pct: 2 }])}
                className="text-xs text-[var(--nx-accent)] hover:underline"
              >
                + adicionar componente
              </button>
            </div>
            {error && <p className="mb-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
            <p className="mb-3 text-xs text-[var(--nx-text-muted)]">Criar uma nova ficha para um produto que já tem uma ativa substitui a anterior (nova versão).</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpenBom(false)} className="rounded-md border border-[var(--nx-border)] px-3 py-1.5 text-sm">
                Cancelar
              </button>
              <button type="submit" className="rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
                Salvar ficha
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
