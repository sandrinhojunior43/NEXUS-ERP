import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCrud } from '../../hooks/useCrud';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal, Field, inputCls } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../lib/auth';
import { roleAtLeast } from '../../lib/modules';
import { money, fmtDate, today } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { DepartmentRow, EmployeeRow } from '../../types/database';

interface EmployeeForm {
  code: string;
  name: string;
  cpf: string;
  cargo: string;
  dept_id: string;
  admissao: string;
  salario: number;
  status: EmployeeRow['status'];
  email: string;
  phone: string;
}

const empty: EmployeeForm = {
  code: '',
  name: '',
  cpf: '',
  cargo: '',
  dept_id: '',
  admissao: today(),
  salario: 0,
  status: 'ativo',
  email: '',
  phone: '',
};

export function EmployeesPage() {
  const { profile } = useAuth();
  const canWrite = roleAtLeast(profile?.role, 'gerente');
  const { data, isLoading, create, update, remove } = useCrud('employees', 'code');
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await supabase.from('departments').select('*')).data as DepartmentRow[] ?? [],
  });
  const deptById = new Map((departments ?? []).map((d) => [d.id, d]));

  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(row: EmployeeRow) {
    setEditing(row);
    setForm({ ...row, cpf: row.cpf ?? '', dept_id: row.dept_id ?? '', email: row.email ?? '', phone: row.phone ?? '' });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const values = { ...form, dept_id: form.dept_id || null };
    if (editing) {
      await update.mutateAsync({ id: editing.id, values });
    } else {
      const code = form.code || `MAT${String(Date.now()).slice(-6)}`;
      await create.mutateAsync({ ...values, code });
    }
    setOpen(false);
  }

  const columns: Column<EmployeeRow>[] = [
    { key: 'code', header: 'Matrícula', render: (r) => r.code },
    { key: 'name', header: 'Nome', render: (r) => r.name },
    { key: 'cargo', header: 'Cargo', render: (r) => r.cargo },
    { key: 'dept', header: 'Departamento', render: (r) => (r.dept_id ? deptById.get(r.dept_id)?.name ?? '—' : '—') },
    { key: 'admissao', header: 'Admissão', render: (r) => fmtDate(r.admissao) },
    { key: 'salario', header: 'Salário', render: (r) => money(r.salario) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];
  if (canWrite) {
    columns.push({
      key: 'actions',
      header: '',
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Remover funcionário ${r.name}?`)) remove.mutate(r.id);
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
          <h1 className="text-xl font-semibold">Funcionários</h1>
          <p className="text-sm text-[var(--nx-text-muted)]">{data?.length ?? 0} cadastrados</p>
        </div>
        {canWrite && (
          <button onClick={openNew} className="nx-btn nx-btn-primary rounded-md bg-[var(--nx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--nx-accent-fg)]">
            + Novo funcionário
          </button>
        )}
      </div>

      <DataTable columns={columns} rows={data ?? []} rowKey={(r) => r.id} loading={isLoading} onRowClick={canWrite ? openEdit : undefined} />

      {open && (
        <Modal title={editing ? `Editar ${editing.code}` : 'Novo funcionário'} onClose={() => setOpen(false)} wide>
          <form onSubmit={submit}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome">
                <input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Cargo">
                <input required className={inputCls} value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Departamento">
                <select className={inputCls} value={form.dept_id} onChange={(e) => setForm({ ...form, dept_id: e.target.value })}>
                  <option value="">—</option>
                  {(departments ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="CPF">
                <input className={inputCls} value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Admissão">
                <input type="date" className={inputCls} value={form.admissao} onChange={(e) => setForm({ ...form, admissao: e.target.value })} />
              </Field>
              <Field label="Salário">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputCls}
                  value={form.salario}
                  onChange={(e) => setForm({ ...form, salario: Number(e.target.value) })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="E-mail">
                <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Telefone">
                <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
            </div>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EmployeeRow['status'] })}>
                <option value="ativo">Ativo</option>
                <option value="afastado">Afastado</option>
                <option value="desligado">Desligado</option>
              </select>
            </Field>
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
