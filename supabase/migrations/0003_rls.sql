-- =============================================================================
-- Row Level Security
--
-- Modelo de papéis (profiles.role): administrador > gerente > operador > consulta.
-- Regra geral: qualquer usuário autenticado e ativo pode LER dados operacionais;
-- gravação (insert/update/delete) exige role em ('administrador','gerente','operador').
-- Áreas sensíveis (contabilidade, folha, usuários, auditoria) restringem
-- gravação a 'administrador'/'gerente', e algumas leitura também.
-- =============================================================================

create or replace function app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active;
$$;

create or replace function is_staff()
returns boolean language sql stable as $$
  select coalesce(app_role(), '') in ('administrador','gerente','operador');
$$;

create or replace function is_manager()
returns boolean language sql stable as $$
  select coalesce(app_role(), '') in ('administrador','gerente');
$$;

create or replace function is_admin()
returns boolean language sql stable as $$
  select coalesce(app_role(), '') = 'administrador';
$$;

-- ---- Tabelas operacionais: leitura para qualquer usuário logado com perfil, --
-- ---- escrita para administrador/gerente/operador. ---------------------------
do $$
declare
  t text;
  tables text[] := array[
    'departments','employees','suppliers','customers',
    'warehouses','inventory_items','lotes','stock_balances','stock_moves',
    'work_centers','boms','bom_lines','bom_operations',
    'production_orders','production_consumo','quality_inspections',
    'requisitions','requisition_lines','requisition_approvals',
    'quotations','quotation_lines','purchases','purchase_lines',
    'receipts','receipt_lines',
    'crm_opportunities','crm_activities','sales','sales_lines',
    'expedicoes','expedicao_lines','devolucoes','devolucao_lines',
    'invoices','invoice_lines','financial_entries','code_sequences'
  ];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for select using (app_role() is not null)',
      t || '_select', t
    );
    execute format(
      'create policy %I on %I for insert with check (is_staff())',
      t || '_insert', t
    );
    execute format(
      'create policy %I on %I for update using (is_staff()) with check (is_staff())',
      t || '_update', t
    );
    execute format(
      'create policy %I on %I for delete using (is_manager())',
      t || '_delete', t
    );
  end loop;
end $$;

-- ---- Empresa: leitura geral, escrita só administrador/gerente ---------------
alter table empresa enable row level security;
create policy empresa_select on empresa for select using (app_role() is not null);
create policy empresa_write on empresa for all using (is_manager()) with check (is_manager());

-- ---- Contabilidade: restrita a administrador/gerente de ponta a ponta ------
do $$
declare
  t text;
  tables text[] := array['chart_of_accounts','journal_entries','journal_lines','payroll'];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (is_manager())', t || '_select', t);
    execute format('create policy %I on %I for all using (is_manager()) with check (is_manager())', t || '_write', t);
  end loop;
end $$;

-- ---- Perfis: cada usuário lê/edita o próprio; administrador vê e gerencia tudo
alter table profiles enable row level security;
create policy profiles_select_self on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_update_self on profiles for update
  using (id = auth.uid() or is_admin())
  with check (
    id = auth.uid() and role = (select role from profiles p where p.id = auth.uid())
    or is_admin()
  );
create policy profiles_admin_insert on profiles for insert with check (is_admin());
create policy profiles_admin_delete on profiles for delete using (is_admin());

-- ---- Auditoria: qualquer usuário logado pode registrar evento; leitura só
-- ---- para quem gerencia (administrador/gerente).
alter table audit_log enable row level security;
create policy audit_log_insert on audit_log for insert with check (app_role() is not null);
create policy audit_log_select on audit_log for select using (is_manager());
