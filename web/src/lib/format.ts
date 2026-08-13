export const money = (v: number | null | undefined) =>
  'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const num = (v: number | null | undefined) => (Number(v) || 0).toLocaleString('pt-BR');

export const fmtDate = (d: string | null | undefined) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '—');

export const fmtDateTime = (d: string | null | undefined) =>
  d
    ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

export const today = () => new Date().toISOString().slice(0, 10);
