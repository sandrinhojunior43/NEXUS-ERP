-- =============================================================================
-- NEXUS ERP — schema inicial
-- Cobre os módulos centrais (Estoque, Produção, Compras, Vendas, Financeiro,
-- CRM, RH) migrados do protótipo single-file para um backend real em Postgres
-- (Supabase). Multiempresa não é objetivo desta fase — uma linha em `empresa`.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- EMPRESA (dados cadastrais únicos do tenant)
-- -----------------------------------------------------------------------------
create table empresa (
  id                 uuid primary key default gen_random_uuid(),
  razao              text not null,
  fantasia           text not null,
  cnpj               text not null,
  ie                 text default '',
  im                 text default '',
  logradouro         text default '',
  numero             text default '',
  bairro             text default '',
  municipio          text default '',
  uf                 text default '',
  cep                text default '',
  fone               text default '',
  regime             text not null default 'presumido' check (regime in ('simples','presumido','real')),
  segmento           text not null default 'ambos' check (segmento in ('industria','comercio','ambos')),
  contribuinte_ipi   boolean not null default true,
  serie_nfe          integer not null default 1,
  proximo_numero_nfe integer not null default 1,
  aliq_icms_interna  numeric(6,2) not null default 18,
  aliq_pis           numeric(6,3) not null default 0.65,
  aliq_cofins        numeric(6,3) not null default 3.00,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on table empresa is 'Cadastro único da empresa operadora do sistema (single-tenant).';

-- -----------------------------------------------------------------------------
-- PERFIS DE USUÁRIO (estende auth.users)
-- -----------------------------------------------------------------------------
create table profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  name                  text not null,
  email                 text not null,
  role                  text not null default 'operador'
                          check (role in ('administrador','gerente','operador','consulta')),
  active                boolean not null default true,
  perms                 jsonb not null default '{}'::jsonb, -- overrides finos por módulo/ação
  limite_alcada         numeric(14,2) not null default 0,
  nivel_aprovacao       smallint not null default 0,
  must_change_password  boolean not null default false,
  last_login_at         timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
comment on table profiles is 'Perfil/role de cada usuário autenticado (auth.users). RBAC: administrador > gerente > operador > consulta.';

-- -----------------------------------------------------------------------------
-- PESSOAS / PARCEIROS
-- -----------------------------------------------------------------------------
create table departments (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  name           text not null,
  orcamento      numeric(14,2) not null default 0,
  responsavel_id uuid,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table employees (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null,
  cpf        text,
  cargo      text not null,
  dept_id    uuid references departments(id) on delete set null,
  admissao   date not null default current_date,
  salario    numeric(14,2) not null default 0,
  status     text not null default 'ativo' check (status in ('ativo','afastado','desligado')),
  email      text,
  phone      text,
  user_id    uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table departments
  add constraint departments_responsavel_fk foreign key (responsavel_id) references employees(id) on delete set null;

create table suppliers (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null,
  cnpj          text,
  city          text,
  uf            text,
  phone         text,
  email         text,
  lead_time_dias integer not null default 15,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table customers (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  name             text not null,
  cnpj             text,
  ie               text,
  city             text,
  uf               text,
  phone            text,
  email            text,
  contribuinte     boolean not null default true,
  consumidor_final boolean not null default false,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- ESTOQUE
-- -----------------------------------------------------------------------------
create table warehouses ( -- depósitos
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  nome       text not null,
  aceita     text not null default 'ambos' check (aceita in ('materia','produto','ambos')),
  descricao  text default '',
  principal  boolean not null default false,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

create table inventory_items (
  id             uuid primary key default gen_random_uuid(),
  sku            text not null unique,
  description    text not null,
  category       text,
  type           text not null check (type in ('materia','produto')),
  quantity       numeric(14,3) not null default 0, -- saldo total, mantido em sincronia com stock_balances
  min_quantity   numeric(14,3) not null default 0,
  unit_price     numeric(14,2) not null default 0,
  supplier_id    uuid references suppliers(id) on delete set null,
  ncm            text default '',
  origem         text default '0',
  unidade        text not null default 'UN',
  aliq_ipi       numeric(6,2) not null default 0,
  cest           text default '',
  controla_lote  boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index inventory_items_type_idx on inventory_items(type);

create table lotes (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references inventory_items(id) on delete cascade,
  codigo        text not null unique,
  fornecedor_id uuid references suppliers(id) on delete set null,
  nf            text default '',
  fabricacao    date,
  validade      date,
  obs           text default '',
  created_at    timestamptz not null default now()
);

create table stock_balances (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references inventory_items(id) on delete cascade,
  warehouse_id uuid not null references warehouses(id) on delete restrict,
  lote_id     uuid references lotes(id) on delete restrict,
  quantity    numeric(14,3) not null default 0,
  updated_at  timestamptz not null default now(),
  unique (item_id, warehouse_id, lote_id)
);
create index stock_balances_item_idx on stock_balances(item_id);
create index stock_balances_warehouse_idx on stock_balances(warehouse_id);

create table stock_moves (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references inventory_items(id) on delete restrict,
  type         text not null check (type in ('entrada','saida')),
  quantity     numeric(14,3) not null,
  warehouse_id uuid references warehouses(id) on delete set null,
  lote_id      uuid references lotes(id) on delete set null,
  ref_type     text, -- compra | venda | producao | transferencia | ajuste
  ref_code     text,
  note         text default '',
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index stock_moves_item_idx on stock_moves(item_id);
create index stock_moves_created_at_idx on stock_moves(created_at);

-- -----------------------------------------------------------------------------
-- PRODUÇÃO (Ficha técnica / BOM, centros de trabalho, ordens)
-- -----------------------------------------------------------------------------
create table work_centers (
  id                     uuid primary key default gen_random_uuid(),
  nome                   text not null unique,
  capacidade_diaria_horas numeric(6,2) not null default 8,
  ativo                  boolean not null default true
);

create table boms (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references inventory_items(id) on delete cascade,
  versao     integer not null default 1,
  ativa      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index boms_produto_ativa_uk on boms(product_id) where ativa;

create table bom_lines (
  id       uuid primary key default gen_random_uuid(),
  bom_id   uuid not null references boms(id) on delete cascade,
  item_id  uuid not null references inventory_items(id) on delete restrict,
  quantity numeric(14,4) not null,
  perda_pct numeric(6,2) not null default 0
);

create table bom_operations (
  id            uuid primary key default gen_random_uuid(),
  bom_id        uuid not null references boms(id) on delete cascade,
  seq           integer not null,
  work_center_id uuid references work_centers(id) on delete set null,
  tempo_min     numeric(10,2) not null default 0,
  custo_hora    numeric(10,2) not null default 0
);

create table production_orders (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  product_id       uuid not null references inventory_items(id) on delete restrict,
  bom_id           uuid references boms(id) on delete set null,
  quantity         numeric(14,3) not null,
  machine          text default '',
  progress         smallint not null default 0 check (progress between 0 and 100),
  status           text not null default 'planejada'
                     check (status in ('planejada','em producao','pausada','concluida','cancelada')),
  due_at           date,
  stock_applied    boolean not null default false,
  custo_material   numeric(14,2),
  custo_operacao   numeric(14,2),
  lote_produzido_id uuid references lotes(id) on delete set null,
  concluida_em     date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table production_consumo (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references production_orders(id) on delete cascade,
  item_id     uuid not null references inventory_items(id) on delete restrict,
  quantity    numeric(14,3) not null
);

create table quality_inspections (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  order_id       uuid references production_orders(id) on delete set null,
  inspected_qty  numeric(14,3) not null,
  accepted_qty   numeric(14,3) not null,
  rate           numeric(6,2) not null default 0,
  inspector      text,
  notes          text default '',
  created_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- SUPRIMENTOS (requisições, cotações, compras, recebimentos)
-- -----------------------------------------------------------------------------
create table requisitions (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  requester_id   uuid references employees(id) on delete set null,
  dept_id        uuid references departments(id) on delete set null,
  justificativa  text default '',
  urgencia       text not null default 'normal' check (urgencia in ('normal','alta','urgente')),
  status         text not null default 'rascunho'
                   check (status in ('rascunho','aguardando','aprovada','reprovada','convertida')),
  needed_at      date,
  purchase_id    uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table requisition_lines (
  id             uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references requisitions(id) on delete cascade,
  item_id        uuid not null references inventory_items(id) on delete restrict,
  quantity       numeric(14,3) not null,
  unit_price     numeric(14,2) not null default 0
);

create table requisition_approvals (
  id             uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references requisitions(id) on delete cascade,
  user_name      text not null,
  acao           text not null check (acao in ('aprovou','reprovou')),
  nivel          smallint not null,
  nivel_label    text,
  motivo         text default '',
  at             timestamptz not null default now()
);

create table quotations (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  requisition_id uuid references requisitions(id) on delete cascade,
  supplier_id    uuid not null references suppliers(id) on delete restrict,
  prazo_dias     integer default 0,
  validade       date,
  pagamento      text default '',
  escolhida      boolean not null default false,
  created_at     timestamptz not null default now()
);

create table quotation_lines (
  id           uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  item_id      uuid not null references inventory_items(id) on delete restrict,
  quantity     numeric(14,3) not null,
  unit_price   numeric(14,2) not null default 0
);

create table purchases (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  supplier_id    uuid not null references suppliers(id) on delete restrict,
  requisition_id uuid references requisitions(id) on delete set null,
  status         text not null default 'rascunho'
                   check (status in ('rascunho','enviado','parcial','recebido','cancelado')),
  expected_at    date,
  stock_applied  boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table requisitions
  add constraint requisitions_purchase_fk foreign key (purchase_id) references purchases(id) on delete set null;

create table purchase_lines (
  id          uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  item_id     uuid not null references inventory_items(id) on delete restrict,
  quantity    numeric(14,3) not null,
  unit_price  numeric(14,2) not null default 0
);

create table receipts (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  purchase_id uuid not null references purchases(id) on delete cascade,
  nf          text default '',
  obs         text default '',
  received_by text default '',
  created_at  timestamptz not null default now()
);

create table receipt_lines (
  id         uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references receipts(id) on delete cascade,
  item_id    uuid not null references inventory_items(id) on delete restrict,
  quantity   numeric(14,3) not null,
  unit_price numeric(14,2) not null default 0
);

-- -----------------------------------------------------------------------------
-- COMERCIAL (CRM, vendas, expedição, devoluções, fiscal)
-- -----------------------------------------------------------------------------
create table crm_opportunities (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,
  nome                text not null,
  cliente_id          uuid references customers(id) on delete set null,
  lead_empresa        text default '',
  vendedor_id         uuid references employees(id) on delete set null,
  valor_estimado      numeric(14,2) not null default 0,
  estagio             text not null default 'prospeccao'
                        check (estagio in ('prospeccao','qualificacao','proposta','negociacao','ganha','perdida')),
  origem              text default '',
  data_abertura        date not null default current_date,
  previsao_fechamento  date,
  fechado_em          date,
  motivo_perda         text default '',
  motivo_perda_detalhe text default '',
  sale_id             uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table crm_activities (
  id             uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references crm_opportunities(id) on delete cascade,
  tipo           text not null check (tipo in ('ligacao','email','reuniao','nota')),
  descricao      text default '',
  usuario        text default '',
  data           timestamptz not null default now()
);

create table sales (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  customer_id   uuid not null references customers(id) on delete restrict,
  opportunity_id uuid references crm_opportunities(id) on delete set null,
  status        text not null default 'aberto'
                  check (status in ('aberto','faturado','cancelado')),
  stock_applied boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table crm_opportunities
  add constraint crm_opportunities_sale_fk foreign key (sale_id) references sales(id) on delete set null;

create table sales_lines (
  id         uuid primary key default gen_random_uuid(),
  sale_id    uuid not null references sales(id) on delete cascade,
  item_id    uuid not null references inventory_items(id) on delete restrict,
  quantity   numeric(14,3) not null,
  unit_price numeric(14,2) not null default 0
);

create table expedicoes (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  sale_id           uuid not null references sales(id) on delete cascade,
  customer_id       uuid references customers(id) on delete set null,
  status            text not null default 'separacao'
                       check (status in ('separacao','separado','embarcado','entregue','cancelada')),
  transportadora    text default '',
  motorista         text default '',
  placa             text default '',
  volumes           integer default 0,
  peso_kg           numeric(10,2) default 0,
  previsao_entrega  date,
  separado_por      text default '',
  separado_em       timestamptz,
  embarcado_por     text default '',
  embarcado_em      timestamptz,
  entregue_por      text default '',
  entregue_em       timestamptz,
  canhoto           text default '',
  motivo_cancel     text default '',
  created_at        timestamptz not null default now()
);

create table expedicao_lines (
  id            uuid primary key default gen_random_uuid(),
  expedicao_id  uuid not null references expedicoes(id) on delete cascade,
  item_id       uuid not null references inventory_items(id) on delete restrict,
  lote_id       uuid references lotes(id) on delete set null,
  quantity      numeric(14,3) not null,
  separado      boolean not null default false
);

create table devolucoes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  tipo        text not null check (tipo in ('venda','compra')),
  ref_id      uuid, -- sale_id ou purchase_id conforme tipo
  motivo      text default '',
  status      text not null default 'aberta' check (status in ('aberta','processada','cancelada')),
  created_at  timestamptz not null default now()
);

create table devolucao_lines (
  id            uuid primary key default gen_random_uuid(),
  devolucao_id  uuid not null references devolucoes(id) on delete cascade,
  item_id       uuid not null references inventory_items(id) on delete restrict,
  quantity      numeric(14,3) not null,
  unit_price    numeric(14,2) not null default 0
);

create table invoices (
  id             uuid primary key default gen_random_uuid(),
  numero         integer not null,
  serie          integer not null default 1,
  sale_id        uuid references sales(id) on delete set null,
  customer_id    uuid references customers(id) on delete set null,
  uf             text,
  natureza       text default 'Venda de produção do estabelecimento',
  status         text not null default 'emitida' check (status in ('emitida','cancelada')),
  total_produtos numeric(14,2) not null default 0,
  total_icms     numeric(14,2) not null default 0,
  total_ipi      numeric(14,2) not null default 0,
  total_pis      numeric(14,2) not null default 0,
  total_cofins   numeric(14,2) not null default 0,
  total_difal    numeric(14,2) not null default 0,
  total_nota     numeric(14,2) not null default 0,
  obs            text default '',
  emitida_em     timestamptz not null default now(),
  emitida_por    text default '',
  cancelada_em   timestamptz,
  motivo_cancel  text default '',
  unique (serie, numero)
);

create table invoice_lines (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid not null references invoices(id) on delete cascade,
  item_id       uuid references inventory_items(id) on delete set null,
  quantidade    numeric(14,3) not null,
  valor_unit    numeric(14,2) not null,
  valor_produto numeric(14,2) not null,
  ncm           text default '',
  origem        text default '0',
  unidade       text default 'UN',
  cfop          text default '',
  icms_base     numeric(14,2) default 0,
  icms_aliq     numeric(6,2) default 0,
  icms_valor    numeric(14,2) default 0,
  ipi_base      numeric(14,2) default 0,
  ipi_aliq      numeric(6,2) default 0,
  ipi_valor     numeric(14,2) default 0,
  pis_valor     numeric(14,2) default 0,
  cofins_valor  numeric(14,2) default 0,
  difal_valor   numeric(14,2) default 0,
  cst           text default '00',
  csosn         text default ''
);

-- -----------------------------------------------------------------------------
-- FINANCEIRO E CONTABILIDADE
-- -----------------------------------------------------------------------------
create table financial_entries (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  type         text not null check (type in ('pagar','receber')),
  description  text not null,
  amount       numeric(14,2) not null,
  due_at       date not null,
  paid_at      date,
  ref_type     text, -- compra | venda | folha | outro
  ref_id       uuid,
  created_at   timestamptz not null default now()
);
create index financial_entries_due_idx on financial_entries(due_at);
create index financial_entries_type_idx on financial_entries(type);

create table chart_of_accounts (
  id        uuid primary key default gen_random_uuid(),
  codigo    text not null unique,
  nome      text not null,
  tipo      text not null check (tipo in ('ativo','passivo','pl','receita','custo','despesa')),
  natureza  text not null check (natureza in ('devedora','credora')),
  sintetica boolean not null default false,
  pai_codigo text,
  sistema   boolean not null default false,
  ativa     boolean not null default true
);

create table journal_entries ( -- lançamentos
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  data        date not null default current_date,
  historico   text not null,
  ref_type    text,
  ref_id      uuid,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table journal_lines (
  id             uuid primary key default gen_random_uuid(),
  journal_id     uuid not null references journal_entries(id) on delete cascade,
  conta_codigo   text not null references chart_of_accounts(codigo),
  debito         numeric(14,2) not null default 0,
  credito        numeric(14,2) not null default 0,
  check (debito = 0 or credito = 0)
);

create table payroll ( -- folha de pagamento
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  employee_id   uuid not null references employees(id) on delete restrict,
  competencia   date not null, -- primeiro dia do mês de referência
  salario_base  numeric(14,2) not null,
  descontos     numeric(14,2) not null default 0,
  proventos     numeric(14,2) not null default 0,
  liquido       numeric(14,2) not null,
  status        text not null default 'aberta' check (status in ('aberta','paga')),
  paga_em       date,
  created_at    timestamptz not null default now(),
  unique (employee_id, competencia)
);

-- -----------------------------------------------------------------------------
-- AUDITORIA
-- -----------------------------------------------------------------------------
create table audit_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete set null,
  user_name  text,
  action     text not null,       -- create | update | delete | login | ...
  entity     text not null,       -- nome da tabela/módulo
  entity_id  uuid,
  detail     jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on audit_log(entity, created_at desc);
