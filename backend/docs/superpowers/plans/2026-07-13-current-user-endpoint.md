# Current User Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /api/v1/auth/user`, returning the currently-authenticated user's profile plus their roles and permissions.

**Architecture:** A single `AuthController::user()` method reads `$request->user()` (the Eloquent `User` model already resolved by the `auth:sanctum` middleware) directly — no Application-layer UseCase, since there is no business rule to enforce, only a read of already-authenticated session data. Roles/permissions come from the `spatie/laravel-permission` `HasRoles` trait already attached to the `User` model.

**Tech Stack:** Laravel 13, Sanctum v4 (SPA session-cookie, guard `web`), spatie/laravel-permission, Pest v4.

## Global Constraints

- PHP 8.4 — explicit return types on every method.
- Follow existing module structure: `app/Modules/Auth/Presentation/Http/Controllers` — do not create new base folders, do not touch `app/Modules/User/Presentation/Http/Controllers/UserController.php` (unrelated scaffold, out of scope).
- Session-cookie auth only (Sanctum SPA, guard `web`) — this route requires `auth:sanctum` middleware, same as the existing `auth.logout` route.
- After modifying any PHP file, run `vendor/bin/pint --dirty --format agent` before committing.
- Run tests with `php artisan test --compact --filter=<name>`.

---

### Task 1: `GET /api/v1/auth/user`

**Files:**
- Modify: `app/Modules/Auth/Presentation/Http/Controllers/AuthController.php`
- Modify: `routes/api/v1/auth.php`
- Test: `tests/Feature/Modules/Auth/CurrentUserTest.php` (new)

**Interfaces:**
- Produces: route `auth.user` (`GET /api/v1/auth/user`, middleware `auth:sanctum`), `AuthController::user(Request $request): JsonResponse`.

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/Modules/Auth/CurrentUserTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('an authenticated user can fetch their own profile with empty roles and permissions', function () {
    $user = UserModel::factory()->create([
        'username' => 'jdoe',
        'email' => 'jdoe@example.com',
    ]);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/auth/user');

    $response->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.username', 'jdoe')
        ->assertJsonPath('data.email', 'jdoe@example.com')
        ->assertJsonPath('data.userType', $user->user_type->value)
        ->assertJsonPath('data.roles', [])
        ->assertJsonPath('data.permissions', []);
});

test('an authenticated user sees their assigned roles and permissions', function () {
    $user = UserModel::factory()->create();
    $permission = Permission::create(['name' => 'users.view']);
    $role = Role::create(['name' => 'admin']);
    $role->givePermissionTo($permission);
    $user->assignRole($role);

    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/auth/user');

    $response->assertOk()
        ->assertJsonPath('data.roles', ['admin'])
        ->assertJsonPath('data.permissions', ['users.view']);
});

test('fetching the current user requires authentication', function () {
    $response = $this->getJson('/api/v1/auth/user');

    $response->assertStatus(401);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact --filter=CurrentUserTest`
Expected: FAIL — 404 Not Found (route `auth.user` does not exist yet)

- [ ] **Step 3: Add the route**

In `routes/api/v1/auth.php`, add this route inside the `Route::prefix('auth')->group(function () { ... })` block, right after the `logout` route:

```php
    Route::get('user', [AuthController::class, 'user'])
        ->middleware('auth:sanctum')
        ->name('auth.user');
```

- [ ] **Step 4: Implement `AuthController::user()`**

In `app/Modules/Auth/Presentation/Http/Controllers/AuthController.php`:

1. Add this import alongside the existing `use` statements:

```php
use Illuminate\Http\Request;
```

2. Add this method (after `logout()`):

```php
    public function user(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'userType' => $user->user_type->value,
                'roles' => $user->getRoleNames(),
                'permissions' => $user->getPermissionNames(),
            ],
        ]);
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `php artisan test --compact --filter=CurrentUserTest`
Expected: PASS (3 passed)

- [ ] **Step 6: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Auth/Presentation/Http/Controllers/AuthController.php routes/api/v1/auth.php tests/Feature/Modules/Auth/CurrentUserTest.php
git commit -m "feat(auth): add GET /api/v1/auth/user with roles and permissions"
```

- [ ] **Step 7: Run the full suite to confirm no regressions**

Run: `php artisan test --compact`
Expected: same pass count as before this task, plus these 3 new tests passing (the one pre-existing unrelated `ExampleTest` failure — root `/` route 404 — is not something to fix here).
