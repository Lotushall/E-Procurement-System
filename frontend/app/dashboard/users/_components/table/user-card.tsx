"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { CalendarDays, Mail, MoreVertical, Pencil, Trash2 } from "lucide-react"
import type { UserListItem, UserType } from "@/lib/user/management/types"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserStatusBadge } from "@/components/user-status-badge"
import { UserStatusSelect } from "@/components/user-status-select"
import { routes } from "@/lib/routes"
import { getInitials } from "@/lib/utils"
import { USER_TYPE_ICON, USER_TYPE_LABEL } from "./columns"
import { DeleteUserDialog } from "./delete-user-dialog"

const AVATAR_CLASS: Record<UserType, string> = {
    internal: "bg-red-700",
    company: "bg-blue-700",
    individual: "bg-amber-700",
}

// การ์ดที่ใช้แทนแถวตารางบนจอเล็กกว่า xl (ส่งเข้า DataTable ผ่าน renderMobileCard); สิทธิ์ชุดเดียวกับ createColumns
export function UserCard({
    user,
    canUpdateStatus,
    canUpdateUser,
    canDeleteUser,
    currentUserId,
}: {
    user: UserListItem
    canUpdateStatus: boolean
    canUpdateUser: boolean
    canDeleteUser: boolean
    currentUserId: number | undefined
}) {
    const router = useRouter()
    const [deleteOpen, setDeleteOpen] = useState(false)
    const TypeIcon = USER_TYPE_ICON[user.userType]
    const createdAt = new Date(user.createdAt)
    const isSelf = currentUserId === user.id

    return (
        <article className="flex flex-col gap-3.5 rounded-2xl border bg-white p-4 shadow-xs">
            <div className="flex items-center gap-3">
                <Link href={routes.dashboards.user.detail(user.id)} className="group flex min-w-0 flex-1 items-center gap-3">
                    <div
                        className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold tracking-wider text-white ${AVATAR_CLASS[user.userType]}`}
                    >
                        {getInitials(user.username ?? "")}
                    </div>
                    <div className="flex min-w-0 flex-col">
                        <span className="truncate text-base font-bold capitalize group-hover:underline group-hover:underline-offset-4">
                            {user.username}
                        </span>
                        <span className="truncate text-sm text-muted-foreground">{user.name}</span>
                    </div>
                </Link>

                {(canUpdateUser || canDeleteUser) && (
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button variant="ghost" aria-label={`ตัวเลือกของ ${user.username}`} className="-mr-2 size-10 shrink-0" />
                            }
                        >
                            <MoreVertical className="size-4.5 text-gray-500" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            {canUpdateUser && (
                                <DropdownMenuItem onClick={() => router.push(routes.dashboards.user.edit(user.id))}>
                                    <Pencil />
                                    แก้ไข
                                </DropdownMenuItem>
                            )}
                            {canDeleteUser && (
                                <DropdownMenuItem variant="destructive" disabled={isSelf} onClick={() => setDeleteOpen(true)}>
                                    <Trash2 />
                                    {isSelf ? "ลบบัญชีตัวเองไม่ได้" : "ลบ"}
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold text-gray-700">
                    <TypeIcon className="size-3.5" aria-hidden="true" />
                    {USER_TYPE_LABEL[user.userType]}
                </span>
                {canUpdateStatus ? (
                    <UserStatusSelect id={user.id} status={user.status} />
                ) : (
                    <UserStatusBadge status={user.status} />
                )}
            </div>

            <dl className="grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-2 gap-y-2 text-sm text-gray-700">
                <dt className="text-gray-500">
                    <Mail className="size-4" aria-label="อีเมล" />
                </dt>
                <dd className="truncate">{user.email}</dd>
                <dt className="text-gray-500">
                    <CalendarDays className="size-4" aria-label="วันที่สร้าง" />
                </dt>
                <dd>สร้างเมื่อ {Number.isNaN(createdAt.getTime()) ? "-" : format(createdAt, "dd-MM-yyyy")}</dd>
            </dl>

            {canDeleteUser && (
                <DeleteUserDialog
                    user={user}
                    currentUserId={currentUserId}
                    open={deleteOpen}
                    onOpenChange={setDeleteOpen}
                />
            )}
        </article>
    )
}
