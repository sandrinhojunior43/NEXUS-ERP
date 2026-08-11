# NEXUS — Arquitetura Técnica

> Reescrito para descrever o app real (`web/` + `supabase/`). O protótipo
> legado (`index-2.html`) é client-only e não é coberto aqui — seu desenho
> era simplesmente "tudo em uma função JS + `localStorage`".

## Visão geral

```
┌─────────────────────────┐        ┌──────────────────────────────────────┐
│   web/ (React + TS)     │        │        Supabase (projeto cloud)       │
│                          │        │                                        │
│  React Router  ─┬─ pages │  HTTPS │  PostgREST  ──▶  Postgres              │
│  TanStack Query │        │◀──────▶│  (auto-gerado    ├─ tabelas            │
│  supabase-js    │        │  REST  │   a partir do    ├─ RLS (por papel)    │
│                  │        │        │   schema)        ├─ funções/triggers  │
│  AuthProvider ───┴─ auth │        │  GoTrue (Auth) ──▶ ├─ auth.users        │
└─────────────────────────┘        └──────────────────────────────────────┘
```

Não há servidor Node/Express customizado. A "camada de API" é o PostgREST
do Supabase, gerado automaticamente a partir do schema Postgres — regras de
negócio que precisam rodar no servidor (RBAC, geração de código sequencial,
sincronização de saldo agregado) vivem como **funções e triggers Postgres**
(`supabase/migrations/0002_functions.sql`), não como endpoints separados.
Regras que envolvem múltiplas escritas coordenadas pelo usuário (dar entrada
de compra, faturar venda, concluir ordem de produção) rodam no cliente como
uma sequência de chamadas — ver "Fluxos multi-tabela" abaixo.

## Banco de dados (`supabase/migrations/`)

- **`0001_schema.sql`** — todas as tabelas. Convenção: chave primária
  `uuid default gen_random_uuid()`, timestamps `timestamptz`, tipos
  restritos por `check` (ex.: `status in (...)`) em vez de enums Postgres
  (mais fácil de alterar sem migração de tipo). Documentos com linhas
  (compra, venda, requisição, cotação, fatura) seguem o padrão
  cabeçalho/linha: `purchases` + `purchase_lines`, etc.
- **`0002_functions.sql`**:
  - `set_updated_at()` — trigger genérico aplicado via loop `DO $$ ... $$`
    às tabelas com coluna `updated_at`.
  - `next_code(prefix, pad)` — sequência atômica por prefixo
    (`code_sequences`), gera códigos como `PC00001`, `OP00001`. Chamado do
    cliente via `supabase.rpc('next_code', ...)`.
  - `handle_new_user()` — trigger em `auth.users` que cria a linha
    correspondente em `profiles` (papel inicial `consulta`; promoção é
    manual).
  - `refresh_item_quantity()` / trigger em `stock_balances` — mantém
    `inventory_items.quantity` como espelho agregado dos saldos por
    depósito/lote, para as telas não precisarem somar em runtime.
- **`0003_rls.sql`** — Row Level Security. Funções auxiliares `app_role()`,
  `is_staff()`, `is_manager()`, `is_admin()` leem `profiles.role` do
  usuário autenticado (`auth.uid()`) e alimentam as políticas. Regra geral
  aplicada em loop a todas as tabelas operacionais: leitura liberada a
  qualquer usuário autenticado ativo, escrita exige `operador` ou acima;
  contabilidade/folha exigem `gerente`/`administrador`; `profiles` só é
  editável pelo próprio usuário (campos não sensíveis) ou por um
  administrador.

RBAC inteiro vive no banco — a UI (`web/src/lib/modules.ts`,
`roleAtLeast()`) só *esconde* o que o usuário não pode fazer; a garantia
real é a política de RLS, então mesmo uma chamada direta à API do Supabase
por fora do app respeita as mesmas regras.

## Frontend (`web/src/`)

```
lib/
  supabase.ts   client supabase-js (sem generic Database — ver nota abaixo)
  auth.tsx      AuthProvider/useAuth — sessão + profile em contexto React
  modules.ts    menu lateral (grupos, papel mínimo, status "pronto/em construção")
  stock.ts      applyStockMove() — grava stock_moves + ajusta stock_balances
  format.ts     money()/num()/fmtDate() — formatação pt-BR
  theme.ts      dark mode via classe no <html>, persistido em localStorage

hooks/
  useCrud.ts    CRUD genérico (list/create/update/remove) via TanStack Query

components/     Layout (sidebar + topbar + barra de comando), DataTable,
                Modal/Field, StatusBadge, Kpi, ComingSoon, ProtectedRoute

pages/          uma pasta por módulo (inventory, purchases, sales, crm,
                production, financial, ...) — list + modal de
                criação/edição, seguindo o mesmo padrão em todas
```

### Por que o client supabase-js não usa o generic `Database`

Versões recentes do `@supabase/supabase-js` (a instalada aqui é 2.112)
exigem, para inferir corretamente os tipos de `.select()`/`.insert()`, um
formato de tipo gerado pela própria CLI (`supabase gen types`) — inclui um
marcador de versão do PostgREST (`__InternalSupabase`) e metadados de
relacionamento (`Relationships`) por tabela. Reproduzir esse formato à mão,
sem um projeto Supabase linkado neste ambiente para gerar os tipos de
verdade, se mostrou frágil: o resolvedor de tipos do client caía para
`never` silenciosamente em vários pontos.

A solução adotada: `supabase = createClient(url, key)` **sem** generic
(client "solto"), e um mapa `TableRowMap` em `web/src/types/database.ts`
com a forma de cada linha, usado para tipar manualmente cada
`useQuery`/`useCrud` no ponto de uso. Ao linkar um projeto Supabase real,
rodar `supabase gen types typescript --linked` e trocar para
`createClient<Database>()` é a melhoria natural — ver `NEXUS_ROADMAP.md`.

### Fluxos multi-tabela (lado cliente)

Alguns fluxos de negócio tocam mais de uma tabela e não têm uma função
Postgres dedicada ainda — rodam como sequência de chamadas do navegador:

- **Receber compra** (`PurchasesPage.receber`) — para cada linha, chama
  `applyStockMove` (entrada de estoque) e cria um `financial_entries`
  tipo `pagar`.
- **Faturar venda** (`SalesPage.faturar`) — mesma ideia, saída de estoque
  por linha + `financial_entries` tipo `receber`.
- **Concluir ordem de produção** (`ProductionPage.concluir`) — para cada
  componente da ficha técnica ativa, saída de matéria-prima
  (`applyStockMove`) proporcional à quantidade da ordem e à perda
  percentual; depois entrada do produto acabado.

Essas operações **não são transacionais** (não há `BEGIN`/`COMMIT` único —
cada chamada é uma requisição HTTP separada ao PostgREST). Uma falha no
meio do caminho deixa estado parcial. Aceitável para o volume de uso atual
(poucos operadores, baixo throughput); a correção correta é mover a lógica
para uma função Postgres (`plpgsql`, `security invoker`) chamada via RPC,
que executa tudo em uma única transação de banco — está no roadmap.

## Deploy

- **Frontend**: qualquer host de site estático que sirva um build Vite
  (Vercel, Netlify, etc.) — `web/`, comando de build `npm run build`,
  saída em `web/dist`. Variáveis de ambiente `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_ANON_KEY` precisam estar configuradas no host.
- **Backend**: projeto Supabase (cloud, free tier serve para começar).
  Setup completo em `supabase/README.md`.
- Não há processo de servidor próprio para deployar — o backend é 100%
  gerenciado pelo Supabase (Postgres + PostgREST + GoTrue + Studio).

## Protótipo legado (`index-2.html`)

Arquitetura completamente diferente e não mantida: uma função `app` global
em JavaScript vanilla, estado em `app.data` serializado inteiro para
`localStorage` a cada mutação, renderização via `innerHTML` de templates
string. Serve hoje só como referência de regras de negócio (cálculo de
DRE, geração de NF-e simulada, folha de pagamento, MRP) ao portar cada
módulo para o app real — ver `NEXUS_ROADMAP.md`.
