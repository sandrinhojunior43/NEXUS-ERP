/**
 * Tipos das tabelas do Supabase (espelham supabase/migrations/0001_schema.sql).
 *
 * Mantidos à mão (sem `supabase gen types`) porque este projeto ainda não tem
 * um projeto Supabase linkado no ambiente de build. Ao linkar um projeto real,
 * prefira gerar isto com:
 *   supabase gen types typescript --linked > src/types/database.ts
 * e adaptar os imports que usam os tipos `Row` abaixo.
 *
 * Insert/Update usam Partial<Row> como aproximação pragmática (todas as
 * colunas com default no banco — id, created_at, código sequencial etc. —
 * podem ser omitidas ao inserir).
 */

export type Role = 'administrador' | 'gerente' | 'operador' | 'consulta';

export interface EmpresaRow {
  id: string;
  razao: string;
  fantasia: string;
  cnpj: string;
  ie: string;
  im: string;
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  fone: string;
  regime: 'simples' | 'presumido' | 'real';
  segmento: 'industria' | 'comercio' | 'ambos';
  contribuinte_ipi: boolean;
  serie_nfe: number;
  proximo_numero_nfe: number;
  aliq_icms_interna: number;
  aliq_pis: number;
  aliq_cofins: number;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  perms: Record<string, unknown>;
  limite_alcada: number;
  nivel_aprovacao: number;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentRow {
  id: string;
  code: string;
  name: string;
  orcamento: number;
  responsavel_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeRow {
  id: string;
  code: string;
  name: string;
  cpf: string | null;
  cargo: string;
  dept_id: string | null;
  admissao: string;
  salario: number;
  status: 'ativo' | 'afastado' | 'desligado';
  email: string | null;
  phone: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierRow {
  id: string;
  code: string;
  name: string;
  cnpj: string | null;
  city: string | null;
  uf: string | null;
  phone: string | null;
  email: string | null;
  lead_time_dias: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerRow {
  id: string;
  code: string;
  name: string;
  cnpj: string | null;
  ie: string | null;
  city: string | null;
  uf: string | null;
  phone: string | null;
  email: string | null;
  contribuinte: boolean;
  consumidor_final: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WarehouseRow {
  id: string;
  code: string;
  nome: string;
  aceita: 'materia' | 'produto' | 'ambos';
  descricao: string;
  principal: boolean;
  ativo: boolean;
  created_at: string;
}

export interface InventoryItemRow {
  id: string;
  sku: string;
  description: string;
  category: string | null;
  type: 'materia' | 'produto';
  quantity: number;
  min_quantity: number;
  unit_price: number;
  supplier_id: string | null;
  ncm: string;
  origem: string;
  unidade: string;
  aliq_ipi: number;
  cest: string;
  controla_lote: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoteRow {
  id: string;
  item_id: string;
  codigo: string;
  fornecedor_id: string | null;
  nf: string;
  fabricacao: string | null;
  validade: string | null;
  obs: string;
  created_at: string;
}

export interface StockBalanceRow {
  id: string;
  item_id: string;
  warehouse_id: string;
  lote_id: string | null;
  quantity: number;
  updated_at: string;
}

export interface StockMoveRow {
  id: string;
  item_id: string;
  type: 'entrada' | 'saida';
  quantity: number;
  warehouse_id: string | null;
  lote_id: string | null;
  ref_type: string | null;
  ref_code: string | null;
  note: string;
  created_by: string | null;
  created_at: string;
}

export interface WorkCenterRow {
  id: string;
  nome: string;
  capacidade_diaria_horas: number;
  ativo: boolean;
}

export interface BomRow {
  id: string;
  product_id: string;
  versao: number;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export interface BomLineRow {
  id: string;
  bom_id: string;
  item_id: string;
  quantity: number;
  perda_pct: number;
}

export interface BomOperationRow {
  id: string;
  bom_id: string;
  seq: number;
  work_center_id: string | null;
  tempo_min: number;
  custo_hora: number;
}

export type ProductionStatus = 'planejada' | 'em producao' | 'pausada' | 'concluida' | 'cancelada';

export interface ProductionOrderRow {
  id: string;
  code: string;
  product_id: string;
  bom_id: string | null;
  quantity: number;
  machine: string;
  progress: number;
  status: ProductionStatus;
  due_at: string | null;
  stock_applied: boolean;
  custo_material: number | null;
  custo_operacao: number | null;
  lote_produzido_id: string | null;
  concluida_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductionConsumoRow {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
}

export interface QualityInspectionRow {
  id: string;
  code: string;
  order_id: string | null;
  inspected_qty: number;
  accepted_qty: number;
  rate: number;
  inspector: string | null;
  notes: string;
  created_at: string;
}

export type RequisitionStatus = 'rascunho' | 'aguardando' | 'aprovada' | 'reprovada' | 'convertida';

export interface RequisitionRow {
  id: string;
  code: string;
  requester_id: string | null;
  dept_id: string | null;
  justificativa: string;
  urgencia: 'normal' | 'alta' | 'urgente';
  status: RequisitionStatus;
  needed_at: string | null;
  purchase_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequisitionLineRow {
  id: string;
  requisition_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
}

export interface RequisitionApprovalRow {
  id: string;
  requisition_id: string;
  user_name: string;
  acao: 'aprovou' | 'reprovou';
  nivel: number;
  nivel_label: string | null;
  motivo: string;
  at: string;
}

export interface QuotationRow {
  id: string;
  code: string;
  requisition_id: string | null;
  supplier_id: string;
  prazo_dias: number;
  validade: string | null;
  pagamento: string;
  escolhida: boolean;
  created_at: string;
}

export interface QuotationLineRow {
  id: string;
  quotation_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
}

export type PurchaseStatus = 'rascunho' | 'enviado' | 'parcial' | 'recebido' | 'cancelado';

export interface PurchaseRow {
  id: string;
  code: string;
  supplier_id: string;
  requisition_id: string | null;
  status: PurchaseStatus;
  expected_at: string | null;
  stock_applied: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseLineRow {
  id: string;
  purchase_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
}

export interface ReceiptRow {
  id: string;
  code: string;
  purchase_id: string;
  nf: string;
  obs: string;
  received_by: string;
  created_at: string;
}

export type SaleStatus = 'aberto' | 'faturado' | 'cancelado';

export interface SaleRow {
  id: string;
  code: string;
  customer_id: string;
  opportunity_id: string | null;
  status: SaleStatus;
  stock_applied: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaleLineRow {
  id: string;
  sale_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
}

export type CrmStage = 'prospeccao' | 'qualificacao' | 'proposta' | 'negociacao' | 'ganha' | 'perdida';

export interface CrmOpportunityRow {
  id: string;
  code: string;
  nome: string;
  cliente_id: string | null;
  lead_empresa: string;
  vendedor_id: string | null;
  valor_estimado: number;
  estagio: CrmStage;
  origem: string;
  data_abertura: string;
  previsao_fechamento: string | null;
  fechado_em: string | null;
  motivo_perda: string;
  motivo_perda_detalhe: string;
  sale_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpedicaoRow {
  id: string;
  code: string;
  sale_id: string;
  customer_id: string | null;
  status: 'separacao' | 'separado' | 'embarcado' | 'entregue' | 'cancelada';
  transportadora: string;
  motorista: string;
  placa: string;
  volumes: number;
  peso_kg: number;
  previsao_entrega: string | null;
  created_at: string;
}

export interface DevolucaoRow {
  id: string;
  code: string;
  tipo: 'venda' | 'compra';
  ref_id: string | null;
  motivo: string;
  status: 'aberta' | 'processada' | 'cancelada';
  created_at: string;
}

export interface InvoiceRow {
  id: string;
  numero: number;
  serie: number;
  sale_id: string | null;
  customer_id: string | null;
  uf: string | null;
  natureza: string;
  status: 'emitida' | 'cancelada';
  total_produtos: number;
  total_icms: number;
  total_ipi: number;
  total_pis: number;
  total_cofins: number;
  total_difal: number;
  total_nota: number;
  obs: string;
  emitida_em: string;
  emitida_por: string;
  cancelada_em: string | null;
  motivo_cancel: string;
}

export type FinancialType = 'pagar' | 'receber';

export interface FinancialEntryRow {
  id: string;
  code: string;
  type: FinancialType;
  description: string;
  amount: number;
  due_at: string;
  paid_at: string | null;
  ref_type: string | null;
  ref_id: string | null;
  created_at: string;
}

export interface ChartOfAccountRow {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'ativo' | 'passivo' | 'pl' | 'receita' | 'custo' | 'despesa';
  natureza: 'devedora' | 'credora';
  sintetica: boolean;
  pai_codigo: string | null;
  sistema: boolean;
  ativa: boolean;
}

export interface JournalEntryRow {
  id: string;
  code: string;
  data: string;
  historico: string;
  ref_type: string | null;
  ref_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface JournalLineRow {
  id: string;
  journal_id: string;
  conta_codigo: string;
  debito: number;
  credito: number;
}

export interface PayrollRow {
  id: string;
  code: string;
  employee_id: string;
  competencia: string;
  salario_base: number;
  descontos: number;
  proventos: number;
  liquido: number;
  status: 'aberta' | 'paga';
  paga_em: string | null;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
}

// ---- Mapa tabela -> tipo de linha -------------------------------------------
//
// O client supabase-js é criado *sem* o generic `Database` (ver lib/supabase.ts):
// a versão atual da lib exige, para inferir tipos de `.select()`/`.insert()`
// corretamente, um formato gerado por `supabase gen types` (com metadados de
// versão do PostgREST e relacionamentos) que não temos disponível neste
// ambiente sem um projeto Supabase linkado. Reproduzir esse formato à mão é
// frágil e quebra silenciosamente a cada patch da lib.
//
// Em vez disso, o client fica com tipagem permissiva e cada chamada casta o
// resultado para o `Row` correto usando este mapa (via hooks/useCrud.ts ou
// diretamente `as XRow[]`). Ao linkar um projeto Supabase real, rodar
// `supabase gen types typescript --linked` passa a valer a pena e este mapa
// pode ser removido em favor do tipo gerado.
export interface TableRowMap {
  empresa: EmpresaRow;
  profiles: ProfileRow;
  departments: DepartmentRow;
  employees: EmployeeRow;
  suppliers: SupplierRow;
  customers: CustomerRow;
  warehouses: WarehouseRow;
  inventory_items: InventoryItemRow;
  lotes: LoteRow;
  stock_balances: StockBalanceRow;
  stock_moves: StockMoveRow;
  work_centers: WorkCenterRow;
  boms: BomRow;
  bom_lines: BomLineRow;
  bom_operations: BomOperationRow;
  production_orders: ProductionOrderRow;
  production_consumo: ProductionConsumoRow;
  quality_inspections: QualityInspectionRow;
  requisitions: RequisitionRow;
  requisition_lines: RequisitionLineRow;
  requisition_approvals: RequisitionApprovalRow;
  quotations: QuotationRow;
  quotation_lines: QuotationLineRow;
  purchases: PurchaseRow;
  purchase_lines: PurchaseLineRow;
  receipts: ReceiptRow;
  sales: SaleRow;
  sales_lines: SaleLineRow;
  crm_opportunities: CrmOpportunityRow;
  expedicoes: ExpedicaoRow;
  devolucoes: DevolucaoRow;
  invoices: InvoiceRow;
  financial_entries: FinancialEntryRow;
  chart_of_accounts: ChartOfAccountRow;
  journal_entries: JournalEntryRow;
  journal_lines: JournalLineRow;
  payroll: PayrollRow;
  audit_log: AuditLogRow;
}
