# Next.js Sanctum SPA Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Next.js frontend to the already-configured Laravel Sanctum SPA cookie auth (CORS + `statefulApi()` + session cookies) using axios and React Query, so login/register/logout and protected routes work end to end.

**Architecture:** A single shared axios instance handles the CSRF cookie dance and global 401/419 handling. React Query owns auth state via a `['auth','user']` query backed by `GET /api/user`. A client-side `AuthProvider` + a `(protected)` route-group layout gate access — there is no middleware-based guard because `next.config.ts` sets `output: 'export'`, which Next.js explicitly does not support alongside Proxy/Middleware, `cookies()`, or Server Actions (see `frontend/node_modules/next/dist/docs/01-app/02-guides/static-exports.md`, "Unsupported Features"). All auth logic must run in the browser.

**Tech Stack:** Next.js 16 App Router (static export), axios ^1.18, @tanstack/react-query ^5, react-hook-form + zod (already installed), Laravel Sanctum ^4.0 (backend, already configured).

## Global Constraints

- `next.config.ts` has `output: 'export'` — no middleware/proxy, no `cookies()` API, no Server Actions, no Route Handlers that read `Request`. Every auth-aware component must be a Client Component (`'use client'`).
- Path alias `@/*` maps to the `frontend/` root (see `frontend/tsconfig.json`), not `frontend/src/*`.
- `tsconfig.json` has `"strict": true` — no `any`, no implicit any.
- Backend contract assumed (per spec's Open Dependency): `POST /login`, `POST /register`, `POST /logout` (no `/api` prefix), `GET /api/user` (already exists, guarded by `auth:sanctum`), `GET /sanctum/csrf-cookie` (registered automatically by Sanctum's service provider — already live on the backend today, independent of the login endpoints).
- `NEXT_PUBLIC_API_URL` must be the API **root** with no path suffix (e.g. `http://localhost:8000`), because `api.get("/api/user")`, `api.post("/login")`, and `api.get("/sanctum/csrf-cookie")` all compose against the same `baseURL` and expect different prefixes (`/api/...` vs none). **Current value in `frontend/.env.local` is `http://localhost:8000/api` — this is wrong for this design and must be corrected in Task 1**, otherwise every request double- or mis-prefixes (e.g. `/api/api/user`, `/api/login`).

---

### Task 1: CSRF-aware axios client with global error handling

**Files:**
- Modify: `frontend/lib/api.ts` (currently just `export const api = axios.create({ baseURL, withCredentials: true })`)

**Interfaces:**
- Produces: `api` (axios instance, existing export, unchanged signature), `ensureCsrfCookie(): Promise<void>`, `setUnauthorizedHandler(handler: () => void): void`

- [ ] **Step 1: Fix `NEXT_PUBLIC_API_URL`**

Modify `frontend/.env.local` — change:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

to:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

This must be the API root with no path suffix — see Global Constraints.

- [ ] **Step 2: Replace `frontend/lib/api.ts` contents**

```ts
import axios, { isAxiosError, type InternalAxiosRequestConfig } from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  withXSRFToken: true,
});

export async function ensureCsrfCookie(): Promise<void> {
  await api.get("/sanctum/csrf-cookie");
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _csrfRetry?: boolean;
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const config = error.config as RetryableRequestConfig;
    const status = error.response?.status;

    if (status === 401 && config.url !== "/api/user") {
      onUnauthorized?.();
      return Promise.reject(error);
    }

    if (status === 419 && !config._csrfRetry) {
      await ensureCsrfCookie();
      config._csrfRetry = true;
      return api(config);
    }

    return Promise.reject(error);
  }
);
```

Notes on why: `withXSRFToken: true` is required because axios (since v1.6) stopped auto-attaching `X-XSRF-TOKEN` on cross-origin requests unless explicitly opted in — frontend and backend are different origins here. The 401 check excludes `/api/user` because that endpoint 401s *by design* on every unauthenticated page load (that's how `useUser` in Task 4 detects "not logged in"); firing the global unauthorized handler for that specific request would be wrong. The 419 branch retries a stale-CSRF-cookie request exactly once.

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manually verify the CSRF cookie call against the live backend**

Run: `cd frontend && npm run dev` (in one terminal), and confirm the Laravel backend is running on the URL in `NEXT_PUBLIC_API_URL`. Then in a browser console on `http://localhost:3000` (any page), run:

```js
fetch(process.env.NEXT_PUBLIC_API_URL + "/sanctum/csrf-cookie", { credentials: "include" })
```

Actually run this via a temporary `useEffect` or the browser devtools Network tab: open devtools → Application → Cookies → confirm `XSRF-TOKEN` cookie appears after visiting any page that triggers `ensureCsrfCookie()` (it won't yet — this route isn't called anywhere until Task 2's `login`/`register`. For now, just confirm `GET {API_URL}/sanctum/csrf-cookie` returns `204` via curl:

Run: `curl -i http://localhost:8000/sanctum/csrf-cookie`
Expected: `HTTP/1.1 204 No Content` with a `Set-Cookie: XSRF-TOKEN=...` header.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/api.ts frontend/.env.local
git commit -m "feat(auth): add CSRF-aware axios client with 401/419 handling"
```

---

### Task 2: Auth types and raw API functions

**Files:**
- Create: `frontend/lib/auth/types.ts`
- Create: `frontend/lib/auth/api.ts`

**Interfaces:**
- Consumes: `api`, `ensureCsrfCookie` from `frontend/lib/api.ts` (Task 1)
- Produces: `User`, `LoginPayload`, `RegisterPayload` types; `fetchCurrentUser(): Promise<User | null>`, `login(payload: LoginPayload): Promise<void>`, `register(payload: RegisterPayload): Promise<void>`, `logout(): Promise<void>`

- [ ] **Step 1: Create the types file**

```ts
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}
```

Save as `frontend/lib/auth/types.ts`.

- [ ] **Step 2: Create the API functions file**

```ts
import { isAxiosError } from "axios";
import { api, ensureCsrfCookie } from "@/lib/api";
import type { LoginPayload, RegisterPayload, User } from "@/lib/auth/types";

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const { data } = await api.get<User>("/api/user");
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function login(payload: LoginPayload): Promise<void> {
  await ensureCsrfCookie();
  await api.post("/login", payload);
}

export async function register(payload: RegisterPayload): Promise<void> {
  await ensureCsrfCookie();
  await api.post("/register", payload);
}

export async function logout(): Promise<void> {
  await api.post("/logout");
}
```

Save as `frontend/lib/auth/api.ts`.

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manually verify `fetchCurrentUser` against the live backend**

Run: `curl -i http://localhost:8000/api/user`
Expected: `HTTP/1.1 401 Unauthorized` (confirms the endpoint exists and is guarded — `fetchCurrentUser`'s catch branch is exercised against this exact response shape).

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/auth/types.ts frontend/lib/auth/api.ts
git commit -m "feat(auth): add auth types and API functions"
```

---

### Task 3: React Query provider

**Files:**
- Create: `frontend/app/providers.tsx`
- Modify: `frontend/app/layout.tsx:26-36` (wrap `{children}` inside `<Providers>`)

**Interfaces:**
- Produces: `Providers` component (client component) wrapping children in `QueryClientProvider`

- [ ] **Step 1: Create the providers file**

```tsx
"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

Save as `frontend/app/providers.tsx`.

- [ ] **Step 2: Wrap the root layout**

Modify `frontend/app/layout.tsx`. Add the import:

```tsx
import { Providers } from "./providers";
```

And change:

```tsx
      <body className="min-h-full flex flex-col">
        <main>{children}</main>
        <Toaster position='top-center' richColors />
      </body>
```

to:

```tsx
      <body className="min-h-full flex flex-col">
        <Providers>
          <main>{children}</main>
          <Toaster position='top-center' richColors />
        </Providers>
      </body>
```

- [ ] **Step 3: Build to confirm static export still compiles**

Run: `cd frontend && npm run build`
Expected: build succeeds, `out/index.html` is generated, no errors about client/server component boundaries.

- [ ] **Step 4: Manual smoke check**

Run: `cd frontend && npm run dev`, open `http://localhost:3000`, confirm the "hello world" home page still renders with no console errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/providers.tsx frontend/app/layout.tsx
git commit -m "feat(auth): add React Query provider to root layout"
```

---

### Task 4: `useUser` query hook

**Files:**
- Create: `frontend/lib/auth/useUser.ts`

**Interfaces:**
- Consumes: `fetchCurrentUser` (Task 2)
- Produces: `AUTH_USER_QUERY_KEY` (readonly tuple `["auth", "user"]`), `useUser()` returning a React Query `UseQueryResult<User | null>`

- [ ] **Step 1: Create the hook**

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser } from "@/lib/auth/api";

export const AUTH_USER_QUERY_KEY = ["auth", "user"] as const;

export function useUser() {
  return useQuery({
    queryKey: AUTH_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
```

Save as `frontend/lib/auth/useUser.ts`.

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/auth/useUser.ts
git commit -m "feat(auth): add useUser query hook"
```

(No isolated browser check here — this hook has no UI surface yet; it's exercised end-to-end once `AuthProvider` consumes it in Task 5.)

---

### Task 5: `AuthProvider` context

**Files:**
- Create: `frontend/lib/auth/AuthProvider.tsx`
- Modify: `frontend/app/providers.tsx` (nest `AuthProvider` inside `QueryClientProvider`)

**Interfaces:**
- Consumes: `useUser` (Task 4), `setUnauthorizedHandler` (Task 1)
- Produces: `AuthProvider` component, `useAuth(): { user: User | null; isLoading: boolean; isAuthenticated: boolean }`

- [ ] **Step 1: Create the provider**

```tsx
"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setUnauthorizedHandler } from "@/lib/api";
import { useUser, AUTH_USER_QUERY_KEY } from "@/lib/auth/useUser";
import type { User } from "@/lib/auth/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      queryClient.setQueryData(AUTH_USER_QUERY_KEY, null);
    });
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{ user: user ?? null, isLoading, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

Save as `frontend/lib/auth/AuthProvider.tsx`.

- [ ] **Step 2: Wire it into `Providers`**

Modify `frontend/app/providers.tsx` to:

```tsx
"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth/AuthProvider";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 3: Type-check and build**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: no errors, build succeeds.

- [ ] **Step 4: Manual verification**

Run: `cd frontend && npm run dev`, open `http://localhost:3000` with devtools Network tab open. Confirm a `GET {API_URL}/api/user` request fires on page load and returns 401 (since not logged in yet) without crashing the page.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/auth/AuthProvider.tsx frontend/app/providers.tsx
git commit -m "feat(auth): add AuthProvider context"
```

---

### Task 6: Login / register / logout mutations

**Files:**
- Create: `frontend/lib/auth/mutations.ts`

**Interfaces:**
- Consumes: `login`, `register`, `logout` (Task 2), `AUTH_USER_QUERY_KEY` (Task 4)
- Produces: `useLogin()`, `useRegister()`, `useLogout()` — each a React Query `UseMutationResult`

- [ ] **Step 1: Create the mutations file**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login, register, logout } from "@/lib/auth/api";
import { AUTH_USER_QUERY_KEY } from "@/lib/auth/useUser";
import type { LoginPayload, RegisterPayload } from "@/lib/auth/types";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY }),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterPayload) => register(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => queryClient.setQueryData(AUTH_USER_QUERY_KEY, null),
  });
}
```

Save as `frontend/lib/auth/mutations.ts`.

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/auth/mutations.ts
git commit -m "feat(auth): add login/register/logout mutations"
```

---

### Task 7: Login page

**Files:**
- Create: `frontend/app/login/page.tsx`

**Interfaces:**
- Consumes: `useLogin` (Task 6), `Button` from `frontend/components/ui/button.tsx`

- [ ] **Step 1: Create the login page**

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLogin } from "@/lib/auth/mutations";

const loginSchema = z.object({
  email: z.string().email("กรอกอีเมลให้ถูกต้อง"),
  password: z.string().min(1, "กรอกรหัสผ่าน"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => router.push("/dashboard"),
      onError: (error) => {
        const message = isAxiosError(error)
          ? (error.response?.data as { message?: string } | undefined)
              ?.message
          : undefined;
        toast.error(message ?? "เข้าสู่ระบบไม่สำเร็จ");
      },
    });
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold">เข้าสู่ระบบ</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm">
            อีเมล
          </label>
          <input
            id="email"
            type="email"
            className="rounded-lg border border-border px-3 py-2 text-sm"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm">
            รหัสผ่าน
          </label>
          <input
            id="password"
            type="password"
            className="rounded-lg border border-border px-3 py-2 text-sm"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
        <Button type="submit" disabled={login.isPending}>
          {login.isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </Button>
      </form>
    </div>
  );
}
```

Save as `frontend/app/login/page.tsx`.

- [ ] **Step 2: Type-check and build**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: no errors, `out/login/index.html` (or `out/login.html`) generated.

- [ ] **Step 3: Manual verification**

Run: `cd frontend && npm run dev`, visit `http://localhost:3000/login`. Submit with an empty form — confirm zod validation messages appear. If the backend `/login` endpoint already exists, submit valid credentials and confirm (in Network tab) that `GET /sanctum/csrf-cookie` fires before `POST /login`, and a successful login redirects to `/dashboard` (which won't exist until Task 9 — a 404 here is expected for now; the redirect firing correctly is what's being checked).

- [ ] **Step 4: Commit**

```bash
git add frontend/app/login/page.tsx
git commit -m "feat(auth): add login page"
```

---

### Task 8: Register page

**Files:**
- Create: `frontend/app/register/page.tsx`

**Interfaces:**
- Consumes: `useRegister` (Task 6), `Button`

- [ ] **Step 1: Create the register page**

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRegister } from "@/lib/auth/mutations";

const registerSchema = z
  .object({
    name: z.string().min(1, "กรอกชื่อ"),
    email: z.string().email("กรอกอีเมลให้ถูกต้อง"),
    password: z.string().min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร"),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["password_confirmation"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit((values) => {
    registerMutation.mutate(values, {
      onSuccess: () => router.push("/dashboard"),
      onError: (error) => {
        const message = isAxiosError(error)
          ? (error.response?.data as { message?: string } | undefined)
              ?.message
          : undefined;
        toast.error(message ?? "สมัครสมาชิกไม่สำเร็จ");
      },
    });
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold">สมัครสมาชิก</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm">
            ชื่อ
          </label>
          <input
            id="name"
            className="rounded-lg border border-border px-3 py-2 text-sm"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm">
            อีเมล
          </label>
          <input
            id="email"
            type="email"
            className="rounded-lg border border-border px-3 py-2 text-sm"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm">
            รหัสผ่าน
          </label>
          <input
            id="password"
            type="password"
            className="rounded-lg border border-border px-3 py-2 text-sm"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password_confirmation" className="text-sm">
            ยืนยันรหัสผ่าน
          </label>
          <input
            id="password_confirmation"
            type="password"
            className="rounded-lg border border-border px-3 py-2 text-sm"
            {...register("password_confirmation")}
          />
          {errors.password_confirmation && (
            <p className="text-xs text-destructive">
              {errors.password_confirmation.message}
            </p>
          )}
        </div>
        <Button type="submit" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? "กำลังสมัคร..." : "สมัครสมาชิก"}
        </Button>
      </form>
    </div>
  );
}
```

Save as `frontend/app/register/page.tsx`.

- [ ] **Step 2: Type-check and build**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `cd frontend && npm run dev`, visit `http://localhost:3000/register`, submit with mismatched passwords — confirm the "รหัสผ่านไม่ตรงกัน" validation message appears on the confirmation field.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/register/page.tsx
git commit -m "feat(auth): add register page"
```

---

### Task 9: Protected route group

**Files:**
- Create: `frontend/app/(protected)/layout.tsx`
- Create: `frontend/app/(protected)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 5), `useLogout` (Task 6)

- [ ] **Step 1: Create the protected layout**

```tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        กำลังตรวจสอบสิทธิ์...
      </div>
    );
  }

  return <>{children}</>;
}
```

Save as `frontend/app/(protected)/layout.tsx`.

- [ ] **Step 2: Create a demo protected page**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLogout } from "@/lib/auth/mutations";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const logout = useLogout();

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold">ยินดีต้อนรับ, {user?.name}</h1>
      <Button
        variant="outline"
        disabled={logout.isPending}
        onClick={() =>
          logout.mutate(undefined, {
            onSuccess: () => router.push("/login"),
          })
        }
      >
        ออกจากระบบ
      </Button>
    </div>
  );
}
```

Save as `frontend/app/(protected)/dashboard/page.tsx`.

- [ ] **Step 3: Type-check and build**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: no errors, `out/dashboard/index.html` (or equivalent) generated — route groups don't appear in the URL, so this must build as `/dashboard`, not `/(protected)/dashboard`.

- [ ] **Step 4: Manual verification**

Run: `cd frontend && npm run dev`. With no session cookie (fresh/incognito browser), visit `http://localhost:3000/dashboard` directly — confirm it briefly shows "กำลังตรวจสอบสิทธิ์..." then redirects to `/login` (no flash of dashboard content).

- [ ] **Step 5: Commit**

```bash
git add "frontend/app/(protected)"
git commit -m "feat(auth): add protected route group and demo dashboard page"
```

---

### Task 10: Full end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm backend auth endpoints exist**

Run: `curl -i -X POST http://localhost:8000/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"wrong"}'`
Expected: a JSON error response (422 or 401), not a 404 — confirms the backend route exists. If this 404s, stop here: the backend `/login`/`/register`/`/logout` endpoints referenced by this plan don't exist yet, and steps 2-6 below can't be completed until they do.

- [ ] **Step 2: Login flow**

In a browser with devtools open: visit `/login`, log in with valid credentials. Confirm in the Network tab that `GET /sanctum/csrf-cookie` fires before `POST /login`, and confirm in Application → Cookies that `laravel_session` and `XSRF-TOKEN` are set. Confirm redirect to `/dashboard` and the user's name displays.

- [ ] **Step 3: Refresh persistence**

Refresh `/dashboard`. Confirm no flash of the login page before the dashboard content settles in.

- [ ] **Step 4: Logout flow**

Click "ออกจากระบบ". Confirm redirect to `/login`, and that cookies are cleared (check Application → Cookies).

- [ ] **Step 5: Post-logout guard**

Visit `/dashboard` directly again. Confirm it redirects to `/login`.

- [ ] **Step 6: Expired-session handling**

Log in again, then manually delete the `laravel_session` cookie via devtools without logging out. Trigger any authenticated request (e.g. refresh `/dashboard`, which calls `GET /api/user`). Confirm the global 401 handler clears auth state and the protected layout redirects to `/login`.

- [ ] **Step 7: Final commit (if any fixups were needed)**

```bash
git add -A
git commit -m "fix(auth): address issues found during end-to-end verification"
```

Only run this if Steps 2-6 uncovered something that needed a code change. If everything passed as-is, there's nothing to commit.
