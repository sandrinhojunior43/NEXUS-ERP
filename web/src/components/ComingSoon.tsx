export function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--nx-border)] bg-[var(--nx-surface)] px-6 py-20 text-center">
      <div className="text-3xl">🚧</div>
      <h2 className="mt-3 text-lg font-semibold text-[var(--nx-text)]">{label} — em construção</h2>
      <p className="mt-2 max-w-md text-sm text-[var(--nx-text-muted)]">
        Este módulo já existe no protótipo original e tem tabela própria no banco, mas ainda não foi
        portado para esta interface. Veja o roadmap em <code>NEXUS_ROADMAP.md</code> para a ordem de
        implementação.
      </p>
    </div>
  );
}
