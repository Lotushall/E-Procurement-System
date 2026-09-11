"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useTenderProjectDetailPage } from "./_hooks/use-tender-project-detail-page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TenderProjectStatusBadge } from "@/components/tender-project-status-badge";
import { TenderProjectStatusSelect } from "@/components/tender-project-status-select";
import { useAuthPermissions } from "@/lib/auth/permissions";
import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";

const formatProjectDate = (value?: string) =>
    value ? format(new Date(value), "d MMM yyyy", { locale: th }) : "-";

function TenderProjectDetailContent() {
    const searchParams = useSearchParams();
    const id = Number(searchParams.get("id"));

    const { project, isValidId, isPending, notFound } = useTenderProjectDetailPage(id);

    const { hasPermission } = useAuthPermissions();
    const canUpdateStatus = hasPermission("tender_projects.updateStatus");

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

    const personInCharge = project.personInCharge?.firstname && project.personInCharge?.lastname
        ? `${project.personInCharge.firstname} ${project.personInCharge.lastname}`
        : "-";

    const summary = [
        { label: "หน่วยงาน", value: project.department?.name ?? "-" },
        { label: "ผู้รับผิดชอบ", value: personInCharge },
        { label: "งบประมาณ", value: `฿${formatCurrency(Number(project.budget))}` },
        { label: "เริ่มโครงการ", value: formatProjectDate(project.projectStartAt) },
        { label: "สิ้นสุดโครงการ", value: formatProjectDate(project.projectEndAt) },
    ];

    return (
        <div className="flex flex-col gap-4.5">
            <Card className="shadow-md shadow-gray-200 border-gray-200">
                <CardHeader className="flex flex-col gap-2.25">
                    <div className="flex items-center gap-2.5 h-fit">
                        <p className="text-xs font-medium text-red-700">{project.projectCode}</p>
                        {canUpdateStatus ? (
                            <TenderProjectStatusSelect key={project.id} id={project.id} status={project.status} />
                        ) : (
                            <TenderProjectStatusBadge status={project.status} />
                        )}
                    </div>
                    <CardTitle className="text-2xl font-semibold">
                        {project.name}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p>{project.description}</p>
                    <Separator className={cn("mb-4.5", project.description && "mt-5")} />
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                        {summary.map((item) => (
                            <div key={item.label} className="flex flex-col gap-1.5">
                                <p className="text-sm font-bold tracking-wide text-gray-500">{item.label}</p>
                                <p className="text-base font-semibold tracking-wider">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-md shadow-gray-200 border-gray-200">
                <CardHeader className="gap-0.5">
                    <CardTitle className="font-bold">TOR ที่เกี่ยวข้อง</CardTitle>
                    <CardDescription>เอกสารข้อกำหนดการจัดซื้อจัดจ้างภายใต้โครงการนี้</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Tor Table</p>
                </CardContent>
            </Card>
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
