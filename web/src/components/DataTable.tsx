import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, rows, rowKey, loading, emptyMessage, onRowClick }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--nx-border)]">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-[var(--nx-border)] bg-black/[0.02] dark:bg-white/[0.03]">
            {columns.map((c) => (
              <th key={c.key} className={`px-3 py-2 text-left font-semibold text-[var(--nx-text-muted)] ${c.className ?? ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-[var(--nx-text-muted)]">
                Carregando…
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-[var(--nx-text-muted)]">
                {emptyMessage ?? 'Nenhum registro encontrado.'}
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-[var(--nx-border)] last:border-0 ${
                  onRowClick ? 'cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.04]' : ''
                }`}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2 align-middle ${c.className ?? ''}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
