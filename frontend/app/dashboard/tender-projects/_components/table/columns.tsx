"use client"

import { TenderProjects } from "@/lib/tender/tender-projects/types";
import { ColumnDef } from "@tanstack/react-table";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { TenderProjectStatusBadge } from "@/components/tender-project-status-badge";

function ColumnHeader({ label, align }: { label: string; align?: "left" | "center" | "right" }) {
    return <p className={`text-sm font-bold text-gray-500 ${align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"}`}>{label}</p>;
}

export function createColumns(): ColumnDef<TenderProjects>[] {
    return [
        {
            id: "projectCode",
            header: () => <ColumnHeader label="รหัสโครงการ" />,
            accessorFn: (project) => project.projectCode,
            cell: ({ getValue }) => (
                <p className="text-xs text-red-700 font-semibold">{getValue<string>()}</p>
            )
        },
        {
            id: "name",
            header: () => <ColumnHeader label="โครงการ / หน่วยงาน" />,
            accessorFn: (project) => project.name,
            cell: ({ getValue, row }) => (
                <div className="flex flex-col">
                    <p className="text-sm font-semibold tracking-wider leading-6">{getValue<string>()}</p>
                    <p className="text-xs text-gray-600 tracking-wider">{row.original.department.name}</p>
                </div>
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
            header: () => <ColumnHeader label="งบประมาณ" align="right" />,
            accessorFn: (project) => project.budget,
            cell: ({ getValue, row }) => (
                <div className="flex flex-col items-end">
                    <p className="text-sm font-normal tracking-wider">ปีงบประมาณ {row.original.fiscalYear}</p>
                    <p className="text-sm font-bold text-right">{formatCurrency(getValue<number>())}</p>
                </div>
            )
        },
        {
            id: "project_start_end_date",
            header: () => <ColumnHeader label="ระยะเวลา" />,
            accessorFn: (project) => `${project.projectStartAt} - ${project.projectEndAt}`,
            cell: ({ row }) => (
                <p className="text-sm">
                    {format(new Date(row.original.projectStartAt), "d MMM yyyy", { locale: th })}
                    {" - "}
                    {format(new Date(row.original.projectEndAt), "d MMM yyyy", { locale: th })}
                </p>
            ),
        },
        {
            id: "tor_count",
            header: () => <ColumnHeader label="TOR" align="center" />,
            accessorFn: () => "-",
            cell: () => (
                <p className="text-sm text-center">
                    -
                </p>
            ),
        },
        {
            id: "status",
            header: () => <ColumnHeader label="สถานะ" align="center" />,
            accessorFn: (project) => project.status,
            cell: ({ getValue }) => (
                <div className="flex justify-center">
                    <TenderProjectStatusBadge status={getValue<string>()} />
                </div>
            ),
        },
        {
            id: "actions",
            header: () => <ColumnHeader label="Actions" />,
            accessorFn: () => "Actions BTN",
        },
    ];
}
