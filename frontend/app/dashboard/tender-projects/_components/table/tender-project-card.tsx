"use client"

import Link from "next/link";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { TenderProjects } from "@/lib/tender/tender-projects/types";
import { formatCurrency } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { TenderProjectStatusBadge } from "@/components/tender-project-status-badge";
import { TenderProjectStatusSelect } from "@/components/tender-project-status-select";
import { Button } from "@/components/ui/button";
import { DeleteTenderProjectDialog } from "../dialogs/delete-tender-project-dialog";
import { EditTenderProjectDialog } from "../dialogs/edit-tender-project-dialog";

function formatPeriod(start?: string, end?: string): string {
    const formatDate = (value: string) => format(new Date(value), "MMM yy", { locale: th });
    if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
    if (start ?? end) return formatDate((start ?? end)!);
    return "ยังไม่กำหนด";
}

// การ์ดที่ใช้แทนแถวตารางบนจอเล็กกว่า xl (ส่งเข้า DataTable ผ่าน renderMobileCard)
export function TenderProjectCard({
    project,
    canUpdateStatus,
}: {
    project: TenderProjects;
    canUpdateStatus: boolean;
}) {
    const detailHref = routes.dashboards.tender_project.detail(project.id);
    const personName =
        project.personInCharge?.firstname && project.personInCharge?.lastname
            ? `${project.personInCharge.firstname} ${project.personInCharge.lastname}`
            : undefined;

    return (
        <article className="flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex flex-col gap-2.5 p-4 pb-3.5">
                <div className="flex items-center justify-between gap-2">
                    {canUpdateStatus ? (
                        <TenderProjectStatusSelect key={project.id} id={project.id} status={project.status} />
                    ) : (
                        <TenderProjectStatusBadge status={project.status} />
                    )}

                    <div className="flex gap-1.5">
                        <EditTenderProjectDialog
                            key={project.id}
                            project={project}
                            trigger={
                                <Button
                                    variant="outline"
                                    aria-label="แก้ไขโครงการ"
                                    className="size-9 rounded-md bg-white"
                                />
                            }
                            triggerChildren={<Pencil className="size-4 text-gray-500" />}
                        />
                        <DeleteTenderProjectDialog
                            tenderProjectId={project.id}
                            displayName={project.name}
                            trigger={
                                <Button
                                    variant="outline"
                                    aria-label="ลบโครงการ"
                                    className="size-9 rounded-md bg-white"
                                />
                            }
                            triggerChildren={<Trash2 className="size-4 text-red-600" />}
                        />
                    </div>
                </div>

                <Link href={detailHref} className="group flex flex-col gap-1">
                    <p className="text-base font-bold leading-relaxed tracking-wide group-hover:underline group-hover:underline-offset-4">
                        {project.name}
                    </p>
                    <p className="text-xs text-gray-600 tracking-wider">
                        <span className="font-semibold text-red-700">{project.projectCode}</span>
                        {" · "}
                        {project.department?.name ?? "-"}
                    </p>
                </Link>

                <div className="flex flex-col gap-0.5 pt-1">
                    <p className="text-xs text-gray-500 tracking-wider">งบประมาณ · ปี {project.fiscalYear}</p>
                    <p className="text-xl font-bold tracking-wide">{formatCurrency(Number(project.budget))}</p>
                </div>
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 border-t bg-gray-50 px-4 py-2.5 text-xs text-gray-600">
                <span className="flex min-w-0 items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[11px] font-bold text-gray-700">
                        {personName?.charAt(0) ?? "–"}
                    </span>
                    <span className="truncate">{personName ?? "ยังไม่มีผู้รับผิดชอบ"}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    {formatPeriod(project.projectStartAt, project.projectEndAt)}
                </span>
            </div>
        </article>
    );
}
