# Role/Permission Management API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 5 backend endpoints (`GET /permissions`, `GET/POST/PATCH/DELETE /roles`) that the already-shipped frontend role/permission management UI expects, per the agreed contract.

**Architecture:** Extend the existing `App\Modules\User` module (no new module). Role/Permission use Spatie's own Eloquent models directly (no Domain Entity/Repository wrapper), matching how `ListUsersQuery` already talks to Eloquent directly. New `Permission` backed enum is the single source of truth for the permission catalog. Full details: `backend/docs/superpowers/specs/2026-08-15-role-permission-management-api-design.md`.

**Tech Stack:** Laravel 13, spatie/laravel-permission, spatie/laravel-data, Pest 4.

## Global Constraints

- API contract (request/response shapes, validation rules, both safeguards) is fixed by `docs/superpowers/specs/2026-08-14-role-permission-management-design.md` (root-level, frontend-authored) — do not deviate from field names/casing/status codes documented there.
- `GET /roles` keeps gate `can:users.viewAny` (not `roles.manage`) — this is a deliberate, already-confirmed decision, not an oversight.
- Out of scope: `POST/PATCH users`, `PATCH users/{id}/status` — separate spec, not touched by this plan.
- Run `vendor/bin/pint --dirty --format agent` before the final commit of every task.
- No placeholders — every safeguard message must be the exact Thai string from the contract.
- Working dir: `backend/` (repo root `D:\E-Procurement-System`). Branch: `Internal`, working in place, no worktree (this repo's established convention).

---

### Task 1: Permission catalog + `GET /api/v1/dashboard/permissions` + `roles.manage` gate

**Files:**
- Create: `app/Modules/User/Domain/Enums/Permission.php`
- Create: `app/Modules/User/Application/Queries/ListPermissionsQuery.php`
- Create: `app/Modules/User/Presentation/Http/Controllers/PermissionController.php`
- Modify: `app/Modules/User/Presentation/Policies/UserPolicy.php`
- Modify: `app/Modules/User/Providers/UserServiceProvider.php`
- Modify: `routes/api/v1/dashboard/users.php`
- Test: `tests/Feature/Modules/User/ListPermissionsQueryTest.php`
- Test: `tests/Feature/Modules/User/PermissionsIndexTest.php`

**Interfaces:**
- Produces: `App\Modules\User\Domain\Enums\Permission` (cases `VendorsView`, `VendorsReview`, `UsersCreate`, `UsersUpdate`, `UsersUpdateStatus`, `RolesManage`; methods `label(): string`, `group(): string`, static `values(): array<int, string>`) — consumed by Task 3/4's `StoreRoleRequest`/`UpdateRoleRequest`.
- Produces: Gate ability `roles.manage` — consumed by Tasks 3, 4, 5's routes.

- [ ] **Step 1: Write the failing tests**

`tests/Feature/Modules/User/ListPermissionsQueryTest.php`:
```php
<?php

use App\Modules\User\Application\Queries\ListPermissionsQuery;

test('execute returns the fixed permission catalog with labels and groups', function () {
    $result = app(ListPermissionsQuery::class)->execute();

    expect($result)->toBe([
        ['name' => 'vendors.view', 'label' => 'ดูรายชื่อผู้ค้า', 'group' => 'ผู้ค้า'],
        ['name' => 'vendors.review', 'label' => 'อนุมัติ/ปฏิเสธผู้ค้า', 'group' => 'ผู้ค้า'],
        ['name' => 'users.create', 'label' => 'เพิ่ม user', 'group' => 'ผู้ใช้'],
        ['name' => 'users.update', 'label' => 'แก้ไข user', 'group' => 'ผู้ใช้'],
        ['name' => 'users.updateStatus', 'label' => 'เปลี่ยนสถานะ user', 'group' => 'ผู้ใช้'],
        ['name' => 'roles.manage', 'label' => 'จัดการ role และสิทธิ์', 'group' => 'Role/สิทธิ์'],
    ]);
});
```

`tests/Feature/Modules/User/PermissionsIndexTest.php`:
```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalUserWithRolesManage(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'roles.manage', 'guard_name' => 'web']));
    $user->assignRole($role);

    return $user;
}

test('fetching the permission catalog requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/permissions');

    $response->assertStatus(401);
});

test('an internal user without roles.manage cannot fetch the permission catalog', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/permissions');

    $response->assertStatus(403);
});

test('a user with roles.manage can fetch the permission catalog', function () {
    $this->actingAs(internalUserWithRolesManage(), 'web');

    $response = $this->getJson('/api/v1/dashboard/permissions');

    $response->assertOk()
        ->assertJsonCount(6, 'data')
        ->assertJsonFragment(['name' => 'roles.manage', 'label' => 'จัดการ role และสิทธิ์', 'group' => 'Role/สิทธิ์']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=ListPermissionsQueryTest`
Expected: FAIL (class `App\Modules\User\Application\Queries\ListPermissionsQuery` not found)

Run: `php artisan test --compact --filter=PermissionsIndexTest`
Expected: FAIL (route `/api/v1/dashboard/permissions` not found, or all three tests error/fail)

- [ ] **Step 3: Implement the permission enum**

`app/Modules/User/Domain/Enums/Permission.php`:
```php
<?php

namespace App\Modules\User\Domain\Enums;

enum Permission: string
{
    case VendorsView = 'vendors.view';
    case VendorsReview = 'vendors.review';
    case UsersCreate = 'users.create';
    case UsersUpdate = 'users.update';
    case UsersUpdateStatus = 'users.updateStatus';
    case RolesManage = 'roles.manage';

    public function label(): string
    {
        return match ($this) {
            self::VendorsView => 'ดูรายชื่อผู้ค้า',
            self::VendorsReview => 'อนุมัติ/ปฏิเสธผู้ค้า',
            self::UsersCreate => 'เพิ่ม user',
            self::UsersUpdate => 'แก้ไข user',
            self::UsersUpdateStatus => 'เปลี่ยนสถานะ user',
            self::RolesManage => 'จัดการ role และสิทธิ์',
        };
    }

    public function group(): string
    {
        return match ($this) {
            self::VendorsView, self::VendorsReview => 'ผู้ค้า',
            self::UsersCreate, self::UsersUpdate, self::UsersUpdateStatus => 'ผู้ใช้',
            self::RolesManage => 'Role/สิทธิ์',
        };
    }

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
```

- [ ] **Step 4: Implement the query**

`app/Modules/User/Application/Queries/ListPermissionsQuery.php`:
```php
<?php

namespace App\Modules\User\Application\Queries;

use App\Modules\User\Domain\Enums\Permission;

final class ListPermissionsQuery
{
    /**
     * @return array<int, array{name: string, label: string, group: string}>
     */
    public function execute(): array
    {
        return array_map(
            fn (Permission $permission): array => [
                'name' => $permission->value,
                'label' => $permission->label(),
                'group' => $permission->group(),
            ],
            Permission::cases(),
        );
    }
}
```

- [ ] **Step 5: Add the `manageRoles` policy method**

Modify `app/Modules/User/Presentation/Policies/UserPolicy.php`:
```php
old_string:
class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->user_type === UserType::Internal;
    }
}
new_string:
class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->user_type === UserType::Internal;
    }

    public function manageRoles(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->checkPermissionTo('roles.manage');
    }
}
```

- [ ] **Step 6: Register the `roles.manage` gate**

Modify `app/Modules/User/Providers/UserServiceProvider.php`:
```php
old_string:
        Gate::define('users.viewAny', [UserPolicy::class, 'viewAny']);
new_string:
        Gate::define('users.viewAny', [UserPolicy::class, 'viewAny']);
        Gate::define('roles.manage', [UserPolicy::class, 'manageRoles']);
```

- [ ] **Step 7: Implement the controller**

`app/Modules/User/Presentation/Http/Controllers/PermissionController.php`:
```php
<?php

namespace App\Modules\User\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\User\Application\Queries\ListPermissionsQuery;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    public function __construct(
        private readonly ListPermissionsQuery $listPermissions,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->listPermissions->execute(),
        ]);
    }
}
```

- [ ] **Step 8: Add the route**

Modify `routes/api/v1/dashboard/users.php`:
```php
old_string:
use App\Modules\User\Presentation\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {
    Route::get('users', [UserController::class, 'index'])
        ->middleware('can:users.viewAny')
        ->name('dashboard.users.index');
    Route::get('users/{id}', [UserController::class, 'show'])
        ->middleware('can:users.viewAny')
        ->whereNumber('id')
        ->name('dashboard.users.show');
});
new_string:
use App\Modules\User\Presentation\Http\Controllers\PermissionController;
use App\Modules\User\Presentation\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {
    Route::get('users', [UserController::class, 'index'])
        ->middleware('can:users.viewAny')
        ->name('dashboard.users.index');
    Route::get('users/{id}', [UserController::class, 'show'])
        ->middleware('can:users.viewAny')
        ->whereNumber('id')
        ->name('dashboard.users.show');

    Route::get('permissions', [PermissionController::class, 'index'])
        ->middleware('can:roles.manage')
        ->name('dashboard.permissions.index');
});
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `php artisan test --compact --filter=ListPermissionsQueryTest`
Expected: PASS (1 test)

Run: `php artisan test --compact --filter=PermissionsIndexTest`
Expected: PASS (3 tests)

- [ ] **Step 10: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/User/Domain/Enums/Permission.php \
  app/Modules/User/Application/Queries/ListPermissionsQuery.php \
  app/Modules/User/Presentation/Http/Controllers/PermissionController.php \
  app/Modules/User/Presentation/Policies/UserPolicy.php \
  app/Modules/User/Providers/UserServiceProvider.php \
  routes/api/v1/dashboard/users.php \
  tests/Feature/Modules/User/ListPermissionsQueryTest.php \
  tests/Feature/Modules/User/PermissionsIndexTest.php
git commit -m "feat(roles): add permission catalog and GET /api/v1/dashboard/permissions"
```

---

### Task 2: `GET /api/v1/dashboard/roles` (extend to `id`/`permissions`/`userCount`)

**Files:**
- Create: `app/Modules/User/Application/Queries/ListRolesQuery.php`
- Create: `app/Modules/User/Presentation/Http/Resources/RoleResource.php`
- Create: `app/Modules/User/Presentation/Http/Controllers/RoleController.php`
- Modify: `routes/api/v1/dashboard/users.php`
- Test: `tests/Feature/Modules/User/ListRolesQueryTest.php`
- Test: `tests/Feature/Modules/User/RolesIndexTest.php`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `App\Modules\User\Presentation\Http\Resources\RoleResource` (shape `{id, name, permissions: string[], userCount}`) and `App\Modules\User\Presentation\Http\Controllers\RoleController` — Tasks 3/4/5 add `store`/`update`/`destroy` methods to this same controller and reuse `RoleResource`.

- [ ] **Step 1: Write the failing tests**

`tests/Feature/Modules/User/ListRolesQueryTest.php`:
```php
<?php

use App\Modules\User\Application\Queries\ListRolesQuery;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('execute returns roles with their permission names and user count', function () {
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $role->givePermissionTo([
        Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']),
        Permission::firstOrCreate(['name' => 'vendors.review', 'guard_name' => 'web']),
    ]);
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->assignRole($role);

    $result = app(ListRolesQuery::class)->execute();

    expect($result)->toHaveCount(1);
    $found = $result->first();
    expect($found->id)->toBe($role->id)
        ->and($found->name)->toBe('procurement_officer')
        ->and($found->permissions->pluck('name')->sort()->values()->all())->toBe(['vendors.review', 'vendors.view'])
        ->and($found->users_count)->toBe(1);
});

test('execute returns zero user count for a role nobody has', function () {
    Role::create(['name' => 'unused_role', 'guard_name' => 'web']);

    $result = app(ListRolesQuery::class)->execute();

    expect($result->first()->users_count)->toBe(0);
});
```

`tests/Feature/Modules/User/RolesIndexTest.php`:
```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('fetching roles requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/roles');

    $response->assertStatus(401);
});

test('a non-internal user cannot fetch roles', function () {
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $this->actingAs($vendorUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/roles');

    $response->assertStatus(403);
});

test('an internal user without roles.manage can still fetch roles', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/roles');

    $response->assertOk();
});

test('the roles list includes id, permissions, and userCount', function () {
    $role = Role::create(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'roles.manage', 'guard_name' => 'web']));
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $internalUser->assignRole($role);
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/roles');

    $response->assertOk()
        ->assertJsonPath('data.0.id', $role->id)
        ->assertJsonPath('data.0.name', 'admin')
        ->assertJsonPath('data.0.permissions', ['roles.manage'])
        ->assertJsonPath('data.0.userCount', 1);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=ListRolesQueryTest`
Expected: FAIL (class `App\Modules\User\Application\Queries\ListRolesQuery` not found)

Run: `php artisan test --compact --filter=RolesIndexTest`
Expected: FAIL (route `/api/v1/dashboard/roles` not found)

- [ ] **Step 3: Implement the query**

`app/Modules/User/Application/Queries/ListRolesQuery.php`:
```php
<?php

namespace App\Modules\User\Application\Queries;

use Illuminate\Database\Eloquent\Collection;
use Spatie\Permission\Models\Role;

final class ListRolesQuery
{
    /**
     * @return Collection<int, Role>
     */
    public function execute(): Collection
    {
        return Role::query()
            ->with('permissions')
            ->withCount('users')
            ->orderBy('id')
            ->get();
    }
}
```

- [ ] **Step 4: Implement the resource**

`app/Modules/User/Presentation/Http/Resources/RoleResource.php`:
```php
<?php

namespace App\Modules\User\Presentation\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoleResource extends JsonResource
{
    public static $wrap = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'permissions' => $this->permissions->pluck('name')->all(),
            'userCount' => $this->users_count,
        ];
    }
}
```

- [ ] **Step 5: Implement the controller**

`app/Modules/User/Presentation/Http/Controllers/RoleController.php`:
```php
<?php

namespace App\Modules\User\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\User\Application\Queries\ListRolesQuery;
use App\Modules\User\Presentation\Http\Resources\RoleResource;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function __construct(
        private readonly ListRolesQuery $listRoles,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => RoleResource::collection($this->listRoles->execute()),
        ]);
    }
}
```

- [ ] **Step 6: Add the route**

Modify `routes/api/v1/dashboard/users.php`:
```php
old_string:
use App\Modules\User\Presentation\Http\Controllers\PermissionController;
use App\Modules\User\Presentation\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
new_string:
use App\Modules\User\Presentation\Http\Controllers\PermissionController;
use App\Modules\User\Presentation\Http\Controllers\RoleController;
use App\Modules\User\Presentation\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
```
```php
old_string:
    Route::get('permissions', [PermissionController::class, 'index'])
        ->middleware('can:roles.manage')
        ->name('dashboard.permissions.index');
});
new_string:
    Route::get('permissions', [PermissionController::class, 'index'])
        ->middleware('can:roles.manage')
        ->name('dashboard.permissions.index');

    Route::get('roles', [RoleController::class, 'index'])
        ->middleware('can:users.viewAny')
        ->name('dashboard.roles.index');
});
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `php artisan test --compact --filter=ListRolesQueryTest`
Expected: PASS (2 tests)

Run: `php artisan test --compact --filter=RolesIndexTest`
Expected: PASS (4 tests)

- [ ] **Step 8: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/User/Application/Queries/ListRolesQuery.php \
  app/Modules/User/Presentation/Http/Resources/RoleResource.php \
  app/Modules/User/Presentation/Http/Controllers/RoleController.php \
  routes/api/v1/dashboard/users.php \
  tests/Feature/Modules/User/ListRolesQueryTest.php \
  tests/Feature/Modules/User/RolesIndexTest.php
git commit -m "feat(roles): extend GET /api/v1/dashboard/roles with id, permissions, userCount"
```

---

### Task 3: `POST /api/v1/dashboard/roles` (create)

**Files:**
- Create: `app/Modules/User/Application/DTOs/RoleData.php`
- Create: `app/Modules/User/Application/UseCases/CreateRoleUseCase.php`
- Create: `app/Modules/User/Presentation/Http/Requests/StoreRoleRequest.php`
- Modify: `app/Modules/User/Presentation/Http/Controllers/RoleController.php`
- Modify: `routes/api/v1/dashboard/users.php`
- Test: `tests/Feature/Modules/User/CreateRoleUseCaseTest.php`
- Test: `tests/Feature/Modules/User/StoreRoleTest.php`

**Interfaces:**
- Consumes: `App\Modules\User\Domain\Enums\Permission::values()` (Task 1), `RoleResource` (Task 2).
- Produces: `App\Modules\User\Application\DTOs\RoleData` (readonly `string $name`, `array $permissions`) — reused as-is by Task 4's `UpdateRoleUseCase`.

- [ ] **Step 1: Write the failing tests**

`tests/Feature/Modules/User/CreateRoleUseCaseTest.php`:
```php
<?php

use App\Modules\User\Application\DTOs\RoleData;
use App\Modules\User\Application\UseCases\CreateRoleUseCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

test('execute creates a role with the given permissions synced', function () {
    Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'vendors.review', 'guard_name' => 'web']);

    $role = app(CreateRoleUseCase::class)->execute(new RoleData(
        name: 'procurement_officer',
        permissions: ['vendors.view', 'vendors.review'],
    ));

    expect($role->name)->toBe('procurement_officer')
        ->and($role->permissions->pluck('name')->sort()->values()->all())->toBe(['vendors.review', 'vendors.view'])
        ->and($role->users_count)->toBe(0);

    $this->assertDatabaseHas('roles', ['name' => 'procurement_officer', 'guard_name' => 'web']);
});

test('execute creates a role with no permissions when none are given', function () {
    $role = app(CreateRoleUseCase::class)->execute(new RoleData(name: 'empty_role', permissions: []));

    expect($role->permissions)->toHaveCount(0);
});
```

`tests/Feature/Modules/User/StoreRoleTest.php`:
```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalUserWithRolesManageForStore(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'roles.manage', 'guard_name' => 'web']));
    $user->assignRole($role);

    return $user;
}

test('creating a role requires authentication', function () {
    $response = $this->postJson('/api/v1/dashboard/roles', ['name' => 'procurement_officer', 'permissions' => []]);

    $response->assertStatus(401);
});

test('an internal user without roles.manage cannot create a role', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/dashboard/roles', ['name' => 'procurement_officer', 'permissions' => []]);

    $response->assertStatus(403);
});

test('a user with roles.manage can create a role', function () {
    $this->actingAs(internalUserWithRolesManageForStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/roles', [
        'name' => 'procurement_officer',
        'permissions' => ['vendors.view', 'vendors.review'],
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'procurement_officer')
        ->assertJsonPath('data.userCount', 0);
    expect($response->json('data.permissions'))->toEqualCanonicalizing(['vendors.view', 'vendors.review']);
});

test('role name must match the lowercase snake pattern', function () {
    $this->actingAs(internalUserWithRolesManageForStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/roles', ['name' => 'Procurement Officer', 'permissions' => []]);

    $response->assertStatus(422)->assertJsonValidationErrors('name');
});

test('role name must be unique', function () {
    Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $this->actingAs(internalUserWithRolesManageForStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/roles', ['name' => 'procurement_officer', 'permissions' => []]);

    $response->assertStatus(422)->assertJsonValidationErrors('name');
});

test('permissions must be within the known catalog', function () {
    $this->actingAs(internalUserWithRolesManageForStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/roles', [
        'name' => 'procurement_officer',
        'permissions' => ['not.a.real.permission'],
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('permissions.0');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=CreateRoleUseCaseTest`
Expected: FAIL (class `App\Modules\User\Application\DTOs\RoleData` not found)

Run: `php artisan test --compact --filter=StoreRoleTest`
Expected: FAIL (route `POST /api/v1/dashboard/roles` not found)

- [ ] **Step 3: Implement the DTO**

`app/Modules/User/Application/DTOs/RoleData.php`:
```php
<?php

namespace App\Modules\User\Application\DTOs;

use Spatie\LaravelData\Data;

final class RoleData extends Data
{
    /**
     * @param  array<int, string>  $permissions
     */
    public function __construct(
        public readonly string $name,
        public readonly array $permissions,
    ) {}
}
```

- [ ] **Step 4: Implement the use case**

`app/Modules/User/Application/UseCases/CreateRoleUseCase.php`:
```php
<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Application\DTOs\RoleData;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

final class CreateRoleUseCase
{
    public function execute(RoleData $data): Role
    {
        return DB::transaction(function () use ($data): Role {
            $role = Role::create(['name' => $data->name, 'guard_name' => 'web']);
            $role->syncPermissions($data->permissions);

            app_log('Role created', [
                'role_id' => $role->id,
                'name' => $role->name,
            ], 'info', 'user');

            return $role->load('permissions')->loadCount('users');
        });
    }
}
```

- [ ] **Step 5: Implement the form request**

`app/Modules/User/Presentation/Http/Requests/StoreRoleRequest.php`:
```php
<?php

namespace App\Modules\User\Presentation\Http\Requests;

use App\Modules\User\Domain\Enums\Permission;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoleRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique('roles', 'name'),
            ],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::in(Permission::values())],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.regex' => 'ใช้ได้แค่ตัวพิมพ์เล็ก ตัวเลข และ _ เท่านั้น (ขึ้นต้นด้วยตัวอักษร)',
            'name.unique' => 'มี role ชื่อนี้อยู่แล้ว',
        ];
    }
}
```

- [ ] **Step 6: Add the `store` action to the controller**

Modify `app/Modules/User/Presentation/Http/Controllers/RoleController.php`:
```php
old_string:
use App\Http\Controllers\Controller;
use App\Modules\User\Application\Queries\ListRolesQuery;
use App\Modules\User\Presentation\Http\Resources\RoleResource;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function __construct(
        private readonly ListRolesQuery $listRoles,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => RoleResource::collection($this->listRoles->execute()),
        ]);
    }
}
new_string:
use App\Http\Controllers\Controller;
use App\Modules\User\Application\DTOs\RoleData;
use App\Modules\User\Application\Queries\ListRolesQuery;
use App\Modules\User\Application\UseCases\CreateRoleUseCase;
use App\Modules\User\Presentation\Http\Requests\StoreRoleRequest;
use App\Modules\User\Presentation\Http\Resources\RoleResource;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function __construct(
        private readonly ListRolesQuery $listRoles,
        private readonly CreateRoleUseCase $createRole,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => RoleResource::collection($this->listRoles->execute()),
        ]);
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = $this->createRole->execute(RoleData::from($request->validated()));

        return response()->json(['data' => new RoleResource($role)], 201);
    }
}
```

- [ ] **Step 7: Add the route**

Modify `routes/api/v1/dashboard/users.php`:
```php
old_string:
    Route::get('roles', [RoleController::class, 'index'])
        ->middleware('can:users.viewAny')
        ->name('dashboard.roles.index');
});
new_string:
    Route::get('roles', [RoleController::class, 'index'])
        ->middleware('can:users.viewAny')
        ->name('dashboard.roles.index');
    Route::post('roles', [RoleController::class, 'store'])
        ->middleware('can:roles.manage')
        ->name('dashboard.roles.store');
});
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `php artisan test --compact --filter=CreateRoleUseCaseTest`
Expected: PASS (2 tests)

Run: `php artisan test --compact --filter=StoreRoleTest`
Expected: PASS (6 tests)

- [ ] **Step 9: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/User/Application/DTOs/RoleData.php \
  app/Modules/User/Application/UseCases/CreateRoleUseCase.php \
  app/Modules/User/Presentation/Http/Requests/StoreRoleRequest.php \
  app/Modules/User/Presentation/Http/Controllers/RoleController.php \
  routes/api/v1/dashboard/users.php \
  tests/Feature/Modules/User/CreateRoleUseCaseTest.php \
  tests/Feature/Modules/User/StoreRoleTest.php
git commit -m "feat(roles): add POST /api/v1/dashboard/roles"
```

---

### Task 4: `PATCH /api/v1/dashboard/roles/{id}` (update, with the admin `roles.manage` safeguard)

**Files:**
- Create: `app/Modules/User/Application/UseCases/UpdateRoleUseCase.php`
- Create: `app/Modules/User/Presentation/Http/Requests/UpdateRoleRequest.php`
- Modify: `app/Modules/User/Presentation/Http/Controllers/RoleController.php`
- Modify: `routes/api/v1/dashboard/users.php`
- Test: `tests/Feature/Modules/User/UpdateRoleUseCaseTest.php`
- Test: `tests/Feature/Modules/User/UpdateRoleTest.php`

**Interfaces:**
- Consumes: `RoleData` (Task 3), `Permission::values()` (Task 1), `RoleResource` (Task 2).
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Write the failing tests**

`tests/Feature/Modules/User/UpdateRoleUseCaseTest.php`:
```php
<?php

use App\Modules\User\Application\DTOs\RoleData;
use App\Modules\User\Application\UseCases\UpdateRoleUseCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('execute renames the role and replaces its permissions', function () {
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']));
    Permission::firstOrCreate(['name' => 'vendors.review', 'guard_name' => 'web']);

    $updated = app(UpdateRoleUseCase::class)->execute($role->id, new RoleData(
        name: 'procurement_lead',
        permissions: ['vendors.review'],
    ));

    expect($updated->name)->toBe('procurement_lead')
        ->and($updated->permissions->pluck('name')->all())->toBe(['vendors.review']);
    $this->assertDatabaseHas('roles', ['id' => $role->id, 'name' => 'procurement_lead']);
});

test('execute throws when the role does not exist', function () {
    app(UpdateRoleUseCase::class)->execute(999999, new RoleData(name: 'x', permissions: []));
})->throws(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
```

`tests/Feature/Modules/User/UpdateRoleTest.php`:
```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalUserWithRolesManageForUpdate(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'roles.manage', 'guard_name' => 'web']));
    $user->assignRole($role);

    return $user;
}

test('updating a role requires authentication', function () {
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", ['name' => 'x', 'permissions' => []]);

    $response->assertStatus(401);
});

test('an internal user without roles.manage cannot update a role', function () {
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", ['name' => 'x', 'permissions' => []]);

    $response->assertStatus(403);
});

test('a user with roles.manage can rename a role and change its permissions', function () {
    Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']);
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $this->actingAs(internalUserWithRolesManageForUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", [
        'name' => 'procurement_lead',
        'permissions' => ['vendors.view'],
    ]);

    $response->assertOk()
        ->assertJsonPath('data.name', 'procurement_lead')
        ->assertJsonPath('data.permissions', ['vendors.view']);
});

test('removing roles.manage from the admin role is rejected', function () {
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'roles.manage', 'guard_name' => 'web']));
    $this->actingAs(internalUserWithRolesManageForUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", [
        'name' => 'admin',
        'permissions' => [],
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('permissions')
        ->assertJsonFragment(['permissions' => ['ไม่สามารถถอดสิทธิ์จัดการ role ออกจาก role admin ได้']]);
    expect(Role::find($role->id)->hasPermissionTo('roles.manage'))->toBeTrue();
});

test('renaming the admin role while keeping roles.manage is allowed', function () {
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'roles.manage', 'guard_name' => 'web']));
    $this->actingAs(internalUserWithRolesManageForUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", [
        'name' => 'super_admin',
        'permissions' => ['roles.manage'],
    ]);

    $response->assertOk()->assertJsonPath('data.name', 'super_admin');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=UpdateRoleUseCaseTest`
Expected: FAIL (class `App\Modules\User\Application\UseCases\UpdateRoleUseCase` not found)

Run: `php artisan test --compact --filter=UpdateRoleTest`
Expected: FAIL (route `PATCH /api/v1/dashboard/roles/{id}` not found)

- [ ] **Step 3: Implement the use case**

`app/Modules/User/Application/UseCases/UpdateRoleUseCase.php`:
```php
<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Application\DTOs\RoleData;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

final class UpdateRoleUseCase
{
    public function execute(int $id, RoleData $data): Role
    {
        return DB::transaction(function () use ($id, $data): Role {
            $role = Role::findOrFail($id);
            $role->name = $data->name;
            $role->save();
            $role->syncPermissions($data->permissions);

            app_log('Role updated', [
                'role_id' => $role->id,
                'name' => $role->name,
            ], 'info', 'user');

            return $role->load('permissions')->loadCount('users');
        });
    }
}
```

- [ ] **Step 4: Implement the form request with the admin safeguard**

`app/Modules/User/Presentation/Http/Requests/UpdateRoleRequest.php`:
```php
<?php

namespace App\Modules\User\Presentation\Http\Requests;

use App\Modules\User\Domain\Enums\Permission;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Spatie\Permission\Models\Role;

class UpdateRoleRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique('roles', 'name')->ignore($this->route('id')),
            ],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::in(Permission::values())],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.regex' => 'ใช้ได้แค่ตัวพิมพ์เล็ก ตัวเลข และ _ เท่านั้น (ขึ้นต้นด้วยตัวอักษร)',
            'name.unique' => 'มี role ชื่อนี้อยู่แล้ว',
        ];
    }

    /**
     * @return array<int, \Closure>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $role = Role::find($this->route('id'));
                $permissions = $this->input('permissions', []);

                if (
                    $role !== null
                    && $role->name === 'admin'
                    && is_array($permissions)
                    && ! in_array('roles.manage', $permissions, true)
                ) {
                    $validator->errors()->add(
                        'permissions',
                        'ไม่สามารถถอดสิทธิ์จัดการ role ออกจาก role admin ได้'
                    );
                }
            },
        ];
    }
}
```

- [ ] **Step 5: Add the `update` action to the controller**

Modify `app/Modules/User/Presentation/Http/Controllers/RoleController.php`:
```php
old_string:
use App\Http\Controllers\Controller;
use App\Modules\User\Application\DTOs\RoleData;
use App\Modules\User\Application\Queries\ListRolesQuery;
use App\Modules\User\Application\UseCases\CreateRoleUseCase;
use App\Modules\User\Presentation\Http\Requests\StoreRoleRequest;
use App\Modules\User\Presentation\Http\Resources\RoleResource;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function __construct(
        private readonly ListRolesQuery $listRoles,
        private readonly CreateRoleUseCase $createRole,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => RoleResource::collection($this->listRoles->execute()),
        ]);
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = $this->createRole->execute(RoleData::from($request->validated()));

        return response()->json(['data' => new RoleResource($role)], 201);
    }
}
new_string:
use App\Http\Controllers\Controller;
use App\Modules\User\Application\DTOs\RoleData;
use App\Modules\User\Application\Queries\ListRolesQuery;
use App\Modules\User\Application\UseCases\CreateRoleUseCase;
use App\Modules\User\Application\UseCases\UpdateRoleUseCase;
use App\Modules\User\Presentation\Http\Requests\StoreRoleRequest;
use App\Modules\User\Presentation\Http\Requests\UpdateRoleRequest;
use App\Modules\User\Presentation\Http\Resources\RoleResource;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function __construct(
        private readonly ListRolesQuery $listRoles,
        private readonly CreateRoleUseCase $createRole,
        private readonly UpdateRoleUseCase $updateRole,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => RoleResource::collection($this->listRoles->execute()),
        ]);
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = $this->createRole->execute(RoleData::from($request->validated()));

        return response()->json(['data' => new RoleResource($role)], 201);
    }

    public function update(UpdateRoleRequest $request, int $id): JsonResponse
    {
        $role = $this->updateRole->execute($id, RoleData::from($request->validated()));

        return response()->json(['data' => new RoleResource($role)]);
    }
}
```

- [ ] **Step 6: Add the route**

Modify `routes/api/v1/dashboard/users.php`:
```php
old_string:
    Route::post('roles', [RoleController::class, 'store'])
        ->middleware('can:roles.manage')
        ->name('dashboard.roles.store');
});
new_string:
    Route::post('roles', [RoleController::class, 'store'])
        ->middleware('can:roles.manage')
        ->name('dashboard.roles.store');
    Route::patch('roles/{id}', [RoleController::class, 'update'])
        ->middleware('can:roles.manage')
        ->whereNumber('id')
        ->name('dashboard.roles.update');
});
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `php artisan test --compact --filter=UpdateRoleUseCaseTest`
Expected: PASS (2 tests)

Run: `php artisan test --compact --filter=UpdateRoleTest`
Expected: PASS (5 tests)

- [ ] **Step 8: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/User/Application/UseCases/UpdateRoleUseCase.php \
  app/Modules/User/Presentation/Http/Requests/UpdateRoleRequest.php \
  app/Modules/User/Presentation/Http/Controllers/RoleController.php \
  routes/api/v1/dashboard/users.php \
  tests/Feature/Modules/User/UpdateRoleUseCaseTest.php \
  tests/Feature/Modules/User/UpdateRoleTest.php
git commit -m "feat(roles): add PATCH /api/v1/dashboard/roles/{id} with the admin roles.manage safeguard"
```

---

### Task 5: `DELETE /api/v1/dashboard/roles/{id}` (with the "in use" safeguard)

**Files:**
- Create: `app/Modules/User/Domain/Exceptions/RoleInUseException.php`
- Create: `app/Modules/User/Application/UseCases/DeleteRoleUseCase.php`
- Modify: `app/Modules/User/Presentation/Http/Controllers/RoleController.php`
- Modify: `routes/api/v1/dashboard/users.php`
- Test: `tests/Feature/Modules/User/DeleteRoleUseCaseTest.php`
- Test: `tests/Feature/Modules/User/DestroyRoleTest.php`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by later tasks (last endpoint task).

- [ ] **Step 1: Write the failing tests**

`tests/Feature/Modules/User/DeleteRoleUseCaseTest.php`:
```php
<?php

use App\Modules\User\Application\UseCases\DeleteRoleUseCase;
use App\Modules\User\Domain\Exceptions\RoleInUseException;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('execute deletes a role with no users assigned', function () {
    $role = Role::create(['name' => 'unused_role', 'guard_name' => 'web']);

    app(DeleteRoleUseCase::class)->execute($role->id);

    $this->assertDatabaseMissing('roles', ['id' => $role->id]);
});

test('execute throws RoleInUseException when the role still has users', function () {
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->assignRole($role);

    app(DeleteRoleUseCase::class)->execute($role->id);
})->throws(RoleInUseException::class, 'ไม่สามารถลบ role ที่ยังมีผู้ใช้งานอยู่ได้');

test('execute throws when the role does not exist', function () {
    app(DeleteRoleUseCase::class)->execute(999999);
})->throws(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
```

`tests/Feature/Modules/User/DestroyRoleTest.php`:
```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalUserWithRolesManageForDestroy(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'roles.manage', 'guard_name' => 'web']));
    $user->assignRole($role);

    return $user;
}

test('deleting a role requires authentication', function () {
    $role = Role::create(['name' => 'unused_role', 'guard_name' => 'web']);

    $response = $this->deleteJson("/api/v1/dashboard/roles/{$role->id}");

    $response->assertStatus(401);
});

test('an internal user without roles.manage cannot delete a role', function () {
    $role = Role::create(['name' => 'unused_role', 'guard_name' => 'web']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->deleteJson("/api/v1/dashboard/roles/{$role->id}");

    $response->assertStatus(403);
});

test('a user with roles.manage can delete an unused role', function () {
    $role = Role::create(['name' => 'unused_role', 'guard_name' => 'web']);
    $this->actingAs(internalUserWithRolesManageForDestroy(), 'web');

    $response = $this->deleteJson("/api/v1/dashboard/roles/{$role->id}");

    $response->assertStatus(204);
    $this->assertDatabaseMissing('roles', ['id' => $role->id]);
});

test('deleting a role that still has users is rejected with 422', function () {
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $assignedUser = User::factory()->create(['user_type' => 'internal']);
    $assignedUser->assignRole($role);
    $this->actingAs(internalUserWithRolesManageForDestroy(), 'web');

    $response = $this->deleteJson("/api/v1/dashboard/roles/{$role->id}");

    $response->assertStatus(422)
        ->assertJson(['message' => 'ไม่สามารถลบ role ที่ยังมีผู้ใช้งานอยู่ได้']);
    $this->assertDatabaseHas('roles', ['id' => $role->id]);
});

test('deleting a nonexistent role returns 404', function () {
    $this->actingAs(internalUserWithRolesManageForDestroy(), 'web');

    $response = $this->deleteJson('/api/v1/dashboard/roles/999999');

    $response->assertStatus(404);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=DeleteRoleUseCaseTest`
Expected: FAIL (class `App\Modules\User\Application\UseCases\DeleteRoleUseCase` not found)

Run: `php artisan test --compact --filter=DestroyRoleTest`
Expected: FAIL (route `DELETE /api/v1/dashboard/roles/{id}` not found)

- [ ] **Step 3: Implement the exception**

`app/Modules/User/Domain/Exceptions/RoleInUseException.php`:
```php
<?php

namespace App\Modules\User\Domain\Exceptions;

use DomainException;
use Illuminate\Http\JsonResponse;

final class RoleInUseException extends DomainException
{
    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], 422);
    }
}
```

- [ ] **Step 4: Implement the use case**

`app/Modules/User/Application/UseCases/DeleteRoleUseCase.php`:
```php
<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Domain\Exceptions\RoleInUseException;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

final class DeleteRoleUseCase
{
    public function execute(int $id): void
    {
        DB::transaction(function () use ($id): void {
            $role = Role::withCount('users')->findOrFail($id);

            if ($role->users_count > 0) {
                throw new RoleInUseException('ไม่สามารถลบ role ที่ยังมีผู้ใช้งานอยู่ได้');
            }

            $role->delete();

            app_log('Role deleted', [
                'role_id' => $role->id,
                'name' => $role->name,
            ], 'info', 'user');
        });
    }
}
```

- [ ] **Step 5: Add the `destroy` action to the controller**

Modify `app/Modules/User/Presentation/Http/Controllers/RoleController.php`:
```php
old_string:
use App\Http\Controllers\Controller;
use App\Modules\User\Application\DTOs\RoleData;
use App\Modules\User\Application\Queries\ListRolesQuery;
use App\Modules\User\Application\UseCases\CreateRoleUseCase;
use App\Modules\User\Application\UseCases\UpdateRoleUseCase;
use App\Modules\User\Presentation\Http\Requests\StoreRoleRequest;
use App\Modules\User\Presentation\Http\Requests\UpdateRoleRequest;
use App\Modules\User\Presentation\Http\Resources\RoleResource;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function __construct(
        private readonly ListRolesQuery $listRoles,
        private readonly CreateRoleUseCase $createRole,
        private readonly UpdateRoleUseCase $updateRole,
    ) {}
new_string:
use App\Http\Controllers\Controller;
use App\Modules\User\Application\DTOs\RoleData;
use App\Modules\User\Application\Queries\ListRolesQuery;
use App\Modules\User\Application\UseCases\CreateRoleUseCase;
use App\Modules\User\Application\UseCases\DeleteRoleUseCase;
use App\Modules\User\Application\UseCases\UpdateRoleUseCase;
use App\Modules\User\Presentation\Http\Requests\StoreRoleRequest;
use App\Modules\User\Presentation\Http\Requests\UpdateRoleRequest;
use App\Modules\User\Presentation\Http\Resources\RoleResource;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function __construct(
        private readonly ListRolesQuery $listRoles,
        private readonly CreateRoleUseCase $createRole,
        private readonly UpdateRoleUseCase $updateRole,
        private readonly DeleteRoleUseCase $deleteRole,
    ) {}
```
```php
old_string:
    public function update(UpdateRoleRequest $request, int $id): JsonResponse
    {
        $role = $this->updateRole->execute($id, RoleData::from($request->validated()));

        return response()->json(['data' => new RoleResource($role)]);
    }
}
new_string:
    public function update(UpdateRoleRequest $request, int $id): JsonResponse
    {
        $role = $this->updateRole->execute($id, RoleData::from($request->validated()));

        return response()->json(['data' => new RoleResource($role)]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->deleteRole->execute($id);

        return response()->json(null, 204);
    }
}
```

- [ ] **Step 6: Add the route**

Modify `routes/api/v1/dashboard/users.php`:
```php
old_string:
    Route::patch('roles/{id}', [RoleController::class, 'update'])
        ->middleware('can:roles.manage')
        ->whereNumber('id')
        ->name('dashboard.roles.update');
});
new_string:
    Route::patch('roles/{id}', [RoleController::class, 'update'])
        ->middleware('can:roles.manage')
        ->whereNumber('id')
        ->name('dashboard.roles.update');
    Route::delete('roles/{id}', [RoleController::class, 'destroy'])
        ->middleware('can:roles.manage')
        ->whereNumber('id')
        ->name('dashboard.roles.destroy');
});
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `php artisan test --compact --filter=DeleteRoleUseCaseTest`
Expected: PASS (3 tests)

Run: `php artisan test --compact --filter=DestroyRoleTest`
Expected: PASS (5 tests)

- [ ] **Step 8: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/User/Domain/Exceptions/RoleInUseException.php \
  app/Modules/User/Application/UseCases/DeleteRoleUseCase.php \
  app/Modules/User/Presentation/Http/Controllers/RoleController.php \
  routes/api/v1/dashboard/users.php \
  tests/Feature/Modules/User/DeleteRoleUseCaseTest.php \
  tests/Feature/Modules/User/DestroyRoleTest.php
git commit -m "feat(roles): add DELETE /api/v1/dashboard/roles/{id} with the in-use safeguard"
```

---

### Task 6: Grant `roles.manage` to admin permanently + full verification

**Files:**
- Modify: `database/seeders/AdminUserSeeder.php`

**Interfaces:**
- Consumes: nothing new — final task, no downstream consumers.

- [ ] **Step 1: Update the seeder**

Modify `database/seeders/AdminUserSeeder.php`:
```php
old_string:
        $admin->givePermissionTo([
            Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'vendors.review', 'guard_name' => 'web']),
            // Temporary: the users.create/update/updateStatus/roles.manage API endpoints don't
            // exist yet (see docs/superpowers/specs/2026-08-14-user-management-create-edit-design.md
            // and docs/superpowers/specs/2026-08-14-role-permission-management-design.md) —
            // granted early so the already-shipped frontend UI is visible for local QA. The
            // real backend plans for those specs should revisit this grant once the endpoints ship.
            Permission::firstOrCreate(['name' => 'users.create', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'users.update', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'users.updateStatus', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'roles.manage', 'guard_name' => 'web']),
        ]);
new_string:
        $admin->givePermissionTo([
            Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'vendors.review', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'roles.manage', 'guard_name' => 'web']),
            // Temporary: the users.create/update/updateStatus API endpoints don't exist yet
            // (see docs/superpowers/specs/2026-08-14-user-management-create-edit-design.md) —
            // granted early so the already-shipped frontend UI is visible for local QA. The
            // real backend plan for that spec should revisit this grant once the endpoints ship.
            Permission::firstOrCreate(['name' => 'users.create', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'users.update', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'users.updateStatus', 'guard_name' => 'web']),
        ]);
```

- [ ] **Step 2: Re-seed the dev database**

Run: `php artisan db:seed --class=AdminUserSeeder`
Expected: seeder runs without error (existing `admin` role/user found via `firstOrCreate`, `roles.manage` now a real, permanent grant rather than a temporary QA one)

- [ ] **Step 3: Run the full test suite**

Run: `php artisan test --compact`
Expected: all tests pass except the pre-existing, unrelated baseline failures already documented in `D:\E-Procurement-System\.superpowers\sdd\progress.md` (root `/` 404 `ExampleTest`, and the 4 known vendor-authorization tripwires: `ApproveVendorDocumentTest`, `ApproveVendorTest`, `ListVendorsTest`, `ShowVendorTest`). No other failures.

- [ ] **Step 4: Verify the routes**

Run: `php artisan route:list --path=dashboard`
Expected: all 7 dashboard routes present — `GET users`, `GET users/{id}`, `GET permissions`, `GET roles`, `POST roles`, `PATCH roles/{id}`, `DELETE roles/{id}` — matching every URL in `frontend/lib/user/management/api.ts` exactly (`fetchRoles`, `fetchPermissions`, `createRole`, `updateRole`, `deleteRole`).

- [ ] **Step 5: Format, commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/seeders/AdminUserSeeder.php
git commit -m "chore(roles): grant roles.manage to admin permanently now that the API exists"
```

- [ ] **Step 6: Update the shared SDD progress ledger**

Append a `# Plan: backend/docs/superpowers/plans/2026-08-15-role-permission-management-api.md` section to `D:\E-Procurement-System\.superpowers\sdd\progress.md`, following the exact format of every other entry in that file (baseline commit, one line per task with commit range, final whole-plan review outcome once run).

---

## Self-Review Notes

- **Spec coverage:** all 6 contract items from `docs/superpowers/specs/2026-08-14-role-permission-management-design.md` (permission catalog endpoint, extended roles list, create, update+safeguard 1, delete+safeguard 2, `roles.manage` permission) map 1:1 to Tasks 1-5. Task 6 covers item 6 (grant to admin) permanently instead of the temporary QA grant.
- **Backward compatibility:** Task 2's `RoleResource` is additive (`id`/`permissions`/`userCount` added, nothing removed) — the pre-existing create/edit-user dropdown that reads only `.name` is unaffected, confirmed no other consumer of `GET /roles` exists yet on the backend side.
- **Type consistency:** `RoleData` (Task 3) is reused unchanged by `UpdateRoleUseCase` (Task 4) — same two fields, same names, no drift.
