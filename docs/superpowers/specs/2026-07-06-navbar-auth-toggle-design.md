# Navbar Auth-Aware Toggle

Date: 2026-07-06

## Context

`frontend/components/navbar.tsx` always renders a static "เข้าสู่ระบบ" button with no auth check. Separately, `frontend/lib/auth/` already has a working zustand store (`useAuthStore`: `user`, `isLoading`, `isAuthenticated`, `fetchUser`, `setUser`), `api.ts` (`fetchCurrentUser`/`login`/`register`/`logout` against the live backend, `GET /api/user` already works and returns 401 when logged out), and `mutations.ts` (`useLogin`/`useRegister`/`useLogout` built on `@tanstack/react-query`'s `useMutation`).

Two things are missing that block this from working at all:
1. No `QueryClientProvider` exists anywhere in the app, so any component calling `useLogin`/`useLogout` would throw.
2. Nothing ever calls `useAuthStore.fetchUser()`, so the store never learns the real auth state — it's stuck at its initial `isLoading: true`.

This spec covers wiring both of those up and making `Navbar` render the correct state.

Out of scope: `/login` and `/profile` pages don't exist yet, and the backend has no `/login`/`/register`/`/logout` routes yet (only `GET /api/user`, guarded by `auth:sanctum`). Navbar will link to `/login` and `/profile` so behavior is correct once those exist, but visiting them today 404s. Building those pages is separate follow-up work (tracked conceptually by the existing `docs/superpowers/plans/2026-07-06-nextjs-sanctum-spa-auth-implementation.md`, which this does not need to fully replay since the store-based approach already diverged from that plan's React-Query-context approach).

## Architecture

### 1. `frontend/app/providers.tsx` (new)
Client component. Creates one `QueryClient` via `useState(() => new QueryClient())` and renders `<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>`. Also owns the one-time auth bootstrap: a `useEffect(() => { useAuthStore.getState().fetchUser(); }, [])` so the real session is checked exactly once when the app mounts, without needing a second wrapper component.

### 2. `frontend/app/layout.tsx` (modify)
Wrap `<Navbar />`, `<main>{children}</main>`, and `<Toaster />` inside `<Providers>`.

### 3. UI primitives (new)
Scaffold `dropdown-menu` and `avatar` via `npx shadcn add dropdown-menu avatar` so they match the project's existing `base-nova` / `@base-ui/react` style (same pattern as `components/ui/button.tsx`), rather than hand-rolled.

### 4. `frontend/components/navbar.tsx` (modify)
Becomes a client component (`"use client"`). Reads `const { user, isLoading, isAuthenticated } = useAuthStore()`.

- **`isLoading`**: render a disabled skeleton-style button in place of the auth control, so there's no flash of "เข้าสู่ระบบ" before flipping to the profile view.
- **`!isAuthenticated`**: existing red "เข้าสู่ระบบ" `Button`, now wrapped in a `Link` to `/login`.
- **`isAuthenticated`**: `DropdownMenu` trigger showing `Avatar` (initials fallback from `user.name`) + `user.name`. Menu items: "โปรไฟล์" (`Link` to `/profile`) and "ออกจากระบบ" (calls `useLogout().mutate()`, on success `router.push("/")`).

## Testing / Verification

Manual, in-browser:
1. Fresh load with no session cookie: confirm `GET /api/user` fires (Network tab), returns 401, and Navbar settles on the "เข้าสู่ระบบ" button (briefly showing the loading placeholder first, no flash of the wrong state).
2. In devtools console, call `useAuthStore.getState().setUser({ id: 1, name: "ทดสอบ", email: "test@example.com" })` (exposed via a temporary `window` binding or React DevTools) to simulate a logged-in session; confirm Navbar swaps to the avatar/name dropdown.
3. Open the dropdown, confirm "โปรไฟล์" and "ออกจากระบบ" render. Clicking "ออกจากระบบ" calls `POST /logout`, which 404s against the current backend (see Out of Scope) — confirm this fails without crashing the page (an error toast is fine). Local state clearing and redirect only need to work once the backend route exists.
4. `npx tsc --noEmit` and `npm run build` both pass (static export must still compile).

## Open dependency

Full logout/login round-trip testing is blocked on the backend `/login`/`/logout` routes, same open dependency already recorded in the earlier Sanctum SPA auth spec.
