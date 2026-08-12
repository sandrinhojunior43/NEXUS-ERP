# NEXUS — Roadmap Técnico

> Reescrito para refletir o estado real do projeto após a migração para
> backend real (Supabase). As versões anteriores deste documento (datadas de
> 2024) descreviam um protótipo single-file bem mais simples do que o que
> existe hoje em `index-2.html`, e não contemplavam a migração para
> `web/` — foram substituídas por este roadmap.

## Onde estamos

- **`index-2.html`** — protótipo client-only, ~20 módulos, dados em
  `localStorage`. Congelado: não recebe mais features, só serve de
  referência de comportamento/regras de negócio.
- **`web/` + `supabase/`** — app real: React/TypeScript no front, Postgres
  + Auth + RLS no backend (Supabase). Schema já cobre **todos** os módulos
  do protótipo (43 tabelas, ver `supabase/migrations/0001_schema.sql`); a
  interface cobre os módulos centrais (ver tabela de status no README).

O trabalho que falta é majoritariamente **portar telas**, não desenhar
schema — a base de dados já existe para tudo.

## Próximos módulos (ordem sugerida)

Ordenado por dependência e valor — cada item assume os anteriores prontos.

✅ **Qualidade** (`quality_inspections`) e **Departamentos + Funcionários**
(`departments`, `employees`) já foram portados — inspeção vinculada a ordens
de produção concluídas com taxa de conformidade, e CRUD de RH completo.

1. **Requisições de compra + Cotações** (`requisitions`, `requisition_lines`,
   `requisition_approvals`, `quotations`, `quotation_lines`) — fluxo de
   aprovação por alçada (`profiles.limite_alcada` / `nivel_aprovacao` já
   existem no schema, e `employees`/`departments` já estão prontos para
   servir de solicitante), depois conversão em pedido de compra.
2. **Expedição** (`expedicoes`, `expedicao_lines`) — separação → embarque →
   entrega, a partir de vendas faturadas.
3. **Devoluções** (`devolucoes`, `devolucao_lines`) — vinculadas a
   compra/venda, com estorno de estoque.
4. **Documentos fiscais** (`invoices`, `invoice_lines`) — hoje é só registro
   interno (sem SEFAZ); calcular ICMS/IPI/PIS/COFINS a partir da venda
   faturada, como o protótipo legado já faz em `renderLinesRC`/`gerarNFe`.
5. **Contabilidade** (`chart_of_accounts`, `journal_entries`,
   `journal_lines`) — partida dobrada automática a partir de
   compras/vendas/produção (o protótipo legado tem a lógica de referência
   em `renderDRE`/`renderBalanco`/`renderBalancete`), depois telas de
   Razão/Balancete/DRE/Balanço.
6. **Folha de pagamento** (`payroll`) — depende de Funcionários (já pronto).
7. **Auditoria** (`audit_log`) — a tabela já existe; falta instrumentar as
   mutações principais (hoje nenhuma tela grava nela) e a tela de consulta.
8. **Gestão de usuários (UI)** — hoje a promoção de papel
    (`profiles.role`) é feita manualmente no banco; falta tela para
    administradores convidarem/desativarem usuários e mudarem papéis.

## Dívidas técnicas conhecidas

- **`applyStockMove` / `next_code`** (`web/src/lib/stock.ts`,
  `supabase/migrations/0002_functions.sql`) fazem leitura-then-escrita a
  partir do cliente. Correto para uso com poucos operadores simultâneos;
  sob concorrência real, migrar para uma função Postgres transacional
  (RPC) elimina a race condition entre o `SELECT` do saldo atual e o
  `UPDATE`.
- **Tipos do Supabase client** (`web/src/types/database.ts`) são mantidos à
  mão porque este ambiente não tem um projeto Supabase linkado para rodar
  `supabase gen types`. Ao linkar um projeto real, gerar os tipos oficiais
  e usar `createClient<Database>()` volta a valer a pena — hoje o client é
  criado sem generic de propósito (ver comentário no arquivo) porque a
  geração manual do formato exigido pela versão atual do `supabase-js`
  (marcador `__InternalSupabase`, `Relationships` por tabela) é frágil.
- Sem testes automatizados (unitários ou E2E) ainda.
- Bundle do Vite passa de 500 kB (aviso no build) — candidato a
  code-splitting por rota quando o número de módulos crescer mais.

## Fora de escopo por enquanto

- Multiempresa / multi-tenant (schema é single-tenant: uma linha em
  `empresa`).
- Integração fiscal real com SEFAZ (emissão de NF-e válida).
- App mobile nativo.
- IA/ML (forecasting, detecção de anomalias) — mencionado em versões
  antigas deste roadmap como "v6.0+"; não há trabalho de base para isso
  ainda.
