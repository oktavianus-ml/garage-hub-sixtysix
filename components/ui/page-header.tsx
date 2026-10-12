export function PageHeader({
  title,
  description,
  example = false,
}: {
  title: string;
  description: string;
  example?: boolean;
}) {
  return (
    <header>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {example ? (
          <span className="rounded-full bg-amber-soft px-2.5 py-1 text-xs font-semibold text-amber">
            Contoh
          </span>
        ) : null}
      </div>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{description}</p>
    </header>
  );
}
