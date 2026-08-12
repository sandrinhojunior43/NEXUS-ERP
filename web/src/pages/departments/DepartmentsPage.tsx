import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCrud } from '../../hooks/useCrud';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal, Field, inputCls } from '../../components/Modal';
import { useAuth } from '../../lib/auth';
import { roleAtLeast } from '../../lib/modules';
import { money } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { DepartmentRow, EmployeeRow } from '../../types/database';

const empty = { code: '', name: '', orcamento: 0, responsavel_id: '', active: true };

export function DepartmentsPage() {
  const { profile } = useAuth();
  const canWrite = roleAtLeast(profile?.role, 'gerente');
  const { data, isLoading, create, update, remove } = useCrud('departments', 'code');
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => (await supabase.from('employees').select('*')).data as EmployeeRow[] ?? [],
  });
  const employeeById = new Map((employees ?? []).map((e) => [e.id, e]));

  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(row: DepartmentRow) {
    setEditing(row);
    setForm({ ...row, responsavel_id: row.responsavel_id ?? '' });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const values = { ...form, responsavel_id: form.responsavel_id || null };
    if (editing) await update.mutateAsync({ id: editing.id, values });
    else await create.mutateAsync(values);
    setOpen(false);
  }

  const columns: Column<DepartmentRow>[] = [
    { key: 'code', header: 'Código', render: (r) => r.code },
    { key: 'name', header: 'Nome', render: (r) => r.name },
    { key: 'orcamento', header: 'Orçamento', render: (r) => money(r.orcamento) },
    { key: 'responsavel', header: 'Responsável', render: (r) => (r.responsavel_id ? employeeById.get(r.responsavel_id)?.name ?? '—' : '—') },
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
            if (confirm(`Remover departamento ${r.name}?`)) remove.mutate(r.id);
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
          <h1 className="text-xl font-semibold">Departamentos</h1>
          <p className="text-sm text-[var(--nx-text-muted)]">{data?.length ?? 0} cadastrados</p>
        </div>
        {canWrite && (
          <button onClick={openNew} className="rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
            + Novo departamento
          </button>
        )}
      </div>

      <DataTable columns={columns} rows={data ?? []} rowKey={(r) => r.id} loading={isLoading} onRowClick={canWrite ? openEdit : undefined} />

      {open && (
        <Modal title={editing ? `Editar ${editing.code}` : 'Novo departamento'} onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Código">
                <input required disabled={!!editing} className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Nome">
                <input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
            </div>
            <Field label="Orçamento anual">
              <input
                type="number"
                min={0}
                step="0.01"
                className={inputCls}
                value={form.orcamento}
                onChange={(e) => setForm({ ...form, orcamento: Number(e.target.value) })}
              />
            </Field>
            <Field label="Responsável">
              <select className={inputCls} value={form.responsavel_id} onChange={(e) => setForm({ ...form, responsavel_id: e.target.value })}>
                <option value="">—</option>
                {(employees ?? []).map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
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
