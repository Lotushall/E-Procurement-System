"use client";

import { useTendersProjectDetail } from "@/lib/tender/tender-projects/queries/useTendersProjectDetail";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";
import { isNotFoundError, isPositiveId } from "@/lib/detail-page";

export function useTenderProjectDetailPage(id: number) {
  const isValidId = isPositiveId(id);
  const { data: project, isPending, isError, error } = useTendersProjectDetail(id);
  const loadFailed = isValidId && isError && !project && !isNotFoundError(error);
  const notFound =
    !isValidId || (isError && !project) || (!isPending && !project);

  useBreadcrumb([
    {
      label: "จัดการโครงการจัดซื้อจัดจ้าง",
      href: routes.dashboards.tender_project.index,
    },
    isValidId && isPending
      ? { loading: true }
      : { label: project?.name ?? "ไม่พบข้อมูล" },
  ]);

  return { project, isValidId, isPending, loadFailed, notFound };
}
