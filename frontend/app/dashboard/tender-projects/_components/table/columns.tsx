"use client"

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { TenderProjects } from "@/lib/tender/tender-projects/types";
import { ColumnDef } from "@tanstack/react-table";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { TenderProjectBudgetAllocation } from "@/components/tender-project-budget-allocation";
import { TenderProjectStatusBadge } from "@/components/tender-project-status-badge";
import { TenderProjectStatusSelect } from "@/components/tender-project-status-select";
import { Button } from "@/components/ui/button";
import { SortableHeader } from "@/components/ui/data-table-sortable-header";
import { routes } from "@/lib/routes";
import { DeleteTenderProjectDialog } from "../dialogs/delete-tender-project-dialog";
import { EditTenderProjectDialog } from "../dialogs/edit-tender-project-dialog";

const HEADER_TEXT_CLASS = "text-sm font-bold text-gray-500";
// ตัด padding/negative margin ของปุ่ม ghost ออก ให้หัวที่ sort ได้กว้างแค่ข้อความ + ไอคอน ไม่ดันตารางจน overflow
const SORTABLE_HEADER_CLASS = `${HEADER_TEXT_CLASS} mx-0 px-0 hover:bg-transparent`;

function ColumnHeader({ label, align }: { label: string; align?: "left" | "center" | "right" }) {
    return <p className={`${HEADER_TEXT_CLASS} ${align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"}`}>{label}</p>;
}

export function createColumns(canUpdateStatus: boolean): ColumnDef<TenderProjects>[] {
    return [
        {
            id: "project_code",
            header: ({ column }) => <SortableHeader column={column} label="รหัสโครงการ" className={SORTABLE_HEADER_CLASS} />,
            accessorFn: (project) => project.projectCode,
            // รหัสและชื่อโครงการเป็นลิงก์ไปหน้า detail แทนปุ่มดูรายละเอียดในคอลัมน์ Actions (ประหยัดความกว้างตาราง)
            cell: ({ getValue, row }) => (
                <Link
                    href={routes.dashboards.tender_project.detail(row.original.id)}
                    className="text-xs text-red-700 font-semibold underline decoration-red-700/30 underline-offset-4 hover:decoration-red-700"
                >
                    {getValue<string>()}
                </Link>
            )
        },
        {
            id: "name",
            header: ({ column }) => <SortableHeader column={column} label="โครงการ / หน่วยงาน" className={SORTABLE_HEADER_CLASS} />,
            accessorFn: (project) => project.name,
            cell: ({ getValue, row }) => (
                <Link
                    href={routes.dashboards.tender_project.detail(row.original.id)}
                    className="group flex flex-col"
                >
                    <p className="text-sm font-semibold tracking-wider leading-6 underline decoration-gray-300 underline-offset-4 group-hover:decoration-current">{getValue<string>()}</p>
                    <p className="text-xs text-gray-600 tracking-wider underline decoration-gray-300 underline-offset-4 group-hover:decoration-current">{row.original.department?.name ?? "-"}</p>
                </Link>
            )
        },
        {
            id: "personInCharge",
            header: () => <ColumnHeader label="ผู้รับผิดชอบ" />,
            accessorFn: (project) =>
                project.personInCharge?.firstname && project.personInCharge?.lastname
                    ? `${project.personInCharge.firstname} ${project.personInCharge.lastname}`
                    : "-",
            cell: ({ getValue }) => (
                <p className="text-sm text-gray-600 tracking-wider">{getValue<string>()}</p>
            ),
        },
        {
            id: "budget",
            header: ({ column }) => <SortableHeader column={column} label="งบประมาณ" align="right" className={SORTABLE_HEADER_CLASS} />,
            accessorFn: (project) => project.budget,
            cell: ({ getValue, row }) => (
                <div className="flex flex-col items-end">
                    <p className="text-sm font-normal tracking-wider">ปีงบประมาณ {row.original.fiscalYear}</p>
                    <p className="text-sm font-bold text-right">{formatCurrency(getValue<number>())}</p>
                </div>
            )
        },
        {
            id: "allocated_budget",
            header: () => <ColumnHeader label="ยอดจัดสรร" />,
            accessorFn: (project) => project.allocatedBudget,
            cell: ({ row }) => (
                <TenderProjectBudgetAllocation
                    budget={row.original.budget}
                    allocatedBudget={row.original.allocatedBudget}
                />
            ),
        },
        {
            id: "project_start_end_date",
            header: () => <ColumnHeader label="ระยะเวลา" />,
            accessorFn: (project) => `${project.projectStartAt ?? ""} - ${project.projectEndAt ?? ""}`,
            cell: ({ row }) => {
                const start = row.original.projectStartAt
                    ? format(new Date(row.original.projectStartAt), "d MMM yyyy", { locale: th })
                    : undefined;
                const end = row.original.projectEndAt
                    ? format(new Date(row.original.projectEndAt), "d MMM yyyy", { locale: th })
                    : undefined;

                return (
                    <p className="text-sm">
                        {start && end ? `${start} - ${end}` : start ?? end ?? "-"}
                    </p>
                );
            },
        },
        {
            id: "tor_count",
            header: () => <ColumnHeader label="TOR" align="center" />,
            accessorFn: (project) => project.torsCount,
            cell: ({ getValue }) => (
                <p className="text-sm text-center">
                    {getValue<number | undefined>() ?? "-"}
                </p>
            ),
        },
        {
            id: "status",
            header: () => <ColumnHeader label="สถานะ" align="center" />,
            accessorFn: (project) => project.status,
            cell: ({ row }) => (
                <div className="flex justify-center">
                    {canUpdateStatus ? (
                        <TenderProjectStatusSelect
                            key={row.original.id}
                            id={row.original.id}
                            status={row.original.status}
                        />
                    ) : (
                        <TenderProjectStatusBadge status={row.original.status} />
                    )}
                </div>
            ),
        },
        {
            id: "actions",
            header: () => <ColumnHeader label="Actions" align="center" />,
            enableHiding: false,
            cell: ({ row }) => (
                <div className="flex justify-center gap-1.5">
                    <EditTenderProjectDialog
                        key={row.original.id}
                        project={row.original}
                        trigger={
                            <Button
                                variant="outline"
                                aria-label="แก้ไขโครงการ"
                                className="size-8 px-1.5 pt-px rounded-md bg-white"
                            />
                        }
                        triggerChildren={<Pencil className="w-4 h-4 text-gray-500" />}
                    />

                    <DeleteTenderProjectDialog
                        tenderProjectId={row.original.id}
                        displayName={row.original.name}
                        trigger={
                            <Button
                                variant="outline"
                                aria-label="ลบโครงการ"
                                className="size-8 px-1.5 pt-px rounded-md bg-white"
                            />
                        }
                        triggerChildren={<Trash2 className="w-4 h-4 text-red-600" />}
                    />
                </div>
            ),
        },
    ];
}
