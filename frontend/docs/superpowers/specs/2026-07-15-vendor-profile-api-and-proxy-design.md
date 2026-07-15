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

## Part 2: Route Proxy

Next.js in this project is v16.2.10, where the `middleware.ts` file convention is deprecated in favor of `proxy.ts` (confirmed via `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`). No `src/` directory exists, so `proxy.ts` goes at the frontend project root, alongside `app/`.

Auth in this project is a Laravel session cookie (`e-procurement-system-session`, httpOnly, set by Sanctum SPA auth), not a JWT. Per Next.js's authentication guide, Proxy can only read the cookie's presence for an "optimistic check" — it cannot decrypt or validate the session. The backend's `auth` middleware remains the real authorization boundary; this proxy only improves UX by avoiding an unnecessary round trip to already-known-outcome pages.

### Behavior

- If the session cookie **is present** and the request path is one of the guest-only auth routes (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`) → redirect to `/`.
- If the session cookie **is absent** and the request path starts with `/profiles` → redirect to `/login`.
- Otherwise, pass through.

### Implementation

```ts
// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { routes } from "@/lib/routes";

const SESSION_COOKIE_NAME = "e-procurement-system-session";

const guestOnlyRoutes: string[] = [
  routes.auth.login,
  routes.auth.register,
  routes.auth.forgotpassword,
  routes.auth.resetPassword,
  routes.auth.verifyEmail,
];

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
  const { pathname } = request.nextUrl;

  if (hasSession && guestOnlyRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL(routes.home, request.url));
  }

  if (!hasSession && pathname.startsWith(routes.profiles.profile)) {
    return NextResponse.redirect(new URL(routes.auth.login, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/profiles/:path*",
  ],
};
```

`config.matcher` must be literal strings (Next.js statically analyzes it at build time — referencing `routes.*` there would silently fail to match), so the matcher paths are hardcoded even though the runtime logic imports `routes` normally.

### Why cookie-presence works across the frontend/backend origins

`SESSION_DOMAIN` is unset in the backend `.env`, so Laravel issues a host-only cookie for whatever host served the request. In local dev both frontend (`localhost:3000`) and backend (`localhost:8000`) share the hostname `localhost` (cookie scoping ignores port), so the browser attaches the cookie to requests reaching the Next.js server too. In production, Sanctum SPA auth already requires the frontend and backend to share a top-level domain (via `SESSION_DOMAIN=.example.com`) for cookie-based auth to work at all — so the same assumption holds there.

## Error Handling

- `fetchVendorProfile`: 404 → `null`; anything else propagates to the caller (react-query surfaces it as `error`).
- Proxy: no error handling needed — it only reads a cookie and redirects; it never calls the backend.

## Testing

The frontend has no test runner configured (no vitest/jest/playwright in `package.json`, no existing `*.test.ts` files). No tests are added for either part, consistent with current frontend conventions. Backend coverage for the endpoint itself already exists (`VendorProfileTest.php`).
