"use client";

import { useTendersProjectDetail } from "@/lib/tender/tender-projects/queries/useTendersProjectDetail";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";

export function useTenderProjectDetailPage(id: number) {
    const isValidId = Number.isFinite(id) && id > 0;
    const { data: project, isPending, isError } = useTendersProjectDetail(id);
    const notFound = !isValidId || (isError && !project) || (!isPending && !project);

    useBreadcrumb([
        { label: "จัดการโครงการจัดซื้อจัดจ้าง", href: routes.dashboards.tender_project.index },
        isValidId && isPending ? { loading: true } : { label: project?.name ?? "ไม่พบข้อมูล" },
    ]);

    return { project, isValidId, isPending, notFound };
}
