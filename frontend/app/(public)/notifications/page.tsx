"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useNotifications } from "@/lib/notification/queries/useNotifications";
import { useUnreadNotificationCount } from "@/lib/notification/queries/useUnreadNotificationCount";
import { useMarkAllNotificationsRead } from "@/lib/notification/mutations/useMarkAllNotificationsRead";
import { useRequireAuth } from "@/lib/auth/guards/useRequireAuth";
import { getErrorMessage } from "@/lib/api-error";
import { routes } from "@/lib/routes";
import { NotificationList } from "./_components/notification-list";

const PER_PAGE = 15;

export default function NotificationsPage() {
  return (
    <Suspense fallback={null}>
      <NotificationsPageContent />
    </Suspense>
  );
}

function NotificationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isChecking } = useRequireAuth();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const { data, isPending, isError, refetch } = useNotifications(page, PER_PAGE);
  const { data: unreadCount } = useUnreadNotificationCount();
  const markAllRead = useMarkAllNotificationsRead();

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(next));
    }
    const query = params.toString();
    router.replace(query ? `${routes.notifications}?${query}` : routes.notifications, { scroll: false });
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  if (isChecking) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">การแจ้งเตือน</h1>
        {(unreadCount ?? 0) > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markAllRead.isPending}>
            อ่านทั้งหมด
          </Button>
        )}
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">โหลดข้อมูลไม่สำเร็จ</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            ลองใหม่
          </Button>
        </div>
      ) : (
        <NotificationList
          notifications={data?.data ?? []}
          isLoading={isPending}
          currentPage={data?.meta.currentPage ?? page}
          lastPage={data?.meta.lastPage ?? 1}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
