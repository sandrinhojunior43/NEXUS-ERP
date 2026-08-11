import { useState } from 'react';
import { useCrud } from '../../hooks/useCrud';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal, Field, inputCls } from '../../components/Modal';
import { useAuth } from '../../lib/auth';
import { roleAtLeast } from '../../lib/modules';
import type { SupplierRow } from '../../types/database';

const empty = { code: '', name: '', cnpj: '', city: '', uf: '', phone: '', email: '', lead_time_dias: 15, active: true };

export function SuppliersPage() {
  const { profile } = useAuth();
  const canWrite = roleAtLeast(profile?.role, 'operador');
  const { data, isLoading, create, update, remove } = useCrud('suppliers');
  const [editing, setEditing] = useState<SupplierRow | null>(null);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(row: SupplierRow) {
    setEditing(row);
    setForm({ ...row, cnpj: row.cnpj ?? '', city: row.city ?? '', uf: row.uf ?? '', phone: row.phone ?? '', email: row.email ?? '' });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      await update.mutateAsync({ id: editing.id, values: form });
    } else {
      const code = form.code || `FOR${String(Date.now()).slice(-6)}`;
      await create.mutateAsync({ ...form, code });
    }
    setOpen(false);
  }

  const columns: Column<SupplierRow>[] = [
    { key: 'code', header: 'Código', render: (r) => r.code },
    { key: 'name', header: 'Nome', render: (r) => r.name },
    { key: 'city', header: 'Cidade/UF', render: (r) => [r.city, r.uf].filter(Boolean).join('/') || '—' },
    { key: 'phone', header: 'Telefone', render: (r) => r.phone || '—' },
    { key: 'lead_time_dias', header: 'Lead time', render: (r) => `${r.lead_time_dias} dias` },
    { key: 'active', header: 'Status', render: (r) => (r.active ? 'Ativo' : 'Inativo') },
  ];
  if (canWrite) {
    columns.push({
      key: 'actions',
      header: '',
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Remover fornecedor ${r.name}?`)) remove.mutate(r.id);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Fornecedores</h1>
          <p className="text-sm text-[var(--nx-text-muted)]">{data?.length ?? 0} cadastrados</p>
        </div>
        {canWrite && (
          <button onClick={openNew} className="rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
            + Novo fornecedor
          </button>
        )}
      </div>

      <DataTable columns={columns} rows={data ?? []} rowKey={(r) => r.id} loading={isLoading} onRowClick={canWrite ? openEdit : undefined} />

      {open && (
        <Modal title={editing ? `Editar ${editing.code}` : 'Novo fornecedor'} onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <Field label="Nome">
              <input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="CNPJ">
              <input className={inputCls} value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cidade">
                <input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </Field>
              <Field label="UF">
                <input maxLength={2} className={inputCls} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefone">
                <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="E-mail">
                <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
            </div>
            <Field label="Lead time (dias)">
              <input
                type="number"
                min={0}
                className={inputCls}
                value={form.lead_time_dias}
                onChange={(e) => setForm({ ...form, lead_time_dias: Number(e.target.value) })}
              />
            </Field>
            <label className="mb-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Ativo
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
