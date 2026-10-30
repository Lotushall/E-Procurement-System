# TORs: List and Detail Endpoints

## Problem

The TOR schema was reset on 2026-10-30 (ADR `docs/adr/0001-tor-progress-and-own-budget-fields.md`)
and seeded with sample data and `tors.*` permissions (`be92db9`), but there is
no TOR API yet. The frontend `dashboard/tors/page.tsx` is an empty shell
waiting for a list endpoint.

## Scope

Backend only. Two read endpoints for TORs: a paginated, filterable list and a
single-TOR detail, both gated by a new three-level visibility rule.

Out of scope: the frontend (separate plan), creating/editing/changing the
status of a TOR, stats/summary numbers, and the 5 pre-existing failing tests in
`ListTenderProjectsTest`/`StoreTenderProjectTest`.

## Design

### Architecture

Follows the existing read-path convention (`ListTenderProjectsQuery`,
`GetTenderProjectByIdQuery`): Application query classes query the Eloquent
model `Tors` directly through model-level `#[Scope]` methods. No repository
or domain entity is involved. The visibility rule is one more scope,
`visibleTo`, so list and detail share a single implementation.

New files sit next to the Project ones, under `Tor/`:

| Layer | File |
|---|---|
| Application | `Application/Tor/Queries/ListTorsQuery.php`, `Application/Tor/Queries/GetTorByIdQuery.php` |
| Presentation | `Presentation/Http/Controllers/TorController.php`, `Presentation/Http/Requests/Tor/ListTorsRequest.php`, `Presentation/Http/Resources/Tor/TorResource.php`, `Presentation/Policies/TorPolicy.php` |
| Routes | `routes/api/v1/dashboard/tors.php`, required from `routes/api.php` inside the `auth` group |

Modified: `Infrastructure/Models/Tor/Tors.php` (scopes),
`Providers/TenderServiceProvider.php` (Gate), `database/seeders/AdminUserSeeder.php`
(permissions).

### Permissions and visibility

Two new permissions, seeded in `AdminUserSeeder` with `updateOrCreate` and
given to the `admin` role like the existing `tors.*` ones:

| Permission | Label | Sees |
|---|---|---|
| `tors.viewAny` (exists) | ดูรายการ TOR | every TOR |
| `tors.viewDepartment` (new) | ดู TOR ของหน่วยงานตัวเอง | TORs whose `department_id` equals the viewer's internal profile `department_id` |
| `tors.viewOwn` (new) | ดู TOR ที่ตัวเองสร้าง | TORs whose `created_by` is the viewer |

Rules:

- A viewer holding several of these gets the **widest** one
  (`viewAny` > `viewDepartment` > `viewOwn`). Levels are not added together:
  a viewer with `viewDepartment` + `viewOwn` sees only their department's TORs,
  so a TOR they created under another department is hidden.
- `viewDepartment` with no internal profile, or a profile whose
  `department_id` is null, matches no rows (an empty list, not an error).
- Permission checks use `checkPermissionTo`, as every existing policy does.

### Authorization

`TorPolicy::viewAny(User $user): bool` returns true when the user is
`UserType::Internal` **and** holds at least one of the three permissions.

Gate ability (registered in `TenderServiceProvider::boot()`):
`Gate::define('tors.index', [TorPolicy::class, 'viewAny'])`. The ability name
must not equal any permission name, for the Spatie `Gate::before` reason already
documented in that provider. Both routes use `->middleware('can:tors.index')`.

### Routes

```php
Route::prefix('dashboard')->group(function () {
    Route::prefix('tors')->group(function () {
        Route::get('/', [TorController::class, 'index'])
            ->middleware('can:tors.index')
            ->name('dashboard.tors.index');

        Route::get('/{id}', [TorController::class, 'show'])
            ->middleware('can:tors.index')
            ->where('id', '[0-9]{1,18}')
            ->name('dashboard.tors.show');
    });
});
```

The id constraint is `[0-9]{1,18}` rather than `whereNumber`: an id too large for an
integer returns 404 instead of a TypeError 500. The Tender Project `{id}` routes got
the same constraint.

### Model scopes (`Tors`)

All are `#[Scope] protected function ...(Builder $query, ...): void` and do
nothing when their argument is null, matching `TenderProjects`.

| Scope | Behaviour |
|---|---|
| `visibleTo(User $viewer)` | `viewAny` → no filter; else `viewDepartment` → `where department_id = profile department` (or match nothing when there is none); else `viewOwn` → `where created_by = viewer id`; else match nothing |
| `search(?string)` | `tor_code LIKE %s%` or `title LIKE %s%` |
| `status(?string)` | exact match |
| `departmentId(?int)` | exact match |
| `fiscalYear(?int)` | exact match |
| `tenderProject(?string)` | `'none'` → `whereNull('tender_project_id')`; numeric → exact match |
| `procurementMethod(?string)` | exact match |
| `sort(?string $sortBy, ?string $direction)` | whitelisted column; default `created_at desc` |

"Match nothing" is `whereRaw('1 = 0')`, so an unauthorized call that slips past
the policy still returns no rows.

### Request validation (`ListTorsRequest`)

| Param | Rule |
|---|---|
| `search` | nullable, string, max 255 |
| `status` | nullable, one of the 10 statuses in the `tors` migration |
| `department_id` | nullable, integer, exists in `departments` |
| `fiscal_year` | nullable, integer |
| `tender_project_id` | nullable; either the literal `none` or an integer that exists in `tenders_projects` |
| `procurement_method` | nullable, string, max 255 |
| `sort_by` | nullable, one of `tor_code`, `title`, `budget_estimate`, `fiscal_year`, `bidding_end_at`, `created_at` |
| `sort_direction` | nullable, `asc` or `desc` |
| `page` | nullable, integer, min 1 |
| `per_page` | nullable, integer, 1–100 |

Invalid input returns 422 (standard FormRequest behaviour).

### Queries

- `ListTorsQuery::execute(User $viewer, ...filters, ?int $page, ?int $perPage): LengthAwarePaginator`
  eager-loads `TorsDepartment`, `TorsTenderProject`, `TorsCreatedBy`,
  `TorsApprovedBy`; applies `visibleTo` then every filter and `sort`; breaks ties
  with `orderBy('id', <same direction as sort, default desc>)`; paginates with
  default 20.
- `GetTorByIdQuery::execute(int $id, User $viewer): Tors` eager-loads the same
  relations, applies `visibleTo`, then `find($id)`; throws
  `ModelNotFoundException` when null, so a TOR that does not exist and a TOR the
  viewer may not see both return **404**.

### Response

`TorController::index`:

```json
{
  "data": [TorResource, ...],
  "meta": { "currentPage": 1, "lastPage": 2, "perPage": 20, "total": 30 }
}
```

`TorController::show`: `{ "data": TorResource }`.

`TorResource` (`$wrap = false`). Unlike `TenderProjectResource`, **every key is
always present**; a missing value is `null`, never an absent key. The frontend
has been bitten before by keys that `whenNotNull`/`whenLoaded` drop.

| Key | Value |
|---|---|
| `id` | int |
| `torCode`, `title`, `scopeOfWork` | string |
| `budgetEstimate` | decimal string, 2 places (model cast) |
| `procurementMethod` | string |
| `fiscalYear` | int |
| `biddingStartAt`, `biddingEndAt`, `approvedAt` | ISO 8601 string or null |
| `status` | string |
| `remark` | string or null |
| `createdAt` | ISO 8601 string |
| `department` | `DepartmentResource` |
| `tenderProject` | `{ id, projectCode, name }` or null |
| `createdBy`, `approvedBy` | `{ id, name, department: { id, name } \| null }` or null; all keys always present. `name` is the internal profile's `firstname lastname`, null without a profile. A TOR viewer needs no account details such as email or login times, so the full `UserResource` is not used. |

Both queries always eager-load the four relations, so the resource reads them
directly instead of using `whenLoaded`.

### Error handling

| Case | Status |
|---|---|
| Not logged in | 401 |
| Vendor user, or internal user with none of the three permissions | 403 |
| Invalid query parameter | 422 |
| Detail of a TOR that does not exist or is outside the viewer's visibility | 404 |

## Testing

Pest, `RefreshDatabase`, factories (`Tors::factory()`, `TenderProjects::factory()`).

- `TorPolicyTest`: true for each of the three permissions; false with none;
  false for a vendor user holding `tors.viewAny`.
- `ListTorsQueryTest`:
  - `viewAny` sees all; `viewDepartment` sees only its department;
    `viewOwn` sees only its own; holding `viewAny` + `viewOwn` sees all
  - `viewDepartment` with no profile, and with a profile without a department,
    sees nothing
  - each filter, including `tender_project_id=none`; each sort column and direction;
    pagination defaults
- `ListTorsTest` (HTTP): 401, 403 (no permission, vendor), 200 with the exact
  JSON shape including `null` keys, `meta` values, 422 for an invalid `status`,
  `sort_by`, and `tender_project_id`.
- `ShowTorTest` (HTTP): 200 with the same shape, 404 for a missing id, 404 for an
  existing TOR outside the viewer's visibility, 403 with no permission.
- `AdminUserSeederTest`: the admin role holds `tors.viewDepartment` and `tors.viewOwn`.
