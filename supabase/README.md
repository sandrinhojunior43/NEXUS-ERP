# Backend do NEXUS (Supabase)

Este diretório contém o schema real do NEXUS ERP: tabelas Postgres, RLS
(controle de acesso por papel) e um seed de demonstração. É o que substitui
o `localStorage` do protótipo original (`index-2.html`).

## Setup — projeto novo no Supabase

1. Crie uma conta e um projeto em [supabase.com](https://supabase.com) (free tier serve para começar).
2. Instale a CLI: `npm install -g supabase` (ou use `npx supabase`).
3. Faça login e linke o projeto:
   ```bash
   supabase login
   supabase link --project-ref <seu-project-ref>
   ```
4. Aplique as migrations (cria todas as tabelas, funções e políticas RLS):
   ```bash
   supabase db push
   ```
5. (Opcional, recomendado para testar) Rode o seed de dados fictícios da
   NEXUS AUTOMOTIVE SOLUTIONS:
   ```bash
   psql "$(supabase db remote-commit-url 2>/dev/null || echo $DATABASE_URL)" -f supabase/seed.sql
   ```
   ou cole o conteúdo de `seed.sql` no **SQL Editor** do Supabase Studio.
6. Crie os usuários de demonstração em **Authentication → Users → Add user**
   (defina uma senha para cada e-mail abaixo — o trigger `handle_new_user`
   cria o `profile` automaticamente como `consulta`):
   - `sandro03junior@gmail.com`
   - `gerente@nexus.com`
   - `operador@nexus.com`
   - `consulta@nexus.com`
7. Promova os papéis rodando o bloco final de `seed.sql` (os `UPDATE profiles ...`).
8. Copie `web/.env.example` para `web/.env` e preencha com a URL e a
   `anon key` do projeto (**Project Settings → API**).

## Desenvolvimento local (opcional)

Se tiver Docker disponível: `supabase start` sobe Postgres + Auth + Studio
localmente (`http://localhost:54323`) sem precisar de projeto na nuvem.
Nesse caso aponte `web/.env` para `http://localhost:54321` e a `anon key`
impressa por `supabase start`.

## Estrutura

- `migrations/0001_schema.sql` — todas as tabelas (estoque, produção,
  compras, vendas, financeiro, contabilidade, RH, CRM, auditoria...).
- `migrations/0002_functions.sql` — `updated_at` automático, geração de
  código sequencial (`next_code('PC')` → `PC00001`), criação automática de
  `profiles` no cadastro de usuário, saldo agregado do item de estoque.
- `migrations/0003_rls.sql` — Row Level Security. Leitura liberada a
  qualquer usuário autenticado com perfil ativo; escrita exige papel
  `administrador`/`gerente`/`operador` (varia por tabela); contabilidade e
  folha restritas a `administrador`/`gerente`.
- `seed.sql` — dados de demonstração (empresa fictícia, fornecedores,
  clientes, estoque, fichas técnicas, algumas ordens/compras/vendas).

## Papéis (RBAC)

| Papel | Pode |
|---|---|
| `administrador` | tudo, incluindo gestão de usuários e contabilidade |
| `gerente` | tudo exceto gestão de usuários |
| `operador` | ler e lançar dados operacionais (estoque, produção, compras, vendas) |
| `consulta` | somente leitura |

Novos usuários nascem como `consulta`; a promoção é manual (tabela
`profiles`, coluna `role`), feita por um `administrador` pela tela de
Usuários ou diretamente no banco.
