"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ReactNode } from "react";

type TableRow = { id: string; cells: ReactNode[] };

export function AdminTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: TableRow[];
}) {
  const columns: ColumnDef<TableRow>[] = headers.map((header, index) => ({
    id: `column-${index}`,
    header,
    cell: ({ row }) => row.original.cells[index],
  }));
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualPagination: true,
  });
  return (
    <section className="admin-panel overflow-x-auto" aria-label={caption}>
      <table className="w-full min-w-[700px] border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
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
                <td key={cell.id} className="px-3 py-4 align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
