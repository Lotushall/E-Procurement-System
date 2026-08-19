"use client"

import Link from "next/link"
import { format } from "date-fns"
import { Building2, Eye, Pencil, Store, UserRound, type LucideIcon } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import type { UserListItem, UserType } from "@/lib/user/management/types"
import { Button } from "@/components/ui/button"
import { SortableHeader } from "@/components/ui/data-table-sortable-header"
import { UserStatusBadge } from "@/components/user-status-badge"
import { UserStatusSelect } from "@/components/user-status-select"
import { routes } from "@/lib/routes"
import { getInitials } from "@/lib/utils"
import { DeleteUserDialog } from "./delete-user-dialog"

const USER_TYPE_LABEL: Record<UserType, string> = {
    internal: "พนักงานภายใน",
    company: "นิติบุคคล",
    individual: "ร้านค้า",
}

const USER_TYPE_ICON: Record<UserType, LucideIcon> = {
    internal: UserRound,
    company: Building2,
    individual: Store,
}

export function createColumns(
    canUpdateStatus: boolean,
    canUpdateUser: boolean,
    canDeleteUser: boolean,
): ColumnDef<UserListItem>[] {
    return [
        {
            id: "username",
            header: ({ column }) => <SortableHeader column={column} label="ผู้ใช้" />,
            accessorFn: (user) => user.username,
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-8.5 rounded-md bg-red-700 text-white text-xs font-bold tracking-wider">
                        {getInitials(row.original.username ?? "")}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold capitalize">{row.original.username}</span>
                        <span className="text-xs text-muted-foreground">{row.original.name}</span>
                    </div>
                </div>
            ),
        },
        {
            id: "user_type",
            header: "ประเภท",
            enableSorting: false,
            accessorFn: (user) => user.userType,
            cell: ({ getValue }) => {
                const type = getValue<UserType>()
                const Icon = USER_TYPE_ICON[type]
                return (
                    <div className="flex items-center gap-1.5 text-gray-700">
                        <Icon className="size-4 text-muted-foreground" />
                        <span>{USER_TYPE_LABEL[type]}</span>
                    </div>
                )
            },
        },
        {
            id: "email",
            header: ({ column }) => <SortableHeader column={column} label="อีเมล" />,
            accessorFn: (user) => user.email,
            cell: ({ getValue }) => getValue<string>(),
        },
        {
            id: "status",
            header: () => <div className="text-center">สถานะ</div>,
            enableSorting: false,
            accessorFn: (user) => user.status,
            cell: ({ row }) => (
                <div className="flex justify-center">
                    {canUpdateStatus ? (
                        <UserStatusSelect id={row.original.id} status={row.original.status} />
                    ) : (
                        <UserStatusBadge status={row.original.status} />
                    )}
                </div>
            ),
        },
        {
            id: "created_at",
            header: ({ column }) => <SortableHeader column={column} label="วันที่สร้าง" align="center" />,
            accessorFn: (user) => user.createdAt,
            cell: ({ getValue }) => {
                const date = new Date(getValue<string>())
                return (
                    <div className="text-center">
                        {Number.isNaN(date.getTime()) ? "-" : format(date, "dd-MM-yyyy")}
                    </div>
                )
            },
        },
        {
            id: "actions",
            header: () => <div className="text-center mx-auto">Actions</div>,
            enableHiding: false,
            cell: ({ row }) => (
                <div className="flex justify-center gap-1.5">
                    <Button
                        variant="outline"
                        render={<Link href={routes.dashboards.user.detail(row.original.id)} />}
                        nativeButton={false}
                        className="size-8 px-1.5 pt-px rounded-md bg-white"
                    >
                        <Eye className="w-4 h-4 text-gray-500" />
                    </Button>
                    {canUpdateUser && (
                        <Button
                            variant="outline"
                            render={<Link href={routes.dashboards.user.edit(row.original.id)} />}
                            nativeButton={false}
                            aria-label="แก้ไข user"
                            className="size-8 px-1.5 pt-px rounded-md bg-white"
                        >
                            <Pencil className="w-4 h-4 text-gray-500" />
                        </Button>
                    )}
                    {canDeleteUser && <DeleteUserDialog user={row.original} />}
                </div>
            ),
        },
    ]
}
