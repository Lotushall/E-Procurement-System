# User Detail Page — Real Data Wiring Design

## Context

Earlier this session a full mock UI was built for the admin "User Detail" page (`frontend/app/dashboard/users/detail/`) with 4 tabs (Overview, Permissions, Sessions, Activity), driven entirely by a static `MOCK_USER_DETAIL` object with no backend calls. This spec covers replacing that mock with real backend data end-to-end, including new backend work where none currently exists.

Investigation during brainstorming found the actual backend state differs from what was assumed when the mock was built:

- **Auth is Sanctum SPA/cookie-session**, not bearer-token. Login calls `Auth::guard('web')->loginUsingId()` + `session()->regenerate()` (`app/Modules/Auth/Presentation/Http/Controllers/AuthController.php:90-91`). `personal_access_tokens` exists as a table but nothing in the app ever writes to it — dead code, not usable as a "sessions" data source.
- Laravel's own `sessions` table (`SESSION_DRIVER=database`) is real and populated on every request, with `user_id`, `ip_address`, `user_agent`, `last_activity` columns already present (`database/migrations/0001_01_01_000000_create_users_table.php:101-108`). This is the real data source for the Sessions tab.
- `UserResource`/`UserDetailResource` (`app/Modules/User/Presentation/Http/Resources/`) currently return only `id, username, email, name, userType, status, createdAt` (+ `vendorProfileId` on the detail variant). **`role`, `internalProfile`, and `permissions` are not exposed at all** — the backend half of the earlier "per-user permission overrides" frontend work was never built. This spec adds read-only exposure of those fields (not the create/update endpoints — those remain out of scope, deferred to whichever session builds the admin create/edit-user backend).
- No columns exist anywhere for `last_login_at`, `password_changed_at`, or two-factor auth state.

## Scope Decisions (from brainstorming)

Confirmed with the user, in order of discussion:

1. **Two-Factor Authentication**: removed entirely from the UI. No backend work. Not a stub — the row is deleted from the Security card.
2. **Activity log tab**: removed entirely from the UI. No backend work, no audit-log table. The whole tab is deleted (3 tabs remain: Overview / Permissions / Sessions).
3. **Sessions tab**: real feature, backed by Laravel's `sessions` table. Device/browser/OS parsed from the stored `user_agent` via a new `jenssegers/agent` composer dependency. "Location" (city/country) is dropped — no GeoIP service in this project. Per-session "Login Time" is dropped — Laravel's `sessions` table has no creation timestamp, only `last_activity` (overwritten every request), so only "last active" is honest to show.
4. **Last Login / Password Changed**: both real, backed by two new `users` columns (`last_login_at`, `password_changed_at`), decoupled from the Sessions feature (session rows can be revoked/expire independently of these account-level facts).
5. **`email_verified_at`**: already exists in the DB and on the domain entity; just needs exposing through the API resource.
6. **`role` / `internalProfile` / `permissions`**: read-only exposure added to `UserResource`/`UserDetailResource`, sourced from existing relations (Spatie `HasRoles`, `UserInternalProfile()`). The write side (create/update user with role+permissions) stays out of scope — this spec only makes the User Detail page's *read* path show real values instead of blanks.

## Architecture

### A. Read-only profile/role/permission exposure

`UserResource::toArray()` gains:

```php
'role' => $this->getRoleNames()->first(),
'internalProfile' => $this->when($this->user_type === UserType::Internal, fn () => [
    'employeeNo' => $this->UserInternalProfile?->employee_no,
    'prefix' => $this->UserInternalProfile?->prefix,
    'firstname' => $this->UserInternalProfile?->firstname,
    'lastname' => $this->UserInternalProfile?->lastname,
    'department' => $this->UserInternalProfile?->department,
    'position' => $this->UserInternalProfile?->position,
    'phone' => $this->UserInternalProfile?->phone,
]),
'permissions' => $this->getAllPermissions()->pluck('name'),
'emailVerifiedAt' => $this->email_verified_at?->toIso8601String(),
```

This mirrors the existing pattern in `AuthenticatedUserResource.php:27-28` (`getRoleNames()`, `getAllPermissions()->pluck('name')`) and the existing `UserInternalProfile()` relation (`app/Modules/User/Infrastructure/Models/User.php:104-107`). No migration needed — all source data already exists.

### B. `last_login_at` / `password_changed_at`

**Migration**: add nullable `last_login_at` and `password_changed_at` timestamp columns to `users`.

**Domain entity** (`app/Modules/User/Domain/Entities/User.php`): add `lastLoginAt` and `passwordChangedAt` properties (constructor + `reconstitute()` + getters), following the existing mutator pattern (`changePassword()`, `verifyEmail()`, private `touch()` at lines 139-142):

- New method `recordLogin(): void` — sets `lastLoginAt = CarbonImmutable::now()`, calls `touch()`.
- Existing `changePassword()` (lines 133-137) — also sets `passwordChangedAt = CarbonImmutable::now()` in addition to its current behavior.

**Repository** (`app/Modules/User/Infrastructure/Repositories/UserRepository.php`): `save()` (lines 13-28) gains two more `$model->x = $user->x();` lines; `toDomain()` (lines 56-71) passes the two new columns into `User::reconstitute()`.

**Wiring**: `LoginUseCase` calls `$user->recordLogin()` before persisting, right alongside the existing `Auth::guard('web')->loginUsingId()` call in `AuthController::login()` (line 90) — the call belongs in the use case, not the controller, since the controller has no direct repository access (confirmed: only `$user` and `$request` are in scope there).

`changePassword()` is already called from both `ChangePasswordUseCase` (self-service) and `ResetPasswordUseCase` (forgot-password email flow), so `password_changed_at` is covered by both with no extra wiring. The admin "reset another user's password" endpoint does not exist in the backend yet (confirmed: no `PATCH /dashboard/users/{id}` route, no `UpdateInternalUserUseCase` class) — out of scope here; once that endpoint is built separately, routing it through `changePassword()` will pick up this behavior automatically.

**Resource**: expose `lastLoginAt`, `passwordChangedAt` alongside `emailVerifiedAt` from section A.

### C. Sessions feature

New Composer dependency: `jenssegers/agent` (parses a `user_agent` string into browser/platform/device-type).

**Data source**: Laravel's own `sessions` table, queried directly (it's framework infrastructure, not a domain concept, so this bypasses the `User` domain entity/repository — a small dedicated query/use-case class per existing folder conventions):

- `app/Modules/User/Application/Queries/ListUserSessionsQuery.php` — `DB::table('sessions')->where('user_id', $userId)->orderByDesc('last_activity')->get()`, mapped through `jenssegers/agent` for device/browser/os, with `current` computed by comparing each row's `id` to the requesting admin's own `$request->session()->getId()`.
- Two small use-cases/actions for revoke: single (`DELETE .../sessions/{sessionId}`, scoped `where('user_id', $userId)->where('id', $sessionId)->delete()` so an admin can't revoke an unrelated user's session by guessing an ID) and bulk (`DELETE .../sessions`, deletes all rows for that `user_id`, with an optional `?keep_current=1` query param to exclude the row matching the requester's own session id — this naturally degrades to "revoke all" when viewing a different user, since none of their rows will ever match the admin's own session id).

**Routes** (`routes/api/v1/dashboard/users.php`, all under existing `users.update` permission gate, matching the edit-page's gate):

```
GET    dashboard/users/{id}/sessions
DELETE dashboard/users/{id}/sessions/{sessionId}
DELETE dashboard/users/{id}/sessions{?keep_current}
```

**Response shape** (`SessionResource`, new):

```json
{
  "data": [
    {
      "id": "8f14e45fceea167a5a36dedd4bad3b5c",
      "device": "Desktop",
      "browser": "Chrome",
      "os": "Windows",
      "ipAddress": "192.168.1.10",
      "lastActiveAt": "2026-08-17T10:02:00+00:00",
      "current": true
    }
  ]
}
```

`device` is one of `"Desktop" | "Mobile" | "Tablet" | "Unknown"`, derived from `Agent::isDesktop()/isMobile()/isTablet()`. `browser`/`os` come from `Agent::browser()`/`Agent::platform()`, falling back to `"Unknown"` when the UA string can't be parsed (e.g. very old sessions created before this feature, or non-browser clients).

### D. Known implementation-access risk

Several files this spec touches (Domain entities, Repositories, Controllers, Resources, everything under `app/Modules/Auth`) are outside the backend directories this session currently has write access to (only `database/migrations`, `database/seeders`, and parts of `app/Modules/User/{Application/Queries,Presentation/Http/Requests,Domain/Enums,Providers,Presentation/Policies}` are currently granted). Implementation may hit permission prompts for additional paths — this is expected, not a design problem.

## Frontend

- **Delete** `app/dashboard/users/detail/_data/mock-user-detail.ts` entirely.
- **`lib/user/management/types.ts`**: `UserDetail` gains `emailVerifiedAt: string | null`, `lastLoginAt: string | null`, `passwordChangedAt: string | null`. New `SessionInfo` type: `{ id: string; device: "Desktop" | "Mobile" | "Tablet" | "Unknown"; browser: string; os: string; ipAddress: string; lastActiveAt: string; current: boolean }`.
- **New query hook** `lib/user/management/queries/useUserSessions.ts` (`useQuery(["users", id, "sessions"], () => fetchUserSessions(id))`), matching the existing `useUserDetail`/`useRoles` shape.
- **New mutations** `useRevokeUserSession(userId)` (single) and `useRevokeAllUserSessions(userId)` (bulk, takes `keepCurrent: boolean`), both invalidating the sessions query key on settle — mirrors the existing `useUpdateUserStatus`/`useDeleteRole` mutation pattern (`toast.promise`, `onSettled: invalidate`).
- **`OverviewTab`**: drop the `status` prop's mock-only handling nuance (none needed — already takes `status` from parent state); switch `user: MockUserDetail` prop to the real `UserDetail` type; drop the "Two-Factor Authentication" `InfoRow` entirely; `emailVerified` badge now derives from `user.emailVerifiedAt !== null` instead of a mock boolean; `lastLoginAt`/`passwordChangedAt` read directly off `user` instead of the mock object (same `formatNotificationTime` usage, now guarding for `null` — render "ยังไม่เคยเข้าสู่ระบบ" / "ยังไม่เคยเปลี่ยนรหัสผ่าน" when null).
- **`PermissionsTab`**: switch to `UserDetail`; `roles` becomes `user.role ? [user.role] : []` (real API returns a single role name, not an array); permission `source` ("role" vs "direct") is computed client-side by diffing `user.permissions` against the matched role's `permissions` from `useRoles()` (a permission name present in the role's set is `"role"`, otherwise `"direct"`) — mirrors the same role/direct distinction already designed for the (separately-scoped, not-yet-backend-built) permission-overrides feature.
- **`SessionsTab`**: replace the `useState(initialSessions)` local-array approach with `useUserSessions(userId)` + the two revoke mutations; loading state (`Spinner`, matching `OverviewTab`'s existing pending pattern) and error state (matching the existing "ไม่สามารถโหลด... กรุณาลองใหม่อีกครั้ง" pattern used elsewhere on these pages) replace the old always-populated mock array.
- **`ActivityTab`**: deleted entirely, along with its `TabsTrigger`/`TabsContent` in `page.tsx`.
- **`UserDetailHeader`**: unchanged in shape (Suspend/Activate/Reset-Password stay demo-only toasts for now — no backend endpoint exists for account suspension or admin password reset yet; this matches the already-accepted "admin write-side is a separate, later feature" boundary from section A).
- **`page.tsx`**: switch from `const user = MOCK_USER_DETAIL` to `useUserDetail(id)` (same `?id=` query-param pattern as the real `edit/page.tsx`/old `detail/page.tsx`), with the same `isPending`/`notFound` gating those pages already use. `Tabs` drops the `activity` value from its `ActiveTab` union and `TabsList`.

## Error Handling

- `useUserDetail` not-found / loading states: reuse the exact pattern already implemented in `edit/page.tsx` (spinner while pending, "ไม่พบข้อมูลผู้ใช้รายนี้" message when not found).
- `useUserSessions` error state: inline message within the Sessions tab only (doesn't block the rest of the page, since Overview/Permissions can render independently) — "ไม่สามารถโหลดรายการ session ได้ กรุณาลองใหม่อีกครั้ง".
- Revoke mutations: `toast.promise` with Thai loading/success/error messages, matching every other mutation in this codebase (`useDeleteRole`, `useUpdateUserStatus`, etc.). A 403 (permission denied) or 404 (session already gone, e.g. it expired naturally between page load and click) both fall through to the mutation's generic error toast — no special-casing needed, the sessions list re-fetches on settle either way and will simply no longer show the row.

## Testing

Backend (Pest, matching existing `tests/Feature/Modules/User/` conventions):
- `UserResource`/`UserDetailResource` include `role`, `internalProfile`, `permissions`, `emailVerifiedAt`, `lastLoginAt`, `passwordChangedAt` with correct values for an internal user; `internalProfile` is `null`/omitted for company/individual users; `role`/`permissions` are empty/absent for a user with no role assigned.
- Logging in sets `last_login_at` to (approximately) now.
- Changing password (both self-service and forgot-password reset) sets `password_changed_at`.
- `GET .../sessions` returns only the target user's own session rows, each with correctly parsed `browser`/`os`/`device`, and `current: true` exactly on the row matching the requester's own session id (test both: admin viewing their own detail page, and admin viewing a different user's page where no row should be `current`).
- `DELETE .../sessions/{sessionId}` removes only that row and is scoped to `user_id` (attempting to revoke a session belonging to a different user 404s/no-ops, doesn't delete).
- `DELETE .../sessions?keep_current=1` removes all rows except the current-matching one; without the param, removes all rows including current.
- Both session-management endpoints are gated behind `users.update` (403 without it).

Frontend (manual QA — no test runner in this repo, no browser automation available in this dev environment, so this checklist is disclosed as **not yet performed** and needs a human pass once the backend ships):
1. Open a real internal user's detail page — Overview shows real account info, profile info, and Security card (email verification, last login, password changed) with no mock artifacts.
2. Open a company/individual user's detail page — Profile Information section renders correctly for that user type (no crash on `internalProfile: null`).
3. Permissions tab shows the user's real role badge and permission table, with correct Role/Direct source split.
4. Sessions tab: log in as the same user from a second browser/device, confirm a second row appears; revoke it, confirm it disappears and that browser session is now logged out.
5. Revoke-all/keep-current button visibility: viewing your own account detail page shows both buttons; viewing another user's page hides "revoke others" (no current session in that list).
6. Confirm 2FA row and Activity tab are fully gone from the page — no leftover mock UI or dead links.
7. Confirm `mock-user-detail.ts` is deleted and nothing else imports it (`tsc --noEmit` clean).
