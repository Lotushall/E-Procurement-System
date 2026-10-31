# Select Options: Internal-User Access and Tender Project Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open every `/select` options endpoint to all internal users (vendors 403), and add `GET /dashboard/tender-projects/select`.

**Architecture:** One shared Gate ability `select-options` (internal-user check) registered in `AppServiceProvider::boot()`. The four existing `/select` routes swap `role:admin` for `can:select-options`. A new uncached `ListTenderProjectOptionsQuery` backs a new `TenderProjectController::select()` action.

**Tech Stack:** Laravel 13, PHP 8.4, Spatie Laravel Permission, Pest 4.

**Spec:** `docs/superpowers/specs/2026-10-31-select-options-internal-access-design.md`

## Global Constraints

- Backend only. No other route's authorization changes; no frontend changes.
- Ability name is exactly `select-options` (it must not match any permission name, so Spatie's `Gate::before` hook cannot bypass it).
- Internal-user check is exactly `$user->user_type === UserType::Internal` (same as `TenderProjectPolicy` / `TorPolicy`).
- Access matrix: not logged in → 401; vendor (`user_type` `company` or `individual`) → 403; any internal user, with or without roles/permissions → 200.
- Tender project options: fields `id`, `projectCode`, `name` only; ordered by `project_code`; every status included; **not cached**.
- **Do not `git commit`.** Standing user instruction: stage with `git add` only; the user reviews and commits.
- Run `vendor/bin/pint --dirty --format agent` after modifying PHP files.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `app/Providers/AppServiceProvider.php` | Modify | Define the shared `select-options` Gate ability |
| `routes/api/v1/dashboard/internal-profiles.php` | Modify | 4 `/select` routes → `can:select-options` |
| `tests/Feature/Modules/User/DepartmentsSelectTest.php` | Modify | Access cases for departments select |
| `tests/Feature/Modules/User/PositionsSelectTest.php` | Modify | Access cases for positions select |
| `tests/Feature/Modules/User/SelectInternalProfileOptionsTest.php` | Modify | Access cases for internal-profiles select |
| `tests/Feature/Modules/User/SelectAvailableInternalProfilesTest.php` | Modify | Access cases for internal-profiles select-available |
| `app/Modules/Tender/Application/Project/Queries/ListTenderProjectOptionsQuery.php` | Create | Read `id, project_code, name` ordered by `project_code` |
| `app/Modules/Tender/Presentation/Http/Controllers/TenderProjectController.php` | Modify | New `select()` action |
| `routes/api/v1/dashboard/tender-projects.php` | Modify | New `/select` route |
| `tests/Feature/Modules/Tender/TenderProjectsSelectTest.php` | Create | HTTP tests for the new endpoint |

---

### Task 1: `select-options` Gate and open the four existing `/select` routes

**Files:**
- Modify: `app/Providers/AppServiceProvider.php`
- Modify: `routes/api/v1/dashboard/internal-profiles.php:11-17, 44-46, 68-70`
- Test: `tests/Feature/Modules/User/DepartmentsSelectTest.php`
- Test: `tests/Feature/Modules/User/PositionsSelectTest.php`
- Test: `tests/Feature/Modules/User/SelectInternalProfileOptionsTest.php`
- Test: `tests/Feature/Modules/User/SelectAvailableInternalProfilesTest.php`

**Interfaces:**
- Consumes: `App\Modules\User\Domain\Enums\UserType::Internal`, `App\Modules\User\Infrastructure\Models\User`.
- Produces: Gate ability `select-options` (usable as route middleware `can:select-options`). Task 2 uses it.

- [ ] **Step 1: Update the departments test**

In `tests/Feature/Modules/User/DepartmentsSelectTest.php`, replace the test `'an internal user without the admin role cannot fetch department select options'` (lines 16-23) with:

```php
test('an internal user with no role or permission can fetch department select options', function () {
    Department::create(['name' => 'IT']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/departments/select');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'IT');
});

test('a vendor user cannot fetch department select options', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/departments/select');

    $response->assertStatus(403);
});
```

Leave the other tests (401, content/order, cache) unchanged — the admin user in them is still internal, so they keep passing.

- [ ] **Step 2: Update the positions test**

In `tests/Feature/Modules/User/PositionsSelectTest.php`, replace the test `'an internal user without the admin role cannot fetch position select options'` (lines 16-23) with:

```php
test('an internal user with no role or permission can fetch position select options', function () {
    Position::create(['name' => 'Manager']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/positions/select');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Manager');
});

test('a vendor user cannot fetch position select options', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/positions/select');

    $response->assertStatus(403);
});
```

- [ ] **Step 3: Update the internal-profile options test**

In `tests/Feature/Modules/User/SelectInternalProfileOptionsTest.php`, replace the test `'an internal user without the admin role cannot fetch internal profile options'` (lines 24-31) with:

```php
test('an internal user with no role or permission can fetch internal profile options', function () {
    InternalProfiles::create(['firstname' => 'Anan', 'lastname' => 'Suk']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/internal-profiles/select');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Anan Suk');
});

test('a vendor user cannot fetch internal profile options', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/internal-profiles/select');

    $response->assertStatus(403);
});
```

- [ ] **Step 4: Update the available internal-profiles test**

In `tests/Feature/Modules/User/SelectAvailableInternalProfilesTest.php`, replace the test `'an internal user without the admin role cannot fetch available internal profiles'` (lines 24-31) with:

```php
test('an internal user with no role or permission can fetch available internal profiles', function () {
    InternalProfiles::create(['firstname' => 'Anan', 'lastname' => 'Suk']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/internal-profiles/select-available');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Anan Suk');
});

test('a vendor user cannot fetch available internal profiles', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/internal-profiles/select-available');

    $response->assertStatus(403);
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `php artisan test --compact tests/Feature/Modules/User/DepartmentsSelectTest.php tests/Feature/Modules/User/PositionsSelectTest.php tests/Feature/Modules/User/SelectInternalProfileOptionsTest.php tests/Feature/Modules/User/SelectAvailableInternalProfilesTest.php`

Expected: the 4 new "internal user with no role or permission can fetch …" tests FAIL (`Expected response status code [200] but received 403`). The vendor tests already pass (vendors have no admin role) — they are regression guards. All other tests pass.

- [ ] **Step 6: Define the Gate ability**

Replace `app/Providers/AppServiceProvider.php` with:

```php
<?php

namespace App\Providers;

use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Model::preventLazyLoading();

        Relation::enforceMorphMap([
            'user' => User::class,
        ]);

        // Shared by the `/select` option endpoints of several modules. The
        // ability name matches no permission name, so Spatie's Gate::before
        // hook cannot grant it without running this check.
        Gate::define('select-options', fn (User $user): bool => $user->user_type === UserType::Internal);
    }
}
```

- [ ] **Step 7: Swap the route middleware**

In `routes/api/v1/dashboard/internal-profiles.php`, change exactly these four routes from `->middleware('role:admin')` to `->middleware('can:select-options')`. Leave every other route on `role:admin`.

```php
        Route::get('/select-available', [InternalProfilesController::class, 'selectAvailable'])
            ->middleware('can:select-options')
            ->name('dashboard.internal-profiles.select-available');

        Route::get('/select', [InternalProfilesController::class, 'select'])
            ->middleware('can:select-options')
            ->name('dashboard.internal-profiles.select');
```

```php
        Route::get('/select', [DepartmentController::class, 'select'])
            ->middleware('can:select-options')
            ->name('dashboard.departments.select');
```

```php
        Route::get('/select', [PositionController::class, 'select'])
            ->middleware('can:select-options')
            ->name('dashboard.positions.select');
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `php artisan test --compact tests/Feature/Modules/User/DepartmentsSelectTest.php tests/Feature/Modules/User/PositionsSelectTest.php tests/Feature/Modules/User/SelectInternalProfileOptionsTest.php tests/Feature/Modules/User/SelectAvailableInternalProfilesTest.php`

Expected: all PASS.

- [ ] **Step 9: Format and stage (do not commit)**

```bash
vendor/bin/pint --dirty --format agent
git add app/Providers/AppServiceProvider.php routes/api/v1/dashboard/internal-profiles.php tests/Feature/Modules/User/DepartmentsSelectTest.php tests/Feature/Modules/User/PositionsSelectTest.php tests/Feature/Modules/User/SelectInternalProfileOptionsTest.php tests/Feature/Modules/User/SelectAvailableInternalProfilesTest.php
```

Do **not** run `git commit`. The user reviews and commits.

---

### Task 2: `GET /dashboard/tender-projects/select`

**Files:**
- Create: `app/Modules/Tender/Application/Project/Queries/ListTenderProjectOptionsQuery.php`
- Modify: `app/Modules/Tender/Presentation/Http/Controllers/TenderProjectController.php`
- Modify: `routes/api/v1/dashboard/tender-projects.php:8-16`
- Test: `tests/Feature/Modules/Tender/TenderProjectsSelectTest.php`

**Interfaces:**
- Consumes: Gate ability `select-options` from Task 1; `App\Modules\Tender\Infrastructure\Models\Project\TenderProjects` (table `tenders_projects`) and its factory's `status(string $status)` state.
- Produces: `ListTenderProjectOptionsQuery::execute(): array` returning `array<int, array{id: int, projectCode: string, name: string}>`; `TenderProjectController::select(): JsonResponse`; route name `dashboard.tender-projects.select`.

- [ ] **Step 1: Create the test file**

Run: `php artisan make:test --pest Modules/Tender/TenderProjectsSelectTest --no-interaction`

Then replace the contents of `tests/Feature/Modules/Tender/TenderProjectsSelectTest.php` with:

```php
<?php

use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function internalUserForTenderProjectOptions(): User
{
    return User::factory()->create(['user_type' => 'internal']);
}

test('fetching tender project select options requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/tender-projects/select');

    $response->assertStatus(401);
});

test('a vendor user cannot fetch tender project select options', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/tender-projects/select');

    $response->assertStatus(403);
});

test('an internal user with no role or permission can fetch tender project select options', function () {
    TenderProjects::factory()->create();
    $this->actingAs(internalUserForTenderProjectOptions(), 'web');

    $response = $this->getJson('/api/v1/dashboard/tender-projects/select');

    $response->assertOk()->assertJsonCount(1, 'data');
});

test('tender project select options include only id, projectCode and name, ordered by projectCode', function () {
    $second = TenderProjects::factory()->create(['project_code' => 'TP-2569-0002', 'name' => 'จัดซื้อวัสดุสำนักงาน']);
    $first = TenderProjects::factory()->create(['project_code' => 'TP-2569-0001', 'name' => 'จัดซื้อยานพาหนะ']);
    $this->actingAs(internalUserForTenderProjectOptions(), 'web');

    $response = $this->getJson('/api/v1/dashboard/tender-projects/select');

    $response->assertOk()->assertExactJson([
        'data' => [
            ['id' => $first->id, 'projectCode' => 'TP-2569-0001', 'name' => 'จัดซื้อยานพาหนะ'],
            ['id' => $second->id, 'projectCode' => 'TP-2569-0002', 'name' => 'จัดซื้อวัสดุสำนักงาน'],
        ],
    ]);
});

test('tender project select options include projects of every status', function () {
    foreach (['draft', 'published', 'closed', 'completed', 'cancelled', 'archived'] as $status) {
        TenderProjects::factory()->status($status)->create();
    }
    $this->actingAs(internalUserForTenderProjectOptions(), 'web');

    $response = $this->getJson('/api/v1/dashboard/tender-projects/select');

    $response->assertOk()->assertJsonCount(6, 'data');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact tests/Feature/Modules/Tender/TenderProjectsSelectTest.php`

Expected: the 401 test passes (the whole route file is inside the `auth` group); the other four FAIL with `404` because no `GET /select` route exists yet (`/{id}` only matches digits).

- [ ] **Step 3: Create the query**

Run: `php artisan make:class Modules/Tender/Application/Project/Queries/ListTenderProjectOptionsQuery --no-interaction`

Then replace the contents of `app/Modules/Tender/Application/Project/Queries/ListTenderProjectOptionsQuery.php` with:

```php
<?php

namespace App\Modules\Tender\Application\Project\Queries;

use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;

final class ListTenderProjectOptionsQuery
{
    /**
     * Not cached: projects change often, and caching would need invalidation
     * in the store/update/destroy use cases.
     *
     * @return array<int, array{id: int, projectCode: string, name: string}>
     */
    public function execute(): array
    {
        return TenderProjects::query()
            ->orderBy('project_code')
            ->get(['id', 'project_code', 'name'])
            ->map(fn (TenderProjects $project): array => [
                'id' => $project->id,
                'projectCode' => $project->project_code,
                'name' => $project->name,
            ])
            ->all();
    }
}
```

- [ ] **Step 4: Add the controller action**

In `app/Modules/Tender/Presentation/Http/Controllers/TenderProjectController.php`:

Add the import (alphabetical, after `GetTenderProjectStatsQuery`):

```php
use App\Modules\Tender\Application\Project\Queries\ListTenderProjectOptionsQuery;
```

Add a constructor dependency after `$listTenderProjects`:

```php
    public function __construct(
        private readonly ListTenderProjectsQuery $listTenderProjects,
        private readonly ListTenderProjectOptionsQuery $listTenderProjectOptions,
        private readonly GetTenderProjectStatsQuery $getTenderProjectStats,
        private readonly GetTenderProjectByIdQuery $getTenderProjectById,
        private readonly CreateTenderProjectUseCase $createTenderProject,
        private readonly UpdateTenderProjectUseCase $updateTenderProject,
        private readonly UpdateTenderProjectStatusUseCase $updateTenderProjectStatus,
        private readonly DeleteTenderProjectUseCase $deleteTenderProject,
    ) {}
```

Add the action between `index()` and `show()`:

```php
    public function select(): JsonResponse
    {
        return response()->json([
            'data' => $this->listTenderProjectOptions->execute(),
        ]);
    }
```

- [ ] **Step 5: Add the route**

In `routes/api/v1/dashboard/tender-projects.php`, add the `/select` route as the first route in the `tender-projects` group, before `/` and `/{id}`:

```php
    Route::prefix('tender-projects')->group(function () {
        Route::get('/select', [TenderProjectController::class, 'select'])
            ->middleware('can:select-options')
            ->name('dashboard.tender-projects.select');

        Route::get('/', [TenderProjectController::class, 'index'])
            ->middleware('can:tender-projects.index')
            ->name('dashboard.tender-projects.index');
```

(the rest of the group is unchanged)

- [ ] **Step 6: Run the tests to verify they pass**

Run: `php artisan test --compact tests/Feature/Modules/Tender/TenderProjectsSelectTest.php tests/Feature/Modules/Tender/TenderProjectRouteIdConstraintTest.php tests/Feature/Modules/Tender/ListTenderProjectsTest.php`

Expected: all PASS (the route-constraint and list tests confirm the existing routes are unaffected).

- [ ] **Step 7: Format and stage (do not commit)**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Tender/Application/Project/Queries/ListTenderProjectOptionsQuery.php app/Modules/Tender/Presentation/Http/Controllers/TenderProjectController.php routes/api/v1/dashboard/tender-projects.php tests/Feature/Modules/Tender/TenderProjectsSelectTest.php
```

Do **not** run `git commit`. The user reviews and commits.

---

## Final check

- [ ] Run: `php artisan route:list --path=select -v`
  Expected: 5 routes (`departments`, `positions`, `internal-profiles/select`, `internal-profiles/select-available`, `tender-projects/select`), each with `can:select-options` and none with `role:admin`.
- [ ] Run: `php artisan test --compact tests/Feature/Modules/User tests/Feature/Modules/Tender`
  Expected: all PASS.
