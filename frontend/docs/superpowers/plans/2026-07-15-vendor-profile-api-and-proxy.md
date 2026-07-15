# Vendor Profile API Client & Route Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a frontend API client (types, fetch function, react-query hook) for the existing `GET /api/v1/vendor/profile` backend endpoint, and add a Next.js `proxy.ts` that redirects logged-in users away from the auth pages and redirects guests away from `/profiles`.

**Architecture:** Two independent, additive pieces sharing no code with each other. The API client follows the exact three-file pattern already used for auth (`lib/auth/types.ts` → `lib/auth/api.ts` → `lib/auth/useUser.ts`). The proxy is a single root-level `proxy.ts` that reads cookie presence only (no session decryption) and redirects via `NextResponse.redirect`.

**Tech Stack:** Next.js 16.2.10 (App Router, Proxy file convention — NOT `middleware.ts`), TypeScript (strict), axios, @tanstack/react-query v5.

## Global Constraints

- Next.js 16: the file must be named `proxy.ts` (project root, no `src/` dir exists) exporting `proxy` — `middleware.ts`/`export function middleware` is deprecated and will not run.
- `export const config = { matcher: [...] }` in `proxy.ts` must contain literal strings only — referencing imported constants there is not statically analyzable and will be ignored by Next.js.
- Backend resource (`VendorProfileResource::toArray`) uses `whenNotNull()` for `verifiedAt` and `remark` — these keys are **absent** from the JSON when null, not `null`. Model them as optional properties (`verifiedAt?: string`), not `| null`.
- Session cookie name is `e-procurement-system-session` (derived from `APP_NAME="E-Procurement System"` via Laravel's `Str::slug(...).'-session'` default in `backend/config/session.php`).
- No test runner exists in this frontend (no vitest/jest/playwright in `package.json`, no `*.test.ts` files). Do not add one as part of this plan — verify via `npx tsc --noEmit`, `npm run lint`, and (for the proxy) manual `curl` checks against the dev server.
- Path alias `@/*` maps to the frontend project root (see `tsconfig.json`).

---

### Task 1: Rewrite `lib/vendor/types.ts` to match the backend resource

**Files:**
- Modify: `lib/vendor/types.ts` (full replacement)

**Interfaces:**
- Consumes: nothing
- Produces: `VendorVerificationStatus`, `VendorProfileDetail`, `VendorProfile` — exported from `lib/vendor/types.ts`, consumed by Task 2

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `lib/vendor/types.ts` with:

```ts
export type VendorVerificationStatus = "pending" | "approved" | "rejected";

interface VendorCompanyProfileDetail {
  type: "company";
  companyName: string;
  businessRegistrationNo: string;
  branchNo: string;
  businessType: string;
  address: string;
  country: string;
  province: string;
  postalCode: string;
  contactName: string;
  contactPosition: string;
  contactPhone: string;
  contactEmail: string;
  lineId: string;
  otherContact: string | null;
}

interface VendorIndividualProfileDetail {
  type: "individual";
  storeName: string;
  prefix: string;
  firstname: string;
  lastname: string;
  businessType: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  province: string;
  postalCode: string;
  contactName: string;
  lineId: string;
  otherContact: string | null;
}

export type VendorProfileDetail = VendorCompanyProfileDetail | VendorIndividualProfileDetail;

export interface VendorProfile {
  id: number;
  verificationStatus: VendorVerificationStatus;
  verifiedAt?: string;
  remark?: string;
  detail: VendorProfileDetail;
}
```

This removes the old `VendorProfile` (snake_case, DB-shaped), `VendorIndividualDetails`, `VendorCompanyDetails`, and `VendorDocuments` interfaces — none of them matched the actual API response, and nothing in the codebase imports them (confirmed: only `app/(auth)/register/**` references `lib/vendor`, and only for unrelated register-form types).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `lib/vendor/types.ts` or its old exports (if this fails because some other file imports the removed types, open that file, confirm it's unrelated dead code or update it — do not silently re-add the removed interfaces).

- [ ] **Step 3: Commit**

```bash
git add lib/vendor/types.ts
git commit -m "refactor(vendor): align VendorProfile types with backend resource shape"
```

---

### Task 2: Add `lib/vendor/api.ts`

**Files:**
- Create: `lib/vendor/api.ts`

**Interfaces:**
- Consumes: `VendorProfile` from `lib/vendor/types.ts` (Task 1); `api` from `lib/api.ts` (existing, exports a configured axios instance with `withCredentials: true`)
- Produces: `fetchVendorProfile(): Promise<VendorProfile | null>` — exported from `lib/vendor/api.ts`, consumed by Task 3

- [ ] **Step 1: Create the file**

```ts
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import type { VendorProfile } from "@/lib/vendor/types";

export async function fetchVendorProfile(): Promise<VendorProfile | null> {
  try {
    const { data } = await api.get<{ data: VendorProfile }>("/api/v1/vendor/profile");
    return data.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/vendor/api.ts
git commit -m "feat(vendor): add fetchVendorProfile API client"
```

---

### Task 3: Add `lib/vendor/useVendorProfile.ts`

**Files:**
- Create: `lib/vendor/useVendorProfile.ts`

**Interfaces:**
- Consumes: `fetchVendorProfile` from `lib/vendor/api.ts` (Task 2)
- Produces: `useVendorProfile()` hook and `VENDOR_PROFILE_QUERY_KEY` — exported from `lib/vendor/useVendorProfile.ts`, for later use by the (not-yet-built) `/profiles` page UI

- [ ] **Step 1: Create the file**

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchVendorProfile } from "@/lib/vendor/api";

export const VENDOR_PROFILE_QUERY_KEY = ["vendor", "profile"] as const;

export function useVendorProfile() {
  return useQuery({
    queryKey: VENDOR_PROFILE_QUERY_KEY,
    queryFn: fetchVendorProfile,
    retry: false,
  });
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/vendor/useVendorProfile.ts
git commit -m "feat(vendor): add useVendorProfile query hook"
```

---

### Task 4 (REVISED): Add client-side guest/vendor route guards

> **Revision note:** the original Task 4 specified a Next.js `proxy.ts`. Its implementer discovered `next.config.ts` sets `output: "export"` (present since the repo's first commit), under which Next.js unconditionally refuses to run Middleware/Proxy (confirmed via the dev-server error and `node_modules/next/dist/server/lib/router-utils/setup-dev-bundler.js:403-406`). The user confirmed: keep static export, guard routes client-side instead. This replaces the original Task 4 in full — no `proxy.ts` is created.

**Files:**
- Create: `lib/auth/useRequireGuest.ts`
- Create: `lib/auth/useRequireAuth.ts`
- Create: `app/(auth)/_components/guest-guard.tsx`
- Create: `app/(public)/profiles/_components/auth-guard.tsx`
- Modify: `app/(auth)/layout.tsx` (wrap `<AuthCard>` with `<GuestGuard>`)
- Modify: `app/(public)/profiles/layout.tsx` (wrap the returned JSX with `<AuthGuard>`)

**Interfaces:**
- Consumes: `useUser` from `lib/auth/useUser.ts` (existing, returns a react-query `UseQueryResult` with `data: CurrentUser | null | undefined` and `isPending: boolean`); `routes` from `lib/routes.ts` (existing, `routes.home`, `routes.auth.login`); `useRouter` from `next/navigation`
- Produces: `useRequireGuest()` returning `{ isChecking: boolean }`; `useRequireAuth()` returning `{ isChecking: boolean }`; `GuestGuard`/`AuthGuard` React components taking `children: React.ReactNode`

- [ ] **Step 1: Create `lib/auth/useRequireGuest.ts`**

```ts
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/auth/useUser";
import { routes } from "@/lib/routes";

export function useRequireGuest() {
  const router = useRouter();
  const { data: user, isPending } = useUser();

  useEffect(() => {
    if (!isPending && user) {
      router.replace(routes.home);
    }
  }, [isPending, user, router]);

  return { isChecking: isPending || Boolean(user) };
}
```

- [ ] **Step 2: Create `lib/auth/useRequireAuth.ts`**

```ts
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/auth/useUser";
import { routes } from "@/lib/routes";

export function useRequireAuth() {
  const router = useRouter();
  const { data: user, isPending } = useUser();

  useEffect(() => {
    if (!isPending && !user) {
      router.replace(routes.auth.login);
    }
  }, [isPending, user, router]);

  return { isChecking: isPending || !user };
}
```

- [ ] **Step 3: Create `app/(auth)/_components/guest-guard.tsx`**

```tsx
"use client";

import { useRequireGuest } from "@/lib/auth/useRequireGuest";

export function GuestGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const { isChecking } = useRequireGuest();

  if (isChecking) {
    return null;
  }

  return <>{children}</>;
}
```

- [ ] **Step 4: Create `app/(public)/profiles/_components/auth-guard.tsx`**

```tsx
"use client";

import { useRequireAuth } from "@/lib/auth/useRequireAuth";

export function AuthGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const { isChecking } = useRequireAuth();

  if (isChecking) {
    return null;
  }

  return <>{children}</>;
}
```

- [ ] **Step 5: Wire `GuestGuard` into `app/(auth)/layout.tsx`**

The file currently reads:

```tsx
import { AuthCard } from "./_components/auth-card";

export const metadata = {
    title: {
        default: "Lotushall Mining E-Bidding",
        template: "%s | Lotushall Mining E-Bidding",
    },
    description: "Lotushall Mining Tender Management System",
};

export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <AuthCard>{children}</AuthCard>;
}
```

Change only the import and the returned JSX (keep `metadata` and everything else identical):

```tsx
import { AuthCard } from "./_components/auth-card";
import { GuestGuard } from "./_components/guest-guard";

export const metadata = {
    title: {
        default: "Lotushall Mining E-Bidding",
        template: "%s | Lotushall Mining E-Bidding",
    },
    description: "Lotushall Mining Tender Management System",
};

export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <GuestGuard>
            <AuthCard>{children}</AuthCard>
        </GuestGuard>
    );
}
```

- [ ] **Step 6: Wire `AuthGuard` into `app/(public)/profiles/layout.tsx`**

The file currently reads:

```tsx
import { Metadata } from "next";
import Navbar from "./_components/navbar";
import Sidebar from "./_components/sidebar";

export const metadata: Metadata = {
    title: {
        default: "Lotushall Mining E-Bidding",
        template: "%s | Lotushall Mining E-Bidding",
    },
    description: "Lotushall Mining Tender Management System",
};

export default function ProfileLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="max-w-290 mx-auto px-6.2 pt-5.5 pb-25">
            <Navbar />
            <main className="flex gap-5 mt-5">
                <Sidebar />

                <div className="bg-white border border-gray-200 shadow rounded-md p-6 w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
```

Change only the import and the returned JSX (keep `metadata` and everything else identical):

```tsx
import { Metadata } from "next";
import Navbar from "./_components/navbar";
import Sidebar from "./_components/sidebar";
import { AuthGuard } from "./_components/auth-guard";

export const metadata: Metadata = {
    title: {
        default: "Lotushall Mining E-Bidding",
        template: "%s | Lotushall Mining E-Bidding",
    },
    description: "Lotushall Mining Tender Management System",
};

export default function ProfileLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <AuthGuard>
            <div className="max-w-290 mx-auto px-6.2 pt-5.5 pb-25">
                <Navbar />
                <main className="flex gap-5 mt-5">
                    <Sidebar />

                    <div className="bg-white border border-gray-200 shadow rounded-md p-6 w-full">
                        {children}
                    </div>
                </main>
            </div>
        </AuthGuard>
    );
}
```

- [ ] **Step 7: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 8: Start the dev server and sanity-check both route groups still render**

Run: `npm run dev` in the background (check port 3000 isn't already in use by an unrelated process first — if it is, use another port, e.g. `npm run dev -- -p 3100`, and adjust the URLs below accordingly). Wait for `Ready`/`Local: http://localhost:PORT`.

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:PORT/login` — expected `200` (this only confirms the page still renders without a server error; it cannot observe the client-side redirect itself, since that runs after browser hydration and is invisible to a plain HTTP response).

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:PORT/profiles` — expected `200`, same caveat.

Stop the background dev server afterward.

This step is a sanity check only (no 500s, both route groups still compile and render their initial HTML shell) — it is not a substitute for verifying the actual redirect behavior, which requires a real browser. Note this limitation explicitly in the task report rather than claiming the redirect itself was verified.

- [ ] **Step 9: Commit**

```bash
git add lib/auth/useRequireGuest.ts lib/auth/useRequireAuth.ts "app/(auth)/_components/guest-guard.tsx" "app/(auth)/layout.tsx" "app/(public)/profiles/_components/auth-guard.tsx" "app/(public)/profiles/layout.tsx"
git commit -m "feat(auth): add client-side guest/vendor route guards"
```

---

## Self-Review Notes

- Spec coverage: Part 1 (types/api/hook) → Tasks 1–3. Part 2 (client-side route guards, revised from proxy) → Task 4. Error handling (404→null) → Task 2 Step 1. Testing section (no test runner, verify via typecheck/lint/curl-sanity-check, real redirect behavior needs manual browser verification) → applied throughout instead of unit tests.
- No placeholders: every step has literal file contents or literal commands with expected output.
- Type consistency: `VendorProfile`/`VendorProfileDetail` names match across Task 1 (produced) and Task 2 (consumed); `fetchVendorProfile` name and signature match across Task 2 (produced) and Task 3 (consumed); `useRequireGuest`/`useRequireAuth`/`GuestGuard`/`AuthGuard` names match between where they're defined (Steps 1-4) and where they're consumed (Steps 5-6).
