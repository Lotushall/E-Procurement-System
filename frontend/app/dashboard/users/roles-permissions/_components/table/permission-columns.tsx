"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Permission } from "@/lib/user/management/types"
import { Badge } from "@/components/ui/badge"
import { PermissionFormDialog } from "../permission-form-dialog"
import { DeletePermissionDialog } from "../delete-permission-dialog"

export const permissionColumns: ColumnDef<Permission>[] = [
    {
        id: "name",
        header: "ชื่อ Permission",
        accessorFn: (permission) => permission.name,
        cell: ({ getValue }) => <span className="font-bold">{getValue<string>()}</span>,
    },
    {
        id: "label",
        header: "คำอธิบาย",
        accessorFn: (permission) => permission.label,
    },
    {
        id: "group",
        header: () => <div className="text-center">กลุ่ม</div>,
        accessorFn: (permission) => permission.name.split(".")[0],
        cell: ({ getValue }) => (
            <div className="flex justify-center">
                <Badge variant="secondary">{getValue<string>()}</Badge>
            </div>
        ),
    },
    {
        id: "actions",
        header: () => <div className="text-center mx-auto">Actions</div>,
        enableHiding: false,
        cell: ({ row }) => (
            <div className="flex justify-center gap-1.5">
                <PermissionFormDialog permission={row.original} />
                <DeletePermissionDialog permission={row.original} />
            </div>
        ),
    },
]
