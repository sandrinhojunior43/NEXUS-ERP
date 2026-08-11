import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, Field, inputCls } from '../../components/Modal';
import { useAuth } from '../../lib/auth';
import { roleAtLeast } from '../../lib/modules';
import { money, today } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { CrmStage } from '../../types/database';

const STAGES: { id: CrmStage; label: string }[] = [
  { id: 'prospeccao', label: 'Prospecção' },
  { id: 'qualificacao', label: 'Qualificação' },
  { id: 'proposta', label: 'Proposta' },
  { id: 'negociacao', label: 'Negociação' },
  { id: 'ganha', label: 'Ganha' },
  { id: 'perdida', label: 'Perdida' },
];

export function CrmPage() {
  const { profile } = useAuth();
  const canWrite = roleAtLeast(profile?.role, 'operador');
  const qc = useQueryClient();
  const { data: opps, isLoading } = useQuery({
    queryKey: ['crm_opportunities'],
    queryFn: async () => (await supabase.from('crm_opportunities').select('*').order('created_at', { ascending: false })).data ?? [],
  });
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: async () => (await supabase.from('customers').select('*')).data ?? [] });
  const customerById = new Map((customers ?? []).map((c) => [c.id, c]));

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', cliente_id: '', lead_empresa: '', valor_estimado: 0, previsao_fechamento: '' });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { data: code } = await supabase.rpc('next_code', { p_prefix: 'OPP', p_pad: 5 });
    await supabase.from('crm_opportunities').insert({
      code: code ?? `OPP${Date.now()}`,
      nome: form.nome,
      cliente_id: form.cliente_id || null,
      lead_empresa: form.lead_empresa,
      valor_estimado: form.valor_estimado,
      estagio: 'prospeccao',
      data_abertura: today(),
      previsao_fechamento: form.previsao_fechamento || null,
    });
    qc.invalidateQueries({ queryKey: ['crm_opportunities'] });
    setOpen(false);
    setForm({ nome: '', cliente_id: '', lead_empresa: '', valor_estimado: 0, previsao_fechamento: '' });
  }

  async function moveStage(id: string, estagio: CrmStage) {
    await supabase
      .from('crm_opportunities')
      .update({ estagio, fechado_em: estagio === 'ganha' || estagio === 'perdida' ? today() : null })
      .eq('id', id);
    qc.invalidateQueries({ queryKey: ['crm_opportunities'] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">CRM — Funil de vendas</h1>
          <p className="text-sm text-[var(--nx-text-muted)]">{opps?.length ?? 0} oportunidades</p>
        </div>
        {canWrite && (
          <button onClick={() => setOpen(true)} className="rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
            + Nova oportunidade
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--nx-text-muted)]">Carregando…</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-2 lg:grid-cols-6">
          {STAGES.map((stage) => {
            const items = (opps ?? []).filter((o) => o.estagio === stage.id);
            return (
              <div key={stage.id} className="min-w-[220px] rounded-xl border border-[var(--nx-border)] bg-[var(--nx-surface)] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{stage.label}</h3>
                  <span className="text-xs text-[var(--nx-text-muted)]">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((o) => (
                    <div key={o.id} className="rounded-lg border border-[var(--nx-border)] p-2 text-xs">
                      <div className="font-medium text-[var(--nx-text)]">{o.nome}</div>
                      <div className="text-[var(--nx-text-muted)]">
                        {o.cliente_id ? customerById.get(o.cliente_id)?.name : o.lead_empresa || '—'}
                      </div>
                      <div className="mt-1 font-semibold">{money(o.valor_estimado)}</div>
                      {canWrite && stage.id !== 'ganha' && stage.id !== 'perdida' && (
                        <select
                          value={o.estagio}
                          onChange={(e) => moveStage(o.id, e.target.value as CrmStage)}
                          className="mt-2 w-full rounded border border-[var(--nx-border)] bg-[var(--nx-bg)] px-1 py-0.5 text-[11px]"
                        >
                          {STAGES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <Modal title="Nova oportunidade" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <Field label="Nome do negócio">
              <input required className={inputCls} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </Field>
            <Field label="Cliente existente (opcional)">
              <select className={inputCls} value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}>
                <option value="">—</option>
                {(customers ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            {!form.cliente_id && (
              <Field label="Empresa (lead novo)">
                <input className={inputCls} value={form.lead_empresa} onChange={(e) => setForm({ ...form, lead_empresa: e.target.value })} />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor estimado">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputCls}
                  value={form.valor_estimado}
                  onChange={(e) => setForm({ ...form, valor_estimado: Number(e.target.value) })}
                />
              </Field>
              <Field label="Previsão de fechamento">
                <input
                  type="date"
                  className={inputCls}
                  value={form.previsao_fechamento}
                  onChange={(e) => setForm({ ...form, previsao_fechamento: e.target.value })}
                />
              </Field>
            </div>
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
