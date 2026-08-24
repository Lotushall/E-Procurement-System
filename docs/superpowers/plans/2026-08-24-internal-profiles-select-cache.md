# Internal Profiles: Department/Position Select (Cached) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a cached, admin-gated `GET /select` endpoint for both departments and positions, returning `{id, name}` pairs for dropdown consumption, separate from the existing management `index` endpoints.

**Architecture:** New `ListDepartmentOptionsQuery` / `ListPositionOptionsQuery` classes cache a plain array of `{id, name}` forever via `app_cache_remember`. `DepartmentObserver` / `PositionObserver`, wired via the `#[ObservedBy]` model attribute, call `app_cache_forget` on `saved`/`deleted` so every mutation path busts the cache automatically. New `select()` controller actions and routes expose the data.

**Tech Stack:** Laravel 13, PHP 8.4, Pest.

## Global Constraints

- Every new route uses `middleware('role:admin')`, matching every other route in `routes/api/v1/dashboard/internal-profiles.php`.
- Cached values MUST be plain arrays of scalars, never Eloquent models/Collections — `config/cache.php` sets `serializable_classes => false` (Laravel 13 hardening default), which breaks unserializing arbitrary objects from a serializing cache store.
- Cache TTL is permanent (`null`), invalidated only via model observers — never a time-based expiry.
- Select options are ordered by `name` (not `id`, unlike the existing management `index` endpoints).
- Response shape: `{"data": [{"id": 1, "name": "..."}]}` — no `internalProfilesCount`.
- Do not modify the existing `/departments` or `/positions` (index/store/update/destroy) behavior.
- Do not commit — stage changes with `git add` only. Commits happen when the user explicitly says so.

---

### Task 1: Department select (cached, admin-gated)

**Files:**
- Create: `app/Modules/InternalProfiles/Application/Queries/ListDepartmentOptionsQuery.php`
- Create: `app/Modules/InternalProfiles/Infrastructure/Observers/DepartmentObserver.php`
- Modify: `app/Modules/InternalProfiles/Infrastructure/Models/Department.php`
- Modify: `app/Modules/InternalProfiles/Presentation/Http/Controllers/DepartmentController.php`
- Modify: `routes/api/v1/dashboard/internal-profiles.php`
- Test: `tests/Feature/Modules/User/DepartmentsSelectTest.php`

**Interfaces:**
- Produces: `ListDepartmentOptionsQuery::CACHE_KEY` (string constant) and `ListDepartmentOptionsQuery::execute(): array` returning `array<int, array{id: int, name: string}>`. No other task in this plan consumes it, but keep the name exact — it is the pattern Task 2 mirrors.

- [ ] **Step 1: Write the failing test file**

Create `tests/Feature/Modules/User/DepartmentsSelectTest.php`:

```php
<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('fetching department select options requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/departments/select');

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot fetch department select options', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/departments/select');

    $response->assertStatus(403);
});

test('department select options include only id and name, ordered by name', function () {
    Department::create(['name' => 'IT']);
    Department::create(['name' => 'Accounting']);
    $admin = User::factory()->create(['user_type' => 'internal']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));
    $this->actingAs($admin, 'web');

    $response = $this->getJson('/api/v1/dashboard/departments/select');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'Accounting')
        ->assertJsonPath('data.1.name', 'IT')
        ->assertJsonMissingPath('data.0.internalProfilesCount');
});

test('department select options cache is invalidated when a department is created', function () {
    $admin = User::factory()->create(['user_type' => 'internal']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));
    $this->actingAs($admin, 'web');

    $this->getJson('/api/v1/dashboard/departments/select')
        ->assertJsonCount(0, 'data');

    Department::create(['name' => 'HR']);

    $this->getJson('/api/v1/dashboard/departments/select')
        ->assertJsonCount(1, 'data');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact tests/Feature/Modules/User/DepartmentsSelectTest.php`
Expected: FAIL — the route `/api/v1/dashboard/departments/select` does not exist yet, so every assertion fails against a 404 response.

- [ ] **Step 3: Create the cached options query**

Create `app/Modules/InternalProfiles/Application/Queries/ListDepartmentOptionsQuery.php`:

```php
<?php

namespace App\Modules\InternalProfiles\Application\Queries;

use App\Modules\InternalProfiles\Infrastructure\Models\Department;

final class ListDepartmentOptionsQuery
{
    public const CACHE_KEY = 'internal-profiles.departments.select';

    /**
     * @return array<int, array{id: int, name: string}>
     */
    public function execute(): array
    {
        return app_cache_remember(self::CACHE_KEY, null, function (): array {
            return Department::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Department $department): array => [
                    'id' => $department->id,
                    'name' => $department->name,
                ])
                ->all();
        });
    }
}
```

- [ ] **Step 4: Create the cache-busting observer**

Create `app/Modules/InternalProfiles/Infrastructure/Observers/DepartmentObserver.php`:

```php
<?php

namespace App\Modules\InternalProfiles\Infrastructure\Observers;

use App\Modules\InternalProfiles\Application\Queries\ListDepartmentOptionsQuery;
use App\Modules\InternalProfiles\Infrastructure\Models\Department;

class DepartmentObserver
{
    public function saved(Department $department): void
    {
        app_cache_forget(ListDepartmentOptionsQuery::CACHE_KEY);
    }

    public function deleted(Department $department): void
    {
        app_cache_forget(ListDepartmentOptionsQuery::CACHE_KEY);
    }
}
```

- [ ] **Step 5: Wire the observer onto the model**

Modify `app/Modules/InternalProfiles/Infrastructure/Models/Department.php` — add the `ObservedBy` attribute alongside the existing `Fillable` attribute:

```php
<?php

namespace App\Modules\InternalProfiles\Infrastructure\Models;

use App\Modules\InternalProfiles\Infrastructure\Observers\DepartmentObserver;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name'])]
#[ObservedBy([DepartmentObserver::class])]
class Department extends Model
{
    public function internalProfiles(): HasMany
    {
        return $this->hasMany(InternalProfiles::class);
    }
}
```

- [ ] **Step 6: Add the controller action**

Modify `app/Modules/InternalProfiles/Presentation/Http/Controllers/DepartmentController.php` — add the import, inject the query, add `select()`:

```php
<?php

namespace App\Modules\InternalProfiles\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\InternalProfiles\Application\DTOs\DepartmentData;
use App\Modules\InternalProfiles\Application\Queries\ListDepartmentOptionsQuery;
use App\Modules\InternalProfiles\Application\Queries\ListDepartmentsQuery;
use App\Modules\InternalProfiles\Application\UseCases\CreateDepartmentUseCase;
use App\Modules\InternalProfiles\Application\UseCases\DeleteDepartmentUseCase;
use App\Modules\InternalProfiles\Application\UseCases\UpdateDepartmentUseCase;
use App\Modules\InternalProfiles\Presentation\Http\Requests\StoreDepartmentRequest;
use App\Modules\InternalProfiles\Presentation\Http\Requests\UpdateDepartmentRequest;
use App\Modules\InternalProfiles\Presentation\Http\Resources\DepartmentResource;
use Illuminate\Http\JsonResponse;

class DepartmentController extends Controller
{
    public function __construct(
        private readonly ListDepartmentsQuery $listDepartments,
        private readonly ListDepartmentOptionsQuery $listDepartmentOptions,
        private readonly CreateDepartmentUseCase $createDepartment,
        private readonly UpdateDepartmentUseCase $updateDepartment,
        private readonly DeleteDepartmentUseCase $deleteDepartment,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => DepartmentResource::collection($this->listDepartments->execute()),
        ]);
    }

    public function select(): JsonResponse
    {
        return response()->json([
            'data' => $this->listDepartmentOptions->execute(),
        ]);
    }

    public function store(StoreDepartmentRequest $request): JsonResponse
    {
        $department = $this->createDepartment->execute(DepartmentData::from($request->validated()));

        return response()->json(['data' => new DepartmentResource($department)], 201);
    }

    public function update(UpdateDepartmentRequest $request, int $id): JsonResponse
    {
        $department = $this->updateDepartment->execute($id, DepartmentData::from($request->validated()));

        return response()->json(['data' => new DepartmentResource($department)]);
    }

    public function destroy(int $id): JsonResponse
    {
        $message = $this->deleteDepartment->execute($id);

        if ($message !== null) {
            return response()->json(['message' => $message], 422);
        }

        return response()->json(null, 204);
    }
}
```

- [ ] **Step 7: Add the route**

Modify `routes/api/v1/dashboard/internal-profiles.php` — add the `/select` route inside the `departments` group, before the `index` route:

```php
    Route::prefix('departments')->group(function () {
        Route::get('/select', [DepartmentController::class, 'select'])
            ->middleware('role:admin')
            ->name('dashboard.departments.select');

        Route::get('/', [DepartmentController::class, 'index'])
            ->middleware('role:admin')
            ->name('dashboard.departments.index');
```

(Leave the rest of the `departments` group — `store`, `update`, `destroy` — unchanged.)

- [ ] **Step 8: Run the tests to verify they pass**

Run: `php artisan test --compact tests/Feature/Modules/User/DepartmentsSelectTest.php`
Expected: PASS (4 tests)

- [ ] **Step 9: Format and stage**

Run: `vendor/bin/pint --dirty --format agent`

Then stage (do not commit):

```bash
git add app/Modules/InternalProfiles/Application/Queries/ListDepartmentOptionsQuery.php \
        app/Modules/InternalProfiles/Infrastructure/Observers/DepartmentObserver.php \
        app/Modules/InternalProfiles/Infrastructure/Models/Department.php \
        app/Modules/InternalProfiles/Presentation/Http/Controllers/DepartmentController.php \
        routes/api/v1/dashboard/internal-profiles.php \
        tests/Feature/Modules/User/DepartmentsSelectTest.php
```

---

### Task 2: Position select (cached, admin-gated)

**Files:**
- Create: `app/Modules/InternalProfiles/Application/Queries/ListPositionOptionsQuery.php`
- Create: `app/Modules/InternalProfiles/Infrastructure/Observers/PositionObserver.php`
- Modify: `app/Modules/InternalProfiles/Infrastructure/Models/Position.php`
- Modify: `app/Modules/InternalProfiles/Presentation/Http/Controllers/PositionController.php`
- Modify: `routes/api/v1/dashboard/internal-profiles.php`
- Test: `tests/Feature/Modules/User/PositionsSelectTest.php`

**Interfaces:**
- Produces: `ListPositionOptionsQuery::CACHE_KEY` (string constant) and `ListPositionOptionsQuery::execute(): array` returning `array<int, array{id: int, name: string}>`. Mirrors `ListDepartmentOptionsQuery` from Task 1 exactly — same shape, independent cache key. No shared code with Task 1, but both tasks edit `routes/api/v1/dashboard/internal-profiles.php`, so run this task after Task 1 is committed/merged rather than concurrently, to avoid a route-file conflict.

- [ ] **Step 1: Write the failing test file**

Create `tests/Feature/Modules/User/PositionsSelectTest.php`:

```php
<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Position;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('fetching position select options requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/positions/select');

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot fetch position select options', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/positions/select');

    $response->assertStatus(403);
});

test('position select options include only id and name, ordered by name', function () {
    Position::create(['name' => 'Manager']);
    Position::create(['name' => 'Analyst']);
    $admin = User::factory()->create(['user_type' => 'internal']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));
    $this->actingAs($admin, 'web');

    $response = $this->getJson('/api/v1/dashboard/positions/select');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'Analyst')
        ->assertJsonPath('data.1.name', 'Manager')
        ->assertJsonMissingPath('data.0.internalProfilesCount');
});

test('position select options cache is invalidated when a position is created', function () {
    $admin = User::factory()->create(['user_type' => 'internal']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));
    $this->actingAs($admin, 'web');

    $this->getJson('/api/v1/dashboard/positions/select')
        ->assertJsonCount(0, 'data');

    Position::create(['name' => 'Director']);

    $this->getJson('/api/v1/dashboard/positions/select')
        ->assertJsonCount(1, 'data');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact tests/Feature/Modules/User/PositionsSelectTest.php`
Expected: FAIL — the route `/api/v1/dashboard/positions/select` does not exist yet, so every assertion fails against a 404 response.

- [ ] **Step 3: Create the cached options query**

Create `app/Modules/InternalProfiles/Application/Queries/ListPositionOptionsQuery.php`:

```php
<?php

namespace App\Modules\InternalProfiles\Application\Queries;

use App\Modules\InternalProfiles\Infrastructure\Models\Position;

final class ListPositionOptionsQuery
{
    public const CACHE_KEY = 'internal-profiles.positions.select';

    /**
     * @return array<int, array{id: int, name: string}>
     */
    public function execute(): array
    {
        return app_cache_remember(self::CACHE_KEY, null, function (): array {
            return Position::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Position $position): array => [
                    'id' => $position->id,
                    'name' => $position->name,
                ])
                ->all();
        });
    }
}
```

- [ ] **Step 4: Create the cache-busting observer**

Create `app/Modules/InternalProfiles/Infrastructure/Observers/PositionObserver.php`:

```php
<?php

namespace App\Modules\InternalProfiles\Infrastructure\Observers;

use App\Modules\InternalProfiles\Application\Queries\ListPositionOptionsQuery;
use App\Modules\InternalProfiles\Infrastructure\Models\Position;

class PositionObserver
{
    public function saved(Position $position): void
    {
        app_cache_forget(ListPositionOptionsQuery::CACHE_KEY);
    }

    public function deleted(Position $position): void
    {
        app_cache_forget(ListPositionOptionsQuery::CACHE_KEY);
    }
}
```

- [ ] **Step 5: Wire the observer onto the model**

Modify `app/Modules/InternalProfiles/Infrastructure/Models/Position.php` — add the `ObservedBy` attribute alongside the existing `Fillable` attribute:

```php
<?php

namespace App\Modules\InternalProfiles\Infrastructure\Models;

use App\Modules\InternalProfiles\Infrastructure\Observers\PositionObserver;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name'])]
#[ObservedBy([PositionObserver::class])]
class Position extends Model
{
    public function internalProfiles(): HasMany
    {
        return $this->hasMany(InternalProfiles::class);
    }
}
```

- [ ] **Step 6: Add the controller action**

Modify `app/Modules/InternalProfiles/Presentation/Http/Controllers/PositionController.php` — add the import, inject the query, add `select()`:

```php
<?php

namespace App\Modules\InternalProfiles\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\InternalProfiles\Application\DTOs\PositionData;
use App\Modules\InternalProfiles\Application\Queries\ListPositionOptionsQuery;
use App\Modules\InternalProfiles\Application\Queries\ListPositionsQuery;
use App\Modules\InternalProfiles\Application\UseCases\CreatePositionUseCase;
use App\Modules\InternalProfiles\Application\UseCases\DeletePositionUseCase;
use App\Modules\InternalProfiles\Application\UseCases\UpdatePositionUseCase;
use App\Modules\InternalProfiles\Presentation\Http\Requests\StorePositionRequest;
use App\Modules\InternalProfiles\Presentation\Http\Requests\UpdatePositionRequest;
use App\Modules\InternalProfiles\Presentation\Http\Resources\PositionResource;
use Illuminate\Http\JsonResponse;

class PositionController extends Controller
{
    public function __construct(
        private readonly ListPositionsQuery $listPositions,
        private readonly ListPositionOptionsQuery $listPositionOptions,
        private readonly CreatePositionUseCase $createPosition,
        private readonly UpdatePositionUseCase $updatePosition,
        private readonly DeletePositionUseCase $deletePosition,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => PositionResource::collection($this->listPositions->execute()),
        ]);
    }

    public function select(): JsonResponse
    {
        return response()->json([
            'data' => $this->listPositionOptions->execute(),
        ]);
    }

    public function store(StorePositionRequest $request): JsonResponse
    {
        $position = $this->createPosition->execute(PositionData::from($request->validated()));

        return response()->json(['data' => new PositionResource($position)], 201);
    }

    public function update(UpdatePositionRequest $request, int $id): JsonResponse
    {
        $position = $this->updatePosition->execute($id, PositionData::from($request->validated()));

        return response()->json(['data' => new PositionResource($position)]);
    }

    public function destroy(int $id): JsonResponse
    {
        $message = $this->deletePosition->execute($id);

        if ($message !== null) {
            return response()->json(['message' => $message], 422);
        }

        return response()->json(null, 204);
    }
}
```

- [ ] **Step 7: Add the route**

Modify `routes/api/v1/dashboard/internal-profiles.php` — add the `/select` route inside the `positions` group, before the `index` route:

```php
    Route::prefix('positions')->group(function () {
        Route::get('/select', [PositionController::class, 'select'])
            ->middleware('role:admin')
            ->name('dashboard.positions.select');

        Route::get('/', [PositionController::class, 'index'])
            ->middleware('role:admin')
            ->name('dashboard.positions.index');
```

(Leave the rest of the `positions` group — `store`, `update`, `destroy` — unchanged.)

- [ ] **Step 8: Run the tests to verify they pass**

Run: `php artisan test --compact tests/Feature/Modules/User/PositionsSelectTest.php`
Expected: PASS (4 tests)

- [ ] **Step 9: Format and stage**

Run: `vendor/bin/pint --dirty --format agent`

Then stage (do not commit):

```bash
git add app/Modules/InternalProfiles/Application/Queries/ListPositionOptionsQuery.php \
        app/Modules/InternalProfiles/Infrastructure/Observers/PositionObserver.php \
        app/Modules/InternalProfiles/Infrastructure/Models/Position.php \
        app/Modules/InternalProfiles/Presentation/Http/Controllers/PositionController.php \
        routes/api/v1/dashboard/internal-profiles.php \
        tests/Feature/Modules/User/PositionsSelectTest.php
```
