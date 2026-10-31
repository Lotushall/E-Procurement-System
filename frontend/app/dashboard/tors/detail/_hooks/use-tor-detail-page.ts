"use client";

import { useTorDetail } from "@/lib/tender/tor/queries/useTorDetail";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";

// 404 จาก API (ไม่มี TOR นี้ หรืออยู่นอกขอบเขตที่ผู้ใช้ดูได้) จะเป็น isError → notFound
export function useTorDetailPage(id: number) {
  const isValidId = Number.isFinite(id) && id > 0;
  const { data: tor, isPending, isError } = useTorDetail(id);
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

  return { tor, isValidId, isPending, notFound };
}
