# Internal Dashboard Page + Route Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/dashboard` route for internal users only — a sidebar-based placeholder page, gated by a new client-side guard that redirects non-internal/logged-out visitors away, without touching the existing `/profiles` guard.

**Architecture:** A new `useRequireInternal` hook (mirrors the existing `useRequireAuth` hook's shape exactly, adding a `userType === "internal"` check) backs a new `InternalGuard` component (mirrors the existing `AuthGuard`). A new `AppSidebar` component is built on the shadcn sidebar primitives already added to this project (`components/ui/sidebar.tsx`). `app/dashboard/layout.tsx` composes `InternalGuard` → `SidebarProvider` → `AppSidebar` + `SidebarInset`, and `app/dashboard/page.tsx` is a placeholder welcome page.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5 (strict), `@base-ui/react` (this codebase's actual headless-UI base — **not** Radix, despite the shadcn-style file layout), `@tanstack/react-query` (`useUser`), `lucide-react` icons. No test runner configured in this repo — verification is `tsc --noEmit`, `eslint`, `next build`, and manual checks via `npm run dev`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-27-internal-dashboard-and-guard-design.md`.
- **One-way guard only.** `/dashboard` is gated to `userType === "internal"`. Do **not** modify `app/(public)/profiles/_components/auth-guard.tsx`, `lib/auth/useRequireAuth.ts`, or anything under `/profiles` — internal users keep unrestricted access there, exactly as today. This was an explicit, confirmed user decision — do not "fix" this into a two-way guard.
- **Placeholder content only.** `app/dashboard/page.tsx` shows a welcome heading and one line of text — no widgets, stats, tables, or data-fetching beyond `useUser()`.
- **No red top `Navbar` on `/dashboard`.** This route's shell is sidebar-only (`AppSidebar` + a slim header containing just a `SidebarTrigger` and the page title) — confirmed user choice, not an oversight.
- **Client-side protection only** — do not add a `middleware.ts` or any server-side redirect. This app has no middleware anywhere today; that's a separate, larger decision, explicitly out of scope.
- **No backend changes** of any kind for this plan.
- File paths below are relative to `frontend/` (repo root `D:\E-Procurement-System`, `frontend/`/`backend/` are siblings). You are on git branch `Internal`.
- Verify TypeScript with `npx tsc --noEmit` from `frontend/`. Baseline on this branch (confirmed 2026-07-27): 8 pre-existing, unrelated errors — 2x `app/(auth)/reset-password/_components/reset-password-view.tsx` (`TS2339`), 6x `lib/auth/permissions.ts` (`TS2345`). Confirm no *new* errors after each task.
- Verify lint with `npm run lint` from `frontend/`. Baseline on this branch (confirmed 2026-07-27, note this is **9**, not 8 — one more than earlier plans on the `vendor` branch): 2x `react/no-unescaped-entities` in `components/legal/privacy-content.tsx`, 6x in `components/legal/terms-content.tsx`, and 1x `react-hooks/set-state-in-effect` in `hooks/use-mobile.ts:14` (a file the user added alongside the shadcn sidebar primitive, pre-existing on this branch, not something this plan introduces or should fix). Confirm no *new* errors beyond these 9 after each task.
- Do **not** touch the pre-existing `[LOGOUT-DEBUG]` `console.log` statements in `lib/auth/useRequireAuth.ts` or `lib/auth/mutations.ts` — unrelated, active debugging from a parallel session on this same branch.
- `getInitials` (from `@/lib/utils`), `Spinner` (from `@/components/ui/spinner`), `Separator` (from `@/components/ui/separator`), and all of `components/ui/sidebar.tsx`'s exports (`Sidebar`, `SidebarContent`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupContent`, `SidebarHeader`, `SidebarInset`, `SidebarMenu`, `SidebarMenuButton`, `SidebarMenuItem`, `SidebarProvider`, `SidebarTrigger`) already exist and are confirmed exported — no new UI primitives need to be created by this plan.

---

### Task 1: `useRequireInternal` hook + `InternalGuard` component

**Files:**
- Create: `lib/auth/useRequireInternal.ts`
- Create: `app/dashboard/_components/internal-guard.tsx`

**Interfaces:**
- Produces (used by Task 3): `export function useRequireInternal(): { isChecking: boolean }` and `export function InternalGuard({ children }: Readonly<{ children: React.ReactNode }>): JSX.Element`.
- Consumes: `useUser()` from `@/lib/auth/useUser` (returns `{ data: CurrentUser | null | undefined, isPending: boolean, ... }`, existing), `routes` from `@/lib/routes` (existing, has `routes.auth.login`, `routes.profiles.profile`), `Spinner` from `@/components/ui/spinner` (existing).

- [ ] **Step 1: Create `lib/auth/useRequireInternal.ts`**

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

- [ ] **Step 2: Create `app/dashboard/_components/internal-guard.tsx`**

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

- [ ] **Step 3: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing baseline errors listed in Global Constraints, nothing new. Neither new file is imported anywhere yet, which is not a type error (unused exports aren't flagged — no `noUnusedLocals` in `tsconfig.json`).

- [ ] **Step 4: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 9 pre-existing baseline errors listed in Global Constraints (note: 9, not 8, on this branch), nothing new from either new file.

- [ ] **Step 5: Commit**

```bash
git add "lib/auth/useRequireInternal.ts" "app/dashboard/_components/internal-guard.tsx"
git commit -m "feat(dashboard): add internal-user route guard"
```

---

### Task 2: `AppSidebar` component

**Files:**
- Create: `app/dashboard/_components/app-sidebar.tsx`

**Interfaces:**
- Produces (used by Task 3): `export function AppSidebar(): JSX.Element` — a `<Sidebar>` with no props, reading the current user and route internally.
- Consumes: `useUser()` (`@/lib/auth/useUser`, existing), `useLogout()` (`@/lib/auth/mutations`, existing, `mutate(undefined, { onSuccess })` shape), `getInitials` (`@/lib/utils`, existing), `routes` (`@/lib/routes`, existing, `routes.dashboards.dashboard` and `routes.home`), and the sidebar primitives from `@/components/ui/sidebar` (existing, listed in Global Constraints).

- [ ] **Step 1: Create `app/dashboard/_components/app-sidebar.tsx`**

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

- [ ] **Step 2: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing baseline errors, nothing new. This is where a mismatched prop name against `components/ui/sidebar.tsx`'s actual exports (e.g. `SidebarMenuButton`'s `render`/`isActive` props) would surface.

- [ ] **Step 3: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 9 pre-existing baseline errors (see Global Constraints), nothing new.

- [ ] **Step 4: Commit**

```bash
git add "app/dashboard/_components/app-sidebar.tsx"
git commit -m "feat(dashboard): add AppSidebar navigation component"
```

---

### Task 3: `app/dashboard/layout.tsx` + `app/dashboard/page.tsx` (wires the route together)

**Files:**
- Create: `app/dashboard/layout.tsx`
- Create: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `InternalGuard` from `./_components/internal-guard` (Task 1), `AppSidebar` from `./_components/app-sidebar` (Task 2), `SidebarProvider`/`SidebarInset`/`SidebarTrigger` from `@/components/ui/sidebar` (existing), `Separator` from `@/components/ui/separator` (existing), `useUser` from `@/lib/auth/useUser` (existing).

- [ ] **Step 1: Create `app/dashboard/layout.tsx`**

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

- [ ] **Step 2: Create `app/dashboard/page.tsx`**

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

- [ ] **Step 3: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 4: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 9 pre-existing baseline errors, nothing new.

- [ ] **Step 5: Build**

Run (from `frontend/`): `npm run build`
Expected: Turbopack's compile phase succeeds — this is real evidence the new route compiles and bundles correctly. The overall command may still exit non-zero solely due to the pre-existing, unrelated `reset-password-view.tsx` TypeScript error during the build's type-check phase — that's a pre-existing condition on this branch, not a regression this plan introduced. Report the compile-phase result explicitly.

- [ ] **Step 6: Manual verification**

If you have `npm run dev` running and browser/credentials access, verify all of the following (skip and disclose explicitly — do not fabricate — if you lack browser access or test accounts for each `userType`):
1. Log in as an internal user, open the profile-menu link (labeled "แดชบอร์ด" per the earlier navbar change on this branch) — lands on `/dashboard`; sidebar shows the Lotushall header, one active "แดชบอร์ด" menu item, a footer with the user's initials/name and a "ออกจากระบบ" button; header shows "แดชบอร์ด" next to the sidebar toggle; page body shows "ยินดีต้อนรับ, {username}".
2. Log in as a company or individual (vendor) user and navigate directly to `/dashboard` by URL — redirected to `/profiles`, no dashboard content ever visible.
3. Log out entirely and navigate directly to `/dashboard` by URL — redirected to `/login`.
4. From `/dashboard`, click "ออกจากระบบ" in the sidebar footer — logs out and lands on `/` (home).
5. Confirm `/profiles` (and its sub-pages) still work unchanged for an internal user — no new redirect was introduced there.
6. Click the `SidebarTrigger` (the panel icon next to "แดชบอร์ด" in the header) — sidebar collapses/expands.

- [ ] **Step 7: Commit**

```bash
git add "app/dashboard/layout.tsx" "app/dashboard/page.tsx"
git commit -m "feat(dashboard): add /dashboard route with sidebar shell and placeholder page"
```
