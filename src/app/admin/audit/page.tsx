import Link from "next/link";
import { notFound } from "next/navigation";
import { readAudit } from "@/features/audit/server/read-audit";
import { auditEventTypes, auditOutcomes } from "@/lib/audit/events";

export default async function AuditPage({
  searchParams,
}: PageProps<"/admin/audit">) {
  const result = await readAudit(await searchParams);
  if (!result.success && result.code !== "INVALID_INPUT") notFound();
  if (!result.success)
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1>Auditoria</h1>
        <p role="alert">Filtros inválidos.</p>
      </main>
    );
  const pageLink = (page: number) =>
    `/admin/audit?${new URLSearchParams({ ...result.query, page: String(page), limit: String(result.query.limit) })}`;
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-12">
      <h1 className="text-3xl font-semibold">Auditoria</h1>
      <p>
        Eventos selecionados. Consulta administrativa sem edição ou exclusão.
      </p>
      <form action="/admin/audit" method="get" className="flex flex-wrap gap-4">
        <label>
          Evento{" "}
          <select name="eventType" defaultValue={result.query.eventType}>
            <option value="">Todos</option>
            {auditEventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Resultado{" "}
          <select name="outcome" defaultValue={result.query.outcome}>
            <option value="">Todos</option>
            {auditOutcomes.map((outcome) => (
              <option key={outcome}>{outcome}</option>
            ))}
          </select>
        </label>
        <label>
          Ator (UUID){" "}
          <input
            name="actorUserId"
            maxLength={36}
            defaultValue={result.query.actorUserId}
          />
        </label>
        <label>
          Recurso (UUID){" "}
          <input
            name="targetId"
            maxLength={36}
            defaultValue={result.query.targetId}
          />
        </label>
        <label>
          Ordem{" "}
          <select name="sort" defaultValue={result.query.sort}>
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
          </select>
        </label>
        <label>
          Por página{" "}
          <input
            name="limit"
            type="number"
            min={1}
            max={50}
            defaultValue={result.query.limit}
          />
        </label>
        <button type="submit">Filtrar auditoria</button>
      </form>
      {result.events.length === 0 ? (
        <p>Nenhum evento nesta página.</p>
      ) : (
        <ul className="grid gap-4">
          {result.events.map((event) => (
            <li key={event.eventId} className="rounded border p-4">
              <p>
                Evento {event.eventId}: {event.eventType} — {event.outcome}
              </p>
              <p>
                <time dateTime={event.occurredAt}>
                  {new Date(event.occurredAt).toLocaleString("pt-BR", {
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </time>
              </p>
              <p>Ator: {event.actorUserId ?? "Não identificado"}</p>
              <p>
                Recurso: {event.targetType ?? "Sem recurso"} {event.targetId}
              </p>
            </li>
          ))}
        </ul>
      )}
      <nav aria-label="Paginação da auditoria" className="flex gap-6">
        {result.query.page > 1 && (
          <Link href={pageLink(result.query.page - 1)}>Anterior</Link>
        )}
        {result.hasNext && (
          <Link href={pageLink(result.query.page + 1)}>Próxima</Link>
        )}
      </nav>
    </main>
  );
}
