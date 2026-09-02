# Tender Project List Query Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `GET` list/index endpoint for Tender Projects — filtering (search, status, department, fiscal year), sorting, pagination, and authorization — following this codebase's established list-query convention.

**Architecture:** Backend only. Unlike `TenderProjectController::store` (which uses the module's DDD write path — domain entity + repository + use case), the read path here mirrors the simpler convention used everywhere else in the codebase for lists (`ListUsersQuery`, `VendorApprovalController::index`): an Application query class queries the Eloquent model (`TenderProjects`) directly via model-level `#[Scope]` filters. No repository or domain-entity involvement on the read side; the `store` flow is untouched.

**Tech Stack:** Laravel 13, PHP 8.4, Pest 4, Spatie Laravel Permission.

## Global Constraints

- Full spec: `docs/superpowers/specs/2026-09-02-tender-project-list-query-design.md`.
- Monorepo root is `D:\E-Procurement-System`; this plan's file paths are given relative to that root (`backend/...`), except inside code blocks and commands, which are relative to `backend/` (the working directory for all PHP/artisan/pest commands).
- Branch `Internal`, working in place, no worktree — established repo convention.
- **Commit policy for this plan (explicit user instruction, overrides the executing-skill's normal per-task auto-commit default): at the end of each task, `git add` the exact files touched by that task only. Do NOT run `git commit`.** The user reviews and commits manually when ready.
- Before staging, run `git status --short` first — a sibling frontend/backend session may have unrelated uncommitted work in the same working tree (established repo pattern). Only stage the files this task touches.
- After modifying any PHP file, run `vendor/bin/pint --dirty --format agent` before staging (project convention — fixes style automatically, does not need a separate check step).
- Run tests with `php artisan test --compact --filter="..."` (project convention), scoped to the tests each task adds.
- The `status` enum validated here is the real DB enum (`draft, published, closed, completed, cancelled, archived`), not the frontend's current placeholder filter values (`draft/in_progress/completed/cancelled`) — reconciling the frontend is explicitly out of scope (see spec).
- Gate ability names for this feature must NOT equal the permission string they check, per the documented Spatie `Gate::before` bypass hazard in `TenderServiceProvider` (see Task 2) — this is why the ability is `tender-projects.index` while the permission is `tender-projects.viewAny`.

---

### Task 1: Seed the `tender-projects.viewAny` permission

**Files:**
- Modify: `backend/database/seeders/AdminUserSeeder.php:22-31`
- Test: `backend/tests/Feature/Database/Seeders/AdminUserSeederTest.php`

**Interfaces:**
- Consumes: nothing new.
- Produces: permission string `'tender-projects.viewAny'`, seeded onto the `admin` role. Consumed by Task 2's policy method and by test helpers in Tasks 2 and 4 that grant it to a user.

- [ ] **Step 1: Write the failing test**

Append to the end of `backend/tests/Feature/Database/Seeders/AdminUserSeederTest.php`:

```php

test('running the admin seeder grants the admin role permission to view tender projects', function () {
    (new AdminUserSeeder)->run();

    $admin = Role::where('name', 'admin')->first();

    expect($admin->hasPermissionTo('tender-projects.viewAny'))->toBeTrue();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact --filter="grants the admin role permission to view tender projects"`
Expected: FAIL — the permission does not exist yet, `hasPermissionTo` throws or the expectation is false.

- [ ] **Step 3: Add the permission in `AdminUserSeeder.php`**

In `backend/database/seeders/AdminUserSeeder.php`, change:

```php
            Permission::updateOrCreate(['name' => 'tender-projects.create', 'guard_name' => 'web'], ['label' => 'สร้างโครงการจัดซื้อจัดจ้าง']),
        ]);
```

to:

```php
            Permission::updateOrCreate(['name' => 'tender-projects.create', 'guard_name' => 'web'], ['label' => 'สร้างโครงการจัดซื้อจัดจ้าง']),
            Permission::updateOrCreate(['name' => 'tender-projects.viewAny', 'guard_name' => 'web'], ['label' => 'ดูรายการโครงการจัดซื้อจัดจ้าง']),
        ]);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --compact --filter="grants the admin role permission to view tender projects"`
Expected: PASS

- [ ] **Step 5: Format and stage**

```bash
vendor/bin/pint --dirty --format agent
git status --short
git add database/seeders/AdminUserSeeder.php tests/Feature/Database/Seeders/AdminUserSeederTest.php
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 2: Policy `viewAny` + Gate ability `tender-projects.index`

**Files:**
- Modify: `backend/app/Modules/Tender/Presentation/Policies/TenderProjectPolicy.php`
- Modify: `backend/app/Modules/Tender/Providers/TenderServiceProvider.php:45-57`
- Test: `backend/tests/Feature/Modules/Tender/TenderProjectPolicyTest.php`

**Interfaces:**
- Consumes: `UserType::Internal` (existing enum), `User::checkPermissionTo()` (Spatie, existing), permission `tender-projects.viewAny` (Task 1).
- Produces: `TenderProjectPolicy::viewAny(User $user): bool`; Gate ability `tender-projects.index`. Consumed by Task 4's route middleware (`can:tender-projects.index`).

- [ ] **Step 1: Write the failing tests**

Append to the end of `backend/tests/Feature/Modules/Tender/TenderProjectPolicyTest.php`:

```php

test('an internal user with the tender-projects.viewAny permission is authorized to list', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender-projects.viewAny', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.index'))->toBeTrue();
});

test('an internal user without the viewAny permission is not authorized to list', function () {
    $user = User::factory()->create(['user_type' => 'internal']);

    expect(Gate::forUser($user)->allows('tender-projects.index'))->toBeFalse();
});

test('a non-internal user is not authorized to list even when directly granted the permission', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender-projects.viewAny', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.index'))->toBeFalse();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=TenderProjectPolicyTest`
Expected: the 3 new tests FAIL — `tender-projects.index` ability is not defined yet (Gate returns false / errors for all three).

- [ ] **Step 3: Add the `viewAny` policy method**

Replace the full contents of `backend/app/Modules/Tender/Presentation/Policies/TenderProjectPolicy.php`:

```php
<?php

namespace App\Modules\Tender\Presentation\Policies;

use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User;

class TenderProjectPolicy
{
    public function create(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->checkPermissionTo('tender-projects.create');
    }

    public function viewAny(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->checkPermissionTo('tender-projects.viewAny');
    }
}
```

- [ ] **Step 4: Register the `tender-projects.index` Gate ability**

In `backend/app/Modules/Tender/Providers/TenderServiceProvider.php`, change the `boot()` method from:

```php
    public function boot(): void
    {
        parent::boot();

        // The ability name is deliberately NOT the same string as the
        // `tender-projects.create` permission name the policy method checks:
        // Spatie registers a Gate::before hook that grants access immediately
        // whenever the ability name exactly matches a permission the user
        // holds, bypassing this policy method (and its user_type guard)
        // entirely on the allow path. Using a distinct ability name forces
        // every request through the policy.
        Gate::define('tender-projects.store', [TenderProjectPolicy::class, 'create']);
    }
```

to:

```php
    public function boot(): void
    {
        parent::boot();

        // The ability names are deliberately NOT the same strings as the
        // permission names their policy methods check (`tender-projects.create`,
        // `tender-projects.viewAny`): Spatie registers a Gate::before hook that
        // grants access immediately whenever the ability name exactly matches
        // a permission the user holds, bypassing the policy method (and its
        // user_type guard) entirely on the allow path. Using distinct ability
        // names forces every request through the policy.
        Gate::define('tender-projects.store', [TenderProjectPolicy::class, 'create']);
        Gate::define('tender-projects.index', [TenderProjectPolicy::class, 'viewAny']);
    }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `php artisan test --compact --filter=TenderProjectPolicyTest`
Expected: PASS (all tests in the file, including the pre-existing `.store` ones)

- [ ] **Step 6: Format and stage**

```bash
vendor/bin/pint --dirty --format agent
git status --short
git add app/Modules/Tender/Presentation/Policies/TenderProjectPolicy.php app/Modules/Tender/Providers/TenderServiceProvider.php tests/Feature/Modules/Tender/TenderProjectPolicyTest.php
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 3: Model scopes + `ListTenderProjectsQuery`

**Files:**
- Modify: `backend/app/Modules/Tender/Infrastructure/Models/Project/TenderProjects.php`
- Create: `backend/app/Modules/Tender/Application/Project/Queries/ListTenderProjectsQuery.php`
- Test: `backend/tests/Feature/Modules/Tender/ListTenderProjectsQueryTest.php`

**Interfaces:**
- Consumes: `TenderProjects` Eloquent model (existing).
- Produces: `TenderProjects` scopes `search(?string)`, `status(?string)`, `departmentId(?int)`, `fiscalYear(?int)`, `sort(?string $sortBy, ?string $sortDirection = null)`; `ListTenderProjectsQuery::execute(?string $search = null, ?string $status = null, ?int $departmentId = null, ?int $fiscalYear = null, ?string $sortBy = null, ?string $sortDirection = null, ?int $page = null, ?int $perPage = null): LengthAwarePaginator`. Consumed by Task 4's controller.
- Note: `TenderProjects` has no factory class (none was created for the `store` feature either). Tests in this task and Task 4 create rows directly via `TenderProjects::create([...])` through a local `createTenderProject()` Pest helper, matching the `validTenderProjectPayload()` helper style already used in `StoreTenderProjectTest.php`.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/Feature/Modules/Tender/ListTenderProjectsQueryTest.php`:

```php
<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Tender\Application\Project\Queries\ListTenderProjectsQuery;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function listTenderProjectsQuery(): ListTenderProjectsQuery
{
    return app(ListTenderProjectsQuery::class);
}

function createTenderProject(array $overrides = []): TenderProjects
{
    $department = Department::firstOrCreate(['name' => 'IT']);

    return TenderProjects::create(array_merge([
        'project_code' => fake()->unique()->numerify('TP-2569-####'),
        'name' => 'จัดซื้อคอมพิวเตอร์',
        'description' => null,
        'budget' => 500000,
        'department_id' => $department->id,
        'person_in_charge_id' => null,
        'created_by' => null,
        'procurement_method' => 'e-bidding',
        'fiscal_year' => 2569,
        'project_start_at' => null,
        'project_end_at' => null,
        'status' => 'draft',
    ], $overrides));
}

test('execute returns all projects when no filters are given', function () {
    createTenderProject();
    createTenderProject();

    $result = listTenderProjectsQuery()->execute();

    expect($result->total())->toBe(2);
});

test('execute searches by name', function () {
    createTenderProject(['name' => 'จัดซื้อคอมพิวเตอร์โน้ตบุ๊ก']);
    createTenderProject(['name' => 'จัดจ้างทำความสะอาด']);

    $result = listTenderProjectsQuery()->execute(search: 'โน้ตบุ๊ก');

    expect($result->total())->toBe(1);
});

test('execute searches by project code', function () {
    $target = createTenderProject(['project_code' => 'TP-2569-0042']);
    createTenderProject(['project_code' => 'TP-2569-0043']);

    $result = listTenderProjectsQuery()->execute(search: 'TP-2569-0042');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($target->id);
});

test('execute filters by status', function () {
    createTenderProject(['status' => 'draft']);
    createTenderProject(['status' => 'published']);

    $result = listTenderProjectsQuery()->execute(status: 'published');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->status)->toBe('published');
});

test('execute filters by department', function () {
    $it = Department::firstOrCreate(['name' => 'IT']);
    $hr = Department::firstOrCreate(['name' => 'HR']);
    createTenderProject(['department_id' => $it->id]);
    createTenderProject(['department_id' => $hr->id]);

    $result = listTenderProjectsQuery()->execute(departmentId: $hr->id);

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->department_id)->toBe($hr->id);
});

test('execute filters by fiscal year', function () {
    createTenderProject(['fiscal_year' => 2569]);
    createTenderProject(['fiscal_year' => 2570]);

    $result = listTenderProjectsQuery()->execute(fiscalYear: 2570);

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->fiscal_year)->toBe(2570);
});

test('execute sorts by the given column and direction', function () {
    createTenderProject(['name' => 'Bravo Project']);
    createTenderProject(['name' => 'Alpha Project']);

    $result = listTenderProjectsQuery()->execute(sortBy: 'name', sortDirection: 'asc');

    expect(collect($result->items())->pluck('name')->toArray())->toBe(['Alpha Project', 'Bravo Project']);
});

test('execute defaults to sorting by created_at descending', function () {
    $older = createTenderProject();
    $older->forceFill(['created_at' => now()->subDay()])->save();
    $newer = createTenderProject();

    $result = listTenderProjectsQuery()->execute();

    expect($result->items()[0]->id)->toBe($newer->id);
});

test('execute paginates results', function () {
    for ($i = 0; $i < 25; $i++) {
        createTenderProject();
    }

    $result = listTenderProjectsQuery()->execute(page: 2, perPage: 10);

    expect($result->count())->toBe(10)
        ->and($result->currentPage())->toBe(2)
        ->and($result->total())->toBe(25);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=ListTenderProjectsQueryTest`
Expected: FAIL — `App\Modules\Tender\Application\Project\Queries\ListTenderProjectsQuery` does not exist yet (class-not-found errors).

- [ ] **Step 3: Add scopes to `TenderProjects`**

In `backend/app/Modules/Tender/Infrastructure/Models/Project/TenderProjects.php`, change the imports from:

```php
use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
```

to:

```php
use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
```

Then append these scope methods at the end of the class, right after the `TenderProjectsTors()` relation method (before the closing `}` of the class):

```php

    /**
     * Scope a query to projects whose name or project code matches the given search term.
     */
    #[Scope]
    protected function search(Builder $query, ?string $search): void
    {
        if ($search === null || trim($search) === '') {
            return;
        }

        $term = '%'.$search.'%';

        $query->where(function (Builder $query) use ($term) {
            $query->where('name', 'like', $term)
                ->orWhere('project_code', 'like', $term);
        });
    }

    /**
     * Scope a query to only include projects with the given status.
     */
    #[Scope]
    protected function status(Builder $query, ?string $status): void
    {
        $query->when($status !== null, fn (Builder $query) => $query->where('status', $status));
    }

    /**
     * Scope a query to only include projects in the given department.
     */
    #[Scope]
    protected function departmentId(Builder $query, ?int $departmentId): void
    {
        $query->when($departmentId !== null, fn (Builder $query) => $query->where('department_id', $departmentId));
    }

    /**
     * Scope a query to only include projects in the given fiscal year.
     */
    #[Scope]
    protected function fiscalYear(Builder $query, ?int $fiscalYear): void
    {
        $query->when($fiscalYear !== null, fn (Builder $query) => $query->where('fiscal_year', $fiscalYear));
    }

    /**
     * Scope a query to sort by the given whitelisted column (defaults to created_at).
     */
    #[Scope]
    protected function sort(Builder $query, ?string $sortBy, ?string $sortDirection = null): void
    {
        $direction = $sortDirection === 'asc' ? 'asc' : 'desc';

        $query->orderBy(
            in_array($sortBy, ['name', 'budget', 'fiscal_year'], true) ? $sortBy : 'created_at',
            $direction,
        );
    }
```

- [ ] **Step 4: Create `ListTenderProjectsQuery`**

Create `backend/app/Modules/Tender/Application/Project/Queries/ListTenderProjectsQuery.php`:

```php
<?php

namespace App\Modules\Tender\Application\Project\Queries;

use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListTenderProjectsQuery
{
    private const DEFAULT_PER_PAGE = 20;

    public function execute(
        ?string $search = null,
        ?string $status = null,
        ?int $departmentId = null,
        ?int $fiscalYear = null,
        ?string $sortBy = null,
        ?string $sortDirection = null,
        ?int $page = null,
        ?int $perPage = null,
    ): LengthAwarePaginator {
        return TenderProjects::query()
            ->search($search)
            ->status($status)
            ->departmentId($departmentId)
            ->fiscalYear($fiscalYear)
            ->sort($sortBy, $sortDirection)
            ->orderByDesc('id')
            ->paginate(perPage: $perPage ?? self::DEFAULT_PER_PAGE, page: $page ?? 1);
    }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `php artisan test --compact --filter=ListTenderProjectsQueryTest`
Expected: PASS

- [ ] **Step 6: Format and stage**

```bash
vendor/bin/pint --dirty --format agent
git status --short
git add app/Modules/Tender/Infrastructure/Models/Project/TenderProjects.php app/Modules/Tender/Application/Project/Queries/ListTenderProjectsQuery.php tests/Feature/Modules/Tender/ListTenderProjectsQueryTest.php
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 4: Request, dual-mode Resource, Controller `index`, route, end-to-end test

**Files:**
- Create: `backend/app/Modules/Tender/Presentation/Http/Requests/Project/ListTenderProjectsRequest.php`
- Modify: `backend/app/Modules/Tender/Presentation/Http/Resources/Project/TenderProjectResource.php`
- Modify: `backend/app/Modules/Tender/Presentation/Http/Controllers/TenderProjectController.php`
- Modify: `backend/routes/api/v1/dashboard/tender-projects.php`
- Test: `backend/tests/Feature/Modules/Tender/ListTenderProjectsTest.php`

**Interfaces:**
- Consumes: `ListTenderProjectsQuery` (Task 3); Gate ability `tender-projects.index` (Task 2); permission `tender-projects.viewAny` (Task 1).
- Produces: `GET /api/v1/dashboard/tender-projects` (route name `dashboard.tender-projects.index`), returning `{ data: TenderProjectResource[], meta: {...} }`. Terminal task — nothing else in this plan depends on it.
- These four files are only meaningfully testable once wired together (a lone `FormRequest` or a `Resource` branch has no HTTP entry point on its own), so this task's test is a single end-to-end feature test rather than a per-file unit test, per the plan's scope-per-task rule.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/Feature/Modules/Tender/ListTenderProjectsTest.php`:

```php
<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function internalUserWithTenderProjectViewAnyPermission(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender-projects.viewAny', 'guard_name' => 'web']));

    return $user;
}

function createTenderProjectRow(array $overrides = []): TenderProjects
{
    $department = Department::firstOrCreate(['name' => 'IT']);

    return TenderProjects::create(array_merge([
        'project_code' => fake()->unique()->numerify('TP-2569-####'),
        'name' => 'จัดซื้อคอมพิวเตอร์',
        'description' => null,
        'budget' => 500000,
        'department_id' => $department->id,
        'person_in_charge_id' => null,
        'created_by' => null,
        'procurement_method' => 'e-bidding',
        'fiscal_year' => 2569,
        'project_start_at' => null,
        'project_end_at' => null,
        'status' => 'draft',
    ], $overrides));
}

test('listing tender projects requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/tender-projects');

    $response->assertStatus(401);
});

test('an internal user without the viewAny permission cannot list tender projects', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/tender-projects');

    $response->assertStatus(403);
});

test('an internal user with the viewAny permission can list tender projects', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    createTenderProjectRow();
    createTenderProjectRow();

    $response = $this->getJson('/api/v1/dashboard/tender-projects');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonStructure([
            'data' => [['id', 'projectCode', 'name', 'budget', 'departmentId', 'procurementMethod', 'fiscalYear', 'status']],
            'meta' => ['currentPage', 'lastPage', 'perPage', 'total'],
        ]);
});

test('listing tender projects searches by name', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    createTenderProjectRow(['name' => 'จัดซื้อคอมพิวเตอร์โน้ตบุ๊ก']);
    createTenderProjectRow(['name' => 'จัดจ้างทำความสะอาด']);

    $response = $this->getJson('/api/v1/dashboard/tender-projects?search='.urlencode('โน้ตบุ๊ก'));

    $response->assertOk()->assertJsonCount(1, 'data');
});

test('listing tender projects searches by project code', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    $target = createTenderProjectRow(['project_code' => 'TP-2569-0042']);
    createTenderProjectRow(['project_code' => 'TP-2569-0043']);

    $response = $this->getJson('/api/v1/dashboard/tender-projects?search=TP-2569-0042');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $target->id);
});

test('listing tender projects filters by status', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    createTenderProjectRow(['status' => 'draft']);
    createTenderProjectRow(['status' => 'published']);

    $response = $this->getJson('/api/v1/dashboard/tender-projects?status=published');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.status', 'published');
});

test('listing tender projects filters by department', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    $it = Department::firstOrCreate(['name' => 'IT']);
    $hr = Department::firstOrCreate(['name' => 'HR']);
    createTenderProjectRow(['department_id' => $it->id]);
    createTenderProjectRow(['department_id' => $hr->id]);

    $response = $this->getJson('/api/v1/dashboard/tender-projects?department_id='.$hr->id);

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.departmentId', $hr->id);
});

test('listing tender projects filters by fiscal year', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    createTenderProjectRow(['fiscal_year' => 2569]);
    createTenderProjectRow(['fiscal_year' => 2570]);

    $response = $this->getJson('/api/v1/dashboard/tender-projects?fiscal_year=2570');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.fiscalYear', 2570);
});

test('listing tender projects sorts by the given column', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    createTenderProjectRow(['name' => 'Bravo Project']);
    createTenderProjectRow(['name' => 'Alpha Project']);

    $response = $this->getJson('/api/v1/dashboard/tender-projects?sort_by=name&sort_direction=asc');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('name')->toArray())->toBe(['Alpha Project', 'Bravo Project']);
});

test('listing tender projects returns camelCase pagination meta', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    createTenderProjectRow();
    createTenderProjectRow();
    createTenderProjectRow();

    $response = $this->getJson('/api/v1/dashboard/tender-projects?page=1&per_page=2');

    $response->assertOk()
        ->assertJson(['meta' => ['currentPage' => 1, 'lastPage' => 2, 'perPage' => 2, 'total' => 3]]);
});

test('an invalid status value is rejected', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');

    $response = $this->getJson('/api/v1/dashboard/tender-projects?status=bogus');

    $response->assertStatus(422);
});

test('an invalid sort_by value is rejected', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');

    $response = $this->getJson('/api/v1/dashboard/tender-projects?sort_by=description');

    $response->assertStatus(422);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=ListTenderProjectsTest`
Expected: FAIL — the route doesn't exist yet (404s / route-not-found).

- [ ] **Step 3: Create `ListTenderProjectsRequest`**

Create `backend/app/Modules/Tender/Presentation/Http/Requests/Project/ListTenderProjectsRequest.php`:

```php
<?php

namespace App\Modules\Tender\Presentation\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListTenderProjectsRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', Rule::in([
                'draft', 'published', 'closed', 'completed', 'cancelled', 'archived',
            ])],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'fiscal_year' => ['nullable', 'integer'],
            'sort_by' => ['nullable', 'string', Rule::in(['created_at', 'name', 'budget', 'fiscal_year'])],
            'sort_direction' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
```

- [ ] **Step 4: Make `TenderProjectResource` support both the domain entity and the raw model**

Replace the full contents of `backend/app/Modules/Tender/Presentation/Http/Resources/Project/TenderProjectResource.php`:

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

- [ ] **Step 5: Add `index` to `TenderProjectController`**

Replace the full contents of `backend/app/Modules/Tender/Presentation/Http/Controllers/TenderProjectController.php`:

```php
<?php

namespace App\Modules\Tender\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
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

    public function store(StoreTenderProjectRequest $request): JsonResponse
    {
        $project = $this->createTenderProject->execute(
            CreateTenderProjectData::from($request->validated()),
            $request->user()->id,
        );

        return response()->json(['data' => new TenderProjectResource($project)], 201);
    }
}
```

- [ ] **Step 6: Add the `GET` route**

In `backend/routes/api/v1/dashboard/tender-projects.php`, change:

```php
<?php

use App\Modules\Tender\Presentation\Http\Controllers\TenderProjectController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {
    Route::post('tender-projects', [TenderProjectController::class, 'store'])
        ->middleware('can:tender-projects.store')
        ->name('dashboard.tender-projects.store');
});
```

to:

```php
<?php

use App\Modules\Tender\Presentation\Http\Controllers\TenderProjectController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {
    Route::get('tender-projects', [TenderProjectController::class, 'index'])
        ->middleware('can:tender-projects.index')
        ->name('dashboard.tender-projects.index');

    Route::post('tender-projects', [TenderProjectController::class, 'store'])
        ->middleware('can:tender-projects.store')
        ->name('dashboard.tender-projects.store');
});
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `php artisan test --compact --filter=ListTenderProjectsTest`
Expected: PASS

Also re-run the existing create-flow test to confirm the `fromEntity` branch still works (regression check):

Run: `php artisan test --compact --filter=StoreTenderProjectTest`
Expected: PASS (unchanged behavior)

- [ ] **Step 8: Format and stage**

```bash
vendor/bin/pint --dirty --format agent
git status --short
git add app/Modules/Tender/Presentation/Http/Requests/Project/ListTenderProjectsRequest.php app/Modules/Tender/Presentation/Http/Resources/Project/TenderProjectResource.php app/Modules/Tender/Presentation/Http/Controllers/TenderProjectController.php routes/api/v1/dashboard/tender-projects.php tests/Feature/Modules/Tender/ListTenderProjectsTest.php
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 5: Full test suite regression check

**Files:** none (verification only).

**Interfaces:** none — terminal verification task.

- [ ] **Step 1: Run the full Tender module test suite**

Run: `php artisan test --compact tests/Feature/Modules/Tender`
Expected: PASS — all Tender tests (policy, repository, use case, model relations, store, and the new list query/endpoint tests) pass together.

- [ ] **Step 2: Run the full test suite**

Run: `php artisan test --compact`
Expected: PASS — no regressions elsewhere (e.g. the `AdminUserSeederTest` change from Task 1 doesn't break other seeder-dependent tests).

- [ ] **Step 3: Report status to the user**

Summarize: all tasks complete, all tests passing, all changes staged but not committed (per this plan's commit policy) — ready for the user's review and manual commit.
