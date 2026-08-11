import { useState } from 'react';
import { useCrud } from '../../hooks/useCrud';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal, Field, inputCls } from '../../components/Modal';
import { useAuth } from '../../lib/auth';
import { roleAtLeast } from '../../lib/modules';
import type { CustomerRow } from '../../types/database';

const empty = {
  code: '',
  name: '',
  cnpj: '',
  ie: '',
  city: '',
  uf: '',
  phone: '',
  email: '',
  contribuinte: true,
  consumidor_final: false,
  active: true,
};

export function CustomersPage() {
  const { profile } = useAuth();
  const canWrite = roleAtLeast(profile?.role, 'operador');
  const { data, isLoading, create, update, remove } = useCrud('customers');
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(row: CustomerRow) {
    setEditing(row);
    setForm({
      ...row,
      cnpj: row.cnpj ?? '',
      ie: row.ie ?? '',
      city: row.city ?? '',
      uf: row.uf ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      await update.mutateAsync({ id: editing.id, values: form });
    } else {
      const code = form.code || `CLI${String(Date.now()).slice(-6)}`;
      await create.mutateAsync({ ...form, code });
    }
    setOpen(false);
  }

  const columns: Column<CustomerRow>[] = [
    { key: 'code', header: 'Código', render: (r) => r.code },
    { key: 'name', header: 'Nome', render: (r) => r.name },
    { key: 'city', header: 'Cidade/UF', render: (r) => [r.city, r.uf].filter(Boolean).join('/') || '—' },
    { key: 'phone', header: 'Telefone', render: (r) => r.phone || '—' },
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
            if (confirm(`Remover cliente ${r.name}?`)) remove.mutate(r.id);
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
          <h1 className="text-xl font-semibold">Clientes</h1>
          <p className="text-sm text-[var(--nx-text-muted)]">{data?.length ?? 0} cadastrados</p>
        </div>
        {canWrite && (
          <button onClick={openNew} className="rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
            + Novo cliente
          </button>
        )}
      </div>

      <DataTable columns={columns} rows={data ?? []} rowKey={(r) => r.id} loading={isLoading} onRowClick={canWrite ? openEdit : undefined} />

      {open && (
        <Modal title={editing ? `Editar ${editing.code}` : 'Novo cliente'} onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <Field label="Nome">
              <input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CNPJ">
                <input className={inputCls} value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
              </Field>
              <Field label="Inscrição estadual">
                <input className={inputCls} value={form.ie} onChange={(e) => setForm({ ...form, ie: e.target.value })} />
              </Field>
            </div>
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
            <div className="mb-4 flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.contribuinte} onChange={(e) => setForm({ ...form, contribuinte: e.target.checked })} />
                Contribuinte ICMS
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.consumidor_final}
                  onChange={(e) => setForm({ ...form, consumidor_final: e.target.checked })}
                />
                Consumidor final
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Ativo
              </label>
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
