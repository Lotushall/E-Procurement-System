# Select Options: Internal-User Access and Tender Project Options

## Problem

The frontend TOR list page (`frontend/docs/superpowers/specs/2026-10-31-tor-list-and-detail-page-design.md`)
needs two dropdowns that the backend cannot serve to its users today:

1. **Department filter.** `GET /dashboard/departments/select` is `role:admin`. A TOR
   viewer who is not an admin (for example one holding only `tors.viewDepartment`)
   gets 403 and cannot load the options.
2. **Tender project filter.** There is no options endpoint for tender projects at all.

The four existing `/select` endpoints return option lists (id + name), which are not
sensitive. Access to the pages that use them is already controlled by each page's own
list/CRUD routes and frontend guards, so the option endpoints do not need to repeat it.
Vendors never use these endpoints: every caller in the frontend lives under
`app/dashboard/`.

## Scope

Backend only.

- Open all `/select` endpoints to every **internal** user; vendors get 403.
- Add `GET /dashboard/tender-projects/select`.

Out of scope: any other route's authorization, and the frontend (separate spec).

## Design

### Gate

One ability, registered in `App\Providers\AppServiceProvider::boot()` because it is
shared by several modules:

```php
Gate::define('select-options', fn (User $user): bool => $user->user_type === UserType::Internal);
```

This is the same internal-user check that `TenderProjectPolicy` and `TorPolicy` use.
The ability name matches no permission name, so Spatie's `Gate::before` hook (see the
comment in `TenderServiceProvider::boot()`) does not bypass it.

### Routes

Replace `->middleware('role:admin')` with `->middleware('can:select-options')` on:

| Route | Name |
|---|---|
| `GET /dashboard/departments/select` | `dashboard.departments.select` |
| `GET /dashboard/positions/select` | `dashboard.positions.select` |
| `GET /dashboard/internal-profiles/select` | `dashboard.internal-profiles.select` |
| `GET /dashboard/internal-profiles/select-available` | `dashboard.internal-profiles.select-available` |

Add to `routes/api/v1/dashboard/tender-projects.php`, **before** the `/{id}` route:

```php
Route::get('/select', [TenderProjectController::class, 'select'])
    ->middleware('can:select-options')
    ->name('dashboard.tender-projects.select');
```

(`/{id}` is constrained to `[0-9]{1,18}`, so `select` would not match it anyway, but
listing it first keeps the order the same as `internal-profiles.php`.)

All routes are already inside the `auth` group in `routes/api.php`, so unauthenticated
calls stay 401.

### Tender project options query

New `App\Modules\Tender\Application\Project\Queries\ListTenderProjectOptionsQuery`,
shaped like `ListDepartmentOptionsQuery`:

```php
/** @return array<int, array{id: int, projectCode: string, name: string}> */
public function execute(): array
```

- Reads `TenderProjects` directly, selecting only `id`, `project_code`, `name`,
  ordered by `project_code`.
- Returns every project regardless of status. Filtering TORs by an archived or
  cancelled project is still a valid question.
- **Not cached.** Department options are cached because departments rarely change;
  projects are created and edited often, and caching would need invalidation in the
  store/update/destroy use cases. The query is one indexed `SELECT` of three columns.

`TenderProjectController::select(): JsonResponse` returns
`{ "data": [{ "id": 1, "projectCode": "...", "name": "..." }, ...] }`.

### Error handling

| Case | Status |
|---|---|
| Not logged in | 401 |
| Vendor user | 403 |
| Any internal user, with or without roles/permissions | 200 |

## Testing

Pest, `RefreshDatabase`.

- Update the existing select tests, which currently expect a non-admin internal user to
  get 403: `DepartmentsSelectTest`, `PositionsSelectTest`,
  `SelectInternalProfileOptionsTest`, `SelectAvailableInternalProfilesTest`. Each one
  asserts 200 for an internal user with no role and no permissions, 403 for a vendor,
  and 401 when logged out.
- New `TenderProjectsSelectTest` (HTTP): the same three access cases; the exact JSON
  shape (`id`, `projectCode`, `name` only); ordered by `projectCode`; includes projects
  of every status.
