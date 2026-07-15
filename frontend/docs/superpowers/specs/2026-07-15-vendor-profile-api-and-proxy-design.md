# Vendor Profile API Client & Route Proxy

## Context

Backend already has a working, tested `GET /api/v1/vendor/profile` endpoint (`VendorController::profile`, `VendorProfileResource`, `VendorProfileTest`), built in a parallel session. The frontend has no consumer for it yet: `lib/vendor/types.ts` exists but describes the raw DB schema (snake_case, flat `VendorIndividualDetails`/`VendorCompanyDetails`/`VendorDocuments` interfaces) rather than the actual JSON the resource returns.

The frontend already has a scaffolded vendor profile area at `app/(public)/profiles` (sidebar with "ข้อมูลบริษัท" / "ผู้ติดต่อ" / "เอกสารประกอบ", route paths `/profiles`, `/profiles/contract`, `/profiles/document` per `lib/routes.ts`), but the pages are empty and there's no route protection.

This spec covers two related pieces:
1. A frontend API client layer for the vendor profile endpoint.
2. Route protection so guests can't reach `/profiles` and logged-in users can't re-enter the auth pages.

Scope explicitly excludes building out the actual profile page UI (company info / contacts / documents display) — that's separate follow-up work.

## Part 1: Vendor Profile API Client

### `lib/vendor/types.ts` (rewrite)

Replace the current snake_case/DB-shaped interfaces entirely with types matching `VendorProfileResource::toArray()`:

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

`verifiedAt` and `remark` are optional properties, not nullable — the backend resource uses `whenNotNull(...)`, which omits the key from the JSON entirely rather than emitting `null`.

`detail.type` acts as the discriminant between the two detail shapes, matching what `VendorProfileResource::detailData()` returns.

### `lib/vendor/api.ts` (new)

Mirrors the existing pattern in `lib/auth/api.ts`:

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

404 (user has no vendor profile — e.g. an `internal` user type) resolves to `null`, consistent with how `fetchCurrentUser` treats 401. Any other error (401, 500, network) propagates.

### `lib/vendor/useVendorProfile.ts` (new)

Mirrors `lib/auth/useUser.ts`:

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

## Part 2: Client-Side Route Guards (revised — see below)

**Revision note:** the original design for this section specified a Next.js `proxy.ts` (the renamed `middleware.ts` convention). During implementation, Task 4's implementer discovered `next.config.ts` sets `output: "export"` (static export), which has set since the repo's first commit. Next.js unconditionally refuses to run Middleware/Proxy under static export — confirmed both by the dev-server error log and by the check in `node_modules/next/dist/server/lib/router-utils/setup-dev-bundler.js:403-406`. A static-exported app has no Node.js/Edge server process at all in production to host a proxy. This was missed during brainstorming (only `package.json`/`tsconfig.json` were checked, not `next.config.ts`).

The user confirmed the project stays statically exported and route protection should be done client-side (CSR) instead. Revised design:

Auth in this project is a Laravel session cookie, checked via the existing `useUser()` hook (`lib/auth/useUser.ts`), which calls the real backend (`GET /api/v1/auth/user`) rather than only checking cookie presence — an improvement over the original optimistic-cookie-check design, at the cost of an extra round trip and a brief loading state before the guard can decide.

### Behavior

- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` (the `(auth)` route group): while `useUser()` is resolving, render nothing. Once resolved, if a user is present, redirect to `/`. Otherwise render the page.
- `/profiles` and its sub-routes (`/profiles/contract`, `/profiles/document`): while `useUser()` is resolving, render nothing. Once resolved, if no user is present, redirect to `/login`. Otherwise render the page.

### Implementation

Two new hooks in `lib/auth/`:

```ts
// lib/auth/useRequireGuest.ts
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

```ts
// lib/auth/useRequireAuth.ts
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

Two new guard components, each the client-component boundary their route group's server `layout.tsx` renders through (both existing layouts export `metadata`, which a Client Component cannot do, so the guard has to live one level below the layout, not replace it):

```tsx
// app/(auth)/_components/guest-guard.tsx
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

```tsx
// app/(public)/profiles/_components/auth-guard.tsx
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

`app/(auth)/layout.tsx` wraps its existing `<AuthCard>` with `<GuestGuard>`; `app/(public)/profiles/layout.tsx` wraps its existing `<Navbar>`/`<Sidebar>`/content block with `<AuthGuard>`. Both layouts keep their `metadata` export unchanged — only the returned JSX changes.

### Trade-offs of this approach (accepted)

- No server-side protection at all: with `output: "export"`, every route ships as static HTML/JS to whatever serves it, and the guard only runs after the browser hydrates. Anyone can view page source or briefly see a flash of nothing (never protected content, since guards render `null` while checking — but also never a hard 404/redirect at the HTTP level).
- Slightly slower perceived protection than a proxy: an extra `GET /api/v1/auth/user` round trip must resolve before the guard can decide, versus a proxy's synchronous cookie check.
- The backend's `auth` Sanctum middleware remains the real authorization boundary for actual data (e.g. `GET /api/v1/vendor/profile` itself is still protected server-side) — these guards are UX-only, same as the originally-designed proxy would have been.

## Error Handling

- `fetchVendorProfile`: 404 → `null`; anything else propagates to the caller (react-query surfaces it as `error`).
- `useRequireGuest`/`useRequireAuth`: rely on `useUser()`'s existing error handling (401 → `null`, per `lib/auth/api.ts`'s `fetchCurrentUser`); no additional error handling needed in the guards themselves.

## Testing

The frontend has no test runner configured (no vitest/jest/playwright in `package.json`, no existing `*.test.ts` files). No automated tests are added for either part, consistent with current frontend conventions. Backend coverage for the vendor endpoint itself already exists (`VendorProfileTest.php`).

The guard components' actual redirect behavior cannot be verified via `curl` (it runs after client-side hydration, invisible to a plain HTTP response) — verification is limited to typecheck/lint plus manual code review of the hook logic, with a real browser check recommended as a follow-up before merge.
