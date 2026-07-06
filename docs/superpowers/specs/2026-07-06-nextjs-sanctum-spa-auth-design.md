# Next.js Frontend Auth Integration with Laravel Sanctum SPA

Date: 2026-07-06

## Context

Backend already has Laravel Sanctum SPA authentication configured:
- `bootstrap/app.php` calls `->statefulApi()`
- `config/cors.php` has `supports_credentials: true`, origin restricted to `FRONTEND_URL`
- `.env` has `SESSION_DRIVER=database`, `SANCTUM_STATEFUL_DOMAINS=localhost:3000`
- `routes/api.php` currently only exposes `GET /user` behind `auth:sanctum`. Backend auth endpoints (`/login`, `/register`, `/logout`) are being built separately by the user — out of scope for this spec.

Frontend (`frontend/`) is a fresh Next.js 16 App Router scaffold (`app/layout.tsx`, `app/page.tsx` only) with `axios` and `@tanstack/react-query` already installed but unused. Nothing exists yet for API calls, auth state, or route protection.

Frontend and backend run on different origins that share the same registrable domain (`localhost:3000` / `localhost:8000` in dev; presumably `app.example.com` / `api.example.com` in prod). This means the Next.js server (middleware/SSR) cannot reliably validate the Laravel session — only the browser, via cookies, can carry it to the backend. Auth state must therefore be resolved client-side.

Goal: wire the Next.js frontend to the existing Sanctum SPA cookie-auth setup using axios + React Query, so login/register/logout and protected routes work end to end once the backend endpoints exist.

## Architecture

### 1. API client

New file `frontend/src/lib/api/client.ts`: a single shared axios instance.
- `baseURL`: `process.env.NEXT_PUBLIC_API_URL`
- `withCredentials: true` — required so the browser sends the session cookie cross-origin
- `withXSRFToken: true` — required because axios (since v1.6) no longer auto-attaches the `X-XSRF-TOKEN` header for cross-origin requests unless this flag is set. Cookie/header names (`XSRF-TOKEN` / `X-XSRF-TOKEN`) already match axios defaults and Laravel's, no renaming needed.

Helper `ensureCsrfCookie()`: `GET {NEXT_PUBLIC_API_URL}/sanctum/csrf-cookie` (this route lives outside the `/api` prefix per `config/cors.php`'s `paths`). Must be called before every login/register/logout POST per Sanctum SPA requirements.

### 2. Auth state via React Query

`frontend/src/lib/auth/useUser.ts`: `useQuery(['auth','user'], fetchCurrentUser, { retry: false })`.
`fetchCurrentUser` calls `GET /api/user`; on 401 it resolves to `null` instead of throwing, so "not logged in" is normal query state, not an error state.

`AuthProvider` (`frontend/src/lib/auth/AuthProvider.tsx`, client component) wraps the app in `app/layout.tsx`, alongside a `QueryClientProvider` (neither exists yet — both need to be created). Exposes `{ user, isLoading, isAuthenticated }` via context.

### 3. Login / Register / Logout

`frontend/src/lib/auth/mutations.ts`, three `useMutation` hooks:
- **login**: `ensureCsrfCookie()` → `POST /login` → on success, invalidate `['auth','user']`
- **register**: same pattern, `POST /register`
- **logout**: `POST /logout` → on success, `setQueryData(['auth','user'], null)` and redirect to `/login`

### 4. Protected routes

Route group `app/(protected)/layout.tsx`, a client component: reads `useUser()`. While `isLoading`, render a loading state. If no user once resolved, `router.replace('/login')`. Otherwise render children. No Next.js middleware-based guard — rejected (see Alternatives) in favor of this simpler client-only approach.

### 5. Error handling

Axios response interceptor in `client.ts`:
- **401** on any request other than the initial `/api/user` check → treat as session-expired: set `['auth','user']` to `null` and redirect to `/login` globally, so individual pages don't need to handle this themselves.
- **419** (CSRF token mismatch) → call `ensureCsrfCookie()` and retry the original request once; if it still fails, rethrow for the caller to surface (e.g. a toast).
- **422** (validation errors) on login/register — passed through untouched for the form layer (react-hook-form + zod, already in use) to handle.

### 6. Environment variables

`frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```
Must be `NEXT_PUBLIC_*` since the axios instance runs in client components.

## Alternatives considered

- **Next.js middleware cookie-presence check**: feasible in principle since a cookie with `Domain=.example.com` (or `Domain=localhost`, port-agnostic) is sent to both frontend and backend hosts sharing the parent domain. Rejected for now: only proves a cookie exists, not that the session is valid (still needs the client-side check anyway), and silently breaks if frontend/backend ever move to unrelated root domains. Can be added later as a defense-in-depth optimization without changing the core design.
- **Bearer token auth instead of cookies**: rejected — contradicts the stateful/cookie-based Sanctum SPA setup already in place on the backend.

## Testing / Verification

Manual, in-browser (not just typecheck/build):
1. Visit `/login`; confirm `GET /sanctum/csrf-cookie` fires before `POST /login` in the network tab.
2. Successful login sets `laravel_session` and `XSRF-TOKEN` cookies and redirects into a protected route.
3. Refreshing a protected route does not flash the login page before resolving auth state.
4. Logout clears session and visiting a protected route afterwards redirects to `/login`.
5. Deleting the session cookie via devtools and then triggering an API call redirects to `/login` automatically (401 interceptor).

## Open dependency

This design assumes backend auth endpoints will be `POST /login`, `POST /register`, `POST /logout` (web routes, no `/api` prefix, per Sanctum SPA convention) and `GET /api/user` (already present). If the user's backend implementation uses different paths, the frontend API client must be updated to match.
