"use client"

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2, UserRound } from "lucide-react";
import { TenderProjects } from "@/lib/tender/tender-projects/types";
import { cn, formatCurrency } from "@/lib/utils";
import { routes } from "@/lib/routes";
import {
    isAllocationOverBudget,
    TenderProjectBudgetAllocation,
} from "@/components/tender-project-budget-allocation";
import { TenderProjectPeriod } from "@/components/tender-project-period";
import { TenderProjectStatusBadge } from "@/components/tender-project-status-badge";
import { TenderProjectStatusSelect } from "@/components/tender-project-status-select";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteTenderProjectDialog } from "../dialogs/delete-tender-project-dialog";
import { EditTenderProjectDialog } from "../dialogs/edit-tender-project-dialog";

// การ์ดที่ใช้แทนแถวตารางบนจอเล็กกว่า xl (ส่งเข้า DataTable ผ่าน renderMobileCard)
export function TenderProjectCard({
    project,
    canUpdateStatus,
}: {
    project: TenderProjects;
    canUpdateStatus: boolean;
}) {
    const [editOpen, setEditOpen] = useState(false);
    // เปลี่ยน key ทุกครั้งที่เปิดแก้ไข ให้ฟอร์ม seed ค่าจาก project ล่าสุด
    const [editSession, setEditSession] = useState(0);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const detailHref = routes.dashboards.tender_project.detail(project.id);
    const personName =
        project.personInCharge?.firstname && project.personInCharge?.lastname
            ? `${project.personInCharge.firstname} ${project.personInCharge.lastname}`
            : undefined;
    const isOverBudget = isAllocationOverBudget(project.budget, project.allocatedBudget);

    return (
        <article
            className={cn(
                "flex flex-col gap-4 rounded-2xl border bg-white p-4.5 pb-4 shadow-sm",
                isOverBudget && "border-red-200",
            )}
        >
            <div className="-my-1.5 -mr-2.5 flex items-center justify-between gap-2">
                {canUpdateStatus ? (
                    <TenderProjectStatusSelect key={project.id} id={project.id} status={project.status} />
                ) : (
                    <TenderProjectStatusBadge status={project.status} />
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={<Button variant="ghost" aria-label="ตัวเลือกของโครงการ" className="size-11 shrink-0" />}
                    >
                        <MoreHorizontal className="size-5 text-gray-500" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                            onClick={() => {
                                setEditSession((session) => session + 1);
                                setEditOpen(true);
                            }}
                        >
                            <Pencil />
                            แก้ไข
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                            <Trash2 />
                            ลบ
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <Link href={detailHref} className="group flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-red-700">{project.projectCode}</span>
                <span className="text-[17px] font-bold leading-snug group-hover:underline group-hover:underline-offset-4">
                    {project.name}
                </span>
                <span className="text-[13px] text-gray-600">{project.department?.name ?? "-"}</span>
            </Link>

            <div className="flex flex-col gap-2">
                <div className="flex items-end justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-gray-600">งบประมาณ ปี {project.fiscalYear}</span>
                        <span className="text-[22px] font-bold tracking-wide">฿{formatCurrency(Number(project.budget))}</span>
                    </div>
                    {project.torsCount !== undefined && (
                        <span className="text-[13px] text-gray-600">
                            {project.torsCount > 0 ? `${project.torsCount} TOR` : "ยังไม่มี TOR"}
                        </span>
                    )}
                </div>
                <TenderProjectBudgetAllocation budget={project.budget} allocatedBudget={project.allocatedBudget} />
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 pt-3.5">
                <div className="flex items-center gap-2.5">
                    <UserRound className="size-4 shrink-0 text-gray-600" aria-hidden="true" />
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-xs text-gray-600">ผู้รับผิดชอบ</span>
                        <span className={cn("truncate text-sm", personName ? "font-semibold" : "text-gray-600")}>
                            {personName ?? "ยังไม่มีผู้รับผิดชอบ"}
                        </span>
                    </div>
                </div>
                <TenderProjectPeriod
                    status={project.status}
                    projectStartAt={project.projectStartAt}
                    projectEndAt={project.projectEndAt}
                />
            </div>

            <EditTenderProjectDialog key={editSession} project={project} open={editOpen} onOpenChange={setEditOpen} />
            <DeleteTenderProjectDialog
                tenderProjectId={project.id}
                displayName={project.name}
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
            />
        </article>
    );
}
