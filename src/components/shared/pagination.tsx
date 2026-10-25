import Link from "next/link";
export function Pagination({
  page,
  previous,
  next,
  label = "Paginação",
}: {
  page: number;
  previous?: string;
  next?: string;
  label?: string;
}) {
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center justify-center gap-5 py-5 font-auth text-sm"
    >
      {previous && (
        <Link className="auth-link min-h-11 py-3" href={previous}>
          Anterior
        </Link>
      )}
      <span aria-current="page">Página {page}</span>
      {next && (
        <Link className="auth-link min-h-11 py-3" href={next}>
          Próxima
        </Link>
      )}
    </nav>
  );
}
