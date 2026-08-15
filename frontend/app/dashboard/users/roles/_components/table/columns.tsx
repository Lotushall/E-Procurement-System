"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { RoleDetail } from "@/lib/user/management/types"
import { Badge } from "@/components/ui/badge"
import { RoleFormDialog } from "../role-form-dialog"
import { DeleteRoleDialog } from "../delete-role-dialog"

export const columns: ColumnDef<RoleDetail>[] = [
    {
        id: "name",
        header: "ชื่อ Role",
        accessorFn: (role) => role.name,
        cell: ({ getValue }) => <span className="font-bold">{getValue<string>()}</span>,
    },
    {
        id: "permissions",
        header: () => <div className="text-center">Permission</div>,
        accessorFn: (role) => role.permissions?.length ?? 0,
        cell: ({ getValue }) => (
            <div className="flex justify-center">
                <Badge variant="secondary">{getValue<number>()} permissions</Badge>
            </div>
        ),
    },
    {
        id: "userCount",
        header: () => <div className="text-center">จำนวนผู้ใช้</div>,
        accessorFn: (role) => role.userCount,
        cell: ({ getValue }) => (
            <div className="flex justify-center">
                <Badge variant="outline">{getValue<number>()} คน</Badge>
            </div>
        ),
    },
    {
        id: "actions",
        header: () => <div className="text-center mx-auto">Actions</div>,
        enableHiding: false,
        cell: ({ row }) => (
            <div className="flex justify-center gap-1.5">
                <RoleFormDialog role={row.original} />
                <DeleteRoleDialog role={row.original} />
            </div>
        ),
    },
]
