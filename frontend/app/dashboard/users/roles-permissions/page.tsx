"use client";

import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { useHasPermission } from "@/lib/auth/permissions";
import { useRoles } from "@/lib/user/management/queries/useRoles";
import { routes } from "@/lib/routes";
import { RoleFormDialog } from "./_components/role-form-dialog";
import { columns } from "./_components/table/columns";

export default function RolesPage() {
  useBreadcrumb([
    { label: "จัดการผู้ใช้", href: routes.dashboards.user.index },
    { label: "จัดการ Role" },
  ]);

  const canManageRoles = useHasPermission("roles.manage");
  const { data: roles, isPending, isError } = useRoles();

  const table = useReactTable({
    data: roles ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!canManageRoles) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        ไม่มีสิทธิ์เข้าถึงหน้านี้
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">จัดการ Role</h1>
          <p className="text-sm text-gray-600 tracking-wide">
            กำหนด role และ permission สำหรับพนักงานภายใน
          </p>
        </div>
        <RoleFormDialog />
      </div>

      {isPending ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-6" />
        </div>
      ) : isError ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          ไม่สามารถโหลดข้อมูล role ได้ กรุณาลองใหม่อีกครั้ง
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
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    ยังไม่มี role ในระบบ
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
