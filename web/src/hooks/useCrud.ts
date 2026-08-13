import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { TableRowMap } from '../types/database';

type TableName = keyof TableRowMap;

/**
 * Hook genérico de CRUD sobre uma tabela do Supabase, com cache via
 * react-query. Cobre o padrão usado pela maioria dos módulos operacionais:
 * listar, criar, atualizar e remover, com invalidação automática da lista.
 *
 * O client supabase-js aqui é usado sem o generic `Database` (ver
 * src/types/database.ts), então o cast `as TableRowMap[T]` nas respostas é
 * responsabilidade nossa — mantém o restante do app fortemente tipado sem
 * depender do gerador de tipos do Supabase, que exigiria um projeto linkado.
 */
export function useCrud<T extends TableName>(table: T, orderBy = 'created_at') {
  const qc = useQueryClient();
  const queryKey = [table];
  type Row = TableRowMap[T];

  const list = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select('*').order(orderBy, { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  const create = useMutation({
    mutationFn: async (values: Partial<Row>) => {
      // O cast `as any` na entrada é necessário porque `Row` é opaco dentro
      // desta função genérica (T ainda não está resolvido para um literal
      // aqui) — o formato já foi validado pelo tipo `Partial<Row>` do
      // parâmetro; só a saída do Supabase precisa ser re-tipada.
      const { data, error } = await supabase.from(table).insert(values as never).select().single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Row> }) => {
      const { data, error } = await supabase.from(table).update(values as never).eq('id', id).select().single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return { ...list, create, update, remove };
}
