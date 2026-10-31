"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, MoreVertical, Pencil, Phone, Trash2, UserRound } from "lucide-react";
import type { InternalProfile } from "@/lib/internal-profiles/types";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/lib/auth/queries/useUser";
import { routes } from "@/lib/routes";
import DeleteInternalProfileDialog from "../dialogs/delete-internal-profile-dialog";
import EditInternalProfileDialog from "../dialogs/edit-internal-profile-dialog";

const ACTION_CLASS = "h-10 flex-1 gap-2 rounded-lg bg-white text-[13px] font-semibold";

// อักษรตัวแรกของชื่อ ข้ามสระหน้า (เ แ โ ใ ไ) ให้ได้พยัญชนะ เช่น "เกศินี" → "ก"
function getThaiInitial(name: string) {
    return name.trim().replace(/^[เแโใไ]/, "").charAt(0) || "?";
}

// การ์ดที่ใช้แทนแถวตารางบนจอเล็กกว่า xl (ส่งเข้า DataTable ผ่าน renderMobileCard)
export function InternalProfileCard({ profile }: { profile: InternalProfile }) {
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const { data: currentUser } = useUser();
    const isSelf = currentUser?.id === profile.userId;

    return (
        <article className="flex flex-col gap-3.5 rounded-2xl border bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2">
                <span className="rounded-md border border-dashed border-gray-300 px-2 py-0.5 font-mono text-xs font-semibold tracking-wider text-gray-700">
                    {profile.employeeNo || "-"}
                </span>

                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={<Button variant="ghost" aria-label="ตัวเลือกของพนักงาน" className="-mr-2 size-9 shrink-0" />}
                    >
                        <MoreVertical className="size-4.5 text-gray-500" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setEditOpen(true)}>
                            <Pencil />
                            แก้ไข
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" disabled={isSelf} onClick={() => setDeleteOpen(true)}>
                            <Trash2 />
                            {isSelf ? "ลบบัญชีตัวเองไม่ได้" : "ลบ"}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="flex items-center gap-3.5">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-red-700 text-xl font-bold text-white">
                    {getThaiInitial(profile.firstname)}
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="truncate text-base font-bold">
                        {profile.prefix}
                        {profile.firstname} {profile.lastname}
                    </p>
                    <p className="truncate text-sm font-semibold text-red-700">
                        {profile.position?.name ?? "ยังไม่ระบุตำแหน่ง"}
                    </p>
                    <p className="flex min-w-0 items-center gap-1.5 text-xs text-gray-600">
                        <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{profile.department?.name ?? "ยังไม่ระบุแผนก"}</span>
                    </p>
                </div>
            </div>

            <div className="flex gap-2">
                {profile.phone ? (
                    // แตะแล้วโทรออกได้บนมือถือ
                    <Button
                        variant="outline"
                        render={<a href={`tel:${profile.phone.replace(/\D/g, "")}`} />}
                        nativeButton={false}
                        aria-label={`โทร ${profile.phone}`}
                        className={ACTION_CLASS}
                    >
                        <Phone className="size-4 text-red-700" aria-hidden="true" />
                        {profile.phone}
                    </Button>
                ) : (
                    <Button variant="outline" disabled className={ACTION_CLASS}>
                        <Phone className="size-4" aria-hidden="true" />
                        ไม่มีเบอร์โทร
                    </Button>
                )}

                {typeof profile.userId === "number" && (
                    <Button
                        variant="outline"
                        render={<Link href={routes.dashboards.user.detail(profile.userId)} />}
                        nativeButton={false}
                        className={ACTION_CLASS}
                    >
                        <UserRound className="size-4 text-gray-500" aria-hidden="true" />
                        ดูบัญชีผู้ใช้
                    </Button>
                )}
            </div>

            <EditInternalProfileDialog id={profile.id} open={editOpen} onOpenChange={setEditOpen} />
            <DeleteInternalProfileDialog internal_profile={profile} open={deleteOpen} onOpenChange={setDeleteOpen} />
        </article>
    );
}
