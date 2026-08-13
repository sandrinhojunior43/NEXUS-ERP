# NEXUS — Enterprise ERP System

Sistema ERP multi-setorial para PMEs de manufatura, logística e varejo.

O NEXUS existe hoje em duas versões no repositório:

| | Onde | O que é |
|---|---|---|
| **App real (atual)** | [`web/`](web/) | React + TypeScript + Supabase (Postgres real, Auth, RLS). Multiusuário, dados persistidos no servidor. **Em construção incremental** — ver status por módulo abaixo. |
| **Protótipo legado** | [`index-2.html`](index-2.html) | Single-file HTML/JS, dados em `localStorage`, sem backend. Mantido como referência histórica e para comparação de funcionalidades — não recebe mais features novas. |

Se você chegou aqui a partir de uma versão antiga deste README: o protótipo
`nexus-v4-2-enterprise-2000s.html` citado nas versões anteriores da
documentação evoluiu para `index-2.html` (bem mais completo — ver
"Funcionalidades do protótipo legado" abaixo) e agora está sendo substituído
pelo app real em `web/`.

---

## Rodando o app real (`web/`)

```bash
cd web
npm install
cp .env.example .env      # preencha com a URL/anon key do seu projeto Supabase
npm run dev
```

Sem um projeto Supabase configurado, a tela de login mostra um aviso e nada
funciona além disso — siga [`supabase/README.md`](supabase/README.md) para
criar o projeto, aplicar as migrations e rodar o seed de demonstração
(empresa fictícia **NEXUS AUTOMOTIVE SOLUTIONS**).

Credenciais de demonstração (após seguir o setup em `supabase/README.md`):

| Perfil | E-mail | Observação |
|---|---|---|
| Administrador | `sandro03junior@gmail.com` | acesso total |
| Gerente | `gerente@nexus.com` | tudo exceto usuários |
| Operador | `operador@nexus.com` | lança dados operacionais |
| Consulta | `consulta@nexus.com` | somente leitura |

> Protótipo de demonstração com dados fictícios. Não use credenciais reais.

### Estilo visual

O app tem dois estilos de interface, alternáveis a qualquer momento em
**Configurações** (ou pelo ícone 🖥️/◧ na barra superior) — a preferência fica
salva no navegador:

- **Moderno** (padrão) — inspirado em macOS/iOS: vidro translúcido na
  barra lateral/superior, cantos arredondados, botões em pílula, tipografia
  do sistema Apple (`-apple-system`).
- **Clássico** — o visual corporativo original do NEXUS (bordas retas, azul
  corporativo), mais próximo da estética 2000s do protótipo legado.

Ambos têm modo claro/escuro independente disso.

### Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 |
| Roteamento | React Router |
| Dados/cache | TanStack Query |
| Gráficos | Recharts |
| Backend | Supabase (Postgres + Auth + Row Level Security) |

Sem servidor Node customizado: a lógica de negócio roda como Postgres
functions/triggers (`supabase/migrations/`) e RLS controla permissões por
papel diretamente no banco. Ver [`NEXUS_ARCHITECTURE.md`](NEXUS_ARCHITECTURE.md).

### Status por módulo

✅ pronto (dados reais via Supabase) · 🚧 tabela existe, tela ainda não implementada

| Módulo | Status |
|---|---|
| Dashboard (KPIs + gráfico) | ✅ |
| Estoque, Depósitos, Lotes, Movimentações | ✅ |
| Ficha técnica (BOM) + Produção | ✅ |
| Fornecedores + Compras | ✅ |
| Clientes + CRM (funil) + Vendas | ✅ |
| Financeiro (a pagar/receber) | ✅ |
| Qualidade | ✅ |
| Departamentos + Funcionários (RH) | ✅ |
| Requisições de compra + cotações | 🚧 |
| Expedição | 🚧 |
| Devoluções | 🚧 |
| Documentos fiscais (NF-e) | 🚧 |
| Contabilidade (plano de contas, DRE, balanço) | 🚧 |
| Auditoria | 🚧 |
| Gestão de usuários (UI) | 🚧 |

Detalhes e ordem sugerida de implementação em
[`NEXUS_ROADMAP.md`](NEXUS_ROADMAP.md).

---

## Protótipo legado (`index-2.html`)

Aplicação single-file (HTML/CSS/JS vanilla) com autenticação apenas no
cliente e dados em `localStorage` — sem sincronização entre usuários, sem
validação server-side. Cobre um número maior de módulos que o app real
ainda cobre (Qualidade, MRP, Expedição, Devoluções, Fiscal, Contabilidade
completa, RH, Auditoria, Permissões) — serve de referência de comportamento
e regras de negócio ao portar cada módulo para `web/`.

```bash
# basta abrir no navegador, não precisa de servidor
open index-2.html
```

Stack: HTML5/CSS3/JS, Chart.js, SheetJS (XLSX), html2pdf.js, `localStorage`.

`portfolio-website.html` é uma landing page comercial separada, sem relação
com o funcionamento do sistema.

---

## Estrutura do repositório

```
NEXUS-ERP/
├── web/                       App real (React + TS + Supabase) — ver web/
├── supabase/                  Schema Postgres, RLS, seed — ver supabase/README.md
│   ├── migrations/            Tabelas, funções, políticas de RLS
│   ├── seed.sql                Dados de demonstração
│   └── config.toml            Config da Supabase CLI
├── index-2.html                Protótipo legado (client-only)
├── portfolio-website.html      Landing page comercial
├── README.md                   Este arquivo
├── NEXUS_ARCHITECTURE.md       Arquitetura técnica (atualizado para o app real)
├── NEXUS_ROADMAP.md            Roadmap por módulo
├── NEXUS_PHASE_SUMMARY.md      Histórico de fases do projeto
└── INDEX-NEXUS.md              Índice geral de arquivos
```

---

## Limitações conhecidas (app real)

- Vários módulos ainda são placeholders ("em construção") — ver tabela de
  status acima.
- A geração de código sequencial (`next_code`) e a baixa de saldo de
  estoque (`applyStockMove`) fazem leitura-then-escrita no cliente; sob uso
  concorrente pesado por múltiplos operadores no mesmo item, isso pode
  gerar condição de corrida. Migrar para uma função Postgres (RPC
  transacional) resolve — está no roadmap.
- Emissão fiscal (NF-e) é só cadastro interno; não há integração com SEFAZ.
- Sem testes automatizados ainda.

---

## Autor

**Sandro Aparecido** — Engenharia Mecânica (Estácio), com foco em automação e ferramentas para manutenção industrial.

---

## Licença

MIT — veja [LICENSE](LICENSE).
