import type { Role } from '../types/database';

export interface ModuleDef {
  id: string;
  code: string;
  label: string;
  path: string;
  /** Papel mínimo para ver o módulo no menu. Todos veem se omitido. */
  minRole?: Role;
  /** true = tela já implementada com dados reais; false = placeholder "em construção". */
  ready: boolean;
}

export interface ModuleGroup {
  group: string;
  items: ModuleDef[];
}

const ROLE_RANK: Record<Role, number> = { consulta: 0, operador: 1, gerente: 2, administrador: 3 };
export const roleAtLeast = (role: Role | null | undefined, min: Role) =>
  ROLE_RANK[role ?? 'consulta'] >= ROLE_RANK[min];

export const MODULES: ModuleGroup[] = [
  {
    group: 'Operações',
    items: [
      { id: 'dashboard', code: 'HOME', label: 'Painel geral', path: '/', ready: true },
      { id: 'inventory', code: 'EST', label: 'Estoque', path: '/estoque', ready: true },
      { id: 'depositos', code: 'DEP', label: 'Depósitos', path: '/depositos', ready: true },
      { id: 'lotes', code: 'LOTE', label: 'Lotes e rastreio', path: '/lotes', ready: true },
      { id: 'moves', code: 'MOV', label: 'Movimentações', path: '/movimentacoes', ready: true },
      { id: 'boms', code: 'FICHA', label: 'Ficha técnica', path: '/fichas-tecnicas', ready: true },
      { id: 'production', code: 'PROD', label: 'Produção', path: '/producao', ready: true },
      { id: 'quality', code: 'QUAL', label: 'Qualidade', path: '/qualidade', ready: true },
    ],
  },
  {
    group: 'Suprimentos',
    items: [
      { id: 'suppliers', code: 'FORN', label: 'Fornecedores', path: '/fornecedores', ready: true },
      { id: 'requisitions', code: 'REQ', label: 'Requisições', path: '/requisicoes', ready: true },
      { id: 'purchases', code: 'COMP', label: 'Compras', path: '/compras', ready: true },
    ],
  },
  {
    group: 'Pessoas',
    items: [
      { id: 'departments', code: 'DEPT', label: 'Departamentos', path: '/departamentos', ready: true },
      { id: 'employees', code: 'RH', label: 'Funcionários', path: '/funcionarios', ready: true },
    ],
  },
  {
    group: 'Comercial',
    items: [
      { id: 'crm', code: 'CRM', label: 'CRM (funil)', path: '/crm', ready: true },
      { id: 'customers', code: 'CLI', label: 'Clientes', path: '/clientes', ready: true },
      { id: 'sales', code: 'VEND', label: 'Vendas', path: '/vendas', ready: true },
      { id: 'expedicao', code: 'EXP', label: 'Expedição', path: '/expedicao', ready: false },
      { id: 'devolucoes', code: 'DEV', label: 'Devoluções', path: '/devolucoes', ready: false },
    ],
  },
  {
    group: 'Gestão',
    items: [
      { id: 'financial', code: 'FIN', label: 'Financeiro', path: '/financeiro', ready: true },
      { id: 'fiscal', code: 'NF', label: 'Documentos fiscais', path: '/fiscal', ready: false },
      { id: 'audit', code: 'AUD', label: 'Auditoria', path: '/auditoria', minRole: 'gerente', ready: false },
      { id: 'users', code: 'USU', label: 'Usuários', path: '/usuarios', minRole: 'administrador', ready: false },
      { id: 'contabilidade', code: 'CTB', label: 'Contabilidade', path: '/contabilidade', minRole: 'gerente', ready: false },
      { id: 'settings', code: 'CONF', label: 'Configurações', path: '/configuracoes', ready: true },
    ],
  },
];

export const ALL_MODULES = MODULES.flatMap((g) => g.items);
export const CODE_MAP: Record<string, string> = Object.fromEntries(ALL_MODULES.map((m) => [m.code, m.path]));
