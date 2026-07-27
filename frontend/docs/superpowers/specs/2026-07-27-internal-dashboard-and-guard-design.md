# Internal Dashboard Page + Route Protection

## Context

`components/navbar.tsx` already routes internal users to `routes.dashboards.dashboard` (`/dashboard`) from the profile-menu link, and now shows a "แดชบอร์ด" label for them instead of "โปรไฟล์" (see `2026-07-27` navbar commits on this branch). `routes.ts` already reserves `dashboards.dashboard = "/dashboard"`, but no page exists at that route yet, and nothing stops a non-internal user (or a logged-out visitor) from hitting it directly by URL — there's no protection at all today.

Auth gating in this codebase is 100% client-side (confirmed: no `middleware.ts` anywhere in the frontend). The existing precedent is `app/(public)/profiles/_components/auth-guard.tsx` (`AuthGuard`) backed by `lib/auth/useRequireAuth.ts` (`useRequireAuth`): a `useEffect` that calls `router.replace(routes.auth.login)` once `useUser()` settles and there's no user, returning `{ isChecking }` so the wrapping layout can show a loading state instead of a content flash. `AuthGuard` only checks "is anyone logged in" — it has no concept of `userType` today. The mirror-image `GuestGuard`/`useRequireGuest` (for `/login`, `/register`, etc.) follows the identical shape.

`CurrentUser.userType` (`"internal" | "company" | "individual"`) loads atomically with the rest of the user object from `GET /api/v1/auth/user` — there's no intermediate state where `user` exists but `userType` is missing, so a guard can safely branch on it the same way `useRequireAuth` already branches on `!user`.

The user has already added the shadcn "sidebar" primitive block (`components/ui/sidebar.tsx`, `hooks/use-mobile.ts`) to the project, built on `@base-ui/react` (this project's actual headless-UI base, confirmed by its imports of `@base-ui/react/merge-props` / `@base-ui/react/use-render` — not Radix) and on already-existing `components/ui/{button,input,separator,sheet,skeleton,tooltip}.tsx`. `npx tsc --noEmit` / `npm run lint` are both clean at this repo's usual baseline (8 + 8 pre-existing, unrelated errors) with these new files present — no compile issues to work around.

This is the first `userType`-based access rule anywhere in the app (frontend or backend) — there is no existing convention to extend, only the "is logged in" shape to follow.

## Scope decisions (confirmed with user)

- **Guard direction: one-way only.** `/dashboard` is gated to internal users; `/profiles` is **not** touched — it keeps accepting any logged-in user exactly as it does today. (The user explicitly declined the two-way option.)
- **Dashboard content: placeholder only.** No real widgets, stats, or data-fetching — just enough of a page to prove the guard and shell work. Content comes in a later, separate task.
- **Layout: sidebar-only, no red `Navbar`.** `/dashboard` does not reuse the branded top `Navbar` from `/profiles`. It's a standalone admin-shell layout: the new shadcn `Sidebar` on the left, a slim header (just a `SidebarTrigger` + page title) and page content on the right via `SidebarInset`.
- **Protection stays client-side**, matching the existing `AuthGuard`/`GuestGuard` precedent exactly (a brief loading state while `useUser()` resolves, then either render or redirect). No `middleware.ts` is introduced — that would be new infrastructure this codebase doesn't have anywhere yet, out of scope here.
- **No backend changes.** The placeholder page needs no internal-only API data, so there's nothing to protect server-side yet.

## Addendum (post-implementation, 2026-07-27)

Two of the scope decisions above changed after implementation, based on direct feedback once the placeholder was actually visible:

- **Layout reverted to top-bar + sidebar, but with a dashboard-specific navbar, not the shared public one.** The "sidebar-only, no `Navbar`" decision above didn't hold — a top bar was wanted after all, but reusing `components/navbar.tsx`'s default-exported `Navbar` (the marketing-site nav with "หน้าหลัก/ประกาศจัดซื้อจัดจ้าง/ติดต่อเรา" links) was explicitly rejected as the wrong fit. Resolution: `ProfileMenu` and `NotificationMenu` (previously private to `navbar.tsx`) are now exported and reused inside a new `app/dashboard/_components/dashboard-navbar.tsx`, composing `SidebarTrigger` + page title on the left with `NotificationMenu` + `ProfileMenu` on the right. `AppSidebar`'s `SidebarFooter` (Part 3 below) was removed as a result — it duplicated the identity/logout affordance `ProfileMenu` already provides.
- **Sidebar collapses to an icon rail, not off-canvas.** `<Sidebar>` now passes `collapsible="icon"` instead of the primitive's default `"offcanvas"`, so toggling the sidebar shrinks it to icon-only rather than hiding it completely; the header logo stays visible and the nav item picked up a `tooltip` prop for the collapsed state.

Part 3's code block (`AppSidebar`) below reflects the original, pre-addendum version and is **superseded** by the above for the footer/collapsible behavior — kept as-is for the historical record of what Task 2 actually implemented at the time.

## Part 1: `lib/auth/useRequireInternal.ts` (new)

Mirrors `useRequireAuth.ts` exactly in shape, adding one more branch for the wrong-user-type case:

```ts
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/auth/useUser";
import { routes } from "@/lib/routes";

export function useRequireInternal() {
  const router = useRouter();
  const { data: user, isPending } = useUser();

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      router.replace(routes.auth.login);
    } else if (user.userType !== "internal") {
      router.replace(routes.profiles.profile);
    }
  }, [isPending, user, router]);

  const isAuthorized = !isPending && !!user && user.userType === "internal";
  return { isChecking: !isAuthorized };
}
```

`isChecking` is `true` in every state that isn't "confirmed internal user" — pending, logged out, or wrong type — so `InternalGuard` (Part 2) never renders `children` for anyone who's about to be redirected away, same guarantee `useRequireAuth`/`AuthGuard` already give `/profiles`.

## Part 2: `app/dashboard/_components/internal-guard.tsx` (new)

Mirrors `auth-guard.tsx`'s shape. Since the dashboard page itself is a placeholder (Part 5), the loading state is a plain centered `Spinner` (already used elsewhere in this codebase, e.g. `app/(public)/profiles/document/page.tsx`) rather than a bespoke skeleton — there's no real layout shape worth mimicking yet:

```tsx
"use client";

import { useRequireInternal } from "@/lib/auth/useRequireInternal";
import { Spinner } from "@/components/ui/spinner";

export function InternalGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const { isChecking } = useRequireInternal();

  if (isChecking) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return <>{children}</>;
}
```

## Part 3: `app/dashboard/_components/app-sidebar.tsx` (new)

Standard shadcn "app sidebar" composition using the primitives already in `components/ui/sidebar.tsx`. One nav item (Dashboard, active-state driven by `usePathname()`), and a footer row showing the current user plus a logout action — this project has no top `Navbar` on this route, so logout has to live somewhere reachable:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOutIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useUser } from "@/lib/auth/useUser";
import { useLogout } from "@/lib/auth/mutations";
import { getInitials } from "@/lib/utils";
import { routes } from "@/lib/routes";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useUser();
  const logout = useLogout();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Image
            src="/images/icon/lotushall_logo.png"
            alt="Lotushall Logo"
            width={28}
            height={28}
          />
          <span className="text-sm font-bold">Lotushall Mining</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href={routes.dashboards.dashboard} />}
                  isActive={pathname === routes.dashboards.dashboard}
                >
                  <LayoutDashboard />
                  <span>แดชบอร์ด</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-red-700 text-xs font-semibold text-white">
                  {getInitials(user.username)}
                </div>
                <span className="flex-1 truncate text-sm font-medium">
                  {user.username}
                </span>
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() =>
                  logout.mutate(undefined, {
                    onSuccess: () => router.push(routes.home),
                  })
                }
              >
                <LogOutIcon />
                <span>ออกจากระบบ</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
```

`getInitials` already exists in `lib/utils.ts` (used the same way in `navbar.tsx`'s `ProfileMenu`). `useLogout()` takes no payload, matching its existing call site in `navbar.tsx`.

## Part 4: `app/dashboard/layout.tsx` (new)

Composes the guard and the sidebar shell:

```tsx
import type { ReactNode } from "react";
import { InternalGuard } from "./_components/internal-guard";
import { AppSidebar } from "./_components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <InternalGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm font-semibold">แดชบอร์ด</span>
          </header>
          <div className="flex flex-1 flex-col p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </InternalGuard>
  );
}
```

## Part 5: `app/dashboard/page.tsx` (new)

Placeholder content only:

```tsx
"use client";

import { useUser } from "@/lib/auth/useUser";

export default function DashboardPage() {
  const { data: user } = useUser();

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold">
        ยินดีต้อนรับ{user ? `, ${user.username}` : ""}
      </h1>
      <p className="text-sm text-muted-foreground">
        นี่คือหน้าแดชบอร์ดสำหรับผู้ใช้งานภายใน เนื้อหาส่วนนี้จะถูกเพิ่มเติมในภายหลัง
      </p>
    </div>
  );
}
```

## Error handling

Identical shape to the existing `AuthGuard`/`useRequireAuth`: three states collapse to the same `isChecking` boolean (query still pending, no user, or wrong `userType`), so there's exactly one loading branch and exactly one "authorized" branch — no separate error UI for "wrong role" beyond the silent redirect back to `/profiles`, matching how `AuthGuard` silently redirects logged-out users to `/login` today. `useUser()`'s `retry: false` means a network failure surfaces as `user: null` (per `fetchCurrentUser`'s 401-to-null handling), which `useRequireInternal` treats the same as "not logged in" — redirect to `/login`, not a stuck spinner.

## Out of scope

- Any real dashboard widgets, stats, or data-fetching.
- Modifying `AuthGuard`/`useRequireAuth`/`/profiles` in any way — internal users keep full access to `/profiles` exactly as today.
- Server-side/middleware-based protection (`middleware.ts`) — this app has none anywhere yet; introducing one is a separate, larger decision.
- Backend internal-only route/middleware/policy conventions — no data is fetched by the placeholder page, so nothing needs server-side protection yet.
- A dropdown/menu-based user footer (e.g. matching `navbar.tsx`'s `ProfileMenu` dropdown) — the footer here is a plain static row plus one logout button, kept minimal since this is a placeholder shell.
- Cleaning up the pre-existing `[LOGOUT-DEBUG]` `console.log` statements in `lib/auth/useRequireAuth.ts` / `lib/auth/mutations.ts` — unrelated, active debugging from a parallel session on this same branch, not touched by this task.

## Testing

No test runner is configured in this repo. Verification is `tsc --noEmit` / `npm run lint` / `npm run build` plus manual checks via `npm run dev`:

1. Log in as an internal user, click the profile-menu link (now labeled "แดชบอร์ด") — lands on `/dashboard`, sidebar renders with one active "แดชบอร์ด" item, header shows the page title, welcome message shows the username.
2. Log in as a company/individual (vendor) user and navigate directly to `/dashboard` by URL — redirected to `/profiles`, never see dashboard content flash.
3. Log out, navigate directly to `/dashboard` by URL — redirected to `/login`.
4. From `/dashboard`, click the sidebar's "ออกจากระบบ" — logs out and returns to `/` (home), matching `navbar.tsx`'s existing logout behavior.
5. Confirm `/profiles/*` still works unchanged for internal users (no new redirect was added there).
6. Collapse/expand the sidebar via `SidebarTrigger` — confirm it toggles as expected (this is the shadcn primitive's own built-in behavior, just confirming it's wired correctly in this layout).
