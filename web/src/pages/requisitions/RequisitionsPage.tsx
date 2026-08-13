import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal, Field, inputCls } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../lib/auth';
import { roleAtLeast } from '../../lib/modules';
import { money, num, fmtDate, today } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { QuotationLineRow, QuotationRow, RequisitionRow, RequisitionStatus } from '../../types/database';

interface LineForm {
  item_id: string;
  quantity: number;
  unit_price: number;
}

const STATUS_TABS: { id: RequisitionStatus | 'todas'; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'rascunho', label: 'Rascunho' },
  { id: 'aguardando', label: 'Aguardando aprovação' },
  { id: 'aprovada', label: 'Aprovadas' },
  { id: 'reprovada', label: 'Reprovadas' },
  { id: 'convertida', label: 'Convertidas' },
];

export function RequisitionsPage() {
  const { profile } = useAuth();
  const canWrite = roleAtLeast(profile?.role, 'operador');
  const canApprove = roleAtLeast(profile?.role, 'gerente');
  const qc = useQueryClient();

  const { data: requisitions, isLoading } = useQuery({
    queryKey: ['requisitions'],
    queryFn: async () => (await supabase.from('requisitions').select('*').order('created_at', { ascending: false })).data as RequisitionRow[] ?? [],
  });
  const { data: lines } = useQuery({
    queryKey: ['requisition_lines'],
    queryFn: async () => (await supabase.from('requisition_lines').select('*')).data ?? [],
  });
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: async () => (await supabase.from('employees').select('*')).data ?? [] });
  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: async () => (await supabase.from('departments').select('*')).data ?? [] });
  const { data: items } = useQuery({ queryKey: ['inventory_items'], queryFn: async () => (await supabase.from('inventory_items').select('*')).data ?? [] });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: async () => (await supabase.from('suppliers').select('*')).data ?? [] });
  const { data: quotations } = useQuery({
    queryKey: ['quotations'],
    queryFn: async () => (await supabase.from('quotations').select('*').order('created_at', { ascending: false })).data as QuotationRow[] ?? [],
  });
  const { data: quotationLines } = useQuery({
    queryKey: ['quotation_lines'],
    queryFn: async () => (await supabase.from('quotation_lines').select('*')).data as QuotationLineRow[] ?? [],
  });

  const employeeById = new Map((employees ?? []).map((e) => [e.id, e]));
  const deptById = new Map((departments ?? []).map((d) => [d.id, d]));
  const itemById = new Map((items ?? []).map((i) => [i.id, i]));
  const supplierById = new Map((suppliers ?? []).map((s) => [s.id, s]));
  const linesByReq = new Map<string, LineForm[]>();
  (lines ?? []).forEach((l) => {
    const arr = linesByReq.get(l.requisition_id) ?? [];
    arr.push(l);
    linesByReq.set(l.requisition_id, arr);
  });
  const totalOf = (id: string) => (linesByReq.get(id) ?? []).reduce((a, l) => a + l.quantity * l.unit_price, 0);
  const quotationsByReq = new Map<string, QuotationRow[]>();
  (quotations ?? []).forEach((q) => {
    const arr = quotationsByReq.get(q.requisition_id ?? '') ?? [];
    arr.push(q);
    quotationsByReq.set(q.requisition_id ?? '', arr);
  });
  const qLinesByQuotation = new Map<string, LineForm[]>();
  (quotationLines ?? []).forEach((l) => {
    const arr = qLinesByQuotation.get(l.quotation_id) ?? [];
    arr.push(l);
    qLinesByQuotation.set(l.quotation_id, arr);
  });

  const [tab, setTab] = useState<RequisitionStatus | 'todas'>('todas');
  const rows = (requisitions ?? []).filter((r) => tab === 'todas' || r.status === tab);

  // ---- Nova requisição ----
  const [open, setOpen] = useState(false);
  const [requesterId, setRequesterId] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [urgencia, setUrgencia] = useState<'normal' | 'alta' | 'urgente'>('normal');
  const [neededAt, setNeededAt] = useState(today());
  const [formLines, setFormLines] = useState<LineForm[]>([{ item_id: '', quantity: 0, unit_price: 0 }]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setRequesterId('');
    setJustificativa('');
    setUrgencia('normal');
    setNeededAt(today());
    setFormLines([{ item_id: '', quantity: 0, unit_price: 0 }]);
    setError(null);
  }

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const valid = formLines.filter((l) => l.item_id && l.quantity > 0);
      if (!valid.length) throw new Error('Adicione ao menos uma linha válida.');
      const requester = employeeById.get(requesterId);
      const { data: code } = await supabase.rpc('next_code', { p_prefix: 'RC', p_pad: 5 });
      const { data: req, error: rErr } = await supabase
        .from('requisitions')
        .insert({
          code: code ?? `RC${Date.now()}`,
          requester_id: requesterId || null,
          dept_id: requester?.dept_id ?? null,
          justificativa,
          urgencia,
          status: 'rascunho',
          needed_at: neededAt,
        })
        .select()
        .single();
      if (rErr) throw rErr;
      const { error: lErr } = await supabase.from('requisition_lines').insert(valid.map((l) => ({ ...l, requisition_id: req.id })));
      if (lErr) throw lErr;
      qc.invalidateQueries({ queryKey: ['requisitions'] });
      qc.invalidateQueries({ queryKey: ['requisition_lines'] });
      setOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar requisição.');
    } finally {
      setBusy(false);
    }
  }

  async function enviar(r: RequisitionRow) {
    await supabase.from('requisitions').update({ status: 'aguardando' }).eq('id', r.id);
    qc.invalidateQueries({ queryKey: ['requisitions'] });
  }

  async function aprovar(r: RequisitionRow) {
    await supabase.from('requisition_approvals').insert({
      requisition_id: r.id,
      user_name: profile?.name ?? '',
      acao: 'aprovou',
      nivel: 1,
      nivel_label: profile?.role ?? '',
    });
    await supabase.from('requisitions').update({ status: 'aprovada' }).eq('id', r.id);
    qc.invalidateQueries({ queryKey: ['requisitions'] });
  }

  async function reprovar(r: RequisitionRow) {
    const motivo = prompt('Motivo da reprovação:');
    if (motivo === null) return;
    await supabase.from('requisition_approvals').insert({
      requisition_id: r.id,
      user_name: profile?.name ?? '',
      acao: 'reprovou',
      nivel: 1,
      nivel_label: profile?.role ?? '',
      motivo,
    });
    await supabase.from('requisitions').update({ status: 'reprovada' }).eq('id', r.id);
    qc.invalidateQueries({ queryKey: ['requisitions'] });
  }

  async function converter(r: RequisitionRow) {
    const reqQuotations = quotationsByReq.get(r.id) ?? [];
    const chosen = reqQuotations.find((q) => q.escolhida);
    const supplierId = chosen?.supplier_id;
    const purchaseLines = chosen ? qLinesByQuotation.get(chosen.id) ?? [] : linesByReq.get(r.id) ?? [];
    if (!supplierId) {
      alert('Escolha uma cotação (fornecedor) antes de converter em pedido de compra.');
      return;
    }
    if (!confirm(`Converter ${r.code} em pedido de compra com ${supplierById.get(supplierId)?.name ?? 'fornecedor selecionado'}?`)) return;
    const { data: code } = await supabase.rpc('next_code', { p_prefix: 'PC', p_pad: 5 });
    const { data: purchase, error } = await supabase
      .from('purchases')
      .insert({ code: code ?? `PC${Date.now()}`, supplier_id: supplierId, requisition_id: r.id, status: 'rascunho', expected_at: chosen?.validade ?? null })
      .select()
      .single();
    if (error) return alert(error.message);
    await supabase.from('purchase_lines').insert(purchaseLines.map((l) => ({ item_id: l.item_id, quantity: l.quantity, unit_price: l.unit_price, purchase_id: purchase.id })));
    await supabase.from('requisitions').update({ status: 'convertida', purchase_id: purchase.id }).eq('id', r.id);
    qc.invalidateQueries({ queryKey: ['requisitions'] });
    qc.invalidateQueries({ queryKey: ['purchases'] });
    qc.invalidateQueries({ queryKey: ['purchase_lines'] });
  }

  // ---- Cotações ----
  const [quoteReq, setQuoteReq] = useState<RequisitionRow | null>(null);
  const [quoteSupplier, setQuoteSupplier] = useState('');
  const [quotePrazo, setQuotePrazo] = useState(15);
  const [quotePagamento, setQuotePagamento] = useState('30 dias');
  const [quoteLines, setQuoteLines] = useState<LineForm[]>([]);

  function openQuotes(r: RequisitionRow) {
    setQuoteReq(r);
    setQuoteSupplier('');
    setQuotePrazo(15);
    setQuotePagamento('30 dias');
    setQuoteLines((linesByReq.get(r.id) ?? []).map((l) => ({ ...l })));
  }

  async function addQuotation(e: React.FormEvent) {
    e.preventDefault();
    if (!quoteReq || !quoteSupplier) return;
    const { data: code } = await supabase.rpc('next_code', { p_prefix: 'COT', p_pad: 5 });
    const { data: q, error } = await supabase
      .from('quotations')
      .insert({ code: code ?? `COT${Date.now()}`, requisition_id: quoteReq.id, supplier_id: quoteSupplier, prazo_dias: quotePrazo, pagamento: quotePagamento })
      .select()
      .single();
    if (error) return alert(error.message);
    await supabase.from('quotation_lines').insert(quoteLines.filter((l) => l.item_id).map((l) => ({ ...l, quotation_id: q.id })));
    qc.invalidateQueries({ queryKey: ['quotations'] });
    qc.invalidateQueries({ queryKey: ['quotation_lines'] });
    setQuoteSupplier('');
  }

  async function escolherCotacao(q: { id: string; requisition_id: string | null }) {
    if (!q.requisition_id) return;
    const siblings = quotationsByReq.get(q.requisition_id) ?? [];
    await Promise.all(siblings.map((s) => supabase.from('quotations').update({ escolhida: s.id === q.id }).eq('id', s.id)));
    qc.invalidateQueries({ queryKey: ['quotations'] });
  }

  const columns: Column<RequisitionRow>[] = [
    { key: 'code', header: 'Código', render: (r) => r.code },
    { key: 'requester', header: 'Solicitante', render: (r) => (r.requester_id ? employeeById.get(r.requester_id)?.name ?? '—' : '—') },
    { key: 'dept', header: 'Departamento', render: (r) => (r.dept_id ? deptById.get(r.dept_id)?.name ?? '—' : '—') },
    { key: 'urgencia', header: 'Urgência', render: (r) => <span className="capitalize">{r.urgencia}</span> },
    { key: 'needed_at', header: 'Necessário até', render: (r) => fmtDate(r.needed_at) },
    { key: 'total', header: 'Total estimado', render: (r) => money(totalOf(r.id)) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex flex-wrap gap-2">
          {canWrite && r.status === 'rascunho' && (
            <button onClick={(e) => { e.stopPropagation(); enviar(r); }} className="nx-link text-xs text-[var(--nx-accent)] hover:underline">
              Enviar
            </button>
          )}
          {canApprove && r.status === 'aguardando' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); aprovar(r); }} className="nx-link text-xs text-emerald-600 hover:underline">
                Aprovar
              </button>
              <button onClick={(e) => { e.stopPropagation(); reprovar(r); }} className="nx-link text-xs text-rose-600 hover:underline">
                Reprovar
              </button>
            </>
          )}
          {canWrite && (r.status === 'aguardando' || r.status === 'aprovada') && (
            <button onClick={(e) => { e.stopPropagation(); openQuotes(r); }} className="nx-link text-xs text-[var(--nx-accent)] hover:underline">
              Cotações ({(quotationsByReq.get(r.id) ?? []).length})
            </button>
          )}
          {canWrite && r.status === 'aprovada' && (
            <button onClick={(e) => { e.stopPropagation(); converter(r); }} className="nx-link text-xs text-emerald-600 hover:underline">
              Converter em compra
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Requisições de compra</h1>
          <p className="text-sm text-[var(--nx-text-muted)]">{requisitions?.length ?? 0} requisições</p>
        </div>
        {canWrite && (
          <button
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
            className="nx-btn nx-btn-primary rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]"
          >
            + Nova requisição
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`nx-pill rounded-full border px-3 py-1 ${
              tab === t.id ? 'border-[var(--nx-accent)] bg-[var(--nx-accent)] text-[var(--nx-accent-fg)]' : 'border-[var(--nx-border)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} loading={isLoading} />

      {open && (
        <Modal title="Nova requisição de compra" onClose={() => setOpen(false)} wide>
          <form onSubmit={submitNew}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Solicitante">
                <select required className={inputCls} value={requesterId} onChange={(e) => setRequesterId(e.target.value)}>
                  <option value="">Selecione…</option>
                  {(employees ?? []).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Urgência">
                <select className={inputCls} value={urgencia} onChange={(e) => setUrgencia(e.target.value as typeof urgencia)}>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Necessário até">
                <input type="date" className={inputCls} value={neededAt} onChange={(e) => setNeededAt(e.target.value)} />
              </Field>
              <Field label="Justificativa">
                <input className={inputCls} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
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
                    placeholder="Preço ref."
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
                className="text-xs text-[var(--nx-accent)] hover:underline"
              >
                + adicionar item
              </button>
            </div>

            <p className="mb-3 text-sm font-medium">Total estimado: {money(formLines.reduce((a, l) => a + l.quantity * l.unit_price, 0))}</p>

            {error && <p className="mb-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="nx-btn nx-btn-secondary rounded-md border border-[var(--nx-border)] px-3 py-1.5 text-sm">
                Cancelar
              </button>
              <button disabled={busy} type="submit" className="nx-btn nx-btn-primary rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)] disabled:opacity-60">
                {busy ? 'Salvando…' : 'Salvar rascunho'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {quoteReq && (
        <Modal title={`Cotações — ${quoteReq.code}`} onClose={() => setQuoteReq(null)} wide>
          <div className="mb-4 space-y-2">
            {(quotationsByReq.get(quoteReq.id) ?? []).length === 0 && (
              <p className="text-sm text-[var(--nx-text-muted)]">Nenhuma cotação registrada ainda.</p>
            )}
            {(quotationsByReq.get(quoteReq.id) ?? []).map((q) => {
              const qTotal = (qLinesByQuotation.get(q.id) ?? []).reduce((a, l) => a + l.quantity * l.unit_price, 0);
              return (
                <div key={q.id} className={`nx-card flex items-center justify-between rounded-lg border p-2 text-sm ${q.escolhida ? 'border-emerald-400' : 'border-[var(--nx-border)]'}`}>
                  <div>
                    <div className="font-medium">{supplierById.get(q.supplier_id)?.name ?? '—'}</div>
                    <div className="text-xs text-[var(--nx-text-muted)]">
                      {q.prazo_dias} dias · {q.pagamento} · {money(qTotal)}
                    </div>
                  </div>
                  {q.escolhida ? (
                    <span className="text-xs font-medium text-emerald-600">Escolhida</span>
                  ) : (
                    canWrite && (
                      <button onClick={() => escolherCotacao(q)} className="nx-link text-xs text-[var(--nx-accent)] hover:underline">
                        Escolher
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>

          {canWrite && (
            <form onSubmit={addQuotation} className="border-t border-[var(--nx-border)] pt-3">
              <p className="mb-2 text-sm font-medium">Nova cotação</p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Fornecedor">
                  <select required className={inputCls} value={quoteSupplier} onChange={(e) => setQuoteSupplier(e.target.value)}>
                    <option value="">Selecione…</option>
                    {(suppliers ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Prazo (dias)">
                  <input type="number" min={0} className={inputCls} value={quotePrazo} onChange={(e) => setQuotePrazo(Number(e.target.value))} />
                </Field>
                <Field label="Pagamento">
                  <input className={inputCls} value={quotePagamento} onChange={(e) => setQuotePagamento(e.target.value)} />
                </Field>
              </div>
              <div className="mb-3">
                <span className="mb-1 block text-sm font-medium text-[var(--nx-text-muted)]">Preços cotados</span>
                {quoteLines.map((l, idx) => (
                  <div key={idx} className="mb-1 flex items-center gap-2 text-sm">
                    <span className="flex-1">{itemById.get(l.item_id)?.description ?? l.item_id}</span>
                    <span className="text-[var(--nx-text-muted)]">{num(l.quantity)}</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={`${inputCls} w-28`}
                      value={l.unit_price || ''}
                      onChange={(e) => {
                        const next = [...quoteLines];
                        next[idx] = { ...next[idx], unit_price: Number(e.target.value) };
                        setQuoteLines(next);
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setQuoteReq(null)} className="nx-btn nx-btn-secondary rounded-md border border-[var(--nx-border)] px-3 py-1.5 text-sm">
                  Fechar
                </button>
                <button type="submit" className="nx-btn nx-btn-primary rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
                  Adicionar cotação
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
