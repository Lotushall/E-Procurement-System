"use client";

import { useTorDetail } from "@/lib/tender/tor/queries/useTorDetail";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";
import { isNotFoundError, isPositiveId } from "@/lib/detail-page";

// 404 จาก API (ไม่มี TOR นี้ หรืออยู่นอกขอบเขตที่ผู้ใช้ดูได้) → notFound, error อื่น → loadFailed
export function useTorDetailPage(id: number) {
  const isValidId = isPositiveId(id);
  const { data: tor, isPending, isError, error } = useTorDetail(id);
  const loadFailed = isValidId && isError && !tor && !isNotFoundError(error);
  const notFound =
    !isValidId || (isError && !tor) || (!isPending && !tor);

  useBreadcrumb([
    {
      label: "การจัดการ TOR",
      href: routes.dashboards.tors.index,
    },
    isValidId && isPending
      ? { loading: true }
      : { label: tor?.title ?? "ไม่พบข้อมูล" },
  ]);

  return { tor, isValidId, isPending, loadFailed, notFound };
}
