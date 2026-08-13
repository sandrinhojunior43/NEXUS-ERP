import { useState } from 'react';
import { useCrud } from '../../hooks/useCrud';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal, Field, inputCls } from '../../components/Modal';
import { useAuth } from '../../lib/auth';
import { roleAtLeast } from '../../lib/modules';
import type { WarehouseRow } from '../../types/database';

interface WarehouseForm {
  code: string;
  nome: string;
  aceita: WarehouseRow['aceita'];
  descricao: string;
  principal: boolean;
  ativo: boolean;
}

const empty: WarehouseForm = { code: '', nome: '', aceita: 'ambos', descricao: '', principal: false, ativo: true };

export function WarehousesPage() {
  const { profile } = useAuth();
  const canWrite = roleAtLeast(profile?.role, 'gerente');
  const { data, isLoading, create, update, remove } = useCrud('warehouses', 'code');
  const [editing, setEditing] = useState<WarehouseRow | null>(null);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(row: WarehouseRow) {
    setEditing(row);
    setForm({ ...row, descricao: row.descricao ?? '' });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) await update.mutateAsync({ id: editing.id, values: form });
    else await create.mutateAsync(form);
    setOpen(false);
  }

  const columns: Column<WarehouseRow>[] = [
    { key: 'code', header: 'Código', render: (r) => r.code },
    { key: 'nome', header: 'Nome', render: (r) => r.nome },
    { key: 'aceita', header: 'Aceita', render: (r) => r.aceita },
    { key: 'principal', header: 'Principal', render: (r) => (r.principal ? 'Sim' : '—') },
    { key: 'ativo', header: 'Status', render: (r) => (r.ativo ? 'Ativo' : 'Inativo') },
  ];
  if (canWrite) {
    columns.push({
      key: 'actions',
      header: '',
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Remover depósito ${r.nome}?`)) remove.mutate(r.id);
          }}
          className="nx-link text-xs text-rose-600 hover:underline"
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
          <h1 className="text-xl font-semibold">Depósitos</h1>
          <p className="text-sm text-[var(--nx-text-muted)]">{data?.length ?? 0} cadastrados</p>
        </div>
        {canWrite && (
          <button onClick={openNew} className="nx-btn nx-btn-primary rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
            + Novo depósito
          </button>
        )}
      </div>

      <DataTable columns={columns} rows={data ?? []} rowKey={(r) => r.id} loading={isLoading} onRowClick={canWrite ? openEdit : undefined} />

      {open && (
        <Modal title={editing ? `Editar ${editing.code}` : 'Novo depósito'} onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Código">
                <input required disabled={!!editing} className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Nome">
                <input required className={inputCls} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </Field>
            </div>
            <Field label="Aceita">
              <select className={inputCls} value={form.aceita} onChange={(e) => setForm({ ...form, aceita: e.target.value as WarehouseRow['aceita'] })}>
                <option value="materia">Matéria-prima</option>
                <option value="produto">Produto acabado</option>
                <option value="ambos">Ambos</option>
              </select>
            </Field>
            <Field label="Descrição">
              <input className={inputCls} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </Field>
            <div className="mb-4 flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.checked })} />
                Depósito principal
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
                Ativo
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="nx-btn nx-btn-secondary rounded-md border border-[var(--nx-border)] px-3 py-1.5 text-sm">
                Cancelar
              </button>
              <button type="submit" className="nx-btn nx-btn-primary rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
                Salvar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
