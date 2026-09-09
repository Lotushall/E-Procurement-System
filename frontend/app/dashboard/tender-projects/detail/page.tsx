"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DisabledActionButton } from "@/components/disabled-action-button";
import { TenderProjectStatusBadge } from "@/components/tender-project-status-badge";
import { DeleteTenderProjectDialog } from "../_components/delete-tender-project-dialog";
import { useTenderProjectDetailPage } from "./_hooks/use-tender-project-detail-page";
import { routes } from "@/lib/routes";
import { cn, formatCurrency } from "@/lib/utils";

function InfoItem({
    label,
    value,
    cols,
}: {
    label: string;
    value?: string | null;
    cols?: number;
}) {
    return (
        <div className={cn("flex min-w-0 flex-col gap-1.5", cols === 2 && "sm:col-span-2")}>
            <p className="text-xs md:text-sm tracking-wide text-gray-500">{label}</p>
            <p className="rounded-sm border border-input bg-transparent px-2.5 py-2 text-sm md:text-base font-medium wrap-break-word">
                {value || "-"}
            </p>
        </div>
    );
}

function TenderProjectDetailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = Number(searchParams.get("id"));

    const { project, isValidId, isPending, notFound } = useTenderProjectDetailPage(id);

    if (isValidId && isPending) {
        return (
            <div className="flex justify-center py-12">
                <Spinner className="size-6" />
            </div>
        );
    }

    if (notFound || !project) {
        return (
            <p className="py-12 text-center text-sm text-muted-foreground">
                ไม่พบข้อมูลโครงการนี้
            </p>
        );
    }

    const personInChargeName =
        project.personInCharge?.firstname && project.personInCharge?.lastname
            ? `${project.personInCharge.firstname} ${project.personInCharge.lastname}`
            : undefined;

    const formatDate = (value?: string | null) =>
        value ? format(new Date(value), "d MMM yyyy", { locale: th }) : undefined;
    const periodStart = formatDate(project.projectStartAt);
    const periodEnd = formatDate(project.projectEndAt);
    const period = periodStart && periodEnd ? `${periodStart} - ${periodEnd}` : periodStart ?? periodEnd;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold">{project.name}</h1>
                        <TenderProjectStatusBadge status={project.status} />
                    </div>
                    <p className="text-xs text-red-700 font-semibold">{project.projectCode}</p>
                </div>

                <div className="flex items-center gap-2">
                    <DisabledActionButton icon={Pencil} label="แก้ไข" />
                    <DeleteTenderProjectDialog
                        tenderProjectId={project.id}
                        displayName={project.name}
                        trigger={<Button type="button" variant="destructive" />}
                        triggerChildren="ลบโครงการ"
                        onSuccess={() => router.push(routes.dashboards.tender_project.index)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-md border p-4 sm:grid-cols-2">
                <InfoItem label="แผนก" value={project.department?.name} />
                <InfoItem label="ผู้รับผิดชอบ" value={personInChargeName} />
                <InfoItem label="งบประมาณ" value={formatCurrency(Number(project.budget))} />
                <InfoItem label="ปีงบประมาณ" value={project.fiscalYear} />
                <InfoItem label="วิธีจัดซื้อ" value={project.procurementMethod} />
                <InfoItem label="ผู้สร้างโครงการ" value={project.createdBy?.username} />
                <InfoItem label="ระยะเวลาโครงการ" value={period} cols={2} />
                <InfoItem label="รายละเอียด" value={project.description} cols={2} />
            </div>
        </div>
    );
}

export default function TenderProjectDetailPage() {
    return (
        <Suspense fallback={null}>
            <TenderProjectDetailContent />
        </Suspense>
    );
}
