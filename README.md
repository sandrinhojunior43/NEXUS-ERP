# NEXUS — Enterprise ERP System

Sistema ERP demonstrativo multi-setorial, desenvolvido como aplicação single-file em HTML5.
Voltado para PMEs de manufatura, logística e varejo.

**Versão atual:** v4.2 Enterprise (interface corporativa + barra de comando estilo transaction code)

---

## Demo

**Online:** https://nexus-erp.vercel.app

**Local:** baixe `nexus-v4-2-enterprise-2000s.html` e abra no navegador.

Credenciais de demonstração:

| Perfil | Usuário | Senha |
|---|---|---|
| Admin | sandroaparecido@nexus.com | (definida no arquivo) |
| Gerente | gerente@nexus.com | gerente123 |
| Operador | operador@nexus.com | operador123 |

> Dados de demonstração fictícios (empresa NEXUS AUTOMOTIVE SOLUTIONS).
> Este é um protótipo — não use credenciais reais nem dados sensíveis.

---

## Funcionalidades

- **Dashboard** — KPIs operacionais e 4 gráficos analíticos
- **Estoque** — 50 itens, cadastro, listagem, exportação
- **Produção** — 30 ordens com acompanhamento de progresso e status
- **Qualidade** — 25 inspeções com cálculo de taxa de conformidade
- **Importação** — upload de CSV/Excel com pré-visualização
- **Relatórios** — 4 gráficos analíticos exportáveis
- **Configurações** — modo escuro e informações do sistema

Recursos transversais:
- Barra de comando no topo (digite `EST`, `PROD`, `QUAL`, `REL`, `IMP`, `CONFIG` + Enter)
- Exportação para Excel (.xlsx) e PDF
- Modo escuro persistente
- Layout responsivo

---

## Stack

| Camada | Tecnologia |
|---|---|
| Interface | HTML5, CSS3, JavaScript |
| Gráficos | Chart.js |
| Planilhas | SheetJS (XLSX.js) |
| PDF | html2pdf.js |
| Persistência | localStorage |

Sem build step, sem dependências de instalação — basta abrir o arquivo.

---

## Estrutura do repositório

```
nexus-erp/
├── nexus-v4-2-enterprise-2000s.html   Aplicação principal
├── portfolio-website.html             Landing page
├── README.md                          Este arquivo
└── docs/
    ├── NEXUS_ARCHITECTURE.md          Arquitetura técnica
    ├── NEXUS_ROADMAP.md               Roadmap de versões
    ├── NEXUS_PHASE_SUMMARY.md         Fases do projeto
    └── INDEX-NEXUS.md                 Índice geral
```

---

## Roadmap

- **v4.2** — atual: interface corporativa, barra de comando, gráficos ajustados
- **v4.3** — refinamentos de UX, validações, tooltips
- **v5.0** — migração para React + TypeScript no front, Node.js + PostgreSQL no back, autenticação JWT real

Detalhes em [`docs/NEXUS_ROADMAP.md`](docs/NEXUS_ROADMAP.md).

---

## Limitações conhecidas

Este é um protótipo de demonstração, não um sistema de produção:

- Autenticação apenas no lado do cliente (sem servidor)
- Dados em `localStorage` — não há sincronização entre usuários
- Sem validação server-side
- Edição de registros ainda não implementada (prevista para v5.0)

---

## Autor

**Sandro Aparecido** — Engenharia Mecânica (Estácio), com foco em automação e ferramentas para manutenção industrial.

---

## Licença

MIT — veja [LICENSE](LICENSE).
