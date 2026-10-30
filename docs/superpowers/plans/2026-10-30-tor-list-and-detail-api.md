# TOR List and Detail API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /api/v1/dashboard/tors` (paginated, filterable list) and `GET /api/v1/dashboard/tors/{id}` (detail), both limited by a three-level TOR visibility rule.

**Architecture:** Backend only. Follows the existing read-path convention (`ListTenderProjectsQuery`, `GetTenderProjectByIdQuery`): Application query classes query the Eloquent model `Tors` directly through `#[Scope]` methods. The visibility rule is one more scope, `visibleTo(User)`, shared by the list and the detail query. A policy only decides whether the user may open TORs at all.

**Tech Stack:** Laravel 13, PHP 8.4, Pest 4, Spatie Laravel Permission.

## Global Constraints

- Full spec: `docs/superpowers/specs/2026-10-30-tor-list-and-detail-api-design.md`.
- Monorepo root is `D:\E-Procurement-System`. File paths in this plan are relative to the root (`backend/...`), except inside code blocks and commands, which are relative to `backend/` (the working directory for all PHP/artisan/pest commands).
- Branch `Internal`, in place, no worktree.
- **Commit policy (standing user instruction, overrides the executing skill's per-task auto-commit): at the end of each task, `git add` only the files that task touched. Do NOT run `git commit`.** The user commits after review.
- Run `git status --short` before staging: sibling sessions may have unrelated uncommitted work in the same tree. Stage only this task's files.
- After modifying any PHP file run `vendor/bin/pint --dirty --format agent`.
- Run tests with `php artisan test --compact <file paths>`, scoped to the task's tests.
- `Model::preventLazyLoading()` is on (`app/Providers/AppServiceProvider.php`). Any relation a resource reads must be eager-loaded, including the nested ones `UserResource` reads (`UserInternalProfile`, its `InternalProfileDepartment` and `InternalProfilePosition`).
- `TorsFactory` picks a random existing project, department and internal user when those attributes are not given. **Tests must always pass `created_by` and `tender_project_id` explicitly** (usually `null`), or a TOR can be handed to the viewer by chance and break visibility tests.
- Pest helper functions are global across the whole suite. Every helper in this plan has a file-specific name; do not rename them to generic names like `makeTor()` (already used by `tests/Unit/Domain/Tender/Entities/Tor/TorTest.php`).
- Gate ability names must not equal a permission name (Spatie `Gate::before` bypass, documented in `TenderServiceProvider`). The ability is `tors.index`; no permission has that name.
- Permission names and labels (exact):
  - `tors.viewAny` — `ดูรายการ TOR` (already seeded)
  - `tors.viewDepartment` — `ดู TOR ของหน่วยงานตัวเอง`
  - `tors.viewOwn` — `ดู TOR ที่ตัวเองสร้าง`
- The 10 TOR statuses (exact, from the `tors` migration): `draft`, `in_review`, `revision_required`, `approved`, `bidding`, `closed`, `no_bidder`, `awarded`, `completed`, `cancelled`.
- Out of scope: frontend, create/edit/status change, stats, and the 5 pre-existing failures in `ListTenderProjectsTest`/`StoreTenderProjectTest`.

---

### Task 1: TOR view permissions, policy, and Gate ability

**Files:**
- Modify: `backend/database/seeders/AdminUserSeeder.php` (the `tors.viewAny` line, ~line 35)
- Create: `backend/app/Modules/Tender/Presentation/Policies/TorPolicy.php`
- Modify: `backend/app/Modules/Tender/Providers/TenderServiceProvider.php` (imports, `boot()`)
- Create: `backend/tests/Feature/Modules/Tender/TorPolicyTest.php`
- Modify: `backend/tests/Feature/Database/Seeders/AdminUserSeederTest.php` (the TOR permission dataset at the end of the file)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: Gate ability `tors.index` → `TorPolicy::viewAny(User $user): bool`. Permissions `tors.viewDepartment` and `tors.viewOwn` exist after seeding. Task 3's routes use `->middleware('can:tors.index')`.

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/Modules/Tender/TorPolicyTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

test('an internal user with any TOR view permission may list TORs', function (string $permission) {
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tors.index'))->toBeTrue();
})->with([
    'tors.viewAny',
    'tors.viewDepartment',
    'tors.viewOwn',
]);

test('an internal user without a TOR view permission may not list TORs', function () {
    $user = User::factory()->create(['user_type' => 'internal']);

    expect(Gate::forUser($user)->allows('tors.index'))->toBeFalse();
});

test('a vendor user may not list TORs even when granted tors.viewAny', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tors.viewAny', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tors.index'))->toBeFalse();
});
```

In `tests/Feature/Database/Seeders/AdminUserSeederTest.php`, the last test is `running the admin seeder grants the admin role every TOR permission` with a `->with([...])` dataset. Add the two new permissions to that dataset so it reads:

```php
})->with([
    'tors.viewAny',
    'tors.viewDepartment',
    'tors.viewOwn',
    'tors.create',
    'tors.update',
    'tors.delete',
    'tors.review',
    'tors.publish',
    'tors.cancel',
]);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact tests/Feature/Modules/Tender/TorPolicyTest.php tests/Feature/Database/Seeders/AdminUserSeederTest.php`

Expected: FAIL. The three `may list TORs` dataset cases fail (`tors.index` is not defined, so the Gate denies), and the seeder cases for `tors.viewDepartment` / `tors.viewOwn` fail with `PermissionDoesNotExist` or `false`.

- [ ] **Step 3: Seed the two new permissions**

In `database/seeders/AdminUserSeeder.php`, directly after the existing line

```php
            Permission::updateOrCreate(['name' => 'tors.viewAny', 'guard_name' => 'web'], ['label' => 'ดูรายการ TOR']),
```

add:

```php
            Permission::updateOrCreate(['name' => 'tors.viewDepartment', 'guard_name' => 'web'], ['label' => 'ดู TOR ของหน่วยงานตัวเอง']),
            Permission::updateOrCreate(['name' => 'tors.viewOwn', 'guard_name' => 'web'], ['label' => 'ดู TOR ที่ตัวเองสร้าง']),
```

- [ ] **Step 4: Create the policy**

Create `app/Modules/Tender/Presentation/Policies/TorPolicy.php`:

```php
<?php

namespace App\Modules\Tender\Presentation\Policies;

use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User;

class TorPolicy
{
    /**
     * Holding any of these lets an internal user open TORs at all. Which TORs
     * they actually see is decided by the Tors::visibleTo() scope.
     *
     * @var list<string>
     */
    private const array VIEW_PERMISSIONS = ['tors.viewAny', 'tors.viewDepartment', 'tors.viewOwn'];

    public function viewAny(User $user): bool
    {
        if ($user->user_type !== UserType::Internal) {
            return false;
        }

        foreach (self::VIEW_PERMISSIONS as $permission) {
            if ($user->checkPermissionTo($permission)) {
                return true;
            }
        }

        return false;
    }
}
```

- [ ] **Step 5: Register the Gate ability**

In `app/Modules/Tender/Providers/TenderServiceProvider.php`, add the import next to the existing `TenderProjectPolicy` import:

```php
use App\Modules\Tender\Presentation\Policies\TorPolicy;
```

At the end of `boot()`, after the line `Gate::define('tender-projects.destroy', [TenderProjectPolicy::class, 'delete']);`, add:

```php

        // Same reason as above: `tors.index` must not equal any TOR permission
        // name (`tors.viewAny`, `tors.viewDepartment`, `tors.viewOwn`).
        Gate::define('tors.index', [TorPolicy::class, 'viewAny']);
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `vendor/bin/pint --dirty --format agent`, then
`php artisan test --compact tests/Feature/Modules/Tender/TorPolicyTest.php tests/Feature/Database/Seeders/AdminUserSeederTest.php`

Expected: PASS (all tests in both files).

- [ ] **Step 7: Stage (do not commit)**

```bash
git status --short
git add database/seeders/AdminUserSeeder.php app/Modules/Tender/Presentation/Policies/TorPolicy.php app/Modules/Tender/Providers/TenderServiceProvider.php tests/Feature/Modules/Tender/TorPolicyTest.php tests/Feature/Database/Seeders/AdminUserSeederTest.php
```

---

### Task 2: Visibility and filter scopes, list and detail queries

**Files:**
- Modify: `backend/app/Modules/Tender/Infrastructure/Models/Tor/Tors.php` (imports, a constant, scopes)
- Create: `backend/app/Modules/Tender/Application/Tor/Queries/ListTorsQuery.php`
- Create: `backend/app/Modules/Tender/Application/Tor/Queries/GetTorByIdQuery.php`
- Create: `backend/tests/Feature/Modules/Tender/ListTorsQueryTest.php`
- Create: `backend/tests/Feature/Modules/Tender/GetTorByIdQueryTest.php`

**Interfaces:**
- Consumes: permission names from Task 1 (the scope checks them by name; they need not be seeded for the query to work).
- Produces:
  - `Tors::RESOURCE_RELATIONS` (`list<string>`) — relations `TorResource` (Task 3) reads.
  - `ListTorsQuery::execute(User $viewer, ?string $search = null, ?string $status = null, ?int $departmentId = null, ?int $fiscalYear = null, ?string $tenderProject = null, ?string $procurementMethod = null, ?string $sortBy = null, ?string $sortDirection = null, ?int $page = null, ?int $perPage = null): LengthAwarePaginator` — `$tenderProject` is a numeric project id string or `'none'`.
  - `GetTorByIdQuery::execute(int $id, User $viewer): Tors` — throws `Illuminate\Database\Eloquent\ModelNotFoundException` when the TOR is missing or not visible.

- [ ] **Step 1: Write the failing list query tests**

Create `tests/Feature/Modules/Tender/ListTorsQueryTest.php`:

```php
<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\Tender\Application\Tor\Queries\ListTorsQuery;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function listTorsQuery(): ListTorsQuery
{
    return app(ListTorsQuery::class);
}

/**
 * An internal user holding the given TOR permissions. With $withProfile, the
 * user gets an internal profile in $departmentId (which may be null).
 *
 * @param  list<string>  $permissions
 */
function torQueryViewer(array $permissions, ?int $departmentId = null, bool $withProfile = true): User
{
    $user = User::factory()->create(['user_type' => 'internal']);

    foreach ($permissions as $permission) {
        $user->givePermissionTo(Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']));
    }

    if ($withProfile) {
        InternalProfiles::create([
            'user_id' => $user->id,
            'firstname' => 'A',
            'lastname' => 'B',
            'department_id' => $departmentId,
        ]);
    }

    return $user;
}

/**
 * A TOR outside any project and with no creator unless given, so the
 * factory's random picks never hand it to the viewer by accident.
 *
 * @param  array<string, mixed>  $attributes
 */
function torForQueryTest(array $attributes = []): Tors
{
    return Tors::factory()->create([
        'tender_project_id' => null,
        'created_by' => null,
        ...$attributes,
    ]);
}

test('a viewer with tors.viewAny sees every TOR', function () {
    $hr = Department::create(['name' => 'HR']);
    $it = Department::create(['name' => 'IT']);
    torForQueryTest(['department_id' => $hr->id]);
    torForQueryTest(['department_id' => $it->id]);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']));

    expect($result->total())->toBe(2);
});

test('a viewer with tors.viewDepartment sees only TORs of their profile department', function () {
    $hr = Department::create(['name' => 'HR']);
    $it = Department::create(['name' => 'IT']);
    $mine = torForQueryTest(['department_id' => $it->id]);
    torForQueryTest(['department_id' => $hr->id]);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewDepartment'], $it->id));

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($mine->id);
});

test('a viewer with tors.viewOwn sees only TORs they created', function () {
    $viewer = torQueryViewer(['tors.viewOwn']);
    $mine = torForQueryTest(['created_by' => $viewer->id]);
    torForQueryTest();

    $result = listTorsQuery()->execute($viewer);

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($mine->id);
});

test('a viewer holding tors.viewAny and tors.viewOwn gets the wider tors.viewAny', function () {
    $viewer = torQueryViewer(['tors.viewAny', 'tors.viewOwn']);
    torForQueryTest(['created_by' => $viewer->id]);
    torForQueryTest();

    $result = listTorsQuery()->execute($viewer);

    expect($result->total())->toBe(2);
});

test('a viewer holding tors.viewDepartment and tors.viewOwn does not see their own TOR in another department', function () {
    $hr = Department::create(['name' => 'HR']);
    $it = Department::create(['name' => 'IT']);
    $viewer = torQueryViewer(['tors.viewDepartment', 'tors.viewOwn'], $it->id);
    $inDepartment = torForQueryTest(['department_id' => $it->id]);
    torForQueryTest(['department_id' => $hr->id, 'created_by' => $viewer->id]);

    $result = listTorsQuery()->execute($viewer);

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($inDepartment->id);
});

test('a viewer with tors.viewDepartment but no internal profile sees nothing', function () {
    torForQueryTest();

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewDepartment'], withProfile: false));

    expect($result->total())->toBe(0);
});

test('a viewer with tors.viewDepartment and a profile without a department sees nothing', function () {
    torForQueryTest();

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewDepartment'], departmentId: null));

    expect($result->total())->toBe(0);
});

test('a viewer without any TOR view permission sees nothing', function () {
    torForQueryTest();

    $result = listTorsQuery()->execute(torQueryViewer([]));

    expect($result->total())->toBe(0);
});

test('execute searches by title', function () {
    $target = torForQueryTest(['title' => 'จัดซื้อเครื่องพิมพ์เลเซอร์']);
    torForQueryTest(['title' => 'จ้างเหมาทำความสะอาด']);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), search: 'เลเซอร์');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($target->id);
});

test('execute searches by TOR code', function () {
    $target = torForQueryTest(['tor_code' => 'TOR-2569-0042']);
    torForQueryTest(['tor_code' => 'TOR-2569-0043']);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), search: 'TOR-2569-0042');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($target->id);
});

test('execute filters by status', function () {
    $target = torForQueryTest(['status' => 'bidding']);
    torForQueryTest(['status' => 'draft']);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), status: 'bidding');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($target->id);
});

test('execute filters by department', function () {
    $hr = Department::create(['name' => 'HR']);
    $it = Department::create(['name' => 'IT']);
    $target = torForQueryTest(['department_id' => $hr->id]);
    torForQueryTest(['department_id' => $it->id]);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), departmentId: $hr->id);

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($target->id);
});

test('execute filters by fiscal year', function () {
    $target = torForQueryTest(['fiscal_year' => 2569]);
    torForQueryTest(['fiscal_year' => 2568]);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), fiscalYear: 2569);

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($target->id);
});

test('execute filters by tender project id', function () {
    $project = TenderProjects::factory()->create();
    $target = torForQueryTest(['tender_project_id' => $project->id]);
    torForQueryTest();

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), tenderProject: (string) $project->id);

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($target->id);
});

test('execute filters TORs without a tender project when given none', function () {
    $project = TenderProjects::factory()->create();
    torForQueryTest(['tender_project_id' => $project->id]);
    $target = torForQueryTest();

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), tenderProject: 'none');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($target->id);
});

test('execute filters by procurement method', function () {
    $target = torForQueryTest(['procurement_method' => 'e-bidding']);
    torForQueryTest(['procurement_method' => 'e-market']);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), procurementMethod: 'e-bidding');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($target->id);
});

test('execute sorts newest first by default', function () {
    $older = torForQueryTest(['created_at' => now()->subDays(2)]);
    $newer = torForQueryTest(['created_at' => now()->subDay()]);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']));

    expect(collect($result->items())->pluck('id')->all())->toBe([$newer->id, $older->id]);
});

test('execute sorts by a whitelisted column and direction', function (string $column, mixed $low, mixed $high) {
    $highTor = torForQueryTest([$column => $high]);
    $lowTor = torForQueryTest([$column => $low]);

    $ascending = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), sortBy: $column, sortDirection: 'asc');
    $descending = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), sortBy: $column, sortDirection: 'desc');

    expect(collect($ascending->items())->pluck('id')->all())->toBe([$lowTor->id, $highTor->id])
        ->and(collect($descending->items())->pluck('id')->all())->toBe([$highTor->id, $lowTor->id]);
})->with([
    'tor_code' => ['tor_code', 'TOR-2569-0001', 'TOR-2569-0002'],
    'title' => ['title', 'ก', 'ข'],
    'budget_estimate' => ['budget_estimate', '100000.00', '900000.00'],
    'fiscal_year' => ['fiscal_year', 2568, 2569],
    'bidding_end_at' => ['bidding_end_at', '2026-01-01 00:00:00', '2026-06-01 00:00:00'],
]);

test('execute ignores a sort column outside the whitelist and keeps newest first', function () {
    $older = torForQueryTest(['created_at' => now()->subDays(2)]);
    $newer = torForQueryTest(['created_at' => now()->subDay()]);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), sortBy: 'remark');

    expect(collect($result->items())->pluck('id')->all())->toBe([$newer->id, $older->id]);
});

test('execute paginates 20 per page by default', function () {
    foreach (range(1, 21) as $i) {
        torForQueryTest();
    }

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']));

    expect($result->perPage())->toBe(20)
        ->and($result->total())->toBe(21)
        ->and($result->lastPage())->toBe(2)
        ->and($result->items())->toHaveCount(20);
});

test('execute eager-loads the relations the TOR resource reads', function () {
    torForQueryTest();

    $tor = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']))->items()[0];

    expect($tor->relationLoaded('TorsDepartment'))->toBeTrue()
        ->and($tor->relationLoaded('TorsTenderProject'))->toBeTrue()
        ->and($tor->relationLoaded('TorsCreatedBy'))->toBeTrue()
        ->and($tor->relationLoaded('TorsApprovedBy'))->toBeTrue();
});
```

- [ ] **Step 2: Write the failing detail query tests**

Create `tests/Feature/Modules/Tender/GetTorByIdQueryTest.php`:

```php
<?php

use App\Modules\Tender\Application\Tor\Queries\GetTorByIdQuery;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function getTorByIdQuery(): GetTorByIdQuery
{
    return app(GetTorByIdQuery::class);
}

function torByIdViewOwnViewer(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tors.viewOwn', 'guard_name' => 'web']));

    return $user;
}

test('execute returns a TOR the viewer may see, with its relations loaded', function () {
    $viewer = torByIdViewOwnViewer();
    $tor = Tors::factory()->create(['created_by' => $viewer->id, 'tender_project_id' => null]);

    $found = getTorByIdQuery()->execute($tor->id, $viewer);

    expect($found->id)->toBe($tor->id)
        ->and($found->relationLoaded('TorsDepartment'))->toBeTrue()
        ->and($found->relationLoaded('TorsCreatedBy'))->toBeTrue();
});

test('execute throws for a TOR that does not exist', function () {
    getTorByIdQuery()->execute(999999, torByIdViewOwnViewer());
})->throws(ModelNotFoundException::class);

test('execute throws for an existing TOR outside the viewer visibility', function () {
    $tor = Tors::factory()->create(['created_by' => null, 'tender_project_id' => null]);

    getTorByIdQuery()->execute($tor->id, torByIdViewOwnViewer());
})->throws(ModelNotFoundException::class);
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `php artisan test --compact tests/Feature/Modules/Tender/ListTorsQueryTest.php tests/Feature/Modules/Tender/GetTorByIdQueryTest.php`

Expected: FAIL with `Target class [App\Modules\Tender\Application\Tor\Queries\ListTorsQuery] does not exist` (and the same for `GetTorByIdQuery`).

- [ ] **Step 4: Add the constant and scopes to `Tors`**

In `app/Modules/Tender/Infrastructure/Models/Tor/Tors.php`, add these imports alongside the existing ones (keep them alphabetical):

```php
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
```

(`App\Modules\User\Infrastructure\Models\User` is already imported.)

Inside the class, directly after `use HasFactory;`, add the constant:

```php

    /**
     * Relations TorResource reads, including the nested ones UserResource
     * reads. Both TOR queries eager-load these because
     * Model::preventLazyLoading() is on.
     *
     * @var list<string>
     */
    public const array RESOURCE_RELATIONS = [
        'TorsDepartment',
        'TorsTenderProject',
        'TorsCreatedBy.UserInternalProfile.InternalProfileDepartment',
        'TorsCreatedBy.UserInternalProfile.InternalProfilePosition',
        'TorsApprovedBy.UserInternalProfile.InternalProfileDepartment',
        'TorsApprovedBy.UserInternalProfile.InternalProfilePosition',
    ];
```

At the end of the class, after the `TorsApprovedBy()` relation, add the scopes:

```php

    /**
     * Scope a query to the TORs the viewer may see. Only the widest TOR view
     * permission the viewer holds applies: tors.viewAny (every TOR), then
     * tors.viewDepartment (their profile department), then tors.viewOwn
     * (TORs they created). With none of them, nothing matches.
     */
    #[Scope]
    protected function visibleTo(Builder $query, User $viewer): void
    {
        if ($viewer->checkPermissionTo('tors.viewAny')) {
            return;
        }

        if ($viewer->checkPermissionTo('tors.viewDepartment')) {
            $departmentId = $viewer->UserInternalProfile?->department_id;

            if ($departmentId === null) {
                $query->whereRaw('1 = 0');

                return;
            }

            $query->where('department_id', $departmentId);

            return;
        }

        if ($viewer->checkPermissionTo('tors.viewOwn')) {
            $query->where('created_by', $viewer->id);

            return;
        }

        $query->whereRaw('1 = 0');
    }

    /**
     * Scope a query to TORs whose title or TOR code matches the given search term.
     */
    #[Scope]
    protected function search(Builder $query, ?string $search): void
    {
        $search = $search === null ? '' : trim($search);

        if ($search === '') {
            return;
        }

        $term = '%'.$search.'%';

        $query->where(function (Builder $query) use ($term) {
            $query->where('title', 'like', $term)
                ->orWhere('tor_code', 'like', $term);
        });
    }

    /**
     * Scope a query to only include TORs with the given status.
     */
    #[Scope]
    protected function status(Builder $query, ?string $status): void
    {
        $query->when($status !== null, fn (Builder $query) => $query->where('status', $status));
    }

    /**
     * Scope a query to only include TORs in the given department.
     */
    #[Scope]
    protected function departmentId(Builder $query, ?int $departmentId): void
    {
        $query->when($departmentId !== null, fn (Builder $query) => $query->where('department_id', $departmentId));
    }

    /**
     * Scope a query to only include TORs in the given fiscal year.
     */
    #[Scope]
    protected function fiscalYear(Builder $query, ?int $fiscalYear): void
    {
        $query->when($fiscalYear !== null, fn (Builder $query) => $query->where('fiscal_year', $fiscalYear));
    }

    /**
     * Scope a query to TORs in the given tender project, or to TORs outside
     * any project when given 'none'.
     */
    #[Scope]
    protected function tenderProject(Builder $query, ?string $tenderProject): void
    {
        if ($tenderProject === null) {
            return;
        }

        if ($tenderProject === 'none') {
            $query->whereNull('tender_project_id');

            return;
        }

        $query->where('tender_project_id', (int) $tenderProject);
    }

    /**
     * Scope a query to only include TORs using the given procurement method.
     */
    #[Scope]
    protected function procurementMethod(Builder $query, ?string $procurementMethod): void
    {
        $query->when($procurementMethod !== null, fn (Builder $query) => $query->where('procurement_method', $procurementMethod));
    }

    /**
     * Scope a query to sort by the given whitelisted column (defaults to created_at).
     */
    #[Scope]
    protected function sort(Builder $query, ?string $sortBy, ?string $sortDirection = null): void
    {
        $direction = $sortDirection === 'asc' ? 'asc' : 'desc';

        $query->orderBy(
            in_array($sortBy, ['tor_code', 'title', 'budget_estimate', 'fiscal_year', 'bidding_end_at'], true) ? $sortBy : 'created_at',
            $direction,
        );
    }
```

- [ ] **Step 5: Create the list query**

Create `app/Modules/Tender/Application/Tor/Queries/ListTorsQuery.php`:

```php
<?php

namespace App\Modules\Tender\Application\Tor\Queries;

use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListTorsQuery
{
    private const DEFAULT_PER_PAGE = 20;

    /**
     * @param  string|null  $tenderProject  a tender project id, or 'none' for TORs outside any project
     */
    public function execute(
        User $viewer,
        ?string $search = null,
        ?string $status = null,
        ?int $departmentId = null,
        ?int $fiscalYear = null,
        ?string $tenderProject = null,
        ?string $procurementMethod = null,
        ?string $sortBy = null,
        ?string $sortDirection = null,
        ?int $page = null,
        ?int $perPage = null,
    ): LengthAwarePaginator {
        $tieBreakDirection = $sortDirection === 'asc' ? 'asc' : 'desc';

        return Tors::query()
            ->with(Tors::RESOURCE_RELATIONS)
            ->visibleTo($viewer)
            ->search($search)
            ->status($status)
            ->departmentId($departmentId)
            ->fiscalYear($fiscalYear)
            ->tenderProject($tenderProject)
            ->procurementMethod($procurementMethod)
            ->sort($sortBy, $sortDirection)
            ->orderBy('id', $tieBreakDirection)
            ->paginate(perPage: $perPage ?? self::DEFAULT_PER_PAGE, page: $page ?? 1);
    }
}
```

- [ ] **Step 6: Create the detail query**

Create `app/Modules/Tender/Application/Tor/Queries/GetTorByIdQuery.php`:

```php
<?php

namespace App\Modules\Tender\Application\Tor\Queries;

use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class GetTorByIdQuery
{
    /**
     * A TOR the viewer may not see is reported exactly like a missing one,
     * so the response never reveals that it exists.
     */
    public function execute(int $id, User $viewer): Tors
    {
        return Tors::query()
            ->with(Tors::RESOURCE_RELATIONS)
            ->visibleTo($viewer)
            ->find($id) ?? throw (new ModelNotFoundException)->setModel(Tors::class, [$id]);
    }
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `vendor/bin/pint --dirty --format agent`, then
`php artisan test --compact tests/Feature/Modules/Tender/ListTorsQueryTest.php tests/Feature/Modules/Tender/GetTorByIdQueryTest.php tests/Feature/Modules/Tender/TenderModelRelationsTest.php tests/Feature/Modules/Tender/TorSeederTest.php`

Expected: PASS (all tests in the four files).

- [ ] **Step 8: Stage (do not commit)**

```bash
git status --short
git add app/Modules/Tender/Infrastructure/Models/Tor/Tors.php app/Modules/Tender/Application/Tor/Queries/ListTorsQuery.php app/Modules/Tender/Application/Tor/Queries/GetTorByIdQuery.php tests/Feature/Modules/Tender/ListTorsQueryTest.php tests/Feature/Modules/Tender/GetTorByIdQueryTest.php
```

---

### Task 3: HTTP layer — request, resource, controller, routes

**Files:**
- Create: `backend/app/Modules/Tender/Presentation/Http/Requests/Tor/ListTorsRequest.php`
- Create: `backend/app/Modules/Tender/Presentation/Http/Resources/Tor/TorResource.php`
- Create: `backend/app/Modules/Tender/Presentation/Http/Controllers/TorController.php`
- Create: `backend/routes/api/v1/dashboard/tors.php`
- Modify: `backend/routes/api.php` (inside the `auth` group)
- Create: `backend/tests/Feature/Modules/Tender/ListTorsTest.php`
- Create: `backend/tests/Feature/Modules/Tender/ShowTorTest.php`

**Interfaces:**
- Consumes: Gate ability `tors.index` (Task 1); `ListTorsQuery::execute(...)`, `GetTorByIdQuery::execute(int $id, User $viewer)` and `Tors::RESOURCE_RELATIONS` (Task 2).
- Produces: routes `dashboard.tors.index` (`GET /api/v1/dashboard/tors`) and `dashboard.tors.show` (`GET /api/v1/dashboard/tors/{id}`) — the contract the future frontend plan consumes.

- [ ] **Step 1: Write the failing list endpoint tests**

Create `tests/Feature/Modules/Tender/ListTorsTest.php`:

```php
<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

/**
 * An internal user with an internal profile in an IT department, so
 * UserResource has nested profile data to render.
 */
function torApiInternalUser(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);

    InternalProfiles::create([
        'user_id' => $user->id,
        'firstname' => 'Somchai',
        'lastname' => 'Jaidee',
        'department_id' => Department::firstOrCreate(['name' => 'IT'])->id,
    ]);

    return $user;
}

/**
 * @param  list<string>  $permissions
 */
function torApiViewer(array $permissions = ['tors.viewAny']): User
{
    $user = torApiInternalUser();

    foreach ($permissions as $permission) {
        $user->givePermissionTo(Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']));
    }

    return $user;
}

/**
 * @param  array<string, mixed>  $attributes
 */
function torForApiTest(array $attributes = []): Tors
{
    return Tors::factory()->create([
        'tender_project_id' => null,
        'created_by' => null,
        ...$attributes,
    ]);
}

test('listing TORs requires authentication', function () {
    $this->getJson('/api/v1/dashboard/tors')->assertStatus(401);
});

test('an internal user without a TOR view permission cannot list TORs', function () {
    $this->actingAs(torApiViewer([]), 'web');

    $this->getJson('/api/v1/dashboard/tors')->assertStatus(403);
});

test('a vendor user cannot list TORs even when granted tors.viewAny', function () {
    $vendor = User::factory()->create(['user_type' => 'company']);
    $vendor->givePermissionTo(Permission::firstOrCreate(['name' => 'tors.viewAny', 'guard_name' => 'web']));
    $this->actingAs($vendor, 'web');

    $this->getJson('/api/v1/dashboard/tors')->assertStatus(403);
});

test('the TOR list returns every key and uses null for missing values', function () {
    $this->actingAs(torApiViewer(), 'web');
    $project = TenderProjects::factory()->create(['project_code' => 'TP-2569-0001', 'name' => 'จัดซื้อคอมพิวเตอร์']);
    $approver = torApiInternalUser();

    torForApiTest([
        'tor_code' => 'TOR-2569-0001',
        'status' => 'draft',
        'created_by' => torApiInternalUser()->id,
        'approved_by' => null,
        'approved_at' => null,
        'bidding_start_at' => null,
        'bidding_end_at' => null,
        'remark' => null,
        'created_at' => now()->subDay(),
    ]);
    torForApiTest([
        'tor_code' => 'TOR-2569-0002',
        'status' => 'bidding',
        'tender_project_id' => $project->id,
        'created_by' => torApiInternalUser()->id,
        'approved_by' => $approver->id,
        'budget_estimate' => '500000.00',
        'fiscal_year' => 2569,
        'created_at' => now(),
    ]);

    $this->getJson('/api/v1/dashboard/tors')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [[
                'id', 'torCode', 'title', 'scopeOfWork', 'budgetEstimate', 'procurementMethod',
                'fiscalYear', 'biddingStartAt', 'biddingEndAt', 'status', 'remark', 'approvedAt',
                'createdAt', 'department', 'tenderProject', 'createdBy', 'approvedBy',
            ]],
            'meta' => ['currentPage', 'lastPage', 'perPage', 'total'],
        ])
        ->assertJsonPath('meta.total', 2)
        ->assertJsonPath('meta.currentPage', 1)
        ->assertJsonPath('meta.perPage', 20)
        ->assertJsonPath('data.0.torCode', 'TOR-2569-0002')
        ->assertJsonPath('data.0.budgetEstimate', '500000.00')
        ->assertJsonPath('data.0.fiscalYear', 2569)
        ->assertJsonPath('data.0.status', 'bidding')
        ->assertJsonPath('data.0.tenderProject', [
            'id' => $project->id,
            'projectCode' => 'TP-2569-0001',
            'name' => 'จัดซื้อคอมพิวเตอร์',
        ])
        ->assertJsonPath('data.0.approvedBy.id', $approver->id)
        ->assertJsonPath('data.1.torCode', 'TOR-2569-0001')
        ->assertJsonPath('data.1.tenderProject', null)
        ->assertJsonPath('data.1.approvedBy', null)
        ->assertJsonPath('data.1.approvedAt', null)
        ->assertJsonPath('data.1.biddingStartAt', null)
        ->assertJsonPath('data.1.biddingEndAt', null)
        ->assertJsonPath('data.1.remark', null);
});

test('the TOR list passes filters through to the query', function () {
    $this->actingAs(torApiViewer(), 'web');
    $project = TenderProjects::factory()->create();
    torForApiTest(['status' => 'bidding', 'tender_project_id' => $project->id]);
    $target = torForApiTest(['status' => 'bidding']);
    torForApiTest(['status' => 'draft']);

    $this->getJson('/api/v1/dashboard/tors?status=bidding&tender_project_id=none')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $target->id);
});

test('the TOR list only returns TORs the viewer may see', function () {
    $viewer = torApiViewer(['tors.viewOwn']);
    $this->actingAs($viewer, 'web');
    $mine = torForApiTest(['created_by' => $viewer->id]);
    torForApiTest();

    $this->getJson('/api/v1/dashboard/tors')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $mine->id);
});

test('the TOR list rejects invalid query parameters', function (string $query, string $field) {
    $this->actingAs(torApiViewer(), 'web');

    $this->getJson('/api/v1/dashboard/tors?'.$query)
        ->assertStatus(422)
        ->assertJsonValidationErrors([$field]);
})->with([
    'unknown status' => ['status=published', 'status'],
    'unknown sort column' => ['sort_by=remark', 'sort_by'],
    'bad sort direction' => ['sort_direction=up', 'sort_direction'],
    'non-numeric project' => ['tender_project_id=abc', 'tender_project_id'],
    'missing project' => ['tender_project_id=999999', 'tender_project_id'],
    'missing department' => ['department_id=999999', 'department_id'],
    'per page over 100' => ['per_page=101', 'per_page'],
]);
```

- [ ] **Step 2: Write the failing detail endpoint tests**

Create `tests/Feature/Modules/Tender/ShowTorTest.php`:

```php
<?php

use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

/**
 * @param  list<string>  $permissions
 */
function showTorViewer(array $permissions): User
{
    $user = User::factory()->create(['user_type' => 'internal']);

    foreach ($permissions as $permission) {
        $user->givePermissionTo(Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']));
    }

    return $user;
}

test('showing a TOR requires authentication', function () {
    $this->getJson('/api/v1/dashboard/tors/1')->assertStatus(401);
});

test('an internal user without a TOR view permission cannot show a TOR', function () {
    $this->actingAs(showTorViewer([]), 'web');
    $tor = Tors::factory()->create(['created_by' => null, 'tender_project_id' => null]);

    $this->getJson('/api/v1/dashboard/tors/'.$tor->id)->assertStatus(403);
});

test('showing a visible TOR returns it with every key', function () {
    $this->actingAs(showTorViewer(['tors.viewAny']), 'web');
    $tor = Tors::factory()->create([
        'tor_code' => 'TOR-2569-0007',
        'status' => 'draft',
        'created_by' => null,
        'tender_project_id' => null,
        'approved_by' => null,
    ]);

    $this->getJson('/api/v1/dashboard/tors/'.$tor->id)
        ->assertOk()
        ->assertJsonStructure(['data' => [
            'id', 'torCode', 'title', 'scopeOfWork', 'budgetEstimate', 'procurementMethod',
            'fiscalYear', 'biddingStartAt', 'biddingEndAt', 'status', 'remark', 'approvedAt',
            'createdAt', 'department', 'tenderProject', 'createdBy', 'approvedBy',
        ]])
        ->assertJsonPath('data.id', $tor->id)
        ->assertJsonPath('data.torCode', 'TOR-2569-0007')
        ->assertJsonPath('data.department.id', $tor->department_id)
        ->assertJsonPath('data.tenderProject', null)
        ->assertJsonPath('data.createdBy', null)
        ->assertJsonPath('data.approvedBy', null);
});

test('showing a TOR that does not exist returns 404', function () {
    $this->actingAs(showTorViewer(['tors.viewAny']), 'web');

    $this->getJson('/api/v1/dashboard/tors/999999')->assertStatus(404);
});

test('showing an existing TOR outside the viewer visibility returns 404', function () {
    $this->actingAs(showTorViewer(['tors.viewOwn']), 'web');
    $tor = Tors::factory()->create(['created_by' => null, 'tender_project_id' => null]);

    $this->getJson('/api/v1/dashboard/tors/'.$tor->id)->assertStatus(404);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `php artisan test --compact tests/Feature/Modules/Tender/ListTorsTest.php tests/Feature/Modules/Tender/ShowTorTest.php`

Expected: FAIL. No `/api/v1/dashboard/tors` route exists yet, so every request (including the unauthenticated ones) returns 404 instead of the expected status.

- [ ] **Step 4: Create the request**

Create `app/Modules/Tender/Presentation/Http/Requests/Tor/ListTorsRequest.php`:

```php
<?php

namespace App\Modules\Tender\Presentation\Http\Requests\Tor;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Fluent;
use Illuminate\Validation\Rule;

class ListTorsRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', Rule::in([
                'draft',
                'in_review',
                'revision_required',
                'approved',
                'bidding',
                'closed',
                'no_bidder',
                'awarded',
                'completed',
                'cancelled',
            ])],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'fiscal_year' => ['nullable', 'integer'],
            'tender_project_id' => [
                'nullable',
                Rule::when(
                    fn (Fluent $input) => $input->get('tender_project_id') !== 'none',
                    ['integer', 'exists:tenders_projects,id'],
                ),
            ],
            'procurement_method' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'string', Rule::in(['tor_code', 'title', 'budget_estimate', 'fiscal_year', 'bidding_end_at', 'created_at'])],
            'sort_direction' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
```

- [ ] **Step 5: Create the resource**

Create `app/Modules/Tender/Presentation/Http/Resources/Tor/TorResource.php`:

```php
<?php

namespace App\Modules\Tender\Presentation\Http\Resources\Tor;

use App\Modules\InternalProfiles\Presentation\Http\Resources\DepartmentResource;
use App\Modules\User\Presentation\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TorResource extends JsonResource
{
    public static $wrap = false;

    /**
     * Every key is always present: a missing value is null, never a dropped
     * key. Relations are read directly because both TOR queries eager-load
     * Tors::RESOURCE_RELATIONS.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'torCode' => $this->tor_code,
            'title' => $this->title,
            'scopeOfWork' => $this->scope_of_work,
            'budgetEstimate' => $this->budget_estimate,
            'procurementMethod' => $this->procurement_method,
            'fiscalYear' => $this->fiscal_year,
            'biddingStartAt' => $this->bidding_start_at?->toIso8601String(),
            'biddingEndAt' => $this->bidding_end_at?->toIso8601String(),
            'status' => $this->status,
            'remark' => $this->remark,
            'approvedAt' => $this->approved_at?->toIso8601String(),
            'createdAt' => $this->created_at?->toIso8601String(),
            'department' => DepartmentResource::make($this->TorsDepartment),
            'tenderProject' => $this->TorsTenderProject === null ? null : [
                'id' => $this->TorsTenderProject->id,
                'projectCode' => $this->TorsTenderProject->project_code,
                'name' => $this->TorsTenderProject->name,
            ],
            'createdBy' => $this->TorsCreatedBy === null ? null : UserResource::make($this->TorsCreatedBy),
            'approvedBy' => $this->TorsApprovedBy === null ? null : UserResource::make($this->TorsApprovedBy),
        ];
    }
}
```

- [ ] **Step 6: Create the controller**

Create `app/Modules/Tender/Presentation/Http/Controllers/TorController.php`:

```php
<?php

namespace App\Modules\Tender\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Tender\Application\Tor\Queries\GetTorByIdQuery;
use App\Modules\Tender\Application\Tor\Queries\ListTorsQuery;
use App\Modules\Tender\Presentation\Http\Requests\Tor\ListTorsRequest;
use App\Modules\Tender\Presentation\Http\Resources\Tor\TorResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TorController extends Controller
{
    public function __construct(
        private readonly ListTorsQuery $listTors,
        private readonly GetTorByIdQuery $getTorById,
    ) {}

    public function index(ListTorsRequest $request): JsonResponse
    {
        $tors = $this->listTors->execute(
            viewer: $request->user(),
            search: $request->validated('search'),
            status: $request->validated('status'),
            departmentId: $request->validated('department_id'),
            fiscalYear: $request->validated('fiscal_year'),
            tenderProject: $request->validated('tender_project_id'),
            procurementMethod: $request->validated('procurement_method'),
            sortBy: $request->validated('sort_by'),
            sortDirection: $request->validated('sort_direction'),
            page: $request->validated('page'),
            perPage: $request->validated('per_page'),
        );

        return response()->json([
            'data' => TorResource::collection($tors->getCollection()),
            'meta' => [
                'currentPage' => $tors->currentPage(),
                'lastPage' => $tors->lastPage(),
                'perPage' => $tors->perPage(),
                'total' => $tors->total(),
            ],
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json([
            'data' => new TorResource($this->getTorById->execute($id, $request->user())),
        ]);
    }
}
```

- [ ] **Step 7: Add the routes**

Create `routes/api/v1/dashboard/tors.php`:

```php
<?php

use App\Modules\Tender\Presentation\Http\Controllers\TorController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {

    Route::prefix('tors')->group(function () {
        Route::get('/', [TorController::class, 'index'])
            ->middleware('can:tors.index')
            ->name('dashboard.tors.index');

        Route::get('/{id}', [TorController::class, 'show'])
            ->middleware('can:tors.index')
            ->whereNumber('id')
            ->name('dashboard.tors.show');
    });
});
```

In `routes/api.php`, inside the `Route::middleware('auth')->group(...)` block, after the line
`require __DIR__.'/api/v1/dashboard/tender-projects.php';`, add:

```php
        require __DIR__.'/api/v1/dashboard/tors.php';
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `vendor/bin/pint --dirty --format agent`, then
`php artisan test --compact tests/Feature/Modules/Tender/ListTorsTest.php tests/Feature/Modules/Tender/ShowTorTest.php`

Expected: PASS (all tests in both files).

Then confirm the routes are registered:
`php artisan route:list --path=api/v1/dashboard/tors`
Expected: two rows, `GET|HEAD api/v1/dashboard/tors` → `dashboard.tors.index` and `GET|HEAD api/v1/dashboard/tors/{id}` → `dashboard.tors.show`.

- [ ] **Step 9: Run every TOR-related test together**

Run: `php artisan test --compact tests/Feature/Modules/Tender/TorPolicyTest.php tests/Feature/Modules/Tender/ListTorsQueryTest.php tests/Feature/Modules/Tender/GetTorByIdQueryTest.php tests/Feature/Modules/Tender/ListTorsTest.php tests/Feature/Modules/Tender/ShowTorTest.php tests/Feature/Modules/Tender/TorSeederTest.php tests/Feature/Modules/Tender/TenderModelRelationsTest.php tests/Feature/Database/Seeders/AdminUserSeederTest.php tests/Unit/Domain/Tender`

Expected: PASS.

- [ ] **Step 10: Stage (do not commit)**

```bash
git status --short
git add app/Modules/Tender/Presentation/Http/Requests/Tor/ListTorsRequest.php app/Modules/Tender/Presentation/Http/Resources/Tor/TorResource.php app/Modules/Tender/Presentation/Http/Controllers/TorController.php routes/api/v1/dashboard/tors.php routes/api.php tests/Feature/Modules/Tender/ListTorsTest.php tests/Feature/Modules/Tender/ShowTorTest.php
```
