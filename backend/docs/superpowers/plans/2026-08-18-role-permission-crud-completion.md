# Role/Permission CRUD Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 5 missing backend endpoints (`PATCH/DELETE /roles/{id}`, `POST/PATCH/DELETE /permissions/{name}`) that the already-shipped frontend Role/Permission management UI (`frontend/app/dashboard/users/roles-permissions/`) expects.

**Architecture:** Extend the existing `App\Modules\User` module — no new module, no new files outside it. Role/Permission use Spatie's own Eloquent models directly (no Domain Entity/Repository wrapper), exactly matching how `CreateRoleUseCase`/`ListPermissionsQuery` already work. Full details: `backend/docs/superpowers/specs/2026-08-18-role-permission-crud-completion-design.md`.

**Tech Stack:** Laravel 13, spatie/laravel-permission, spatie/laravel-data, Pest 4.

## Global Constraints

- API contract (request/response shapes, validation regexes, status codes) is fixed by the shipped frontend (`frontend/lib/user/management/api.ts`, `_schemas/schema.ts`, `_schemas/permission-schema.ts`) — do not deviate from field names/casing documented there.
- All 5 new routes gated by `role:admin` middleware — **not** `can:roles.manage` (that permission was removed from the system entirely in an earlier session; do not reintroduce it or a `roles.manage` Gate).
- Admin-role protection (blocking rename/delete of the role literally named `admin`) is a **new** safeguard this plan adds — it deliberately overrides an older, now-stale note in `docs/superpowers/specs/2026-08-14-role-permission-management-design.md` that said no such protection was needed. See the design spec's Safeguard 2 for the full reasoning.
- Run `vendor/bin/pint --dirty --format agent` before the final commit of every task.
- No placeholders — every validation/safeguard message must be the exact Thai string specified in each task below.
- Working dir: `backend/` (repo root `D:\E-Procurement-System`). Branch: `Internal`, working in place, no worktree (this repo's established convention).
- New Pest test files each declare global helper functions (e.g. `internalAdminUserForUpdate()`) — these must be **uniquely named across the whole test suite** (Pest loads all test files together; a duplicate name is a fatal "cannot redeclare function" error). Follow the exact naming already established by `tests/Feature/Modules/User/StoreRoleTest.php` (`internalAdminUserForStore`) and `PermissionsIndexTest.php` (`internalAdminUser`): `internalAdminUserFor<Action>`.

---

### Task 1: `PATCH /api/v1/dashboard/roles/{id}` (update, with the admin-role rename guard)

**Files:**
- Create: `app/Modules/User/Domain/Exceptions/AdminRoleProtectedException.php`
- Create: `app/Modules/User/Application/UseCases/UpdateRoleUseCase.php`
- Create: `app/Modules/User/Presentation/Http/Requests/UpdateRoleRequest.php`
- Modify: `app/Modules/User/Presentation/Http/Controllers/RoleController.php`
- Modify: `routes/api/v1/dashboard/users.php`
- Test: `tests/Feature/Modules/User/UpdateRoleUseCaseTest.php`
- Test: `tests/Feature/Modules/User/UpdateRoleTest.php`

**Interfaces:**
- Consumes: `App\Modules\User\Application\DTOs\RoleData` (existing, unchanged), `App\Modules\User\Presentation\Http\Resources\RoleResource` (existing, unchanged).
- Produces: `App\Modules\User\Domain\Exceptions\AdminRoleProtectedException` (extends `DomainException`, has `render(): JsonResponse` returning `422 {"message": ...}`) — reused as-is by Task 2's `DeleteRoleUseCase`.

- [ ] **Step 1: Write the failing tests**

`tests/Feature/Modules/User/UpdateRoleUseCaseTest.php`:
```php
<?php

use App\Modules\User\Application\DTOs\RoleData;
use App\Modules\User\Application\UseCases\UpdateRoleUseCase;
use App\Modules\User\Domain\Exceptions\AdminRoleProtectedException;
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

test('execute rejects renaming the admin role away from admin', function () {
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

    app(UpdateRoleUseCase::class)->execute($role->id, new RoleData(name: 'super_admin', permissions: []));
})->throws(AdminRoleProtectedException::class, 'ไม่สามารถเปลี่ยนชื่อ role admin ได้');

test('execute allows changing the admin role permissions while keeping its name', function () {
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']);

    $updated = app(UpdateRoleUseCase::class)->execute($role->id, new RoleData(
        name: 'admin',
        permissions: ['vendors.view'],
    ));

    expect($updated->name)->toBe('admin')
        ->and($updated->permissions->pluck('name')->all())->toBe(['vendors.view']);
});
```

`tests/Feature/Modules/User/UpdateRoleTest.php`:
```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForUpdate(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $user->assignRole($role);

    return $user;
}

test('updating a role requires authentication', function () {
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", ['name' => 'x', 'permissions' => []]);

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot update a role', function () {
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", ['name' => 'x', 'permissions' => []]);

    $response->assertStatus(403);
});

test('a user with the admin role can rename a role and change its permissions', function () {
    Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']);
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", [
        'name' => 'procurement_lead',
        'permissions' => ['vendors.view'],
    ]);

    $response->assertOk()
        ->assertJsonPath('data.name', 'procurement_lead')
        ->assertJsonPath('data.permissions', ['vendors.view']);
});

test('role name must match the lowercase snake pattern on update', function () {
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", ['name' => 'Procurement Officer', 'permissions' => []]);

    $response->assertStatus(422)->assertJsonValidationErrors('name');
});

test('role name must stay unique on update, ignoring itself', function () {
    Role::create(['name' => 'existing_role', 'guard_name' => 'web']);
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", ['name' => 'existing_role', 'permissions' => []]);
    $response->assertStatus(422)->assertJsonValidationErrors('name');

    $sameNameResponse = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", ['name' => 'procurement_officer', 'permissions' => []]);
    $sameNameResponse->assertOk();
});

test('renaming the admin role is rejected with a 422', function () {
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", [
        'name' => 'super_admin',
        'permissions' => [],
    ]);

    $response->assertStatus(422)->assertJson(['message' => 'ไม่สามารถเปลี่ยนชื่อ role admin ได้']);
    expect(Role::find($role->id)->name)->toBe('admin');
});

test('updating the admin role permissions while keeping its name is allowed', function () {
    Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", [
        'name' => 'admin',
        'permissions' => ['vendors.view'],
    ]);

    $response->assertOk()->assertJsonPath('data.name', 'admin');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=UpdateRoleUseCaseTest`
Expected: FAIL (class `App\Modules\User\Application\UseCases\UpdateRoleUseCase` not found)

Run: `php artisan test --compact --filter=UpdateRoleTest`
Expected: FAIL (route `PATCH /api/v1/dashboard/roles/{id}` not found)

- [ ] **Step 3: Implement the exception**

`app/Modules/User/Domain/Exceptions/AdminRoleProtectedException.php`:
```php
<?php

namespace App\Modules\User\Domain\Exceptions;

use DomainException;
use Illuminate\Http\JsonResponse;

final class AdminRoleProtectedException extends DomainException
{
    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], 422);
    }
}
```

- [ ] **Step 4: Implement the use case**

`app/Modules/User/Application/UseCases/UpdateRoleUseCase.php`:
```php
<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Application\DTOs\RoleData;
use App\Modules\User\Domain\Exceptions\AdminRoleProtectedException;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

final class UpdateRoleUseCase
{
    public function execute(int $id, RoleData $data): Role
    {
        return DB::transaction(function () use ($id, $data): Role {
            $role = Role::findOrFail($id);

            if ($role->name === 'admin' && $data->name !== 'admin') {
                throw new AdminRoleProtectedException('ไม่สามารถเปลี่ยนชื่อ role admin ได้');
            }

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

- [ ] **Step 5: Implement the form request**

`app/Modules/User/Presentation/Http/Requests/UpdateRoleRequest.php`:
```php
<?php

namespace App\Modules\User\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'permissions.*' => ['string', Rule::exists('permissions', 'name')],
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

- [ ] **Step 6: Add the `update` action to the controller**

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

- [ ] **Step 7: Add the route**

Modify `routes/api/v1/dashboard/users.php`:
```php
old_string:
    Route::post('roles', [RoleController::class, 'store'])
        ->middleware('role:admin')
        ->name('dashboard.roles.store');
});
new_string:
    Route::post('roles', [RoleController::class, 'store'])
        ->middleware('role:admin')
        ->name('dashboard.roles.store');
    Route::patch('roles/{id}', [RoleController::class, 'update'])
        ->middleware('role:admin')
        ->whereNumber('id')
        ->name('dashboard.roles.update');
});
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `php artisan test --compact --filter=UpdateRoleUseCaseTest`
Expected: PASS (4 tests)

Run: `php artisan test --compact --filter=UpdateRoleTest`
Expected: PASS (7 tests)

- [ ] **Step 9: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/User/Domain/Exceptions/AdminRoleProtectedException.php \
  app/Modules/User/Application/UseCases/UpdateRoleUseCase.php \
  app/Modules/User/Presentation/Http/Requests/UpdateRoleRequest.php \
  app/Modules/User/Presentation/Http/Controllers/RoleController.php \
  routes/api/v1/dashboard/users.php \
  tests/Feature/Modules/User/UpdateRoleUseCaseTest.php \
  tests/Feature/Modules/User/UpdateRoleTest.php
git commit -m "feat(roles): add PATCH /api/v1/dashboard/roles/{id} with the admin-role rename guard"
```

---

### Task 2: `DELETE /api/v1/dashboard/roles/{id}` (with the "in use" and admin-role safeguards)

**Files:**
- Create: `app/Modules/User/Domain/Exceptions/RoleInUseException.php`
- Create: `app/Modules/User/Application/UseCases/DeleteRoleUseCase.php`
- Modify: `app/Modules/User/Presentation/Http/Controllers/RoleController.php`
- Modify: `routes/api/v1/dashboard/users.php`
- Test: `tests/Feature/Modules/User/DeleteRoleUseCaseTest.php`
- Test: `tests/Feature/Modules/User/DestroyRoleTest.php`

**Interfaces:**
- Consumes: `App\Modules\User\Domain\Exceptions\AdminRoleProtectedException` (Task 1, reused as-is).
- Produces: `App\Modules\User\Domain\Exceptions\RoleInUseException` — not consumed by later tasks (last Role task).

- [ ] **Step 1: Write the failing tests**

`tests/Feature/Modules/User/DeleteRoleUseCaseTest.php`:
```php
<?php

use App\Modules\User\Application\UseCases\DeleteRoleUseCase;
use App\Modules\User\Domain\Exceptions\AdminRoleProtectedException;
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

test('execute rejects deleting the admin role even when it has no users', function () {
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

    app(DeleteRoleUseCase::class)->execute($role->id);
})->throws(AdminRoleProtectedException::class, 'ไม่สามารถลบ role admin ได้');
```

`tests/Feature/Modules/User/DestroyRoleTest.php`:
```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForDestroy(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $user->assignRole($role);

    return $user;
}

test('deleting a role requires authentication', function () {
    $role = Role::create(['name' => 'unused_role', 'guard_name' => 'web']);

    $response = $this->deleteJson("/api/v1/dashboard/roles/{$role->id}");

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot delete a role', function () {
    $role = Role::create(['name' => 'unused_role', 'guard_name' => 'web']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->deleteJson("/api/v1/dashboard/roles/{$role->id}");

    $response->assertStatus(403);
});

test('a user with the admin role can delete an unused role', function () {
    $role = Role::create(['name' => 'unused_role', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForDestroy(), 'web');

    $response = $this->deleteJson("/api/v1/dashboard/roles/{$role->id}");

    $response->assertStatus(204);
    $this->assertDatabaseMissing('roles', ['id' => $role->id]);
});

test('deleting a role that still has users is rejected with 422', function () {
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $assignedUser = User::factory()->create(['user_type' => 'internal']);
    $assignedUser->assignRole($role);
    $this->actingAs(internalAdminUserForDestroy(), 'web');

    $response = $this->deleteJson("/api/v1/dashboard/roles/{$role->id}");

    $response->assertStatus(422)
        ->assertJson(['message' => 'ไม่สามารถลบ role ที่ยังมีผู้ใช้งานอยู่ได้']);
    $this->assertDatabaseHas('roles', ['id' => $role->id]);
});

test('deleting the admin role is rejected even when the acting user is its only member', function () {
    $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForDestroy(), 'web');

    $response = $this->deleteJson("/api/v1/dashboard/roles/{$adminRole->id}");

    $response->assertStatus(422)->assertJson(['message' => 'ไม่สามารถลบ role admin ได้']);
    $this->assertDatabaseHas('roles', ['id' => $adminRole->id]);
});

test('deleting a nonexistent role returns 404', function () {
    $this->actingAs(internalAdminUserForDestroy(), 'web');

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

use App\Modules\User\Domain\Exceptions\AdminRoleProtectedException;
use App\Modules\User\Domain\Exceptions\RoleInUseException;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

final class DeleteRoleUseCase
{
    public function execute(int $id): void
    {
        DB::transaction(function () use ($id): void {
            $role = Role::withCount('users')->findOrFail($id);

            if ($role->name === 'admin') {
                throw new AdminRoleProtectedException('ไม่สามารถลบ role admin ได้');
            }

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
        ->middleware('role:admin')
        ->whereNumber('id')
        ->name('dashboard.roles.update');
});
new_string:
    Route::patch('roles/{id}', [RoleController::class, 'update'])
        ->middleware('role:admin')
        ->whereNumber('id')
        ->name('dashboard.roles.update');
    Route::delete('roles/{id}', [RoleController::class, 'destroy'])
        ->middleware('role:admin')
        ->whereNumber('id')
        ->name('dashboard.roles.destroy');
});
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `php artisan test --compact --filter=DeleteRoleUseCaseTest`
Expected: PASS (4 tests)

Run: `php artisan test --compact --filter=DestroyRoleTest`
Expected: PASS (6 tests)

- [ ] **Step 8: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/User/Domain/Exceptions/RoleInUseException.php \
  app/Modules/User/Application/UseCases/DeleteRoleUseCase.php \
  app/Modules/User/Presentation/Http/Controllers/RoleController.php \
  routes/api/v1/dashboard/users.php \
  tests/Feature/Modules/User/DeleteRoleUseCaseTest.php \
  tests/Feature/Modules/User/DestroyRoleTest.php
git commit -m "feat(roles): add DELETE /api/v1/dashboard/roles/{id} with the in-use and admin-role safeguards"
```

---

### Task 3: `POST /api/v1/dashboard/permissions` (create)

**Files:**
- Create: `app/Modules/User/Application/DTOs/PermissionData.php`
- Create: `app/Modules/User/Application/UseCases/CreatePermissionUseCase.php`
- Create: `app/Modules/User/Presentation/Http/Requests/StorePermissionRequest.php`
- Create: `app/Modules/User/Presentation/Http/Resources/PermissionResource.php`
- Modify: `app/Modules/User/Presentation/Http/Controllers/PermissionController.php`
- Modify: `routes/api/v1/dashboard/users.php`
- Test: `tests/Feature/Modules/User/CreatePermissionUseCaseTest.php`
- Test: `tests/Feature/Modules/User/StorePermissionTest.php`

**Interfaces:**
- Consumes: nothing from Tasks 1-2 (Permission endpoints are independent of Role endpoints).
- Produces: `App\Modules\User\Application\DTOs\PermissionData` (readonly `string $name`, `string $label`) and `App\Modules\User\Presentation\Http\Resources\PermissionResource` (shape `{name, label, group}`) — both reused as-is by Task 4's `UpdatePermissionUseCase`/controller `update()`.

- [ ] **Step 1: Write the failing tests**

`tests/Feature/Modules/User/CreatePermissionUseCaseTest.php`:
```php
<?php

use App\Modules\User\Application\DTOs\PermissionData;
use App\Modules\User\Application\UseCases\CreatePermissionUseCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('execute creates a permission with the given name and label', function () {
    $permission = app(CreatePermissionUseCase::class)->execute(new PermissionData(
        name: 'reports.export',
        label: 'ส่งออกรายงาน',
    ));

    expect($permission->name)->toBe('reports.export')
        ->and($permission->label)->toBe('ส่งออกรายงาน');

    $this->assertDatabaseHas('permissions', [
        'name' => 'reports.export',
        'label' => 'ส่งออกรายงาน',
        'guard_name' => 'web',
    ]);
});
```

`tests/Feature/Modules/User/StorePermissionTest.php`:
```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForPermissionStore(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $user->assignRole($role);

    return $user;
}

test('creating a permission requires authentication', function () {
    $response = $this->postJson('/api/v1/dashboard/permissions', ['name' => 'reports.export', 'label' => 'ส่งออกรายงาน']);

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot create a permission', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/dashboard/permissions', ['name' => 'reports.export', 'label' => 'ส่งออกรายงาน']);

    $response->assertStatus(403);
});

test('a user with the admin role can create a permission', function () {
    $this->actingAs(internalAdminUserForPermissionStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/permissions', [
        'name' => 'reports.export',
        'label' => 'ส่งออกรายงาน',
    ]);

    $response->assertStatus(201)
        ->assertJson(['data' => ['name' => 'reports.export', 'label' => 'ส่งออกรายงาน', 'group' => 'reports']]);
});

test('permission name must match the prefix.action pattern', function () {
    $this->actingAs(internalAdminUserForPermissionStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/permissions', ['name' => 'ReportsExport', 'label' => 'x']);

    $response->assertStatus(422)->assertJsonValidationErrors('name');
});

test('permission name must be unique', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);
    $this->actingAs(internalAdminUserForPermissionStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/permissions', ['name' => 'reports.export', 'label' => 'y']);

    $response->assertStatus(422)->assertJsonValidationErrors('name');
});

test('permission label is required', function () {
    $this->actingAs(internalAdminUserForPermissionStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/permissions', ['name' => 'reports.export', 'label' => '']);

    $response->assertStatus(422)->assertJsonValidationErrors('label');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=CreatePermissionUseCaseTest`
Expected: FAIL (class `App\Modules\User\Application\DTOs\PermissionData` not found)

Run: `php artisan test --compact --filter=StorePermissionTest`
Expected: FAIL (route `POST /api/v1/dashboard/permissions` not found)

- [ ] **Step 3: Implement the DTO**

`app/Modules/User/Application/DTOs/PermissionData.php`:
```php
<?php

namespace App\Modules\User\Application\DTOs;

use Spatie\LaravelData\Data;

final class PermissionData extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly string $label,
    ) {}
}
```

- [ ] **Step 4: Implement the use case**

`app/Modules/User/Application/UseCases/CreatePermissionUseCase.php`:
```php
<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Application\DTOs\PermissionData;
use Spatie\Permission\Models\Permission;

final class CreatePermissionUseCase
{
    public function execute(PermissionData $data): Permission
    {
        $permission = Permission::create([
            'name' => $data->name,
            'label' => $data->label,
            'guard_name' => 'web',
        ]);

        app_log('Permission created', [
            'permission_id' => $permission->id,
            'name' => $permission->name,
        ], 'info', 'user');

        return $permission;
    }
}
```

- [ ] **Step 5: Implement the form request**

`app/Modules/User/Presentation/Http/Requests/StorePermissionRequest.php`:
```php
<?php

namespace App\Modules\User\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePermissionRequest extends FormRequest
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
                'regex:/^[a-z][a-z0-9_]*\.[a-z][a-zA-Z0-9_]*$/',
                Rule::unique('permissions', 'name'),
            ],
            'label' => ['required', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.regex' => 'รูปแบบต้องเป็น prefix.action เช่น reports.export (prefix ต้องเป็นตัวพิมพ์เล็ก ตัวเลข และ _ เท่านั้น ส่วน action อนุญาตตัวพิมพ์ใหญ่ได้ เช่น updateStatus)',
            'name.unique' => 'มี permission ชื่อนี้อยู่แล้ว',
        ];
    }
}
```

- [ ] **Step 6: Implement the resource**

`app/Modules/User/Presentation/Http/Resources/PermissionResource.php`:
```php
<?php

namespace App\Modules\User\Presentation\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PermissionResource extends JsonResource
{
    public static $wrap = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'name' => $this->name,
            'label' => $this->label ?? $this->name,
            'group' => explode('.', $this->name)[0],
        ];
    }
}
```

- [ ] **Step 7: Add the `store` action to the controller**

Modify `app/Modules/User/Presentation/Http/Controllers/PermissionController.php`:
```php
old_string:
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
new_string:
<?php

namespace App\Modules\User\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\User\Application\DTOs\PermissionData;
use App\Modules\User\Application\Queries\ListPermissionsQuery;
use App\Modules\User\Application\UseCases\CreatePermissionUseCase;
use App\Modules\User\Presentation\Http\Requests\StorePermissionRequest;
use App\Modules\User\Presentation\Http\Resources\PermissionResource;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    public function __construct(
        private readonly ListPermissionsQuery $listPermissions,
        private readonly CreatePermissionUseCase $createPermission,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->listPermissions->execute(),
        ]);
    }

    public function store(StorePermissionRequest $request): JsonResponse
    {
        $permission = $this->createPermission->execute(PermissionData::from($request->validated()));

        return response()->json(['data' => new PermissionResource($permission)], 201);
    }
}
```

- [ ] **Step 8: Add the route**

Modify `routes/api/v1/dashboard/users.php`:
```php
old_string:
    Route::get('permissions', [PermissionController::class, 'index'])
        ->middleware('role:admin')
        ->name('dashboard.permissions.index');
new_string:
    Route::get('permissions', [PermissionController::class, 'index'])
        ->middleware('role:admin')
        ->name('dashboard.permissions.index');
    Route::post('permissions', [PermissionController::class, 'store'])
        ->middleware('role:admin')
        ->name('dashboard.permissions.store');
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `php artisan test --compact --filter=CreatePermissionUseCaseTest`
Expected: PASS (1 test)

Run: `php artisan test --compact --filter=StorePermissionTest`
Expected: PASS (6 tests)

- [ ] **Step 10: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/User/Application/DTOs/PermissionData.php \
  app/Modules/User/Application/UseCases/CreatePermissionUseCase.php \
  app/Modules/User/Presentation/Http/Requests/StorePermissionRequest.php \
  app/Modules/User/Presentation/Http/Resources/PermissionResource.php \
  app/Modules/User/Presentation/Http/Controllers/PermissionController.php \
  routes/api/v1/dashboard/users.php \
  tests/Feature/Modules/User/CreatePermissionUseCaseTest.php \
  tests/Feature/Modules/User/StorePermissionTest.php
git commit -m "feat(permissions): add POST /api/v1/dashboard/permissions"
```

---

### Task 4: `PATCH /api/v1/dashboard/permissions/{name}` (update)

**Files:**
- Create: `app/Modules/User/Application/UseCases/UpdatePermissionUseCase.php`
- Create: `app/Modules/User/Presentation/Http/Requests/UpdatePermissionRequest.php`
- Modify: `app/Modules/User/Presentation/Http/Controllers/PermissionController.php`
- Modify: `routes/api/v1/dashboard/users.php`
- Test: `tests/Feature/Modules/User/UpdatePermissionUseCaseTest.php`
- Test: `tests/Feature/Modules/User/UpdatePermissionTest.php`

**Interfaces:**
- Consumes: `App\Modules\User\Application\DTOs\PermissionData`, `App\Modules\User\Presentation\Http\Resources\PermissionResource` (both Task 3, unchanged).
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Write the failing tests**

`tests/Feature/Modules/User/UpdatePermissionUseCaseTest.php`:
```php
<?php

use App\Modules\User\Application\DTOs\PermissionData;
use App\Modules\User\Application\UseCases\UpdatePermissionUseCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

test('execute renames the permission and updates its label', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'ส่งออกรายงาน']);

    $updated = app(UpdatePermissionUseCase::class)->execute('reports.export', new PermissionData(
        name: 'reports.export_v2',
        label: 'ส่งออกรายงาน (v2)',
    ));

    expect($updated->name)->toBe('reports.export_v2')
        ->and($updated->label)->toBe('ส่งออกรายงาน (v2)');
    $this->assertDatabaseHas('permissions', ['name' => 'reports.export_v2', 'label' => 'ส่งออกรายงาน (v2)']);
});

test('execute keeps role assignments intact after renaming a permission', function () {
    $permission = Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'ส่งออกรายงาน']);
    $role = \Spatie\Permission\Models\Role::create(['name' => 'reporter', 'guard_name' => 'web']);
    $role->givePermissionTo($permission);

    app(UpdatePermissionUseCase::class)->execute('reports.export', new PermissionData(
        name: 'reports.export_v2',
        label: 'ส่งออกรายงาน (v2)',
    ));

    expect($role->fresh()->permissions->pluck('name')->all())->toBe(['reports.export_v2']);
});

test('execute throws when the permission does not exist', function () {
    app(UpdatePermissionUseCase::class)->execute('missing.permission', new PermissionData(name: 'x.y', label: 'x'));
})->throws(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
```

`tests/Feature/Modules/User/UpdatePermissionTest.php`:
```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForPermissionUpdate(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $user->assignRole($role);

    return $user;
}

test('updating a permission requires authentication', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);

    $response = $this->patchJson('/api/v1/dashboard/permissions/reports.export', ['name' => 'reports.export', 'label' => 'y']);

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot update a permission', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->patchJson('/api/v1/dashboard/permissions/reports.export', ['name' => 'reports.export', 'label' => 'y']);

    $response->assertStatus(403);
});

test('a user with the admin role can update a permission label', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'ส่งออกรายงาน']);
    $this->actingAs(internalAdminUserForPermissionUpdate(), 'web');

    $response = $this->patchJson('/api/v1/dashboard/permissions/reports.export', [
        'name' => 'reports.export',
        'label' => 'ส่งออกรายงาน (แก้ไข)',
    ]);

    $response->assertOk()
        ->assertJson(['data' => ['name' => 'reports.export', 'label' => 'ส่งออกรายงาน (แก้ไข)', 'group' => 'reports']]);
});

test('permission name must stay unique on update, ignoring itself', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);
    Permission::create(['name' => 'reports.import', 'guard_name' => 'web', 'label' => 'y']);
    $this->actingAs(internalAdminUserForPermissionUpdate(), 'web');

    $conflict = $this->patchJson('/api/v1/dashboard/permissions/reports.export', ['name' => 'reports.import', 'label' => 'z']);
    $conflict->assertStatus(422)->assertJsonValidationErrors('name');

    $sameName = $this->patchJson('/api/v1/dashboard/permissions/reports.export', ['name' => 'reports.export', 'label' => 'z']);
    $sameName->assertOk();
});

test('updating a nonexistent permission returns 404', function () {
    $this->actingAs(internalAdminUserForPermissionUpdate(), 'web');

    $response = $this->patchJson('/api/v1/dashboard/permissions/missing.permission', ['name' => 'missing.permission', 'label' => 'x']);

    $response->assertStatus(404);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=UpdatePermissionUseCaseTest`
Expected: FAIL (class `App\Modules\User\Application\UseCases\UpdatePermissionUseCase` not found)

Run: `php artisan test --compact --filter=UpdatePermissionTest`
Expected: FAIL (route `PATCH /api/v1/dashboard/permissions/{name}` not found)

- [ ] **Step 3: Implement the use case**

`app/Modules/User/Application/UseCases/UpdatePermissionUseCase.php`:
```php
<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Application\DTOs\PermissionData;
use Spatie\Permission\Models\Permission;

final class UpdatePermissionUseCase
{
    public function execute(string $name, PermissionData $data): Permission
    {
        $permission = Permission::where('name', $name)->firstOrFail();
        $permission->name = $data->name;
        $permission->label = $data->label;
        $permission->save();

        app_log('Permission updated', [
            'permission_id' => $permission->id,
            'name' => $permission->name,
        ], 'info', 'user');

        return $permission;
    }
}
```

- [ ] **Step 4: Implement the form request**

`app/Modules/User/Presentation/Http/Requests/UpdatePermissionRequest.php`:
```php
<?php

namespace App\Modules\User\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePermissionRequest extends FormRequest
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
                'regex:/^[a-z][a-z0-9_]*\.[a-z][a-zA-Z0-9_]*$/',
                Rule::unique('permissions', 'name')->ignore($this->route('name'), 'name'),
            ],
            'label' => ['required', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.regex' => 'รูปแบบต้องเป็น prefix.action เช่น reports.export (prefix ต้องเป็นตัวพิมพ์เล็ก ตัวเลข และ _ เท่านั้น ส่วน action อนุญาตตัวพิมพ์ใหญ่ได้ เช่น updateStatus)',
            'name.unique' => 'มี permission ชื่อนี้อยู่แล้ว',
        ];
    }
}
```

- [ ] **Step 5: Add the `update` action to the controller**

Modify `app/Modules/User/Presentation/Http/Controllers/PermissionController.php`:
```php
old_string:
use App\Http\Controllers\Controller;
use App\Modules\User\Application\DTOs\PermissionData;
use App\Modules\User\Application\Queries\ListPermissionsQuery;
use App\Modules\User\Application\UseCases\CreatePermissionUseCase;
use App\Modules\User\Presentation\Http\Requests\StorePermissionRequest;
use App\Modules\User\Presentation\Http\Resources\PermissionResource;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    public function __construct(
        private readonly ListPermissionsQuery $listPermissions,
        private readonly CreatePermissionUseCase $createPermission,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->listPermissions->execute(),
        ]);
    }

    public function store(StorePermissionRequest $request): JsonResponse
    {
        $permission = $this->createPermission->execute(PermissionData::from($request->validated()));

        return response()->json(['data' => new PermissionResource($permission)], 201);
    }
}
new_string:
use App\Http\Controllers\Controller;
use App\Modules\User\Application\DTOs\PermissionData;
use App\Modules\User\Application\Queries\ListPermissionsQuery;
use App\Modules\User\Application\UseCases\CreatePermissionUseCase;
use App\Modules\User\Application\UseCases\UpdatePermissionUseCase;
use App\Modules\User\Presentation\Http\Requests\StorePermissionRequest;
use App\Modules\User\Presentation\Http\Requests\UpdatePermissionRequest;
use App\Modules\User\Presentation\Http\Resources\PermissionResource;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    public function __construct(
        private readonly ListPermissionsQuery $listPermissions,
        private readonly CreatePermissionUseCase $createPermission,
        private readonly UpdatePermissionUseCase $updatePermission,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->listPermissions->execute(),
        ]);
    }

    public function store(StorePermissionRequest $request): JsonResponse
    {
        $permission = $this->createPermission->execute(PermissionData::from($request->validated()));

        return response()->json(['data' => new PermissionResource($permission)], 201);
    }

    public function update(UpdatePermissionRequest $request, string $name): JsonResponse
    {
        $permission = $this->updatePermission->execute($name, PermissionData::from($request->validated()));

        return response()->json(['data' => new PermissionResource($permission)]);
    }
}
```

- [ ] **Step 6: Add the route**

Modify `routes/api/v1/dashboard/users.php`:
```php
old_string:
    Route::post('permissions', [PermissionController::class, 'store'])
        ->middleware('role:admin')
        ->name('dashboard.permissions.store');
new_string:
    Route::post('permissions', [PermissionController::class, 'store'])
        ->middleware('role:admin')
        ->name('dashboard.permissions.store');
    Route::patch('permissions/{name}', [PermissionController::class, 'update'])
        ->middleware('role:admin')
        ->name('dashboard.permissions.update');
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `php artisan test --compact --filter=UpdatePermissionUseCaseTest`
Expected: PASS (3 tests)

Run: `php artisan test --compact --filter=UpdatePermissionTest`
Expected: PASS (5 tests)

- [ ] **Step 8: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/User/Application/UseCases/UpdatePermissionUseCase.php \
  app/Modules/User/Presentation/Http/Requests/UpdatePermissionRequest.php \
  app/Modules/User/Presentation/Http/Controllers/PermissionController.php \
  routes/api/v1/dashboard/users.php \
  tests/Feature/Modules/User/UpdatePermissionUseCaseTest.php \
  tests/Feature/Modules/User/UpdatePermissionTest.php
git commit -m "feat(permissions): add PATCH /api/v1/dashboard/permissions/{name}"
```

---

### Task 5: `DELETE /api/v1/dashboard/permissions/{name}` (delete, no safeguard by design)

**Files:**
- Create: `app/Modules/User/Application/UseCases/DeletePermissionUseCase.php`
- Modify: `app/Modules/User/Presentation/Http/Controllers/PermissionController.php`
- Modify: `routes/api/v1/dashboard/users.php`
- Test: `tests/Feature/Modules/User/DeletePermissionUseCaseTest.php`
- Test: `tests/Feature/Modules/User/DestroyPermissionTest.php`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing (last task before final verification).

- [ ] **Step 1: Write the failing tests**

`tests/Feature/Modules/User/DeletePermissionUseCaseTest.php`:
```php
<?php

use App\Modules\User\Application\UseCases\DeletePermissionUseCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('execute deletes a permission not assigned to any role', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);

    app(DeletePermissionUseCase::class)->execute('reports.export');

    $this->assertDatabaseMissing('permissions', ['name' => 'reports.export']);
});

test('execute deletes a permission and detaches it from every role that had it', function () {
    $permission = Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);
    $role = Role::create(['name' => 'reporter', 'guard_name' => 'web']);
    $role->givePermissionTo($permission);

    app(DeletePermissionUseCase::class)->execute('reports.export');

    expect($role->fresh()->permissions)->toHaveCount(0);
});

test('execute throws when the permission does not exist', function () {
    app(DeletePermissionUseCase::class)->execute('missing.permission');
})->throws(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
```

`tests/Feature/Modules/User/DestroyPermissionTest.php`:
```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForPermissionDestroy(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $user->assignRole($role);

    return $user;
}

test('deleting a permission requires authentication', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);

    $response = $this->deleteJson('/api/v1/dashboard/permissions/reports.export');

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot delete a permission', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->deleteJson('/api/v1/dashboard/permissions/reports.export');

    $response->assertStatus(403);
});

test('a user with the admin role can delete a permission', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);
    $this->actingAs(internalAdminUserForPermissionDestroy(), 'web');

    $response = $this->deleteJson('/api/v1/dashboard/permissions/reports.export');

    $response->assertStatus(204);
    $this->assertDatabaseMissing('permissions', ['name' => 'reports.export']);
});

test('deleting a permission still assigned to a role succeeds with no block, per accepted-risk design', function () {
    $permission = Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);
    $role = Role::create(['name' => 'reporter', 'guard_name' => 'web']);
    $role->givePermissionTo($permission);
    $this->actingAs(internalAdminUserForPermissionDestroy(), 'web');

    $response = $this->deleteJson('/api/v1/dashboard/permissions/reports.export');

    $response->assertStatus(204);
    expect($role->fresh()->permissions)->toHaveCount(0);
});

test('deleting a nonexistent permission returns 404', function () {
    $this->actingAs(internalAdminUserForPermissionDestroy(), 'web');

    $response = $this->deleteJson('/api/v1/dashboard/permissions/missing.permission');

    $response->assertStatus(404);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=DeletePermissionUseCaseTest`
Expected: FAIL (class `App\Modules\User\Application\UseCases\DeletePermissionUseCase` not found)

Run: `php artisan test --compact --filter=DestroyPermissionTest`
Expected: FAIL (route `DELETE /api/v1/dashboard/permissions/{name}` not found)

- [ ] **Step 3: Implement the use case**

`app/Modules/User/Application/UseCases/DeletePermissionUseCase.php`:
```php
<?php

namespace App\Modules\User\Application\UseCases;

use Spatie\Permission\Models\Permission;

final class DeletePermissionUseCase
{
    public function execute(string $name): void
    {
        $permission = Permission::where('name', $name)->firstOrFail();
        $permission->delete();

        app_log('Permission deleted', [
            'permission_id' => $permission->id,
            'name' => $permission->name,
        ], 'info', 'user');
    }
}
```

- [ ] **Step 4: Add the `destroy` action to the controller**

Modify `app/Modules/User/Presentation/Http/Controllers/PermissionController.php`:
```php
old_string:
use App\Http\Controllers\Controller;
use App\Modules\User\Application\DTOs\PermissionData;
use App\Modules\User\Application\Queries\ListPermissionsQuery;
use App\Modules\User\Application\UseCases\CreatePermissionUseCase;
use App\Modules\User\Application\UseCases\UpdatePermissionUseCase;
use App\Modules\User\Presentation\Http\Requests\StorePermissionRequest;
use App\Modules\User\Presentation\Http\Requests\UpdatePermissionRequest;
use App\Modules\User\Presentation\Http\Resources\PermissionResource;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    public function __construct(
        private readonly ListPermissionsQuery $listPermissions,
        private readonly CreatePermissionUseCase $createPermission,
        private readonly UpdatePermissionUseCase $updatePermission,
    ) {}
new_string:
use App\Http\Controllers\Controller;
use App\Modules\User\Application\DTOs\PermissionData;
use App\Modules\User\Application\Queries\ListPermissionsQuery;
use App\Modules\User\Application\UseCases\CreatePermissionUseCase;
use App\Modules\User\Application\UseCases\DeletePermissionUseCase;
use App\Modules\User\Application\UseCases\UpdatePermissionUseCase;
use App\Modules\User\Presentation\Http\Requests\StorePermissionRequest;
use App\Modules\User\Presentation\Http\Requests\UpdatePermissionRequest;
use App\Modules\User\Presentation\Http\Resources\PermissionResource;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    public function __construct(
        private readonly ListPermissionsQuery $listPermissions,
        private readonly CreatePermissionUseCase $createPermission,
        private readonly UpdatePermissionUseCase $updatePermission,
        private readonly DeletePermissionUseCase $deletePermission,
    ) {}
```
```php
old_string:
    public function update(UpdatePermissionRequest $request, string $name): JsonResponse
    {
        $permission = $this->updatePermission->execute($name, PermissionData::from($request->validated()));

        return response()->json(['data' => new PermissionResource($permission)]);
    }
}
new_string:
    public function update(UpdatePermissionRequest $request, string $name): JsonResponse
    {
        $permission = $this->updatePermission->execute($name, PermissionData::from($request->validated()));

        return response()->json(['data' => new PermissionResource($permission)]);
    }

    public function destroy(string $name): JsonResponse
    {
        $this->deletePermission->execute($name);

        return response()->json(null, 204);
    }
}
```

- [ ] **Step 5: Add the route**

Modify `routes/api/v1/dashboard/users.php`:
```php
old_string:
    Route::patch('permissions/{name}', [PermissionController::class, 'update'])
        ->middleware('role:admin')
        ->name('dashboard.permissions.update');
new_string:
    Route::patch('permissions/{name}', [PermissionController::class, 'update'])
        ->middleware('role:admin')
        ->name('dashboard.permissions.update');
    Route::delete('permissions/{name}', [PermissionController::class, 'destroy'])
        ->middleware('role:admin')
        ->name('dashboard.permissions.destroy');
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `php artisan test --compact --filter=DeletePermissionUseCaseTest`
Expected: PASS (3 tests)

Run: `php artisan test --compact --filter=DestroyPermissionTest`
Expected: PASS (5 tests)

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/User/Application/UseCases/DeletePermissionUseCase.php \
  app/Modules/User/Presentation/Http/Controllers/PermissionController.php \
  routes/api/v1/dashboard/users.php \
  tests/Feature/Modules/User/DeletePermissionUseCaseTest.php \
  tests/Feature/Modules/User/DestroyPermissionTest.php
git commit -m "feat(permissions): add DELETE /api/v1/dashboard/permissions/{name}"
```

---

### Task 6: Full verification + SDD progress ledger update

**Files:**
- None (verification-only task, plus the ledger update below)

**Interfaces:**
- Consumes: nothing new — final task, no downstream consumers.

- [ ] **Step 1: Run the full test suite**

Run: `php artisan test --compact`
Expected: all tests pass except the pre-existing, unrelated baseline failure already documented in `D:\E-Procurement-System\.superpowers\sdd\progress.md` (root `/` 404 `ExampleTest`). No other failures.

- [ ] **Step 2: Verify the routes**

Run: `php artisan route:list --path=dashboard`
Expected: 13 dashboard routes present, including all 5 new ones — `PATCH roles/{id}`, `DELETE roles/{id}`, `POST permissions`, `PATCH permissions/{name}`, `DELETE permissions/{name}` — matching every URL in `frontend/lib/user/management/api.ts` exactly (`updateRole`, `deleteRole`, `createPermission`, `updatePermission`, `deletePermission`).

- [ ] **Step 3: Update the shared SDD progress ledger**

Append a `# Plan: backend/docs/superpowers/plans/2026-08-18-role-permission-crud-completion.md` section to `D:\E-Procurement-System\.superpowers\sdd\progress.md`, following the exact format of every other entry in that file (baseline commit, one line per task with commit range, final whole-plan review outcome once run).

---

## Self-Review Notes

- **Spec coverage:** all 5 endpoints from `docs/superpowers/specs/2026-08-18-role-permission-crud-completion-design.md` map 1:1 to Tasks 1-5 (`PATCH roles/{id}` → Task 1, `DELETE roles/{id}` → Task 2, `POST/PATCH/DELETE permissions` → Tasks 3-5). Both safeguards (role-in-use, admin-role protection) and the explicit "no safeguard" decision for permission delete/update are each covered by a dedicated test in their respective task.
- **Type consistency:** `PermissionData` (Task 3) is reused unchanged by `UpdatePermissionUseCase` (Task 4) — same two fields (`name`, `label`), same names, no drift. `AdminRoleProtectedException` (Task 1) is reused unchanged by `DeleteRoleUseCase` (Task 2) — same constructor signature (inherited from `DomainException`), same `render()` shape.
- **Test helper naming:** every new HTTP test file declares a uniquely-named `internalAdminUserFor<Action>()` helper (`ForUpdate`, `ForDestroy`, `ForPermissionStore`, `ForPermissionUpdate`, `ForPermissionDestroy`) — verified against the full existing list in `tests/Feature/Modules/User/` (`internalAdminUserForStore`, `internalAdminUser`, `actingSessionsAdmin`, `actingInternalAdmin`, `insertSessionRow`) — no collisions.
- **Route param behavior:** confirmed via `php artisan tinker` against this app's actual router that a `{name}` route parameter matches a dotted value like `vendors.view` in the last URL segment without any explicit `->where()` constraint needed (default Laravel/Symfony regex `[^/]+` has no special-cased trailing-dot exclusion in this Laravel 13 install).
