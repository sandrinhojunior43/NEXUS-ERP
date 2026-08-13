export function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'default' | 'warning' | 'danger' }) {
  const toneCls =
    tone === 'danger'
      ? 'text-rose-600 dark:text-rose-400'
      : tone === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-[var(--nx-text)]';
  return (
    <div className="nx-card rounded-xl border border-[var(--nx-border)] bg-[var(--nx-surface)] p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--nx-text-muted)]">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneCls}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-[var(--nx-text-muted)]">{hint}</div>}
    </div>
  );
}
