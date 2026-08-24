"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { InternalProfile } from "@/lib/internal-profiles/types";
import { Button } from "@/components/ui/button";
import { SortableHeader } from "@/components/ui/data-table-sortable-header";
import { routes } from "@/lib/routes";
import DeleteInternalProfileDialog from "../delete-internal-profile-dialog";

export const columns: ColumnDef<InternalProfile>[] = [
    {
        id: "employee_no",
        header: ({ column }) => <SortableHeader column={column} label="รหัสพนักงาน" />,
        accessorFn: (profile) => profile?.employeeNo ?? "-",
        cell: ({ getValue }) => getValue<string>(),
        meta: { className: "w-36" },
    },
    {
        id: "firstname",
        header: ({ column }) => <SortableHeader column={column} label="ชื่อ-นามสกุล" />,
        accessorFn: (profile) => `${profile.prefix}${profile.firstname} ${profile.lastname}`,
        cell: ({ row }) => (
            <div className="flex items-center gap-3">
                <span className="font-bold">
                    {row.original.prefix}
                    {row.original.firstname} {row.original.lastname}
                </span>
            </div>
        ),
    },
    {
        id: "department",
        header: ({ column }) => <SortableHeader column={column} label="แผนก" />,
        accessorFn: (profile) => profile.department?.name ?? "-",
        cell: ({ getValue }) => getValue<string>(),
        meta: { className: "w-40" },
    },
    {
        id: "position",
        header: ({ column }) => <SortableHeader column={column} label="ตำแหน่ง" />,
        accessorFn: (profile) => profile.position?.name ?? "-",
        cell: ({ getValue }) => getValue<string>(),
        meta: { className: "w-40" },
    },
    {
        id: "phone",
        header: "เบอร์โทร",
        enableSorting: false,
        accessorFn: (profile) => profile.phone,
        cell: ({ getValue }) => getValue<string>() || "-",
        meta: { className: "w-36" },
    },
    {
        id: "actions",
        header: () => <div className="text-center mx-auto">Actions</div>,
        enableHiding: false,
        meta: { className: "w-20" },
        cell: ({ row }) => (
            <div className="flex justify-center gap-1.5">
                <Button
                    variant="outline"
                    render={<Link href={routes.dashboards.internal_employees.edit(row.original.id)} />}
                    nativeButton={false}
                    aria-label="แก้ไขพนักงาน"
                    className="size-8 px-1.5 pt-px rounded-md bg-white"
                >
                    <Pencil className="w-4 h-4 text-gray-500" />
                </Button>

                <DeleteInternalProfileDialog internal_profile={row.original} />
            </div>
        ),
    },
];
