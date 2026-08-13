const PALETTE: Record<string, string> = {
  // genéricos
  ativo: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  ativa: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  aprovada: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  concluida: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  recebido: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  faturado: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  entregue: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  paga: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  ganha: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',

  rascunho: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  planejada: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  aberta: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  aberto: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',

  enviado: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  parcial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  aguardando: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  pausada: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'em producao': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  negociacao: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  proposta: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',

  cancelado: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  cancelada: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  reprovada: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  perdida: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = PALETTE[status] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}
