# Notification Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show real backend notifications (vendor document/profile approved/rejected) in the existing navbar bell dropdown alongside the profile-completeness checklist, plus a dedicated `/notifications` page with pagination, unread badge, and mark-as-read.

**Architecture:** New `lib/notification/` module (types, axios calls, React Query read hooks, mutation hooks with optimistic updates) consumed from two UI surfaces: the existing `NotificationMenu()` in `components/navbar.tsx` (dropdown preview, 5 latest) and a new `app/(public)/notifications/page.tsx` (full paginated history). A shared `useSelectNotification()` hook and `NotificationBody` presentational component keep the mark-as-read + navigate behavior and the row markup identical between both surfaces.

**Tech Stack:** Next.js (App Router, client components), TypeScript, `@tanstack/react-query` v5, `date-fns` v4 (`th` locale), `lucide-react`, shadcn/ui (`@base-ui/react` primitives) — no backend changes in this plan, no test runner in this repo (manual QA only, verified via `tsc`/`lint`).

## Global Constraints

- Backend read-side API (`GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `PATCH /api/v1/notifications/{id}/read`, `PATCH /api/v1/notifications/read-all`) is designed in `docs/superpowers/specs/2026-08-11-notification-center-design.md` but **implemented in a separate backend plan**. Until that lands, these requests will fail — every task below must leave the UI in a working, non-crashing state on request failure (empty/error states), and end-to-end manual verification of real notification data is blocked until the backend plan ships.
- Unread count polls every 3 minutes (`refetchInterval: 3 * 60 * 1000`), no websocket/real-time push.
- Badge on the bell is the real unread number, capped display at `"99+"` above 99; hidden entirely (not "0") when count is 0 or the query errored.
- Mark-as-read fires automatically on row click (no separate "read" affordance), immediately followed by navigation to the type's target route — never blocks navigation on the mutation's network response (optimistic).
- Checklist (profile completeness) and real notifications render in **one** dropdown list, checklist items first, a `DropdownMenuSeparator` between groups when both are non-empty — not tabs, not a second bell.
- `/notifications` lives at `app/(public)/notifications/` (inherits the plain `(public)/layout.tsx` Navbar, not the `profiles` sidebar layout) because every current notification type targets vendor users only; internal-staff notifications are out of scope.
- No automated test runner in this repo — every task's verification step is `npx tsc --noEmit` (compare against the pre-existing baseline below) plus, for the two UI-integration tasks, manual QA in the browser.
- Pre-existing `tsc` baseline (do not try to fix, must not grow): 6 errors, all in `lib/auth/permissions.ts:30,35,40,45,50,55` (`CurrentUser` vs `User` mismatch, unrelated to this feature).

---

### Task 1: Notification types, API client, route, and UI mapping

**Files:**
- Create: `lib/notification/types.ts`
- Create: `lib/notification/api.ts`
- Create: `lib/notification/utils.ts`
- Modify: `lib/routes.ts`

**Interfaces:**
- Produces: `NotificationType`, `NotificationItem`, `PaginatedNotifications` (types.ts); `fetchNotifications(page, perPage)`, `fetchUnreadNotificationCount()`, `markNotificationRead(id)`, `markAllNotificationsRead()` (api.ts); `NOTIFICATION_META` (`Record<NotificationType, { icon, tone, href }>`), `formatNotificationTime(iso)` (utils.ts); `routes.notifications` (`"/notifications"`). All consumed by Tasks 2–6.

- [ ] **Step 1: Create `lib/notification/types.ts`**

```ts
export type NotificationType =
  | "vendor_document_approved"
  | "vendor_document_rejected"
  | "vendor_profile_approved"
  | "vendor_profile_rejected";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

export interface PaginatedNotifications {
  data: NotificationItem[];
  meta: NotificationListMeta;
}
```

- [ ] **Step 2: Create `lib/notification/api.ts`**

```ts
import { api } from "@/lib/api";
import type { PaginatedNotifications } from "@/lib/notification/types";

export async function fetchNotifications(
  page: number,
  perPage: number,
): Promise<PaginatedNotifications> {
  const { data } = await api.get<PaginatedNotifications>("/api/v1/notifications", {
    params: { page, per_page: perPage },
  });
  return data;
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const { data } = await api.get<{ data: { count: number } }>(
    "/api/v1/notifications/unread-count",
  );
  return data.data.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/api/v1/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch("/api/v1/notifications/read-all");
}
```

- [ ] **Step 3: Create `lib/notification/utils.ts`**

```tsx
import { CheckCircle2, XCircle, type LucideIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { routes } from "@/lib/routes";
import type { NotificationType } from "@/lib/notification/types";

interface NotificationMeta {
  icon: LucideIcon;
  tone: "success" | "danger";
  href: string;
}

export const NOTIFICATION_META: Record<NotificationType, NotificationMeta> = {
  vendor_document_approved: {
    icon: CheckCircle2,
    tone: "success",
    href: routes.profiles.document,
  },
  vendor_document_rejected: {
    icon: XCircle,
    tone: "danger",
    href: routes.profiles.document,
  },
  vendor_profile_approved: {
    icon: CheckCircle2,
    tone: "success",
    href: routes.profiles.profile,
  },
  vendor_profile_rejected: {
    icon: XCircle,
    tone: "danger",
    href: routes.profiles.profile,
  },
};

export function formatNotificationTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: th });
}
```

- [ ] **Step 4: Add the `/notifications` route to `lib/routes.ts`**

Find:

```ts
export const routes = {
  home: "/",
  profiles: {
```

Replace with:

```ts
export const routes = {
  home: "/",
  notifications: "/notifications",
  profiles: {
```

- [ ] **Step 5: Run `tsc` to confirm no new errors**

Run from `frontend/`: `npx tsc --noEmit`

Expected: only the 6 pre-existing `lib/auth/permissions.ts` errors from Global Constraints — nothing new. These 3 new files have no consumers yet, so this is a pure syntax/type check.

- [ ] **Step 6: Commit**

```bash
cd frontend
git add lib/notification/types.ts lib/notification/api.ts lib/notification/utils.ts lib/routes.ts
git commit -m "feat(notification): add notification types, API client, and type-to-UI mapping"
```

---

### Task 2: Read hooks (unread count + paginated list)

**Files:**
- Create: `lib/notification/queries/useUnreadNotificationCount.ts`
- Create: `lib/notification/queries/useNotifications.ts`

**Interfaces:**
- Consumes: `fetchUnreadNotificationCount`, `fetchNotifications` from `lib/notification/api.ts` (Task 1).
- Produces: `NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY` (readonly tuple `["notifications", "unread-count"]`) and `useUnreadNotificationCount()` returning a `UseQueryResult<number>`; `useNotifications(page, perPage)` returning `UseQueryResult<PaginatedNotifications>` with query key `["notifications", "list", page, perPage]`. Both consumed by Tasks 3, 5, 6.

- [ ] **Step 1: Create `lib/notification/queries/useUnreadNotificationCount.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchUnreadNotificationCount } from "@/lib/notification/api";

export const NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY = ["notifications", "unread-count"] as const;

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
    queryFn: fetchUnreadNotificationCount,
    refetchInterval: 3 * 60 * 1000,
    retry: false,
  });
}
```

`retry: false` matches the design spec's error handling: if this endpoint fails, fail once and stay quiet (no badge) rather than hammering it with retries.

- [ ] **Step 2: Create `lib/notification/queries/useNotifications.ts`**

```ts
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "@/lib/notification/api";

export function useNotifications(page: number, perPage: number) {
  return useQuery({
    queryKey: ["notifications", "list", page, perPage],
    queryFn: () => fetchNotifications(page, perPage),
    placeholderData: keepPreviousData,
  });
}
```

`keepPreviousData` avoids a skeleton flash when paging (matches `useVendorList`'s existing pattern in `lib/vendor/approval/queries/useVendorList.ts`).

- [ ] **Step 3: Run `tsc`**

Run from `frontend/`: `npx tsc --noEmit`

Expected: same 6 pre-existing baseline errors, nothing new.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add lib/notification/queries/useUnreadNotificationCount.ts lib/notification/queries/useNotifications.ts
git commit -m "feat(notification): add unread-count and paginated-list read hooks"
```

---

### Task 3: Mutations + shared select handler

**Files:**
- Create: `lib/notification/mutations/useMarkNotificationRead.ts`
- Create: `lib/notification/mutations/useMarkAllNotificationsRead.ts`
- Create: `lib/notification/useSelectNotification.ts`

**Interfaces:**
- Consumes: `markNotificationRead`, `markAllNotificationsRead` (Task 1 `api.ts`); `NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY` (Task 2); `PaginatedNotifications`, `NotificationItem` (Task 1 `types.ts`); `NOTIFICATION_META` (Task 1 `utils.ts`).
- Produces: `useMarkNotificationRead()` → `UseMutationResult<void, unknown, string>` (mutate with notification `id`); `useMarkAllNotificationsRead()` → `UseMutationResult<void, unknown, void>`; `useSelectNotification()` → returns a `(notification: NotificationItem) => void` function that marks-read-if-unread and navigates. Consumed by Tasks 5, 6.

- [ ] **Step 1: Create `lib/notification/mutations/useMarkNotificationRead.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markNotificationRead } from "@/lib/notification/api";
import { NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY } from "@/lib/notification/queries/useUnreadNotificationCount";
import type { PaginatedNotifications } from "@/lib/notification/types";

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousLists = queryClient.getQueriesData<PaginatedNotifications>({
        queryKey: ["notifications", "list"],
      });
      const previousCount = queryClient.getQueryData<number>(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY);

      let wasUnread = false;
      queryClient.setQueriesData<PaginatedNotifications>(
        { queryKey: ["notifications", "list"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((item) => {
              if (item.id !== id) return item;
              if (item.readAt === null) wasUnread = true;
              return { ...item, readAt: new Date().toISOString() };
            }),
          };
        },
      );

      if (wasUnread) {
        queryClient.setQueryData<number>(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY, (old) =>
          Math.max(0, (old ?? 1) - 1),
        );
      }

      return { previousLists, previousCount };
    },
    onError: (_error, _id, context) => {
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (context) {
        queryClient.setQueryData(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY, context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
```

- [ ] **Step 2: Create `lib/notification/mutations/useMarkAllNotificationsRead.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markAllNotificationsRead } from "@/lib/notification/api";
import { NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY } from "@/lib/notification/queries/useUnreadNotificationCount";
import type { PaginatedNotifications } from "@/lib/notification/types";

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousLists = queryClient.getQueriesData<PaginatedNotifications>({
        queryKey: ["notifications", "list"],
      });
      const previousCount = queryClient.getQueryData<number>(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY);

      const now = new Date().toISOString();
      queryClient.setQueriesData<PaginatedNotifications>(
        { queryKey: ["notifications", "list"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((item) => (item.readAt === null ? { ...item, readAt: now } : item)),
          };
        },
      );
      queryClient.setQueryData<number>(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY, 0);

      return { previousLists, previousCount };
    },
    onError: (_error, _vars, context) => {
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (context) {
        queryClient.setQueryData(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY, context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
```

- [ ] **Step 3: Create `lib/notification/useSelectNotification.ts`**

```ts
"use client";

import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { NOTIFICATION_META } from "@/lib/notification/utils";
import { useMarkNotificationRead } from "@/lib/notification/mutations/useMarkNotificationRead";
import type { NotificationItem } from "@/lib/notification/types";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function useSelectNotification() {
  const router = useRouter();
  const markRead = useMarkNotificationRead();

  return function selectNotification(notification: NotificationItem): void {
    if (notification.readAt === null) {
      markRead.mutate(notification.id, {
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    }
    router.push(NOTIFICATION_META[notification.type].href);
  };
}
```

This mirrors the existing `getErrorMessage`/`toast.error` pattern used in `app/dashboard/vendors/detail/_hooks/use-vendor-detail-page.ts` — navigation fires immediately (optimistic UI already updated the badge/list), the toast only appears if the background mark-as-read request actually fails.

- [ ] **Step 4: Run `tsc`**

Run from `frontend/`: `npx tsc --noEmit`

Expected: same 6 pre-existing baseline errors, nothing new.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add lib/notification/mutations/useMarkNotificationRead.ts lib/notification/mutations/useMarkAllNotificationsRead.ts lib/notification/useSelectNotification.ts
git commit -m "feat(notification): add mark-as-read mutations with optimistic updates"
```

---

### Task 4: Shared notification row component

**Files:**
- Create: `components/notification-item.tsx`

**Interfaces:**
- Consumes: `NOTIFICATION_META`, `formatNotificationTime` (Task 1 `utils.ts`); `NotificationItem` (Task 1 `types.ts`).
- Produces: `NotificationBody({ notification }: { notification: NotificationItem })` — renders the icon-circle + message + relative-time content only (no outer clickable wrapper, no unread background — callers apply those since the wrapper differs between a `DropdownMenuItem` and a `Card`). Consumed by Tasks 5, 6.

- [ ] **Step 1: Create `components/notification-item.tsx`**

```tsx
import { cn } from "@/lib/utils";
import { NOTIFICATION_META, formatNotificationTime } from "@/lib/notification/utils";
import type { NotificationItem } from "@/lib/notification/types";

export function NotificationBody({ notification }: { notification: NotificationItem }) {
  const meta = NOTIFICATION_META[notification.type];
  const Icon = meta.icon;

  return (
    <>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          meta.tone === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-col">
        <p className="text-sm font-medium leading-tight">{notification.message}</p>
        <p className="text-xs text-muted-foreground">{formatNotificationTime(notification.createdAt)}</p>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Run `tsc`**

Run from `frontend/`: `npx tsc --noEmit`

Expected: same 6 pre-existing baseline errors, nothing new. (Not yet rendered anywhere — visual verification happens in Task 5.)

- [ ] **Step 3: Commit**

```bash
cd frontend
git add components/notification-item.tsx
git commit -m "feat(notification): add shared NotificationBody row component"
```

---

### Task 5: `/notifications` page

**Files:**
- Create: `app/(public)/notifications/page.tsx`
- Create: `app/(public)/notifications/_components/notification-pagination.tsx`
- Create: `app/(public)/notifications/_components/notification-list.tsx`

**Interfaces:**
- Consumes: `useNotifications`, `useUnreadNotificationCount` (Task 2); `useMarkAllNotificationsRead` (Task 3); `useSelectNotification` (Task 3); `NotificationBody` (Task 4); `NotificationItem` (Task 1 `types.ts`).
- Produces: the `/notifications` route (`routes.notifications`, added in Task 1) — a working page. Nothing here is consumed by later tasks except the route existing, which Task 6's "ดูทั้งหมด" link points at.

- [ ] **Step 1: Create `app/(public)/notifications/_components/notification-pagination.tsx`**

```tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationPaginationProps {
  currentPage: number;
  lastPage: number;
  onPageChange: (page: number) => void;
}

export function NotificationPagination({
  currentPage,
  lastPage,
  onPageChange,
}: NotificationPaginationProps) {
  if (lastPage <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        <ChevronLeft />
        ก่อนหน้า
      </Button>

      <p className="text-sm text-muted-foreground">
        หน้า {currentPage} จาก {lastPage}
      </p>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= lastPage}
      >
        ถัดไป
        <ChevronRight />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(public)/notifications/_components/notification-list.tsx`**

```tsx
"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { NotificationBody } from "@/components/notification-item";
import { useSelectNotification } from "@/lib/notification/useSelectNotification";
import type { NotificationItem } from "@/lib/notification/types";
import { NotificationPagination } from "./notification-pagination";

interface NotificationListProps {
  notifications: NotificationItem[];
  isLoading: boolean;
  currentPage: number;
  lastPage: number;
  onPageChange: (page: number) => void;
}

export function NotificationList({
  notifications,
  isLoading,
  currentPage,
  lastPage,
  onPageChange,
}: NotificationListProps) {
  const selectNotification = useSelectNotification();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">ไม่มีการแจ้งเตือน</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            onClick={() => selectNotification(notification)}
            className={cn(
              "cursor-pointer flex-row items-start gap-3 p-4 transition-colors hover:bg-accent",
              notification.readAt === null && "bg-red-50/50",
            )}
          >
            <NotificationBody notification={notification} />
          </Card>
        ))}
      </div>

      <NotificationPagination currentPage={currentPage} lastPage={lastPage} onPageChange={onPageChange} />
    </div>
  );
}
```

- [ ] **Step 3: Create `app/(public)/notifications/page.tsx`**

```tsx
"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/notification/queries/useNotifications";
import { useUnreadNotificationCount } from "@/lib/notification/queries/useUnreadNotificationCount";
import { useMarkAllNotificationsRead } from "@/lib/notification/mutations/useMarkAllNotificationsRead";
import { NotificationList } from "./_components/notification-list";

const PER_PAGE = 15;

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

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
    router.replace(query ? `/notifications?${query}` : "/notifications", { scroll: false });
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

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
```

`useSearchParams()` requires a `<Suspense>` boundary in this Next.js version, same pattern already used in `app/dashboard/vendors/detail/page.tsx` — this file mirrors that split (default export wraps a `*Content` component that actually calls the hook).

- [ ] **Step 4: Run `tsc`**

Run from `frontend/`: `npx tsc --noEmit`

Expected: same 6 pre-existing baseline errors, nothing new.

- [ ] **Step 5: Manual verification**

The backend read-side API may not exist yet (see Global Constraints) — this step verifies the page doesn't crash either way.

1. Start the dev server if not already running: `npm run dev`.
2. Log in as any user (vendor or admin — `admin@example.com` / `password`, or any seeded vendor with `password`).
3. Navigate directly to `http://localhost:3000/notifications` (no nav link yet — that's Task 6).
4. **If the backend endpoints don't exist yet:** confirm the page shows "โหลดข้อมูลไม่สำเร็จ" with a "ลองใหม่" button — it must not crash or show a blank white screen.
5. **If the backend endpoints exist and return data:** confirm notifications render (icon, message, relative time), unread ones have a light red background, clicking one navigates to the mapped page and the item's background clears, "อ่านทั้งหมด" clears all backgrounds, and pagination buttons move between pages when there's more than one page of results.
6. Check both light and dark mode.

- [ ] **Step 6: Commit**

```bash
cd frontend
git add "app/(public)/notifications/page.tsx" "app/(public)/notifications/_components/notification-pagination.tsx" "app/(public)/notifications/_components/notification-list.tsx"
git commit -m "feat(notification): add /notifications page with pagination"
```

---

### Task 6: Wire real notifications into the navbar dropdown

**Files:**
- Modify: `components/navbar.tsx`

**Interfaces:**
- Consumes: `useNotifications`, `useUnreadNotificationCount` (Task 2); `useMarkAllNotificationsRead`, `useSelectNotification` (Task 3); `NotificationBody` (Task 4); `routes.notifications` (Task 1).

- [ ] **Step 1: Add new imports**

Find:

```tsx
import { useVendorProfileCompleteness } from "@/lib/vendor/profile/queries/useVendorProfileCompleteness";
```

Replace with:

```tsx
import { useVendorProfileCompleteness } from "@/lib/vendor/profile/queries/useVendorProfileCompleteness";
import { useNotifications } from "@/lib/notification/queries/useNotifications";
import { useUnreadNotificationCount } from "@/lib/notification/queries/useUnreadNotificationCount";
import { useMarkAllNotificationsRead } from "@/lib/notification/mutations/useMarkAllNotificationsRead";
import { useSelectNotification } from "@/lib/notification/useSelectNotification";
import { NotificationBody } from "@/components/notification-item";
import { isAxiosError } from "axios";
import { toast } from "sonner";
```

- [ ] **Step 2: Replace the body of `NotificationMenu()`**

Find the entire existing function (from `export function NotificationMenu() {` through its closing `}` — the one building the `notifications` array from `useVendorProfileCompleteness` and rendering the single-group dropdown):

```tsx
export function NotificationMenu() {
    const { data: user } = useUser();
    const {
        hasVertifyEmail,
        hasIncompleteAddress,
        hasIncompleteContact,
        hasIncompleteDocument,
    } = useVendorProfileCompleteness();

    const isVendor = user?.userType === "company" || user?.userType === "individual";

    const notifications = isVendor
        ? [
            {
                key: "account",
                icon: <CircleUserRound className="size-4" />,
                label: "ยืนยันอีเมลของคุณ",
                description: "ยืนยันเพื่อใช้งานได้เต็มรูปแบบ",
                href: routes.profiles.profile,
                show: hasVertifyEmail,
            },
            {
                key: "vendor-info",
                icon: <Building2 className="size-4" />,
                label: "กรอกข้อมูลกิจการให้ครบถ้วน",
                description: "ที่อยู่ จังหวัด รหัสไปรษณีย์",
                href: routes.profiles.vendorInfo,
                show: hasIncompleteAddress,
            },
            {
                key: "contact",
                icon: <Users className="size-4" />,
                label: "เพิ่มข้อมูลผู้ติดต่อให้ครบถ้วน",
                description: "ชื่อ อีเมล และเบอร์โทรผู้ติดต่อหลัก",
                href: routes.profiles.contract,
                show: hasIncompleteContact,
            },
            {
                key: "document",
                icon: <FileText className="size-4" />,
                label: "แนบเอกสารประกอบให้ครบถ้วน",
                description: "เอกสารที่จำเป็นสำหรับการขึ้นทะเบียน",
                href: routes.profiles.document,
                show: hasIncompleteDocument,
            },
        ].filter((notification) => notification.show)
        : [];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <button
                        type="button"
                        aria-label="การแจ้งเตือน"
                        className="relative flex items-center justify-center rounded-full p-2 text-muted-foreground cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground"
                    />
                }
            >
                <Bell className="size-5" />
                {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-1.75 h-1.75 rounded-full bg-red-600" />
                )}
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-80 overflow-hidden p-0"
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold tracking-wide">การแจ้งเตือน</p>
                    {notifications.length > 0 && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                            {notifications.length} รายการ
                        </span>
                    )}
                </div>

                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                        <CheckCircle2 className="size-8 text-green-600" />
                        <p className="text-sm text-muted-foreground">ไม่มีการแจ้งเตือนใหม่</p>
                    </div>
                ) : (
                    <div className="p-1">
                        {notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.key}
                                render={<Link href={notification.href} />}
                                className="cursor-pointer items-start gap-3 py-2.5"
                            >
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                                    {notification.icon}
                                </span>
                                <div className="flex min-w-0 flex-col">
                                    <p className="text-sm font-medium leading-tight">{notification.label}</p>
                                    <p className="text-xs text-muted-foreground">{notification.description}</p>
                                </div>
                            </DropdownMenuItem>
                        ))}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
```

Replace with:

```tsx
function getNotificationErrorMessage(error: unknown): string {
    const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
    return message ?? "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function NotificationMenu() {
    const { data: user } = useUser();
    const {
        hasVertifyEmail,
        hasIncompleteAddress,
        hasIncompleteContact,
        hasIncompleteDocument,
    } = useVendorProfileCompleteness();
    const { data: unreadCount } = useUnreadNotificationCount();
    const { data: notificationPage } = useNotifications(1, 5);
    const markAllRead = useMarkAllNotificationsRead();
    const selectNotification = useSelectNotification();
    const badgeCount = unreadCount ?? 0;

    const isVendor = user?.userType === "company" || user?.userType === "individual";

    const checklist = isVendor
        ? [
            {
                key: "account",
                icon: <CircleUserRound className="size-4" />,
                label: "ยืนยันอีเมลของคุณ",
                description: "ยืนยันเพื่อใช้งานได้เต็มรูปแบบ",
                href: routes.profiles.profile,
                show: hasVertifyEmail,
            },
            {
                key: "vendor-info",
                icon: <Building2 className="size-4" />,
                label: "กรอกข้อมูลกิจการให้ครบถ้วน",
                description: "ที่อยู่ จังหวัด รหัสไปรษณีย์",
                href: routes.profiles.vendorInfo,
                show: hasIncompleteAddress,
            },
            {
                key: "contact",
                icon: <Users className="size-4" />,
                label: "เพิ่มข้อมูลผู้ติดต่อให้ครบถ้วน",
                description: "ชื่อ อีเมล และเบอร์โทรผู้ติดต่อหลัก",
                href: routes.profiles.contract,
                show: hasIncompleteContact,
            },
            {
                key: "document",
                icon: <FileText className="size-4" />,
                label: "แนบเอกสารประกอบให้ครบถ้วน",
                description: "เอกสารที่จำเป็นสำหรับการขึ้นทะเบียน",
                href: routes.profiles.document,
                show: hasIncompleteDocument,
            },
        ].filter((notification) => notification.show)
        : [];

    const notifications = notificationPage?.data ?? [];
    const hasAnyItem = checklist.length > 0 || notifications.length > 0;

    const handleMarkAllRead = () => {
        markAllRead.mutate(undefined, {
            onError: (error) => toast.error(getNotificationErrorMessage(error)),
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <button
                        type="button"
                        aria-label="การแจ้งเตือน"
                        className="relative flex items-center justify-center rounded-full p-2 text-muted-foreground cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground"
                    />
                }
            >
                <Bell className="size-5" />
                {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                        {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                )}
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-80 overflow-hidden p-0"
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold tracking-wide">การแจ้งเตือน</p>
                    {badgeCount > 0 && (
                        <button
                            type="button"
                            onClick={handleMarkAllRead}
                            disabled={markAllRead.isPending}
                            className="cursor-pointer text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                        >
                            อ่านทั้งหมด
                        </button>
                    )}
                </div>

                {!hasAnyItem ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                        <CheckCircle2 className="size-8 text-green-600" />
                        <p className="text-sm text-muted-foreground">ไม่มีการแจ้งเตือนใหม่</p>
                    </div>
                ) : (
                    <>
                        {checklist.length > 0 && (
                            <div className="p-1">
                                {checklist.map((notification) => (
                                    <DropdownMenuItem
                                        key={notification.key}
                                        render={<Link href={notification.href} />}
                                        className="cursor-pointer items-start gap-3 py-2.5"
                                    >
                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                                            {notification.icon}
                                        </span>
                                        <div className="flex min-w-0 flex-col">
                                            <p className="text-sm font-medium leading-tight">{notification.label}</p>
                                            <p className="text-xs text-muted-foreground">{notification.description}</p>
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </div>
                        )}

                        {checklist.length > 0 && notifications.length > 0 && <DropdownMenuSeparator />}

                        {notifications.length > 0 && (
                            <div className="p-1">
                                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">การแจ้งเตือนล่าสุด</p>
                                {notifications.map((notification) => (
                                    <DropdownMenuItem
                                        key={notification.id}
                                        onClick={() => selectNotification(notification)}
                                        className={cn(
                                            "cursor-pointer items-start gap-3 py-2.5",
                                            notification.readAt === null && "bg-red-50/50",
                                        )}
                                    >
                                        <NotificationBody notification={notification} />
                                    </DropdownMenuItem>
                                ))}
                            </div>
                        )}
                    </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                    render={<Link href={routes.notifications} />}
                    className="cursor-pointer justify-center py-2 text-sm font-medium text-red-700"
                >
                    ดูทั้งหมด
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
```

`cn` is already imported at the top of this file (`import { cn, getInitials } from "@/lib/utils";`), no new import needed for it.

- [ ] **Step 3: Run `tsc`**

Run from `frontend/`: `npx tsc --noEmit`

Expected: same 6 pre-existing baseline errors, nothing new.

- [ ] **Step 4: Run lint**

Run from `frontend/`: `npm run lint`

Expected: no new warnings/errors introduced by `navbar.tsx`.

- [ ] **Step 5: Manual verification**

1. Start the dev server if not already running: `npm run dev`.
2. Log in as a vendor with an incomplete profile (any fresh registration, or a seeded vendor missing address/contact/documents) — confirm the checklist items still appear in the dropdown exactly as before this change.
3. **If the backend read-side API exists:** trigger a real notification — as admin, approve or reject that vendor's profile or a document — then log back in as the vendor and confirm:
   - The bell shows a numeric badge (not a plain dot).
   - Opening the dropdown shows the checklist group, a divider, then "การแจ้งเตือนล่าสุด" with the new item, newest first.
   - Clicking the notification navigates to `/profiles` or `/profiles/document` (per its type) and the badge count decreases by 1.
   - "อ่านทั้งหมด" appears while unread > 0, clears the badge to 0 when clicked.
   - "ดูทั้งหมด" navigates to `/notifications`.
4. **If the backend read-side API does not exist yet:** confirm the dropdown still works exactly as before (checklist-only) and does not crash or show a broken badge — the `useUnreadNotificationCount`/`useNotifications` failures should be silent (no badge, empty "การแจ้งเตือนล่าสุด" section simply doesn't render).
5. Log in as an internal staff user (`admin@example.com` / `password`) — confirm the bell shows no badge and the dropdown shows the "ไม่มีการแจ้งเตือนใหม่" empty state (staff never has checklist items and currently never receives real notifications either).
6. Check both light and dark mode.

- [ ] **Step 6: Commit**

```bash
cd frontend
git add components/navbar.tsx
git commit -m "feat(notification): merge real notifications into the navbar bell dropdown"
```
