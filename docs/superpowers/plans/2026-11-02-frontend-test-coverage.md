# Frontend Test Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every frontend source module (`app/`, `lib/`, `components/`, `hooks/`) unit or integration tests that assert its *intended* behavior, using the Vitest + React Testing Library + MSW setup already in place.

**Architecture:** Tests live outside the source tree under `frontend/tests/`, mirroring source paths. Pure logic goes in `tests/unit/`; anything that renders with React Query, MSW, the router mock or the toast mock goes in `tests/integration/`. The network is mocked at the HTTP layer with MSW (the real axios client, interceptors, React Query hooks and components all run). `next/navigation` and `sonner` are replaced globally by controllable mocks. E2E (Playwright) is out of scope and will be decided after this plan's coverage report.

**Tech Stack:** Vitest 5, @vitest/coverage-v8, jsdom 30, @testing-library/react 16 + user-event 14 + jest-dom 7, MSW 3 (`msw/http`, `msw/node`), React 19, Next 16, TanStack Query 5, react-hook-form 7, zod 4, base-ui (via shadcn `components/ui`).

## Global Constraints

- Frontend only. Working directory `D:\E-Procurement-System\frontend`. Branch `Internal`, in place, no worktree.
- **No commits.** Standing instruction: implementers never run `git commit`/`git add`. The controller records a checkpoint tree after each task with a temp index (`GIT_INDEX_FILE=../.superpowers/sdd/ftc.index`; `git read-tree HEAD`; `git add -A -- frontend`; `git write-tree`), same as earlier frontend runs. Ledger: `D:\E-Procurement-System\.superpowers\sdd\progress.md`.
- **Only files under `frontend/tests/` may be created or modified.** Do not edit any source file, `vitest.config.mts` or `package.json`. If a module cannot be tested without a source change, stop and report it.
- **Test intended behavior, not current behavior.** The source of truth is, in order: code comments, `D:\E-Procurement-System\CONTEXT.md`, specs under `D:\E-Procurement-System\docs\superpowers\specs\`, then the Thai UI copy. When the code disagrees with that intent (a bug), write the test for the intended behavior, mark it `it.skip("BUG: <one line> — <file>:<line>", ...)` so the suite stays green, and list it under **Concerns** in your report. Never weaken an assertion to make it pass, and never fix the source.
- Thai UI strings in assertions are copied verbatim from the source. Test names are in English.
- Use the shared helpers listed under **Test Infrastructure**. Do not create a second helper that does the same job. New fixture builders go in `tests/fixtures/<domain>.ts`, are typed with the domain's `lib/**/types.ts`, and are named `make<Type>(overrides?: Partial<Type>): Type`.
- **Path mirroring:** `tests/{unit|integration}/<source path minus extension>.test.ts(x)`. Route groups drop their parentheses: `app/(auth)/…` → `app/auth/…`, `app/(public)/…` → `app/public/…`, `app/(verify)/…` → `app/verify/…`. One test file per source file. A `page.tsx` test is named `page.test.tsx` inside the mirrored folder.
- Queries: prefer `getByRole` / `getByLabelText` / `getByText`. No snapshot tests. Assert CSS classes only when the class *is* the behavior (a tone, a strike-through, a hidden state) and no accessible alternative exists.
- Every HTTP request a test triggers must be mocked with `server.use(...)` — unhandled requests fail the test. Assert request method, URL, query string and JSON body by capturing them in the handler.
- Never sleep or wait on arbitrary timeouts. Use `findBy*` / `waitFor`. For debounce use `vi.useFakeTimers()` inside `try/finally` with `vi.useRealTimers()`. For "now"-dependent code use `freezeTimeAt(...)`.
- `tests/helpers/query-client.tsx` sets `retry: false`; production React Query retries 3 times. Do not assert retry behavior.
- Next.js in this repo has breaking changes (see `frontend/AGENTS.md`). Before testing anything Next-specific (layouts, `metadata`, `next/image`, `next/link`, `next/font`), read the matching guide under `frontend/node_modules/next/dist/docs/`.
- **Coverage bar per task:** every source file listed in the task has a test file; line coverage of the task's files is **≥ 90% for `lib/**` and `hooks/**`** and **≥ 80% for `app/**` and `components/**`**. Report any file below the bar with the uncovered line numbers and why.
- **Verification per task** (all must pass, paste the summary lines in the report):
  - `npx vitest run <the task's test folders>`
  - `npx vitest run --coverage --coverage.include="<glob of the task's source files>"`
  - `npx vitest run` (the whole suite — nothing else may break)
  - `npx tsc --noEmit`
  - `npx eslint tests`

---

## Test Infrastructure (already in the working tree — do not recreate)

| File | Use it for |
|---|---|
| `tests/setup.ts` | Runs before every file: jest-dom matchers, MSW server (`onUnhandledFrame: "error"`), global mocks of `next/navigation` and `sonner`, jsdom polyfills (`matchMedia`, `ResizeObserver`, `scrollIntoView`, pointer capture), and resets after each test. |
| `tests/msw/server.ts` | `server`, `apiUrl(path)` → `"http://localhost:3000" + path`. jsdom and the API share this origin on purpose (no CORS). |
| `tests/mocks/next-navigation.ts` | `router` (`push`, `replace`, `back`, … are `vi.fn()`), `setUrl("/path?query")` before rendering, `setParams({...})`. `useRouter` / `usePathname` / `useSearchParams` / `useParams` read from it. `router.replace` does **not** change the URL — to test "after navigation", call `setUrl(...)` and `rerender()`. |
| `tests/mocks/sonner.ts` | Import `{ toast }` from `"sonner"` in tests. `toast.promise` awaits the real promise, runs the `success`/`error` callbacks, then calls `toast.success(msg)` / `toast.error(msg)` — so assert `expect(toast.success).toHaveBeenCalledWith("…")`. |
| `tests/helpers/query-client.tsx` | `renderWithQueryClient(ui)`, `renderHookWithQueryClient(() => hook())`, `createTestQueryClient()`. Each returns `{ queryClient, ...renderResult }`. |
| `tests/helpers/auth.ts` | `signInAs({ roles, permissions, userType, … })` mocks `GET /api/v1/auth/user` and returns the user; `signOut()` makes it 401. |
| `tests/helpers/zod.ts` | `fieldErrorsOf(schema, input)` → `{ field: string[] }`. Schemas are already fully tested — do not retest them. |
| `tests/helpers/time.ts` | `freezeTimeAt("2026-11-02T10:00:00+07:00")` at describe/file level. Timezone is fixed to `Asia/Bangkok`. |
| `tests/fixtures/users.ts` | `makeUser(overrides)`. |
| `tests/fixtures/pagination.ts` | `paginated(data, metaOverrides)` → `{ data, meta: { currentPage, lastPage, perPage, total } }`. |

**Already covered — skip these files:** every `_schemas/*.ts`; `lib/utils.ts`, `lib/api.ts`, `lib/api-error.ts`, `lib/routes.ts`, `lib/auth/permissions.ts` (pure functions only — the `use*` hooks in it are Task 2), `lib/auth/queries/useUser.ts`, `lib/notification/utils.ts`, `lib/tender/fiscal-year-options.ts`, `lib/breadcrumb/store.ts`, `components/{tor-status-badge,tender-project-status-badge,user-status-badge,vendor-status-badge,tor-bidding-window,tender-project-period,tender-project-budget-allocation,search-input}.tsx`, `app/dashboard/tender-projects/_components/dialogs/delete-tender-project-dialog.tsx`. `hooks/use-list-page-controls.ts` is partly covered (Task 1 finishes it).

## Test Patterns

Every task uses these patterns. The **reference test files already in the repo** are the canonical, runnable versions — open them before writing your first test:

- Network + interceptors: `tests/integration/lib/api.test.ts`
- Query hook: `tests/integration/lib/auth/queries/useUser.test.ts`
- Dialog with mutation + toast: `tests/integration/app/dashboard/tender-projects/delete-tender-project-dialog.test.tsx`
- URL-driven list hook + router mock + debounce: `tests/integration/hooks/use-list-page-controls.test.ts`
- Component with frozen time: `tests/unit/components/tor-bidding-window.test.tsx`

### P1 — API module function (`lib/**/api.ts`)

Assert what goes over the wire and how the response is mapped. One `describe` per exported function.

```ts
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { createTenderProject, fetchTenderProjectsList } from "@/lib/tender/tender-projects/api";
import { paginated } from "@/tests/fixtures/pagination";
import { apiUrl, server } from "@/tests/msw/server";

describe("fetchTenderProjectsList", () => {
  it("sends filters with page and per_page, and maps meta", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(apiUrl("/api/v1/dashboard/tender-projects"), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(paginated([], { currentPage: 2, lastPage: 5, total: 90, stats: { total: 90 } }));
      }),
    );

    const result = await fetchTenderProjectsList({ search: "คอม" }, 2, 50);

    expect(Object.fromEntries(query!)).toEqual({ search: "คอม", page: "2", per_page: "50" });
    expect(result.meta).toEqual({ currentPage: 2, lastPage: 5, perPage: 20, total: 90, stats: { total: 90 } });
  });
});

describe("createTenderProject", () => {
  it("posts the payload and returns the project code", async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl("/api/v1/dashboard/tender-projects"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: { projectCode: "TP-2570-001" } }, { status: 201 });
      }),
    );

    await expect(createTenderProject({ name: "จัดซื้อ" } as never)).resolves.toEqual({ projectCode: "TP-2570-001" });
    expect(body).toEqual({ name: "จัดซื้อ" });
  });
});
```

### P2 — Query hook (`lib/**/queries/*.ts`)

Render with `renderHookWithQueryClient`, wait for `isSuccess`, assert `data` and that the hook's arguments reach the request. Also assert the query key when other code invalidates by it (read the mutations that touch it).

```ts
const { result, queryClient } = renderHookWithQueryClient(() => useTorDetail(12));
await waitFor(() => expect(result.current.isSuccess).toBe(true));
expect(result.current.data).toEqual(tor);
expect(queryClient.getQueryData(["tors", "detail", 12])).toEqual(tor); // key copied from the source
```

If a query has `enabled`, test both the enabled and the disabled case (disabled: no request is made — assert the handler spy was not called and `fetchStatus` is `"idle"`).

### P3 — Mutation hook (`lib/**/mutations/*.ts`)

Assert the request and every cache side effect (`invalidateQueries`, `setQueryData`, optimistic updates and their rollback).

```ts
const { result, queryClient } = renderHookWithQueryClient(() => useDeleteTenderProject());
const invalidate = vi.spyOn(queryClient, "invalidateQueries");
server.use(http.delete(apiUrl("/api/v1/dashboard/tender-projects/:id"), () => new HttpResponse(null, { status: 204 })));

await act(() => result.current.mutateAsync(7));

expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tenders_projects"] });
```

`onSettled` invalidation must also be asserted on the error path. For optimistic updates: seed the cache with `queryClient.setQueryData`, make the request fail, and assert the cache is rolled back.

### P4 — Form hook (`app/**/_hooks/use-*-form.ts`)

Prefer testing the form through the component or page that uses it (Testing Library + `user-event`). Test the hook directly only when it has no single owning component. Cover, for every form:

1. Invalid input blocks the request (assert the MSW handler spy was not called and the field error text is shown).
2. Valid submit sends the exact payload (capture `request.json()`).
3. Success effect: the toast text, `router.push`/`router.replace` target, the `onSuccess`/close callback, form reset.
4. 422 with `{ errors: { field: [msg] } }`: the message lands on that field (or the toast, if that is what the code does).
5. Other failure: the backend `message`, else the hook's own Thai fallback text.

```ts
const { result } = renderHookWithQueryClient(() => useLoginForm());
server.use(http.post(apiUrl("/api/v1/auth/login"), () => new HttpResponse(null, { status: 204 })));
server.use(http.get(apiUrl("/sanctum/csrf-cookie"), () => new HttpResponse(null, { status: 204 })));

act(() => {
  result.current.setValue("identifier", "officer");
  result.current.setValue("password", "secret");
});
await act(() => result.current.onSubmit());

await waitFor(() => expect(router.push).toHaveBeenCalledWith("/"));
```

### P5 — Dialog / interactive component

Open via its trigger with `user-event`, act, then assert the request, the toast, `onSuccess`, and whether the dialog closed (`queryByRole("dialog" | "alertdialog")`). The canonical file is `delete-tender-project-dialog.test.tsx`. Every dialog test must cover: opening shows the right text, confirm success, failure with backend message, failure fallback message, and the submit button disabled while pending when the code does that.

### P6 — Page (`page.tsx`) and guarded screens

Pages are client components; render them with `renderWithQueryClient(<Page />)` after `setUrl(...)` and `signInAs(...)`. Cover:

1. **Permission gate** — without the permission: `await screen.findByText("คุณไม่มีสิทธิ์เข้าถึงหน้านี้")` and no data request was made. With it: the page heading.
2. **Loading** — while the list request is pending the skeleton is shown (use a handler that returns `new Promise(() => {})`, then assert the skeleton's accessible content or `data-slot="skeleton"`).
3. **Error** — the page's Thai error text on a 500.
4. **Each empty state** — every distinct empty message (e.g. "ไม่พบ TOR ที่ตรงกับคำค้นหา" when `?search=` is set, "ไม่พบ TOR ที่ตรงกับเงื่อนไขที่เลือก" with a filter, "ยังไม่มี TOR ในระบบ" otherwise).
5. **Populated** — rows/cards show the key fields; links point to `routes.*` targets.
6. **Breadcrumb** — `useBreadcrumbStore.getState().items` equals what the page sets.

Async server components (if any) cannot be rendered by Vitest — list them under Concerns instead.

### P7 — Presentational component

Render with props, assert each prop-driven branch (labels, conditional sections, tones, disabled states, `-` fallbacks for nulls). Use `freezeTimeAt` whenever the component reads the current date. No network.

---

## Task 1: Shared hooks and shared components

**Files:**
- Modify: `tests/integration/hooks/use-list-page-controls.test.ts` (add the missing branches)
- Test: `tests/integration/hooks/use-mobile.test.ts`
- Test: `tests/integration/lib/breadcrumb/useBreadcrumb.test.ts`
- Test: `tests/unit/components/forbidden.test.tsx`
- Test: `tests/unit/components/input-field.test.tsx`
- Test: `tests/unit/components/notification-item.test.tsx`
- Test: `tests/unit/components/legal/legal-section.test.tsx`
- Test: `tests/unit/components/legal/privacy-content.test.tsx`
- Test: `tests/unit/components/legal/terms-content.test.tsx`
- Test: `tests/integration/components/disabled-action-button.test.tsx`
- Test: `tests/integration/components/list-sort-select.test.tsx`
- Test: `tests/integration/components/list-filter-sheet.test.tsx`
- Test: `tests/integration/components/floating-action-button.test.tsx`

**Interfaces:**
- Consumes: Test Infrastructure only.
- Produces: nothing new for later tasks.

Must cover:
- `use-list-page-controls`: `resolveIsFetching` (shows skeleton only for fetches after `setSkipSkeleton(false)`, resets to skip after a fetch ends); `normalizeSearch` option; the URL→input resync when `search` changes from outside (`setUrl` + `rerender`); `updateParams` deleting `null`/`""` values; `per_page` written only when not the default.
- `use-mobile`: initial value from `window.innerWidth` (set it with `Object.defineProperty(window, "innerWidth", { value, configurable: true })`), updates on the `matchMedia` change event (stub `window.matchMedia` with an object whose `addEventListener` captures the listener), removes the listener on unmount.
- `useBreadcrumb`: sets the store on mount, clears on unmount, does not reset when re-rendered with equal items, updates when the items change.
- `disabled-action-button`: button is disabled with its `aria-label`; hovering/focusing the wrapper shows "ฟีเจอร์นี้ยังไม่เปิดใช้งาน".
- `list-sort-select`: shows the current sort label; choosing an option calls `onSortingChange` with `[{ id, desc }]`; choosing the default option calls it with `[]`.
- `list-filter-sheet`, `floating-action-button`, `notification-item`, `input-field`, legal components: every prop branch (read the source; e.g. active filter count badge, label/error/warning rendering).

- [ ] **Step 1:** Read each source file and list its branches in your notes.
- [ ] **Step 2:** Write the tests for the first file; run `npx vitest run <file>` and confirm they pass for the right reason (temporarily break one expectation to see it fail, then restore it).
- [ ] **Step 3:** Repeat Step 2 for each remaining file.
- [ ] **Step 4:** Run the Global Constraints verification commands with `--coverage.include="hooks/**" --coverage.include="lib/breadcrumb/**" --coverage.include="components/{forbidden,input-field,notification-item,disabled-action-button,list-sort-select,list-filter-sheet,floating-action-button}.tsx" --coverage.include="components/legal/**"`.
- [ ] **Step 5:** No commit. Report files, verification output, coverage per file, and Concerns.

## Task 2: Auth library — API, mutations, guards, permission hooks

**Files:**
- Test: `tests/integration/lib/auth/api.test.ts`
- Test: `tests/integration/lib/auth/mutations/{useChangePassword,useForgotPassword,useLogin,useLogout,useRegister,useResendVerificationEmail,useResetPassword,useUpdateAccount,useVerifyEmail}.test.ts` (9 files)
- Test: `tests/integration/lib/auth/guards/{useRequireAuth,useRequireGuest,useRequireInternal}.test.ts`
- Test: `tests/integration/lib/auth/guards/{RequirePermission,RequireRole}.test.tsx`
- Test: `tests/integration/lib/auth/permissions-hooks.test.tsx` (the `use*` hooks exported by `lib/auth/permissions.ts`)

**Interfaces:**
- Consumes: `signInAs`, `signOut`, `router`, `renderHookWithQueryClient`.
- Produces: nothing new.

Must cover:
- `api.ts` (P1): every function's method, URL, params/body. Functions that call `ensureCsrfCookie()` first must be asserted to request `GET /sanctum/csrf-cookie` **before** the main request (record request order in an array). `fetchCurrentUser` is covered by `useUser.test.ts` — only add what is missing.
- Mutations (P3): `useLogin` invalidates `["auth","user"]` on success only; `useLogout` sets `["auth","user"]` to `null` on success and leaves it on failure; `useUpdateAccount` cache effect (read the source); the rest: request made, error propagates.
- Guards: `useRequireAuth` → `router.replace("/login")` once the user check finishes with no user, `isChecking` true while pending and while no user; `useRequireGuest` → redirect target when signed in (read the source); `useRequireInternal` → behavior for `userType` `"internal"` vs `"company"`/`"individual"` and for no user. `RequirePermission`: spinner while pending, `Forbidden` without permission, children with `permission`, children with any one of `permissions`. `RequireRole`: same matrix with roles.
- Permission hooks: `useAuthPermissions()` returns working checkers bound to the signed-in user; `useHasAnyRole` / `useHasAllRoles` / `useHasAnyPermission` / `useHasAllPermissions` return `false` while signed out.

- [ ] **Step 1:** Read `lib/auth/**` and list each export's branches.
- [ ] **Step 2:** Write `api.test.ts`; run it; break one expectation to confirm it can fail; restore.
- [ ] **Step 3:** Write the mutation tests, then the guard tests, then the permission-hook tests, running each file as you go.
- [ ] **Step 4:** Verification with `--coverage.include="lib/auth/**"`.
- [ ] **Step 5:** No commit. Report.

## Task 3: Auth and verify-email screens

**Files:**
- Test: `tests/integration/app/auth/login/page.test.tsx` (covers `_hooks/use-login-form.ts` through the page)
- Test: `tests/integration/app/auth/register/page.test.tsx` (covers `_hooks/use-register-form.ts`)
- Test: `tests/integration/app/auth/forgot-password/page.test.tsx` (covers `_hooks/use-forgot-password-form.ts`)
- Test: `tests/integration/app/auth/reset-password/reset-password-view.test.tsx` (covers `_components/reset-password-view.tsx` + `_hooks/use-reset-password-form.ts`)
- Test: `tests/integration/app/auth/reset-password/page.test.tsx`
- Test: `tests/integration/app/auth/_components/{auth-card,guest-guard,input-field}.test.tsx`
- Test: `tests/unit/app/auth/register/_components/masked-input.test.tsx`
- Test: `tests/integration/app/verify/verify-email/verify-email-view.test.tsx` (covers `_components/verify-email-view.tsx` + `_hooks/use-verify-email-page.ts`)
- Test: `tests/integration/app/verify/verify-email/page.test.tsx`
- Test: `tests/integration/app/auth/layout.test.tsx`, `tests/integration/app/verify/layout.test.tsx`

**Interfaces:**
- Consumes: `signInAs`, `signOut`, `router`, `setUrl`, `toast`.
- Produces: nothing new.

Must cover (P4 for every form, P6 for every page):
- Login: field errors block submit; success → `router.push("/")`; 422 → `toast.error` with the first field message; other failure → backend `message`, else "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"; submit disabled while pending; the guest guard redirects a signed-in user.
- Register: switching company/individual swaps the required fields; masked inputs format tax id / id card / phone as the user types; the payload the backend receives (digits only where the hook strips them — read the hook); success effect; 422 field errors mapped onto fields; terms checkbox required.
- Forgot password: success message/state; resend cooldown or second-send behavior if the hook has one (read it); error fallback.
- Reset password: reads `token`/`email` from the URL (`setUrl`); missing token state; success → redirect target; error fallback.
- Verify email: reads `id`, `hash`, `expires`, `signature` from the URL; success, already-verified and failure states; resend button.

- [ ] **Step 1:** Read every file listed and its hook; list the states.
- [ ] **Step 2:** Write and run the login test first (it is the smallest form); confirm one expectation can fail.
- [ ] **Step 3:** Write and run the remaining files one at a time.
- [ ] **Step 4:** Verification with `--coverage.include="app/(auth)/**" --coverage.include="app/(verify)/**"`.
- [ ] **Step 5:** No commit. Report.

## Task 4: Notifications

**Files:**
- Test: `tests/integration/lib/notification/api.test.ts`
- Test: `tests/integration/lib/notification/queries/{useNotifications,useUnreadNotificationCount}.test.ts`
- Test: `tests/integration/lib/notification/mutations/{useMarkNotificationRead,useMarkAllNotificationsRead}.test.ts`
- Test: `tests/integration/lib/notification/useSelectNotification.test.ts`
- Test: `tests/integration/app/public/notifications/page.test.tsx`
- Test: `tests/integration/app/public/notifications/_components/{notification-list,notification-pagination}.test.tsx`
- Create: `tests/fixtures/notifications.ts`

**Interfaces:**
- Consumes: Test Infrastructure.
- Produces: `makeNotification(overrides?: Partial<Notification>): Notification` in `tests/fixtures/notifications.ts` (type from `lib/notification/types.ts`), used by Task 5.

Must cover:
- The two mutations do optimistic cache updates (46 and 55 lines): assert the cache changes before the request resolves, is rolled back when the request fails, and the unread count query is updated/invalidated as the source does.
- `useUnreadNotificationCount`: polling interval option if present (assert the option value via `queryClient.getQueryCache().find(...)?.options`, do not wait for real time).
- `useSelectNotification`: marks unread ones read and navigates to `getNotificationMeta(type).href`; already-read ones only navigate.
- Page: pagination via URL `?page=`, empty state, error state, list items show time via `formatNotificationTime` (freeze time).

- [ ] **Step 1:** Read the sources; write `makeNotification`.
- [ ] **Step 2:** Write and run the API and query tests.
- [ ] **Step 3:** Write and run the mutation tests including rollback; confirm a rollback assertion can fail by removing the error handler temporarily.
- [ ] **Step 4:** Write and run the hook, component and page tests.
- [ ] **Step 5:** Verification with `--coverage.include="lib/notification/**" --coverage.include="app/(public)/notifications/**"`. No commit. Report.

## Task 5: Site navbar and public/profile shell

**Files:**
- Test: `tests/integration/components/navbar.test.tsx`
- Test: `tests/integration/app/public/profiles/_components/{navbar,sidebar,auth-guard,section-title}.test.tsx`
- Test: `tests/integration/app/public/profiles/layout.test.tsx`, `tests/integration/app/public/profiles/page.test.tsx`
- Test: `tests/integration/app/public/{layout,page}.test.tsx`
- Test: `tests/integration/app/public/{privacy,terms}/page.test.tsx`

**Interfaces:**
- Consumes: `makeNotification` (Task 4), `signInAs`, `signOut`, `router`, `setUrl`.
- Produces: nothing new.

Must cover:
- `components/navbar.tsx` (487 lines): signed-out vs signed-in vs internal-user menus; unread badge count; notification dropdown list and "mark all read"; logout → `useLogout` request then the redirect the code does; vendor profile completeness warning (from `useVendorProfileCompleteness`); mobile menu open/close; active link by `usePathname`.
- Profiles `auth-guard`: redirect when signed out, behavior for internal users (read it), children when allowed.
- Sidebar: links and the active item by pathname; completeness markers if present.
- Layout/page files: render without crashing and show their landmark/heading; skip `metadata` objects (not runtime behavior).

- [ ] **Step 1:** Read the sources. For `navbar.tsx`, list each conditional block with its line range.
- [ ] **Step 2:** Write and run the navbar test block by block.
- [ ] **Step 3:** Write and run the remaining files.
- [ ] **Step 4:** Verification with `--coverage.include="components/navbar.tsx" --coverage.include="app/(public)/profiles/_components/**" --coverage.include="app/(public)/{layout,page}.tsx" --coverage.include="app/(public)/profiles/{layout,page}.tsx" --coverage.include="app/(public)/{privacy,terms}/**"`.
- [ ] **Step 5:** No commit. Report.

## Task 6: Vendor self-service — profile library, account and password

**Files:**
- Test: `tests/integration/lib/vendor/profile/api.test.ts`
- Test: `tests/integration/lib/vendor/profile/queries/{useVendorProfile,useVendorProfileCompleteness}.test.ts`
- Test: `tests/integration/lib/vendor/profile/mutations/{useDeleteVendorContact,useDeleteVendorDocument,useSaveVendorContact,useSaveVendorDocument,useUpdateVendorInfo}.test.ts`
- Test: `tests/integration/app/public/profiles/_components/{account-info-section,change-password-section}.test.tsx` (covers `_hooks/use-account-info-form.ts` and `_hooks/use-change-password-form.ts`)
- Create: `tests/fixtures/vendor-profile.ts`

**Interfaces:**
- Consumes: Test Infrastructure.
- Produces: in `tests/fixtures/vendor-profile.ts` (types from `lib/vendor/profile/types.ts`): `makeVendorProfile(overrides?)`, `makeCompanyVendorProfile(overrides?)`, `makeIndividualVendorProfile(overrides?)`, `makeVendorContact(overrides?)`, `makeVendorDocument(overrides?)` — export whichever of these the types support; Tasks 7, 8 and 9 use them.

Must cover:
- API: document upload sends `multipart/form-data` (assert with `await request.formData()` the file name and fields); masked ids are passed through untouched.
- `useVendorProfileCompleteness` (46 lines): every rule that marks a section incomplete, for company and individual vendors.
- `useUpdateVendorInfo` (29 lines): its cache effects.
- Account info form: prefilled from the current user; success updates the cached user; 422 maps to fields.
- Change password form: mismatch blocks submit; success resets the form; wrong current password (422) shows on `currentPassword`.

- [ ] **Step 1:** Read the sources and types; write the fixtures.
- [ ] **Step 2:** Write and run the API, query and mutation tests.
- [ ] **Step 3:** Write and run the two section tests.
- [ ] **Step 4:** Verification with `--coverage.include="lib/vendor/profile/**" --coverage.include="app/(public)/profiles/_components/{account-info-section,change-password-section}.tsx" --coverage.include="app/(public)/profiles/_hooks/**"`.
- [ ] **Step 5:** No commit. Report.

## Task 7: Vendor self-service — contacts and documents

**Files:**
- Test: `tests/integration/app/public/profiles/contract/page.test.tsx`
- Test: `tests/integration/app/public/profiles/contract/_components/{add-contact-dialog,edit-contact-dialog,view-contact-dialog,delete-contact-dialog,contact-form-fields}.test.tsx` (the add/edit tests cover `_hooks/use-add-contact-form.ts`)
- Test: `tests/integration/app/public/profiles/document/page.test.tsx`
- Test: `tests/integration/app/public/profiles/document/_components/{document-row,delete-document-dialog}.test.tsx`
- Test: `tests/unit/app/public/profiles/data/{business-types,document-types,provinces}.test.ts`

**Interfaces:**
- Consumes: Task 6 fixtures (`makeVendorContact`, `makeVendorDocument`, profile builders).
- Produces: nothing new.

Must cover:
- Contacts: add (P5 + P4: phone is formatted as typed, invalid phone blocks submit with "เบอร์โทรไม่ถูกต้อง (ขึ้นต้นด้วย 0 และมี 9-10 หลัก)"), edit prefills, view shows all fields and dashes for empty ones, delete confirm/cancel, main-contact rules the code enforces (read it).
- `document-row` (234 lines): every document status shown; upload a file (`user.upload`) sends form data; replace and delete; file type/size validation if present; reject reason shown for rejected documents.
- Data files: each list has no duplicate values; `document-types` required flags match what `useVendorProfileCompleteness` reads.

- [ ] **Step 1:** Read the sources.
- [ ] **Step 2:** Write and run the contact tests, then the document tests, then the data tests.
- [ ] **Step 3:** Verification with `--coverage.include="app/(public)/profiles/contract/**" --coverage.include="app/(public)/profiles/document/**" --coverage.include="app/(public)/profiles/data/**"`.
- [ ] **Step 4:** No commit. Report.

## Task 8: Vendor self-service — business info

**Files:**
- Test: `tests/integration/app/public/profiles/vendor-info/page.test.tsx`
- Test: `tests/integration/app/public/profiles/vendor-info/_components/{company-info-form,individual-info-form,business-type-combobox}.test.tsx` (the forms cover `_hooks/use-vendor-info-form.ts`)
- Test: `tests/unit/app/public/profiles/vendor-info/_lib/format-thai-id.test.ts`

**Interfaces:**
- Consumes: Task 6 fixtures.
- Produces: nothing new.

Must cover:
- `formatThaiId`: digits and `X` kept, grouping `X-XXXX-XXXXX-XX-X`, max 13 characters, lowercase `x` upper-cased.
- Both forms: prefilled from the profile (masked ids shown formatted); saving without touching a masked id sends it unchanged and succeeds; postal code and 13-digit rules block submit with their messages; `vendorType` is added to the payload; success toast "บันทึกข้อมูลกิจการสำเร็จ"; 422 field errors land on the fields and the toast says "กรุณาตรวจสอบข้อมูลที่กรอก"; other failure falls back to "บันทึกข้อมูลกิจการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"; the cancel/reset button restores the profile values; warnings on empty fields (`warning={!detail.x}`).
- Individual form: default prefix "นาย" when empty.
- Page: picks the company or individual form by vendor type; loading and error states.

- [ ] **Step 1:** Read the sources.
- [ ] **Step 2:** Write and run `format-thai-id.test.ts`, then the forms, then the combobox and page.
- [ ] **Step 3:** Verification with `--coverage.include="app/(public)/profiles/vendor-info/**"`.
- [ ] **Step 4:** No commit. Report.

## Task 9: Vendor approval — library and list page

**Files:**
- Test: `tests/integration/lib/vendor/approval/api.test.ts`
- Test: `tests/integration/lib/vendor/approval/queries/{useVendorList,useVendorDetail}.test.ts`
- Test: `tests/integration/lib/vendor/approval/mutations/{useApproveVendor,useApproveVendorDocument,useDeleteVendor,usePendingVendor,usePendingVendorDocument,useRejectVendor,useRejectVendorDocument,useInvalidateVendors}.test.ts`
- Test: `tests/integration/app/dashboard/vendors/page.test.tsx` (covers `_hooks/use-vendor-list-page.ts`)
- Test: `tests/integration/app/dashboard/vendors/_components/{delete-vendor-dialog,reject-reason-dialog,vendor-stats-cards,vendor-list-skeleton}.test.tsx`
- Test: `tests/integration/app/dashboard/vendors/_components/filters/vendor-filter-bar.test.tsx`
- Test: `tests/integration/app/dashboard/vendors/_components/table/{columns,vendor-card}.test.tsx`
- Create: `tests/fixtures/vendor-approval.ts`

**Interfaces:**
- Consumes: Test Infrastructure; Task 6 fixtures if the approval types reuse profile types.
- Produces: `makeVendorListItem(overrides?)`, `makeVendorDetail(overrides?)` in `tests/fixtures/vendor-approval.ts` (types from `lib/vendor/approval/types.ts`), used by Task 10.

Must cover:
- Page (P6): permission gate with the vendor permissions the page requires (read the page); URL filters → request query; search debounce; stats cards from `meta`; every empty/error message; mobile cards vs table (`renderMobileCard`).
- `columns.tsx` (193 lines): render a `DataTable` with these columns (or call each column's `cell` through a rendered table) and assert every cell's output, including status badge, dates, and the actions menu items gated by permission.
- Reject dialog: reason required; sends the reason; closes on success.

- [ ] **Step 1:** Read the sources; write the fixtures.
- [ ] **Step 2:** Write and run library tests, then components, then the page.
- [ ] **Step 3:** Verification with `--coverage.include="lib/vendor/approval/**" --coverage.include="app/dashboard/vendors/{page.tsx,_hooks/**,_components/**}"`.
- [ ] **Step 4:** No commit. Report.

## Task 10: Vendor approval — detail page

**Files:**
- Test: `tests/integration/app/dashboard/vendors/detail/page.test.tsx` (covers `_hooks/use-vendor-detail-page.ts`)
- Test: `tests/integration/app/dashboard/vendors/detail/_components/{vendor-document-approval-row,vendor-profile-info}.test.tsx`

**Interfaces:**
- Consumes: `makeVendorDetail`, `makeVendorListItem` (Task 9), Task 6 fixtures.
- Produces: nothing new.

Must cover:
- Page (282 lines): `?id=` from the URL (`setUrl`), invalid/missing id state, 404 state, approve / reject (with reason) / set pending / delete flows with their toasts and redirects, actions hidden without permission, mobile bottom bar actions (`data-bottom-bar`).
- Document approval row: approve / reject (reason) / pending per document, file link, status badge, disabled while pending.
- Profile info: company vs individual fields, masked ids, dashes for empty values.

- [ ] **Step 1:** Read the sources.
- [ ] **Step 2:** Write and run the two component tests, then the page.
- [ ] **Step 3:** Verification with `--coverage.include="app/dashboard/vendors/detail/**"`.
- [ ] **Step 4:** No commit. Report.

## Task 11: Internal employees — library, shared selects, list page

**Files:**
- Test: `tests/integration/lib/internal-profiles/api.test.ts`
- Test: `tests/integration/lib/internal-profiles/queries/{useAvailableInternalProfiles,useDepartmentList,useDepartmentOptions,useInternalProfileDetail,useInternalProfileList,useInternalProfileOptions,usePositionList,usePositionOptions}.test.ts`
- Test: `tests/integration/lib/internal-profiles/mutations/{useCreateDepartment,useCreateInternalProfile,useCreatePosition,useDeleteDepartment,useDeleteInternalProfile,useDeletePosition,useInvalidateDepartments,useInvalidateInternalProfiles,useInvalidatePositions,useUpdateDepartment,useUpdateInternalProfile,useUpdatePosition}.test.ts`
- Test: `tests/integration/components/{department-select,position-select,internal-profile-select,internal-profile-combobox}.test.tsx`
- Test: `tests/integration/app/dashboard/internal-employees/page.test.tsx` (covers `_hooks/use-internal-profile-list-page.ts`)
- Test: `tests/integration/app/dashboard/internal-employees/_components/dialogs/{internal-profile-form-dialog,edit-internal-profile-dialog,delete-internal-profile-dialog}.test.tsx` (cover `_hooks/use-internal-profile-form.ts` and `_hooks/use-edit-internal-profile-form.ts`)
- Test: `tests/integration/app/dashboard/internal-employees/_components/filters/internal-profile-filter-bar.test.tsx`
- Test: `tests/integration/app/dashboard/internal-employees/_components/table/{columns,internal-profile-card}.test.tsx`
- Test: `tests/integration/app/dashboard/internal-employees/_components/internal-profile-list-skeleton.test.tsx`
- Create: `tests/fixtures/internal-profiles.ts`

**Interfaces:**
- Consumes: Test Infrastructure.
- Produces: in `tests/fixtures/internal-profiles.ts` (types from `lib/internal-profiles/types.ts`): `makeDepartment(overrides?)`, `makePosition(overrides?)`, `makeInternalProfile(overrides?)`, and option builders `makeDepartmentOption(overrides?)` / `makePositionOption(overrides?)` / `makeInternalProfileOption(overrides?)` if those types exist. Used by Tasks 12, 13, 14, 17, 18, 19, 20.

Must cover:
- `department-select` / `position-select` (122 lines each): load options, choose one → `onChange(id as string)`, inline create (if present) calls the create mutation and selects the new item, empty and error states.
- `internal-profile-combobox`: typing filters, selecting calls back, "no results" text.
- Page: `?search=` deep link (the route helper `routes.dashboards.internal_employees.index(search)`), filters, empty/error states, create/edit/delete dialogs reachable with permission only.
- Form dialogs (P4 + P5): firstname/lastname required, optional fields sent as the hook maps them (empty → `null`/omitted — read the hook), 422 field mapping, success toast and close.

- [ ] **Step 1:** Read the sources; write the fixtures.
- [ ] **Step 2:** Library tests, then shared selects, then dialogs, then the page — run each file as written.
- [ ] **Step 3:** Verification with `--coverage.include="lib/internal-profiles/**" --coverage.include="components/{department-select,position-select,internal-profile-select,internal-profile-combobox}.tsx" --coverage.include="app/dashboard/internal-employees/{page.tsx,_hooks/**,_components/**}"`.
- [ ] **Step 4:** No commit. Report.

## Task 12: Internal employees — departments and positions

**Files:**
- Test: `tests/integration/app/dashboard/internal-employees/departments-positions/page.test.tsx`
- Test: `tests/integration/app/dashboard/internal-employees/departments-positions/_components/{department-tab,position-tab,department-form-dialog,position-form-dialog,edit-department-dialog,edit-position-dialog,delete-department-dialog,delete-position-dialog,list-table-skeleton}.test.tsx` (the dialog tests cover the four `_hooks/use-*-form.ts`)

**Interfaces:**
- Consumes: `makeDepartment`, `makePosition` (Task 11).
- Produces: nothing new.

Must cover: tab switching; each list's loading/empty/error; create/edit/delete for both (P5); name required; 422 duplicate-name message on the field; permission-gated actions.

- [ ] **Step 1:** Read the sources.
- [ ] **Step 2:** Write and run department files, then position files, then the page.
- [ ] **Step 3:** Verification with `--coverage.include="app/dashboard/internal-employees/departments-positions/**"`.
- [ ] **Step 4:** No commit. Report.

## Task 13: User management — library, shared user components, list page

**Files:**
- Test: `tests/integration/lib/user/management/api.test.ts`
- Test: `tests/integration/lib/user/management/queries/{usePermissions,useRoles,useUserDetail,useUserList,useUserSessions}.test.ts`
- Test: `tests/integration/lib/user/management/mutations/{useCreatePermission,useCreateRole,useCreateUser,useDeletePermission,useDeleteRole,useDeleteUser,useInvalidateUsers,useRevokeAllUserSessions,useRevokeUserSession,useUpdatePermission,useUpdateRole,useUpdateUser,useUpdateUserStatus}.test.ts`
- Test: `tests/integration/components/{role-select,user-status-select,permission-picker}.test.tsx`
- Test: `tests/integration/app/dashboard/users/page.test.tsx` (covers `_hooks/use-user-list-page.ts`)
- Test: `tests/integration/app/dashboard/users/_components/filters/user-filter-bar.test.tsx`
- Test: `tests/integration/app/dashboard/users/_components/table/{columns,user-card,delete-user-dialog}.test.tsx`
- Test: `tests/integration/app/dashboard/users/_components/user-list-skeleton.test.tsx`
- Create: `tests/fixtures/user-management.ts`

**Interfaces:**
- Consumes: `makeUser`, `makeInternalProfile` (Task 11).
- Produces: in `tests/fixtures/user-management.ts` (types from `lib/user/management/types.ts`): `makeManagedUser(overrides?)`, `makeUserDetail(overrides?)`, `makeRole(overrides?)`, `makePermission(overrides?)`, `makeUserSession(overrides?)` — whichever the types define. Used by Tasks 14, 15, 16.

Must cover:
- `user-status-select`: changing status calls `useUpdateUserStatus` and toasts; rollback/disabled behavior on failure as the code does; options shown per current status.
- `permission-picker`: grouped permissions, select/deselect single and whole group, already-granted-by-role permissions shown as the code shows them.
- List page: filters (role, status, user type), search, sorting, deep links, empty/error, actions by permission.

- [ ] **Step 1:** Read the sources; write the fixtures.
- [ ] **Step 2:** Library tests, then shared components, then list page files.
- [ ] **Step 3:** Verification with `--coverage.include="lib/user/management/**" --coverage.include="components/{role-select,user-status-select,permission-picker}.tsx" --coverage.include="app/dashboard/users/{page.tsx,_hooks/use-user-list-page.ts,_components/filters/**,_components/table/**,_components/user-list-skeleton.tsx}"`.
- [ ] **Step 4:** No commit. Report.

## Task 14: User management — create and edit

**Files:**
- Test: `tests/integration/app/dashboard/users/create/page.test.tsx` (covers `_hooks/use-create-user-form.ts` and `_components/create-internal-user-fields.tsx`)
- Test: `tests/integration/app/dashboard/users/edit/page.test.tsx` (covers `_hooks/use-update-account-form.ts` and `_hooks/use-update-internal-user-form.ts`)

**Interfaces:**
- Consumes: Task 13 fixtures, Task 11 fixtures, `signInAs`, `setUrl`, `router`.
- Produces: nothing new.

Must cover (P4 + P6):
- Create: choose an available internal profile, role and extra permissions; payload; success → redirect target and toast; 422 per field (username/email taken); permission gate.
- Edit (222 lines): `?id=` from URL; internal vs external user picks the right form; empty password means "unchanged" and is not sent (or sent as the hook does — read it); role change updates the permission picker; success/error paths; editing yourself vs another user if the page distinguishes.

- [ ] **Step 1:** Read the sources.
- [ ] **Step 2:** Write and run the create page test, then the edit page test.
- [ ] **Step 3:** Verification with `--coverage.include="app/dashboard/users/{create,edit}/**" --coverage.include="app/dashboard/users/_hooks/{use-create-user-form,use-update-account-form,use-update-internal-user-form}.ts" --coverage.include="app/dashboard/users/_components/create-internal-user-fields.tsx"`.
- [ ] **Step 4:** No commit. Report.

## Task 15: User management — detail page

**Files:**
- Test: `tests/integration/app/dashboard/users/detail/page.test.tsx`
- Test: `tests/integration/app/dashboard/users/detail/_components/{user-detail-header,overview-tab,permissions-tab,sessions-tab}.test.tsx` (the sessions test covers `_hooks/use-session-revocation.ts`)

**Interfaces:**
- Consumes: Task 13 fixtures.
- Produces: nothing new.

Must cover: tabs; header status select and actions by permission; overview fields with dashes; permissions tab shows role vs direct permissions; sessions tab (173 lines) lists sessions with device/IP/last active (freeze time), marks the current session, revoke one and revoke all with confirmation, toasts, and the list refreshes.

- [ ] **Step 1:** Read the sources.
- [ ] **Step 2:** Write and run the component tests, then the page.
- [ ] **Step 3:** Verification with `--coverage.include="app/dashboard/users/detail/**"`.
- [ ] **Step 4:** No commit. Report.

## Task 16: User management — roles and permissions

**Files:**
- Test: `tests/integration/app/dashboard/users/roles-permissions/page.test.tsx`
- Test: `tests/integration/app/dashboard/users/roles-permissions/_components/{role-tab,permission-tab,role-form-dialog,permission-form-dialog,delete-role-dialog,delete-permission-dialog}.test.tsx` (the form dialogs cover `_hooks/use-role-form.ts` and `_hooks/use-permission-form.ts`)
- Test: `tests/integration/app/dashboard/users/roles-permissions/_components/table/columns.test.tsx`
- Test: `tests/unit/app/dashboard/users/roles-permissions/_data/group-labels.test.ts`

**Interfaces:**
- Consumes: `makeRole`, `makePermission` (Task 13).
- Produces: nothing new.

Must cover: create/edit role (name format error text, at least one permission), create/edit permission (`prefix.action` format), delete with the in-use warning if the code has one, tabs, permission gate, `group-labels` maps every permission prefix used in fixtures.

- [ ] **Step 1:** Read the sources.
- [ ] **Step 2:** Write and run the dialogs, tabs, columns, data, then the page.
- [ ] **Step 3:** Verification with `--coverage.include="app/dashboard/users/roles-permissions/**"`.
- [ ] **Step 4:** No commit. Report.

## Task 17: Tender projects — library, status select, list page

**Files:**
- Test: `tests/integration/lib/tender/tender-projects/api.test.ts`
- Test: `tests/integration/lib/tender/tender-projects/queries/{useTenderProjectOptions,useTendersProjectDetail,useTendersProjectList}.test.ts`
- Test: `tests/integration/lib/tender/tender-projects/mutations/{useCreateTenderProject,useDeleteTenderProject,useUpdateTenderProject,useUpdateTenderProjectStatus}.test.ts`
- Test: `tests/unit/lib/tender/procurement-methods.test.ts`
- Test: `tests/integration/components/tender-project-status-select.test.tsx`
- Test: `tests/integration/app/dashboard/tender-projects/page.test.tsx` (covers `_hooks/use-tender-project-list-page.ts`)
- Test: `tests/integration/app/dashboard/tender-projects/_components/filters/{tender-project-filter-bar,tender-project-filter-fields,tender-project-filter-sheet,tender-project-sort-select}.test.tsx`
- Test: `tests/integration/app/dashboard/tender-projects/_components/table/{columns,tender-project-card}.test.tsx`
- Test: `tests/integration/app/dashboard/tender-projects/_components/{tender-project-stats-cards,tender-project-list-skeleton}.test.tsx`
- Create: `tests/fixtures/tender-projects.ts`

**Interfaces:**
- Consumes: Task 11 fixtures (department options, internal profiles).
- Produces: in `tests/fixtures/tender-projects.ts` (types from `lib/tender/tender-projects/types.ts`): `makeTenderProject(overrides?: Partial<TenderProjects>): TenderProjects`, `makeTenderProjectOption(overrides?)`. Used by Tasks 18, 19, 20.

Must cover:
- `use-tender-project-list-page` (182 lines): every URL param parsed and validated (status, department, fiscal year, procurement method, sort), invalid values ignored, draft vs applied filters, `submitFilters` / `clearFilters` URLs, `activeFilterCount`, stats from `meta.stats`.
- Status select: allowed transitions shown per current status (read the source), change calls `PATCH …/status` and toasts, failure toast.
- Columns/card: budget with ฿ and satang, allocation bar, period, links to `routes.dashboards.tender_project.detail(id)`, actions by permission.
- `procurement-methods`: the list is what filters and the combobox accept.

- [ ] **Step 1:** Read the sources; write the fixtures.
- [ ] **Step 2:** Library tests (the delete mutation already has dialog coverage — still test the hook itself per P3).
- [ ] **Step 3:** Status select, filters, table, stats, then the page.
- [ ] **Step 4:** Verification with `--coverage.include="lib/tender/tender-projects/**" --coverage.include="lib/tender/procurement-methods.ts" --coverage.include="components/tender-project-status-select.tsx" --coverage.include="app/dashboard/tender-projects/{page.tsx,_hooks/use-tender-project-list-page.ts,_components/filters/**,_components/table/**,_components/tender-project-stats-cards.tsx,_components/tender-project-list-skeleton.tsx}"`.
- [ ] **Step 5:** No commit. Report.

## Task 18: Tender projects — create and edit dialogs

**Files:**
- Test: `tests/integration/app/dashboard/tender-projects/_components/dialogs/{create-tender-project-dialog,edit-tender-project-dialog,procurement-method-combobox}.test.tsx` (cover `_hooks/use-create-tender-project-form.ts` and `_hooks/use-edit-tender-project-form.ts`)

**Interfaces:**
- Consumes: `makeTenderProject` (Task 17), Task 11 fixtures.
- Produces: nothing new.

Must cover (P4 + P5): required fields and their messages; budget "งบประมาณต้องมากกว่า 0" and "งบประมาณไม่ถูกต้อง"; end date before start date blocked; date pickers write ISO dates the hook sends (read the hook); department → person-in-charge dependency if present; fiscal-year options; payload shape (numbers vs strings as the hook converts); success toast with project code, close, list invalidated; 422 per field; edit prefills every field from the project and only enabled when allowed by status (read the dialog).

- [ ] **Step 1:** Read the sources.
- [ ] **Step 2:** Write and run the combobox test, then create, then edit.
- [ ] **Step 3:** Verification with `--coverage.include="app/dashboard/tender-projects/_components/dialogs/**" --coverage.include="app/dashboard/tender-projects/_hooks/{use-create-tender-project-form,use-edit-tender-project-form}.ts"`.
- [ ] **Step 4:** No commit. Report.

## Task 19: Tender projects — detail page

**Files:**
- Test: `tests/integration/app/dashboard/tender-projects/detail/page.test.tsx` (covers `_hooks/use-tender-project-detail-page.ts`)
- Test: `tests/integration/app/dashboard/tender-projects/detail/_components/tender-project-tor-list.test.tsx`

**Interfaces:**
- Consumes: `makeTenderProject` (Task 17), `makeTor` (Task 20 creates it — if Task 20 has not run yet, create `tests/fixtures/tors.ts` with `makeTor(overrides?: Partial<Tor>): Tor` here and Task 20 reuses it).
- Produces: `makeTor` in `tests/fixtures/tors.ts` if not already present.

Must cover: `?id=` handling, 404/error, all detail fields, budget allocation (full variant), status select and edit/delete entry points by permission, delete → redirect to the list, TOR list with count, empty state and links to `routes.dashboards.tors.detail(id)`, TOR visibility rules the list applies (read the source and the 2026-10 TOR specs).

- [ ] **Step 1:** Read the sources.
- [ ] **Step 2:** Write and run the TOR list test, then the page.
- [ ] **Step 3:** Verification with `--coverage.include="app/dashboard/tender-projects/detail/**"`.
- [ ] **Step 4:** No commit. Report.

## Task 20: TOR — library, list and detail

**Files:**
- Test: `tests/integration/lib/tender/tor/api.test.ts`
- Test: `tests/integration/lib/tender/tor/queries/{useTorDetail,useTorsList}.test.ts`
- Test: `tests/integration/app/dashboard/tors/page.test.tsx` (covers `_hooks/use-tor-list-page.ts`)
- Test: `tests/integration/app/dashboard/tors/_components/filters/{tor-filter-bar,tor-filter-fields,tor-filter-sheet,tor-sort-select,tender-project-filter-combobox}.test.tsx`
- Test: `tests/integration/app/dashboard/tors/_components/table/{columns,tor-card}.test.tsx`
- Test: `tests/integration/app/dashboard/tors/_components/tor-list-skeleton.test.tsx`
- Test: `tests/integration/app/dashboard/tors/detail/page.test.tsx` (covers `detail/_hooks/use-tor-detail-page.ts`)
- Create or extend: `tests/fixtures/tors.ts`

**Interfaces:**
- Consumes: `makeTenderProjectOption` (Task 17), Task 11 fixtures, `makeTor` if Task 19 created it.
- Produces: `makeTor(overrides?: Partial<Tor>): Tor` in `tests/fixtures/tors.ts`.

Must cover:
- `use-tor-list-page` (174 lines): `parseStatus` / department / fiscal year / procurement method / tender project (`"none"` vs id) parsing; staged filters are not applied until `submitFilters`; `submitFilters` URL including sort `"latest"` → no sort params; `clearFilters`; draft sort resync when the URL sort changes (`setUrl` + `rerender`); `activeFilterCount`.
- Page: gate with `TOR_VIEW_PERMISSIONS` (any one of `tors.viewAny`, `tors.viewDepartment`, `tors.viewOwn`); the three empty messages "ไม่พบ TOR ที่ตรงกับคำค้นหา", "ไม่พบ TOR ที่ตรงกับเงื่อนไขที่เลือก", "ยังไม่มี TOR ในระบบ"; error "ไม่สามารถโหลดข้อมูล TOR ได้ กรุณาลองใหม่อีกครั้ง"; department and project options failing still renders the fixed options.
- Tender project filter combobox: "ทุกโครงการ", "ไม่สังกัดโครงการ", project options, unknown id.
- Detail: `?id=`, every section, bidding window (frozen time), person rows with "-" when null and approver date only when `approvedAt` is set, 404/error.

- [ ] **Step 1:** Read the sources; write or extend the fixture.
- [ ] **Step 2:** Library tests, then filters/table, then the list page, then the detail page.
- [ ] **Step 3:** Verification with `--coverage.include="lib/tender/tor/**" --coverage.include="app/dashboard/tors/**"`.
- [ ] **Step 4:** No commit. Report.

## Task 21: Dashboard shell and app root

**Files:**
- Test: `tests/integration/app/dashboard/_components/{app-sidebar,dashboard-breadcrumb,dashboard-navbar,internal-guard}.test.tsx`
- Test: `tests/integration/app/dashboard/{layout,page}.test.tsx`
- Test: `tests/integration/app/dashboard/{reports,settings}/page.test.tsx`
- Test: `tests/integration/app/providers.test.tsx`
- Test: `tests/integration/app/auth/layout.test.tsx` and `tests/integration/app/verify/layout.test.tsx` only if Task 3 did not create them

**Interfaces:**
- Consumes: `signInAs`, `signOut`, `setUrl`, `router`, `useBreadcrumbStore`.
- Produces: nothing new.

Must cover:
- `app-sidebar` (157 lines): each menu item shown only with its role/permission (one test per item using `signInAs({ permissions: [...] })`), the active item by pathname, collapsed state if testable.
- `dashboard-breadcrumb`: renders the store's items, links vs current page, loading item.
- `internal-guard`: redirect for signed-out and non-internal users, children for internal users.
- `app/layout.tsx`: read the Next docs first; if it only wires fonts/metadata/`<html>` and cannot render in jsdom, do not test it — list it under Concerns as "not unit-testable" with the reason.

- [ ] **Step 1:** Read the sources and the Next docs for layouts.
- [ ] **Step 2:** Write and run each file.
- [ ] **Step 3:** Verification with `--coverage.include="app/dashboard/{_components/**,layout.tsx,page.tsx,reports/**,settings/**}" --coverage.include="app/{providers,layout}.tsx"`.
- [ ] **Step 4:** No commit. Report.

## Task 22: Whole-suite coverage report

**Files:**
- Create: `D:\E-Procurement-System\.superpowers\sdd\ftc-coverage-report.md`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: the report the human uses to decide on E2E.

- [ ] **Step 1:** Run `npx vitest run --coverage` and paste the four summary lines.
- [ ] **Step 2:** Run `npx vitest run --coverage --coverage.reporter=json-summary`, read `coverage/coverage-summary.json`, and list every source file below the Global Constraints bar with its line %, grouped by folder.
- [ ] **Step 3:** List every `it.skip("BUG: …")` in `tests/` (`grep -rn 'it.skip("BUG' tests`) with file:line and the one-line description.
- [ ] **Step 4:** List files that were declared not unit-testable, with the reason — these are the E2E candidates.
- [ ] **Step 5:** Run `npx tsc --noEmit` and `npx eslint tests`; paste results. No commit.
