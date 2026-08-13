-- =============================================================================
-- Funções auxiliares: updated_at automático, geração de código sequencial
-- (EST0001, PC0001, PV0001...) e criação automática de profile no signup.
-- =============================================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'empresa','profiles','departments','employees','suppliers','customers',
      'inventory_items','boms','production_orders','requisitions','purchases',
      'sales','crm_opportunities'
    ])
  loop
    execute format(
      'create trigger set_updated_at before update on %I for each row execute function set_updated_at()',
      t
    );
  end loop;
end $$;

-- ---- Sequências de código por prefixo (EST0001, PC0001, OP0001, ...) --------
create table code_sequences (
  prefix   text primary key,
  next_val bigint not null default 1
);

create or replace function next_code(p_prefix text, p_pad int default 5)
returns text language plpgsql as $$
declare v bigint;
begin
  insert into code_sequences(prefix, next_val) values (p_prefix, 2)
    on conflict (prefix) do update set next_val = code_sequences.next_val + 1
    returning next_val - 1 into v;
  return p_prefix || lpad(v::text, p_pad, '0');
end;
$$;
comment on function next_code is 'Gera códigos sequenciais atômicos (ex: next_code(''PC'') -> PC00001).';

-- ---- Perfil automático ao criar usuário no Supabase Auth --------------------
-- Novo usuário nasce como 'consulta' (menor privilégio); promoção é manual
-- por um administrador via tela de Usuários.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'consulta'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---- Saldo agregado do item (inventory_items.quantity) a partir dos saldos --
create or replace function refresh_item_quantity(p_item_id uuid)
returns void language sql as $$
  update inventory_items
    set quantity = coalesce((select sum(quantity) from stock_balances where item_id = p_item_id), 0)
    where id = p_item_id;
$$;

create or replace function trg_stock_balances_sync()
returns trigger language plpgsql as $$
begin
  perform refresh_item_quantity(coalesce(new.item_id, old.item_id));
  return coalesce(new, old);
end;
$$;

create trigger stock_balances_sync
  after insert or update or delete on stock_balances
  for each row execute function trg_stock_balances_sync();
