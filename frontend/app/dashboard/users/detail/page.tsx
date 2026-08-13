"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { UserStatusBadge } from "@/components/user-status-badge";
import { useUserDetail } from "@/lib/user/management/queries/useUserDetail";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";
import { getInitials } from "@/lib/utils";

const USER_TYPE_LABEL: Record<"internal" | "company" | "individual", string> = {
  internal: "พนักงานภายใน",
  company: "นิติบุคคล",
  individual: "ร้านค้า",
};

export default function UserDetailPage() {
  return (
    <Suspense fallback={null}>
      <UserDetailContent />
    </Suspense>
  );
}

function UserDetailContent() {
  const searchParams = useSearchParams();
  const userId = Number(searchParams.get("id"));
  const isValidId = Number.isFinite(userId) && userId > 0;

  const { data: user, isPending, isError } = useUserDetail(userId);
  const notFound = !isValidId || (isError && !user) || (!isPending && !user);

  useBreadcrumb([
    { label: "จัดการผู้ใช้", href: routes.dashboards.user.index },
    isValidId && isPending ? { loading: true } : { label: user?.name ?? "ไม่พบข้อมูล" },
  ]);

  if (isValidId && isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        ไม่พบข้อมูลผู้ใช้รายนี้
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-red-700 text-sm font-bold text-white">
            {getInitials(user.name ?? "")}
          </div>

          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-sm text-muted-foreground">
              {user.username} · {user.email}
            </p>
          </div>

          <UserStatusBadge status={user.status} />
        </div>

        {user.vendorProfileId && (
          <Button
            type="button"
            variant="outline"
            render={<Link href={routes.dashboards.vendors.detail(user.vendorProfileId)} />}
          >
            ดูข้อมูลผู้ค้า
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">ประเภทผู้ใช้</span>
          <span className="text-sm font-medium">{USER_TYPE_LABEL[user.userType]}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">วันที่สร้างบัญชี</span>
          <span className="text-sm font-medium">
            {Number.isNaN(new Date(user.createdAt).getTime()) ? "-" : format(new Date(user.createdAt), "dd-MM-yyyy")}
          </span>
        </div>
      </div>
    </div>
  );
}
