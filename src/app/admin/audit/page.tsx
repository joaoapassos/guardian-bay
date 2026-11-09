import Link from "next/link";
import { readAudit } from "@/features/audit/server/read-audit";
import { auditEventTypes, auditOutcomes } from "@/lib/audit/events";
import { AccessState } from "../_components/access-state";
import { AdminTable } from "../_components/admin-table";

export default async function AuditPage({
  searchParams,
}: PageProps<"/admin/audit">) {
  const result = await readAudit(await searchParams);
  if (!result.success && result.code !== "INVALID_INPUT")
    return <AccessState code={result.code} />;
  if (!result.success)
    return (
      <main id="main-content" tabIndex={-1} className="admin-page">
        <h1>Auditoria</h1>
        <p role="alert">Filtros inválidos.</p>
      </main>
    );
  const pageLink = (page: number) =>
    `/admin/audit?${new URLSearchParams({ ...result.query, page: String(page), limit: String(result.query.limit) })}`;
  return (
    <main id="main-content" tabIndex={-1} className="admin-page">
      <h1>Auditoria</h1>
      <p className="text-muted">
        Eventos selecionados. Consulta administrativa sem edição ou exclusão.
      </p>
      <form
        action="/admin/audit"
        method="get"
        className="admin-panel grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
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
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="admin-action">
            Filtrar auditoria
          </button>
          <Link href="/admin/audit" className="auth-link">
            Limpar
          </Link>
        </div>
      </form>
      {result.events.length === 0 ? (
        <p className="admin-panel">Nenhum evento nesta página.</p>
      ) : (
        <AdminTable
          caption="Eventos de auditoria"
          headers={["Evento", "Data", "Resultado", "Ator", "Recurso"]}
          rows={result.events.map((event) => ({
            id: event.eventId,
            cells: [
              <div key="event" className="min-w-48">
                <p className="font-semibold">{event.eventType}</p>
                <p className="break-all text-sm text-muted">{event.eventId}</p>
              </div>,
              <time key="date" dateTime={event.occurredAt}>
                {new Date(event.occurredAt).toLocaleString("pt-BR", {
                  timeZone: "UTC",
                })}{" "}
                UTC
              </time>,
              <span
                key="outcome"
                className="inline-flex rounded-control border border-line px-3 py-1 text-sm"
              >
                {event.outcome}
              </span>,
              <span key="actor" className="break-all">
                {event.actorUserId ?? "Não identificado"}
              </span>,
              <span key="target" className="break-all">
                {event.targetType ?? "Sem recurso"} {event.targetId}
              </span>,
            ],
          }))}
        />
      )}
      <nav aria-label="Paginação da auditoria" className="flex gap-6">
        {result.query.page > 1 && (
          <Link className="auth-link" href={pageLink(result.query.page - 1)}>
            Anterior
          </Link>
        )}
        {result.hasNext && (
          <Link className="auth-link" href={pageLink(result.query.page + 1)}>
            Próxima
          </Link>
        )}
      </nav>
    </main>
  );
}
