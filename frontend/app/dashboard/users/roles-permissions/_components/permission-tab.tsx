"use client";

import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/lib/user/management/queries/usePermissions";
import { PermissionFormDialog } from "./permission-form-dialog";
import { permissionColumns } from "./table/permission-columns";

export function PermissionTab() {
  const { data: permissions, isPending, isError } = usePermissions();

  const sorted = [...(permissions ?? [])].sort(
    (a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name),
  );

  const table = useReactTable({
    data: sorted,
    columns: permissionColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <PermissionFormDialog />
      </div>

      {isPending ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-6" />
        </div>
      ) : isError ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          ไม่สามารถโหลดข้อมูล permission ได้ กรุณาลองใหม่อีกครั้ง
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border shadow-md">
          <Table>
            <TableHeader className="bg-[#F7F8FA]">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="px-4 py-3 font-bold text-gray-600 tracking-wide">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="even:bg-[#F7F8FA] odd:bg-white">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3 text-gray-700">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={permissionColumns.length} className="h-24 text-center">
                    ยังไม่มี permission ในระบบ
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
