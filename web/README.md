# NEXUS ERP — frontend

React + TypeScript + Vite + Tailwind CSS v4, com Supabase como backend
(Postgres + Auth + RLS). Ver a documentação principal na raiz do
repositório:

- [`../README.md`](../README.md) — visão geral do projeto
- [`../supabase/README.md`](../supabase/README.md) — como criar/configurar o projeto Supabase
- [`../NEXUS_ARCHITECTURE.md`](../NEXUS_ARCHITECTURE.md) — arquitetura técnica
- [`../NEXUS_ROADMAP.md`](../NEXUS_ROADMAP.md) — o que falta implementar

## Setup

```bash
npm install
cp .env.example .env   # preencha com a URL/anon key do seu projeto Supabase
npm run dev
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento (Vite) |
| `npm run build` | typecheck (`tsc -b`) + build de produção |
| `npm run preview` | serve o build de produção localmente |
| `npm run lint` | lint (oxlint) |
