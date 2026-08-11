import type { ReactNode } from 'react';

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12" onClick={onClose}>
      <div
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-xl border border-[var(--nx-border)] bg-[var(--nx-surface)] p-5 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--nx-text)]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--nx-text-muted)] hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block text-sm">
      <span className="mb-1 block font-medium text-[var(--nx-text-muted)]">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full rounded-md border border-[var(--nx-border)] bg-[var(--nx-bg)] px-3 py-1.5 text-sm text-[var(--nx-text)] outline-none focus:border-[var(--nx-accent)]';
