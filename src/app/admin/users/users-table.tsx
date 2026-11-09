"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { UserActions } from "./user-actions";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  suspended: boolean;
};

export function UsersTable({
  users,
  actorId,
}: {
  users: User[];
  actorId: string;
}) {
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "Usuário",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface font-semibold text-coast"
          >
            {(row.original.name || row.original.email)
              .slice(0, 1)
              .toUpperCase()}
          </span>
          <div>
            <p className="font-semibold">
              {row.original.name || "Nome não informado"}
              {row.original.id === actorId && " (você)"}
            </p>
            <p className="text-muted">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Cadastro",
      cell: ({ row }) => (
        <time dateTime={row.original.createdAt}>
          {new Date(row.original.createdAt).toLocaleDateString("pt-BR", {
            timeZone: "UTC",
          })}
        </time>
      ),
    },
    {
      accessorKey: "role",
      header: "Cargo",
      cell: ({ row }) => (
        <span className="inline-flex rounded-control border border-line px-3 py-1 text-sm">
          {row.original.role === "admin" ? "Administrador" : "Usuário comum"}
        </span>
      ),
    },
    {
      accessorKey: "suspended",
      header: "Status",
      cell: ({ row }) => (row.original.suspended ? "Suspenso" : "Ativo"),
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <UserActions
          id={row.original.id}
          role={row.original.role}
          self={row.original.id === actorId}
          suspended={row.original.suspended}
          label={row.original.name || row.original.email}
        />
      ),
    },
  ];
  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualPagination: true,
  });
  return (
    <>
      <ul className="space-y-3 xl:hidden" aria-label="Usuários cadastrados">
        {users.map((user) => (
          <li
            key={user.id}
            className="admin-panel min-w-0 space-y-4 p-4 sm:p-6"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-semibold">
                  {user.name || "Nome não informado"}
                  {user.id === actorId && " (você)"}
                </p>
                <p className="break-all text-sm text-muted">{user.email}</p>
              </div>
              <div className="shrink-0">
                <UserActions
                  id={user.id}
                  role={user.role}
                  self={user.id === actorId}
                  suspended={user.suspended}
                  label={user.name || user.email}
                />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted">Cadastro</dt>
                <dd className="mt-1">
                  <time dateTime={user.createdAt}>
                    {new Date(user.createdAt).toLocaleDateString("pt-BR", {
                      timeZone: "UTC",
                    })}
                  </time>
                </dd>
              </div>
              <div>
                <dt className="text-muted">Cargo</dt>
                <dd className="mt-1">
                  {user.role === "admin" ? "Administrador" : "Usuário comum"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Status</dt>
                <dd className="mt-1">
                  {user.suspended ? "Suspenso" : "Ativo"}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <div className="admin-panel hidden min-w-0 overflow-x-auto xl:block">
        <table className="w-full min-w-[850px] border-collapse text-left">
          <caption className="sr-only">Usuários cadastrados</caption>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-line">
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className="px-3 py-3 font-semibold"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-4 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
