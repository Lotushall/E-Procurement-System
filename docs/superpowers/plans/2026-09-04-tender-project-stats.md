# Tender Project Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add global (unfiltered) tender-project stats — total count, total budget, in-progress count, completed count — to the existing tender-projects list endpoint's response, matching the shape the frontend's stat cards already expect.

**Architecture:** A new `GetTenderProjectStatsQuery` (Application layer) runs one aggregate SQL query over `TenderProjects` with no scopes applied, independent of whatever filters the list request carries. `TenderProjectController::index()` calls it and embeds the result under `meta.stats` in the existing list response — no new route.

**Tech Stack:** Laravel 13, Eloquent, Pest.

## Global Constraints

- Stats are global — never filtered by the list's `search`/`status`/`department_id`/`fiscal_year` params. `GetTenderProjectStatsQuery` applies no scopes.
- `inProgressCount` counts `status = 'published'` only. `completedCount` counts `status = 'completed'` only. `totalCount`/`totalBudget` include every status (draft, published, closed, completed, cancelled, archived).
- One aggregate query, not four separate `count()`/`sum()` calls.
- `stats` is embedded in the existing `GET /tender-projects` response's `meta` — no new endpoint, no new route.
- `stats` shape is exactly `{ totalCount: int, totalBudget: float, inProgressCount: int, completedCount: int }` — matches the frontend's existing `TenderProjectStats` type in `tender-project-stats-cards.tsx` verbatim.
- Permission strings for this module use the underscore form: `tender_projects.viewAny`, `tender_projects.create` (already the case in `TenderProjectPolicy.php`, which is ahead of its consumers). Gate ability strings `tender-projects.index` / `tender-projects.store` stay hyphenated and are NOT touched — they're deliberately different from the permission names (see `TenderServiceProvider::boot()`) to avoid Spatie's `Gate::before` auto-grant hook.
- Every PHP file touched must pass `vendor/bin/pint --dirty --format agent` before its task is committed.
- Do not run `git commit` without the user's explicit go-ahead for that specific commit (standing project rule) — stage the files and report what's ready, then wait.

---

### Task 1: Fix `tender-projects.*` → `tender_projects.*` permission naming

`TenderProjectPolicy.php` already checks `tender_projects.create` / `tender_projects.viewAny` (an unstaged, in-progress edit already on disk). Everything that grants or asserts those permission strings — a seeder and 4 test files — still uses the old hyphenated names, so every request through the real policy currently gets rejected (403) even for a correctly-permissioned user. This task re-aligns those 6 files with the already-changed policy so the baseline test suite is green before Tasks 2–3 add anything on top of it. Gate ability strings (`tender-projects.index`, `tender-projects.store` — used in `Gate::forUser()->allows()` and route `can:` middleware) are a deliberately distinct, separate naming scheme and must NOT be changed by this task.

**Files:**
- Modify: `database/seeders/AdminUserSeeder.php:30-31`
- Modify: `app/Modules/Tender/Providers/TenderServiceProvider.php:49-51` (comment only)
- Modify: `tests/Feature/Modules/Tender/TenderProjectPolicyTest.php:10,12,25,30,32`
- Modify: `tests/Feature/Modules/Tender/StoreTenderProjectTest.php:14`
- Modify: `tests/Feature/Modules/Tender/ListTenderProjectsTest.php:16`
- Modify: `tests/Feature/Database/Seeders/AdminUserSeederTest.php:46,54`

**Interfaces:**
- Produces: permission strings `tender_projects.create` and `tender_projects.viewAny`, consistently granted/asserted everywhere in the codebase. Task 4's new test in `ListTenderProjectsTest.php` relies on `internalUserWithTenderProjectViewAnyPermission()` (defined in that file) actually granting a permission the policy recognizes.

- [ ] **Step 1: Run the Tender + AdminUserSeeder test suites to confirm the current (broken) baseline**

Run: `php artisan test --compact --filter=Tender`
Expected: FAIL — 23 failures, all `Expected response status code [...] but received 403` (11 in `ListTenderProjectsTest`, 10 in `StoreTenderProjectTest`) or `Failed asserting that false is true` (2 in `TenderProjectPolicyTest`).

Run: `php artisan test --compact --filter=AdminUserSeeder`
Expected: PASS (these two specific assertions haven't been touched by the in-progress edit yet, but will be renamed in this task regardless so they stay accurate).

- [ ] **Step 2: Fix `AdminUserSeeder.php`**

In `database/seeders/AdminUserSeeder.php`, change:

```php
            Permission::updateOrCreate(['name' => 'tender-projects.create', 'guard_name' => 'web'], ['label' => 'สร้างโครงการจัดซื้อจัดจ้าง']),
            Permission::updateOrCreate(['name' => 'tender-projects.viewAny', 'guard_name' => 'web'], ['label' => 'ดูรายการโครงการจัดซื้อจัดจ้าง']),
```

to:

```php
            Permission::updateOrCreate(['name' => 'tender_projects.create', 'guard_name' => 'web'], ['label' => 'สร้างโครงการจัดซื้อจัดจ้าง']),
            Permission::updateOrCreate(['name' => 'tender_projects.viewAny', 'guard_name' => 'web'], ['label' => 'ดูรายการโครงการจัดซื้อจัดจ้าง']),
```

- [ ] **Step 3: Fix the stale comment in `TenderServiceProvider.php`**

In `app/Modules/Tender/Providers/TenderServiceProvider.php`, change:

```php
        // The ability names are deliberately NOT the same strings as the
        // permission names their policy methods check (`tender-projects.create`,
        // `tender-projects.viewAny`): Spatie registers a Gate::before hook that
```

to:

```php
        // The ability names are deliberately NOT the same strings as the
        // permission names their policy methods check (`tender_projects.create`,
        // `tender_projects.viewAny`): Spatie registers a Gate::before hook that
```

(The two `Gate::define('tender-projects.store', ...)` / `Gate::define('tender-projects.index', ...)` lines below it are unchanged.)

- [ ] **Step 4: Fix `TenderProjectPolicyTest.php`**

In `tests/Feature/Modules/Tender/TenderProjectPolicyTest.php`, change:

```php
test('an internal user with the tender-projects.create permission is authorized', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender-projects.create', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.store'))->toBeTrue();
});

test('an internal user without the permission is not authorized', function () {
    $user = User::factory()->create(['user_type' => 'internal']);

    expect(Gate::forUser($user)->allows('tender-projects.store'))->toBeFalse();
});

test('a non-internal user is not authorized even when directly granted the permission', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender-projects.create', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.store'))->toBeFalse();
});

test('an internal user with the tender-projects.viewAny permission is authorized to list', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender-projects.viewAny', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.index'))->toBeTrue();
});
```

to:

```php
test('an internal user with the tender_projects.create permission is authorized', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.create', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.store'))->toBeTrue();
});

test('an internal user without the permission is not authorized', function () {
    $user = User::factory()->create(['user_type' => 'internal']);

    expect(Gate::forUser($user)->allows('tender-projects.store'))->toBeFalse();
});

test('a non-internal user is not authorized even when directly granted the permission', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.create', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.store'))->toBeFalse();
});

test('an internal user with the tender_projects.viewAny permission is authorized to list', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.viewAny', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.index'))->toBeTrue();
});
```

And separately, change:

```php
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender-projects.viewAny', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.index'))->toBeFalse();
});
```

to:

```php
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.viewAny', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.index'))->toBeFalse();
});
```

(This is the last test in the file — `'a non-internal user is not authorized to list even when directly granted the permission'`. The `Gate::forUser(...)->allows('tender-projects.store'|'tender-projects.index')` calls throughout this file stay exactly as they are — those are Gate ability names, not permission names.)

- [ ] **Step 5: Fix `StoreTenderProjectTest.php`**

In `tests/Feature/Modules/Tender/StoreTenderProjectTest.php`, change:

```php
function internalUserWithTenderProjectCreatePermission(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender-projects.create', 'guard_name' => 'web']));

    return $user;
}
```

to:

```php
function internalUserWithTenderProjectCreatePermission(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.create', 'guard_name' => 'web']));

    return $user;
}
```

- [ ] **Step 6: Fix `ListTenderProjectsTest.php`**

In `tests/Feature/Modules/Tender/ListTenderProjectsTest.php`, change:

```php
function internalUserWithTenderProjectViewAnyPermission(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender-projects.viewAny', 'guard_name' => 'web']));

    return $user;
}
```

to:

```php
function internalUserWithTenderProjectViewAnyPermission(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.viewAny', 'guard_name' => 'web']));

    return $user;
}
```

- [ ] **Step 7: Fix `AdminUserSeederTest.php`**

In `tests/Feature/Database/Seeders/AdminUserSeederTest.php`, change:

```php
    expect($admin->hasPermissionTo('tender-projects.create'))->toBeTrue();
```

to:

```php
    expect($admin->hasPermissionTo('tender_projects.create'))->toBeTrue();
```

And change:

```php
    expect($admin->hasPermissionTo('tender-projects.viewAny'))->toBeTrue();
```

to:

```php
    expect($admin->hasPermissionTo('tender_projects.viewAny'))->toBeTrue();
```

- [ ] **Step 8: Run the same test suites again to confirm GREEN**

Run: `php artisan test --compact --filter=Tender`
Expected: PASS (the `ListTenderProjectsTest`/`StoreTenderProjectTest`/`TenderProjectPolicyTest` failures from Step 1 are gone; `ListTenderProjectsQueryTest` and `TenderProjectSeederTest` were unaffected and stay green).

Run: `php artisan test --compact --filter=AdminUserSeeder`
Expected: PASS.

- [ ] **Step 9: Format and stage**

```bash
vendor/bin/pint --dirty --format agent
git add database/seeders/AdminUserSeeder.php app/Modules/Tender/Providers/TenderServiceProvider.php tests/Feature/Modules/Tender/TenderProjectPolicyTest.php tests/Feature/Modules/Tender/StoreTenderProjectTest.php tests/Feature/Modules/Tender/ListTenderProjectsTest.php tests/Feature/Database/Seeders/AdminUserSeederTest.php
```

Report the staged diff and wait for explicit go-ahead before running `git commit` (standing project rule — no auto-commit).

---

### Task 2: Restore `TenderProjectResource`'s model/entity branching

Task 1's permission fix unmasked two more pre-existing bugs (previously hidden behind 403s, already on the committed `Internal` branch — not anyone's in-progress edit): `TenderProjectResource::toArray()` currently does raw property access (`$this->id`, `$this->project_code`, `$this->department_id` doesn't even exist — it does `DepartmentResource::make($this->whenLoaded('TenderProjectsDepartment'))` instead) with no branching on what kind of object it's wrapping. This breaks two ways:

1. **List path:** `TenderProjectController::index()` passes raw `TenderProjects` Eloquent rows through the resource. The resource emits a nested `department`/`personInCharge`/`createdBy` object via `whenLoaded()` — but `ListTenderProjectsQuery` never eager-loads those relations, and more importantly `ListTenderProjectsTest.php`'s existing (already-committed, unmodified-by-Task-1) assertions expect flat `departmentId`/`personInChargeId`/`createdBy` fields, which the current resource doesn't emit at all.
2. **Store path:** `TenderProjectController::store()` passes a `TenderProject` *domain entity* (private properties, camelCase getter methods, no `__get` magic) through the same resource. `$this->id` on the resource crashes with `Error: Cannot access private property App\Modules\Tender\Domain\Entities\Project\TenderProject::$id` — every `POST /tender-projects` request currently 500s.

The fix: restore the `fromModel`/`fromEntity` branch the original list-query design specified (`docs/superpowers/specs/2026-09-02-tender-project-list-query-design.md`), which this task's flat-field shape exactly matches the already-existing `ListTenderProjectsTest.php` and `StoreTenderProjectTest.php` assertions (verified against both files' current content — no test changes needed, only the resource).

**Files:**
- Modify: `app/Modules/Tender/Presentation/Http/Resources/Project/TenderProjectResource.php`

**Interfaces:**
- Consumes: `TenderProjects` (Eloquent model, `App\Modules\Tender\Infrastructure\Models\Project\TenderProjects`) and `TenderProject` (domain entity, `App\Modules\Tender\Domain\Entities\Project\TenderProject`) — both already exist, unchanged by this task.
- Produces: `TenderProjectResource::toArray()` emitting the same flat JSON shape for both — `id`, `projectCode`, `name`, `description`, `budget`, `departmentId`, `personInChargeId`, `createdBy`, `procurementMethod`, `fiscalYear`, `projectStartAt`, `projectEndAt`, `status`. Task 4 (controller wiring for stats) does not touch this resource and is unaffected by its shape.

- [ ] **Step 1: Run the two tests this bug currently breaks, to confirm the failures**

Run: `php artisan test --compact --filter=ListTenderProjectsTest`
Expected: FAIL — 3 failures: `an internal user with the viewAny permission can list tender projects` (missing `departmentId` key), `listing tender projects filters by department` (`data.0.departmentId` is null), `listing tender projects includes description, person in charge, dates, and formatted budget when present` (`data.0.personInChargeId` is null).

Run: `php artisan test --compact --filter=StoreTenderProjectTest`
Expected: FAIL — 4 failures, all `Expected response status code [201] but received 500` with `Error: Cannot access private property App\Modules\Tender\Domain\Entities\Project\TenderProject::$id`.

- [ ] **Step 2: Rewrite `TenderProjectResource`**

Replace the full contents of `app/Modules/Tender/Presentation/Http/Resources/Project/TenderProjectResource.php`:

```php
<?php

namespace App\Modules\Tender\Presentation\Http\Resources\Project;

use App\Modules\Tender\Domain\Entities\Project\TenderProject;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TenderProjectResource extends JsonResource
{
    public static $wrap = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return $this->resource instanceof TenderProjects
            ? $this->fromModel($this->resource)
            : $this->fromEntity($this->resource);
    }

    /**
     * @return array<string, mixed>
     */
    private function fromEntity(TenderProject $project): array
    {
        return [
            'id' => $project->id(),
            'projectCode' => $project->projectCode()->value,
            'name' => $project->name(),
            'description' => $this->whenNotNull($project->description()),
            'budget' => $project->budget()->amount,
            'departmentId' => $project->departmentId(),
            'personInChargeId' => $this->whenNotNull($project->personInChargeId()),
            'createdBy' => $project->createdBy(),
            'procurementMethod' => $project->procurementMethod(),
            'fiscalYear' => $project->fiscalYear(),
            'projectStartAt' => $this->whenNotNull($project->projectStartAt()?->toIso8601String()),
            'projectEndAt' => $this->whenNotNull($project->projectEndAt()?->toIso8601String()),
            'status' => $project->status(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function fromModel(TenderProjects $model): array
    {
        return [
            'id' => $model->id,
            'projectCode' => $model->project_code,
            'name' => $model->name,
            'description' => $this->whenNotNull($model->description),
            'budget' => $model->budget,
            'departmentId' => $model->department_id,
            'personInChargeId' => $this->whenNotNull($model->person_in_charge_id),
            'createdBy' => $model->created_by,
            'procurementMethod' => $model->procurement_method,
            'fiscalYear' => $model->fiscal_year,
            'projectStartAt' => $this->whenNotNull($model->project_start_at?->toIso8601String()),
            'projectEndAt' => $this->whenNotNull($model->project_end_at?->toIso8601String()),
            'status' => $model->status,
        ];
    }
}
```

(This drops the `DepartmentResource`/`InternalProfileResource`/`UserResource` nested-relation approach entirely — those relations are never eager-loaded by either the list query or the store flow, and neither existing test file expects nested objects. `$model->budget` is a `decimal:2` cast, already the same 2-decimal string format as `$project->budget()->amount`, so both branches produce an identical `budget` shape — same as the original list-query design's rationale.)

- [ ] **Step 3: Run the same two tests to verify they pass**

Run: `php artisan test --compact --filter=ListTenderProjectsTest`
Expected: PASS — all tests in the file.

Run: `php artisan test --compact --filter=StoreTenderProjectTest`
Expected: PASS — all tests in the file.

- [ ] **Step 4: Run the full Tender suite to confirm no other regression**

Run: `php artisan test --compact --filter=Tender`
Expected: PASS — 82/82 (this is the full, already-existing Tender test suite; Task 1 fixed the 23 permission-403 failures, this task fixes the remaining 7).

- [ ] **Step 5: Format and stage**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Tender/Presentation/Http/Resources/Project/TenderProjectResource.php
```

Report the staged diff and wait for explicit go-ahead before running `git commit`.

---

### Task 3: `GetTenderProjectStatsQuery`

**Files:**
- Create: `app/Modules/Tender/Application/Project/Queries/GetTenderProjectStatsQuery.php`
- Test: `tests/Feature/Modules/Tender/GetTenderProjectStatsQueryTest.php`

**Interfaces:**
- Consumes: `TenderProjects` model (`App\Modules\Tender\Infrastructure\Models\Project\TenderProjects`) — no scopes.
- Produces: `GetTenderProjectStatsQuery::execute(): array` returning `['totalCount' => int, 'totalBudget' => float, 'inProgressCount' => int, 'completedCount' => int]`. Task 4 calls this directly from the controller.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Modules/Tender/GetTenderProjectStatsQueryTest.php`:

```php
<?php

use App\Modules\Tender\Application\Project\Queries\GetTenderProjectStatsQuery;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function getTenderProjectStatsQuery(): GetTenderProjectStatsQuery
{
    return app(GetTenderProjectStatsQuery::class);
}

test('execute returns zero stats when there are no projects', function () {
    $stats = getTenderProjectStatsQuery()->execute();

    expect($stats)->toBe([
        'totalCount' => 0,
        'totalBudget' => 0.0,
        'inProgressCount' => 0,
        'completedCount' => 0,
    ]);
});

test('execute counts and sums every project regardless of status', function () {
    TenderProjects::factory()->status('draft')->create(['budget' => 100000]);
    TenderProjects::factory()->status('published')->create(['budget' => 200000]);
    TenderProjects::factory()->status('closed')->create(['budget' => 300000]);
    TenderProjects::factory()->status('completed')->create(['budget' => 400000]);
    TenderProjects::factory()->status('cancelled')->create(['budget' => 500000]);
    TenderProjects::factory()->status('archived')->create(['budget' => 600000]);

    $stats = getTenderProjectStatsQuery()->execute();

    expect($stats['totalCount'])->toBe(6)
        ->and($stats['totalBudget'])->toBe(2100000.0);
});

test('execute counts only published projects as in progress', function () {
    TenderProjects::factory()->status('published')->create();
    TenderProjects::factory()->status('published')->create();
    TenderProjects::factory()->status('draft')->create();
    TenderProjects::factory()->status('completed')->create();

    $stats = getTenderProjectStatsQuery()->execute();

    expect($stats['inProgressCount'])->toBe(2);
});

test('execute counts only completed projects as completed', function () {
    TenderProjects::factory()->status('completed')->create();
    TenderProjects::factory()->status('completed')->create();
    TenderProjects::factory()->status('completed')->create();
    TenderProjects::factory()->status('published')->create();

    $stats = getTenderProjectStatsQuery()->execute();

    expect($stats['completedCount'])->toBe(3);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact --filter=GetTenderProjectStatsQueryTest`
Expected: FAIL — `Class "App\Modules\Tender\Application\Project\Queries\GetTenderProjectStatsQuery" not found`.

- [ ] **Step 3: Implement `GetTenderProjectStatsQuery`**

Create `app/Modules/Tender/Application/Project/Queries/GetTenderProjectStatsQuery.php`:

```php
<?php

namespace App\Modules\Tender\Application\Project\Queries;

use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;

final class GetTenderProjectStatsQuery
{
    /**
     * @return array{totalCount: int, totalBudget: float, inProgressCount: int, completedCount: int}
     */
    public function execute(): array
    {
        $stats = TenderProjects::query()
            ->selectRaw(
                'COUNT(*) as total_count, '.
                'SUM(budget) as total_budget, '.
                'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as in_progress_count, '.
                'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed_count',
                ['published', 'completed'],
            )
            ->first();

        return [
            'totalCount' => (int) $stats->total_count,
            'totalBudget' => (float) $stats->total_budget,
            'inProgressCount' => (int) $stats->in_progress_count,
            'completedCount' => (int) $stats->completed_count,
        ];
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --compact --filter=GetTenderProjectStatsQueryTest`
Expected: PASS — 4 tests, 0 failures.

- [ ] **Step 5: Format and stage**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Tender/Application/Project/Queries/GetTenderProjectStatsQuery.php tests/Feature/Modules/Tender/GetTenderProjectStatsQueryTest.php
```

Report the staged diff and wait for explicit go-ahead before running `git commit`.

---

### Task 4: Wire stats into `TenderProjectController::index()`

**Files:**
- Modify: `app/Modules/Tender/Presentation/Http/Controllers/TenderProjectController.php`
- Modify: `tests/Feature/Modules/Tender/ListTenderProjectsTest.php`

**Interfaces:**
- Consumes: `GetTenderProjectStatsQuery::execute(): array` (Task 3).

- [ ] **Step 1: Write the failing tests**

In `tests/Feature/Modules/Tender/ListTenderProjectsTest.php`, change the `assertJsonStructure` in the existing test:

```php
test('an internal user with the viewAny permission can list tender projects', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    TenderProjects::factory()->create();
    TenderProjects::factory()->create();

    $response = $this->getJson('/api/v1/dashboard/tender-projects');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonStructure([
            'data' => [['id', 'projectCode', 'name', 'budget', 'departmentId', 'procurementMethod', 'fiscalYear', 'status']],
            'meta' => ['currentPage', 'lastPage', 'perPage', 'total'],
        ]);
});
```

to:

```php
test('an internal user with the viewAny permission can list tender projects', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    TenderProjects::factory()->create();
    TenderProjects::factory()->create();

    $response = $this->getJson('/api/v1/dashboard/tender-projects');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonStructure([
            'data' => [['id', 'projectCode', 'name', 'budget', 'departmentId', 'procurementMethod', 'fiscalYear', 'status']],
            'meta' => [
                'currentPage', 'lastPage', 'perPage', 'total',
                'stats' => ['totalCount', 'totalBudget', 'inProgressCount', 'completedCount'],
            ],
        ]);
});
```

Then append a new test at the end of the file:

```php
test('listing tender projects returns global stats unaffected by the list filters', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    TenderProjects::factory()->status('draft')->create(['budget' => 100000]);
    TenderProjects::factory()->status('published')->create(['budget' => 200000]);
    TenderProjects::factory()->status('published')->create(['budget' => 300000]);
    TenderProjects::factory()->status('completed')->create(['budget' => 400000]);

    $response = $this->getJson('/api/v1/dashboard/tender-projects?status=published');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJson(['meta' => ['stats' => [
            'totalCount' => 4,
            'totalBudget' => 1000000.0,
            'inProgressCount' => 2,
            'completedCount' => 1,
        ]]]);
});
```

(NOTE: `TenderProjects` and `internalUserWithTenderProjectViewAnyPermission()` are already imported/defined at the top of this file — no new `use` statements needed.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=ListTenderProjectsTest`
Expected: FAIL — the structure assertion fails with a missing `stats` key, and the new "global stats" test fails the same way (`meta` has no `stats` key yet).

- [ ] **Step 3: Wire `GetTenderProjectStatsQuery` into the controller**

In `app/Modules/Tender/Presentation/Http/Controllers/TenderProjectController.php`, change:

```php
use App\Modules\Tender\Application\Project\DTOs\CreateTenderProjectData;
use App\Modules\Tender\Application\Project\Queries\ListTenderProjectsQuery;
use App\Modules\Tender\Application\Project\UseCases\CreateTenderProjectUseCase;
use App\Modules\Tender\Presentation\Http\Requests\Project\ListTenderProjectsRequest;
use App\Modules\Tender\Presentation\Http\Requests\Project\StoreTenderProjectRequest;
use App\Modules\Tender\Presentation\Http\Resources\Project\TenderProjectResource;
use Illuminate\Http\JsonResponse;

class TenderProjectController extends Controller
{
    public function __construct(
        private readonly ListTenderProjectsQuery $listTenderProjects,
        private readonly CreateTenderProjectUseCase $createTenderProject,
    ) {}

    public function index(ListTenderProjectsRequest $request): JsonResponse
    {
        $projects = $this->listTenderProjects->execute(
            search: $request->validated('search'),
            status: $request->validated('status'),
            departmentId: $request->validated('department_id'),
            fiscalYear: $request->validated('fiscal_year'),
            sortBy: $request->validated('sort_by'),
            sortDirection: $request->validated('sort_direction'),
            page: $request->validated('page'),
            perPage: $request->validated('per_page'),
        );

        return response()->json([
            'data' => TenderProjectResource::collection($projects->getCollection()),
            'meta' => [
                'currentPage' => $projects->currentPage(),
                'lastPage' => $projects->lastPage(),
                'perPage' => $projects->perPage(),
                'total' => $projects->total(),
            ],
        ]);
    }
```

to:

```php
use App\Modules\Tender\Application\Project\DTOs\CreateTenderProjectData;
use App\Modules\Tender\Application\Project\Queries\GetTenderProjectStatsQuery;
use App\Modules\Tender\Application\Project\Queries\ListTenderProjectsQuery;
use App\Modules\Tender\Application\Project\UseCases\CreateTenderProjectUseCase;
use App\Modules\Tender\Presentation\Http\Requests\Project\ListTenderProjectsRequest;
use App\Modules\Tender\Presentation\Http\Requests\Project\StoreTenderProjectRequest;
use App\Modules\Tender\Presentation\Http\Resources\Project\TenderProjectResource;
use Illuminate\Http\JsonResponse;

class TenderProjectController extends Controller
{
    public function __construct(
        private readonly ListTenderProjectsQuery $listTenderProjects,
        private readonly GetTenderProjectStatsQuery $getTenderProjectStats,
        private readonly CreateTenderProjectUseCase $createTenderProject,
    ) {}

    public function index(ListTenderProjectsRequest $request): JsonResponse
    {
        $projects = $this->listTenderProjects->execute(
            search: $request->validated('search'),
            status: $request->validated('status'),
            departmentId: $request->validated('department_id'),
            fiscalYear: $request->validated('fiscal_year'),
            sortBy: $request->validated('sort_by'),
            sortDirection: $request->validated('sort_direction'),
            page: $request->validated('page'),
            perPage: $request->validated('per_page'),
        );

        return response()->json([
            'data' => TenderProjectResource::collection($projects->getCollection()),
            'meta' => [
                'currentPage' => $projects->currentPage(),
                'lastPage' => $projects->lastPage(),
                'perPage' => $projects->perPage(),
                'total' => $projects->total(),
                'stats' => $this->getTenderProjectStats->execute(),
            ],
        ]);
    }
```

(The `store()` method below is untouched.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `php artisan test --compact --filter=ListTenderProjectsTest`
Expected: PASS — all tests in the file, including the two touched/added in Step 1.

- [ ] **Step 5: Run the full Tender module suite**

Run: `php artisan test --compact --filter=Tender`
Expected: PASS — `ListTenderProjectsTest`, `ListTenderProjectsQueryTest`, `GetTenderProjectStatsQueryTest`, `StoreTenderProjectTest`, `TenderProjectPolicyTest`, `TenderProjectSeederTest` all green.

- [ ] **Step 6: Format and stage**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Tender/Presentation/Http/Controllers/TenderProjectController.php tests/Feature/Modules/Tender/ListTenderProjectsTest.php
```

Report the staged diff and wait for explicit go-ahead before running `git commit`.

---

### Task 5: Migrate existing `tender-projects.*` permission grants to `tender_projects.*`

The final whole-plan review flagged a real gap in Task 1: it renamed the permission strings in code (seeder + tests) but not in already-seeded databases. `AdminUserSeeder`'s `updateOrCreate(['name' => 'tender_projects.create'], ...)` **creates a new permission row** rather than renaming the existing `tender-projects.create` row — so in any environment that was seeded before this plan ran, the old row (and every role/user grant against it) is orphaned: `TenderProjectPolicy` no longer checks it, silently revoking Tender access from anyone who isn't re-granted, and the permission-management UI (`ListPermissionsQuery`, which groups by `explode('.', $name)[0]`) will show a duplicate, non-functional `tender-projects` group alongside the real `tender_projects` one. A test database (`RefreshDatabase`) never has the old row seeded in the first place, which is why this was invisible to every task's own tests.

This codebase already has a precedent for exactly this situation: `database/migrations/2026_08_28_152400_rename_vendors_view_permission_to_vendors_view_any.php` renames `vendors.view` → `vendors.viewAny`, handling both a plain rename (only the old name exists) and a merge (both exist — reassign every `role_has_permissions`/`model_has_permissions` grant from the old permission id to the new one, then delete the stale row). This task adds the equivalent migration for both `tender-projects.create` → `tender_projects.create` and `tender-projects.viewAny` → `tender_projects.viewAny`, generalizing the precedent's single-pair logic into a loop over both pairs (DRY — the merge/rename logic is identical for each).

**Files:**
- Create: `database/migrations/2026_09_04_120000_rename_tender_projects_permissions.php`
- Test: `tests/Feature/Database/Migrations/RenameTenderProjectsPermissionsTest.php`

**Interfaces:**
- Produces: a Laravel migration (anonymous class) with `up()`/`down()`, runnable both automatically (via `php artisan migrate`, and via `RefreshDatabase` in every test — a no-op there since no old-name rows are ever seeded before it runs) and directly in a test via `(require database_path('migrations/2026_09_04_120000_rename_tender_projects_permissions.php'))->up()`.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Database/Migrations/RenameTenderProjectsPermissionsTest.php`:

```php
<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function runTenderProjectsPermissionRenameMigration()
{
    return require database_path('migrations/2026_09_04_120000_rename_tender_projects_permissions.php');
}

test('renames the permission in place when no underscore-form row exists yet', function () {
    $oldId = DB::table('permissions')->insertGetId([
        'name' => 'tender-projects.create',
        'guard_name' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $role = Role::create(['name' => 'test-role', 'guard_name' => 'web']);
    DB::table('role_has_permissions')->insert(['permission_id' => $oldId, 'role_id' => $role->id]);

    runTenderProjectsPermissionRenameMigration()->up();

    expect(DB::table('permissions')->where('id', $oldId)->value('name'))->toBe('tender_projects.create')
        ->and(DB::table('role_has_permissions')->where(['permission_id' => $oldId, 'role_id' => $role->id])->exists())->toBeTrue();
});

test('merges grants into the existing underscore-form row and drops the stale row when both exist', function () {
    $oldId = DB::table('permissions')->insertGetId([
        'name' => 'tender-projects.viewAny',
        'guard_name' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $newId = DB::table('permissions')->insertGetId([
        'name' => 'tender_projects.viewAny',
        'guard_name' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $role = Role::create(['name' => 'test-role', 'guard_name' => 'web']);
    DB::table('role_has_permissions')->insert(['permission_id' => $oldId, 'role_id' => $role->id]);

    runTenderProjectsPermissionRenameMigration()->up();

    expect(DB::table('permissions')->where('id', $oldId)->exists())->toBeFalse()
        ->and(DB::table('permissions')->where('id', $newId)->exists())->toBeTrue()
        ->and(DB::table('role_has_permissions')->where(['permission_id' => $newId, 'role_id' => $role->id])->exists())->toBeTrue();
});

test('does nothing when neither hyphenated permission name exists', function () {
    $countBefore = DB::table('permissions')->count();

    runTenderProjectsPermissionRenameMigration()->up();

    expect(DB::table('permissions')->count())->toBe($countBefore);
});

test('down restores the hyphenated name after a plain rename', function () {
    $id = DB::table('permissions')->insertGetId([
        'name' => 'tender-projects.create',
        'guard_name' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $migration = runTenderProjectsPermissionRenameMigration();
    $migration->up();

    $migration->down();

    expect(DB::table('permissions')->where('id', $id)->value('name'))->toBe('tender-projects.create');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact --filter=RenameTenderProjectsPermissionsTest`
Expected: FAIL — `require(...2026_09_04_120000_rename_tender_projects_permissions.php): Failed to open stream: No such file or directory` (the migration file doesn't exist yet).

- [ ] **Step 3: Create the migration**

Create `database/migrations/2026_09_04_120000_rename_tender_projects_permissions.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * @var array<string, string>
     */
    private const array RENAMES = [
        'tender-projects.create' => 'tender_projects.create',
        'tender-projects.viewAny' => 'tender_projects.viewAny',
    ];

    /**
     * `TenderProjectPolicy` was changed to check the underscore-form
     * permission names (`tender_projects.create`/`tender_projects.viewAny`)
     * to match this codebase's convention for multi-word resource names
     * (e.g. `users.create`), but any already-seeded environment still has
     * grants against the old hyphenated names. This handles both: a plain
     * rename when only the old name exists, or a merge (reassigning every
     * role/user grant from the old id to the new id, then dropping the old
     * row) when `AdminUserSeeder` already created the new-name row too.
     */
    public function up(): void
    {
        foreach (self::RENAMES as $old => $new) {
            $this->rename($old, $new);
        }
    }

    private function rename(string $old, string $new): void
    {
        $oldId = DB::table('permissions')->where('name', $old)->where('guard_name', 'web')->value('id');

        if ($oldId === null) {
            return;
        }

        $newId = DB::table('permissions')->where('name', $new)->where('guard_name', 'web')->value('id');

        if ($newId === null) {
            DB::table('permissions')->where('id', $oldId)->update(['name' => $new]);
            app(PermissionRegistrar::class)->forgetCachedPermissions();

            return;
        }

        foreach (['role_has_permissions', 'model_has_permissions'] as $pivotTable) {
            foreach (DB::table($pivotTable)->where('permission_id', $oldId)->get() as $row) {
                $attributes = (array) $row;
                $attributes['permission_id'] = $newId;

                if (! DB::table($pivotTable)->where($attributes)->exists()) {
                    DB::table($pivotTable)->insert($attributes);
                }
            }

            DB::table($pivotTable)->where('permission_id', $oldId)->delete();
        }

        DB::table('permissions')->where('id', $oldId)->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Best-effort only: if `up()` merged two rows together for a given
     * permission, the merge isn't reversible (the original hyphenated id is
     * gone). If `up()` did a plain rename, this restores it.
     */
    public function down(): void
    {
        foreach (self::RENAMES as $old => $new) {
            DB::table('permissions')->where('name', $new)->where('guard_name', 'web')->update(['name' => $old]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --compact --filter=RenameTenderProjectsPermissionsTest`
Expected: PASS — 4 tests, 0 failures.

- [ ] **Step 5: Run the full Tender + AdminUserSeeder suites to confirm no regression**

Run: `php artisan test --compact --filter=Tender`
Expected: PASS — 87/87 (unchanged from Task 4 — this migration is a no-op under `RefreshDatabase` since no old-name rows are ever seeded before it runs).

Run: `php artisan test --compact --filter=AdminUserSeeder`
Expected: PASS — 5/5.

- [ ] **Step 6: Format and stage**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_09_04_120000_rename_tender_projects_permissions.php tests/Feature/Database/Migrations/RenameTenderProjectsPermissionsTest.php
```

Report the staged diff and wait for explicit go-ahead before running `git commit`.
