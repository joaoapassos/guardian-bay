export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-panel border border-line bg-surface px-5 py-10 text-center sm:px-8">
      <h2 className="font-editorial text-2xl text-coast">{title}</h2>
      <div className="mx-auto mt-4 max-w-lg space-y-4 text-muted">
        {children}
      </div>
    </section>
  );
}
