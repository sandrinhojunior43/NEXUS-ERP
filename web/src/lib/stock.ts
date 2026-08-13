import { supabase } from './supabase';

/**
 * Aplica um movimento de estoque: grava o lançamento em `stock_moves` e
 * ajusta (ou cria) o saldo correspondente em `stock_balances`. O agregado
 * em `inventory_items.quantity` é recalculado automaticamente por trigger
 * (ver supabase/migrations/0002_functions.sql).
 *
 * Feito no cliente (sem RPC) porque o volume de escrita concorrente deste
 * protótipo é baixo; para uso com múltiplos operadores simultâneos no mesmo
 * item, migrar esta lógica para uma função Postgres (RPC) evitaria
 * race conditions entre o SELECT e o UPDATE do saldo.
 */
export async function applyStockMove(params: {
  itemId: string;
  warehouseId: string;
  loteId?: string | null;
  type: 'entrada' | 'saida';
  quantity: number;
  refType?: string;
  refCode?: string;
  note?: string;
  createdBy?: string | null;
}) {
  const { itemId, warehouseId, loteId, type, quantity, refType, refCode, note, createdBy } = params;
  if (quantity <= 0) throw new Error('Quantidade deve ser maior que zero.');

  let balanceQuery = supabase.from('stock_balances').select('*').eq('item_id', itemId).eq('warehouse_id', warehouseId);
  balanceQuery = loteId ? balanceQuery.eq('lote_id', loteId) : balanceQuery.is('lote_id', null);
  const { data: existing, error: findErr } = await balanceQuery.maybeSingle();
  if (findErr) throw findErr;

  const delta = type === 'entrada' ? quantity : -quantity;
  const nextQty = (existing?.quantity ?? 0) + delta;
  if (nextQty < 0) throw new Error('Saldo insuficiente para essa saída.');

  if (existing) {
    const { error } = await supabase.from('stock_balances').update({ quantity: nextQty }).eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('stock_balances').insert({ item_id: itemId, warehouse_id: warehouseId, lote_id: loteId ?? null, quantity: nextQty });
    if (error) throw error;
  }

  const { error: moveErr } = await supabase.from('stock_moves').insert({
    item_id: itemId,
    warehouse_id: warehouseId,
    lote_id: loteId ?? null,
    type,
    quantity,
    ref_type: refType ?? 'ajuste',
    ref_code: refCode ?? '',
    note: note ?? '',
    created_by: createdBy ?? null,
  });
  if (moveErr) throw moveErr;
}
