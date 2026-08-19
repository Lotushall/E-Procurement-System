# Delete User Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin soft-delete a user from the `dashboard/users` list — backend endpoint + frontend UI, both built in this plan.

**Architecture:** Soft delete via a new `deleted_at` column (Eloquent `SoftDeletes`) on the `users` table, gated behind a new `users.delete` permission. Deleting also revokes all of the target's active sessions. Self-delete is blocked with a 422. Mirrors this codebase's existing `DeleteRoleUseCase` / `RoleController::destroy` / `DeleteRoleDialog` patterns exactly.

**Tech Stack:** Laravel 12 + Pest (backend), Next.js App Router + TypeScript + `@tanstack/react-query` + Tailwind v4 + base-ui components (frontend).

## Global Constraints

- Full spec: `docs/superpowers/specs/2026-08-18-user-delete-action-design.md`.
- Monorepo root is `D:\E-Procurement-System`; this plan's file paths are given relative to that root (`backend/...`, `frontend/...`).
- Branch `Internal`, working in place, no worktree — established repo convention.
- **Commit policy for this plan (explicit user instruction, overrides the executing-skill's normal per-task auto-commit default):** at the end of each task, `git add` the exact files touched by that task only. Do **not** run `git commit`. The user reviews and commits manually when ready.
- Before staging, run `git status --short` first — a sibling backend/frontend session may have unrelated uncommitted work in the same working tree (established repo pattern). Only stage the files this task touches.
- Backend: run tests with `php artisan test <path>` (Pest). No `--filter`-only runs when a path is available — prefer the path form shown in each step.
- Frontend: no test runner exists in this repo (established convention). Verify every frontend task with `npx tsc --noEmit` and `npm run lint`; do not write jest/vitest-style tests.
- No browser automation tool (chromium-cli/Playwright) is available in this dev environment (established convention). Manual browser QA must be disclosed as unperformed/pending to the user, not silently skipped.
- Follow existing patterns exactly: mirror `DeleteRoleUseCase`/`RoleController::destroy`/`DestroyRoleTest.php` on the backend and `DeleteRoleDialog`/`useDeleteRole.ts` on the frontend — do not introduce new abstractions.

---

### Task 1: `deleted_at` column, `SoftDeletes` trait, repository `delete()`

**Files:**
- Create: `backend/database/migrations/2026_08_18_090000_add_deleted_at_to_users_table.php`
- Modify: `backend/app/Modules/User/Infrastructure/Models/User.php`
- Modify: `backend/app/Modules/User/Domain/Repositories/UserRepositoryInterface.php`
- Modify: `backend/app/Modules/User/Infrastructure/Repositories/UserRepository.php`
- Test: `backend/tests/Feature/Modules/User/UserRepositoryTest.php`

**Interfaces:**
- Produces: `UserRepositoryInterface::delete(int $id): void` — soft-deletes the user, throws `Illuminate\Database\Eloquent\ModelNotFoundException` if the id doesn't exist (or is already deleted). Consumed by Task 2's `DeleteUserUseCase`.
- Consumes: nothing new — extends the existing `UserRepository`/`UserRepositoryInterface` pair.

- [ ] **Step 1: Add the failing tests to `backend/tests/Feature/Modules/User/UserRepositoryTest.php`**

Add this import at the top, alongside the existing `use` block:

```php
use Illuminate\Database\Eloquent\ModelNotFoundException;
```

Append these two tests at the end of the file:

```php
test('delete soft-deletes the user and excludes them from default queries', function () {
    $repository = new UserRepository;
    $user = User::register('todelete', Email::fromString('todelete@example.com'), 'hashed-password', UserType::Internal);
    $saved = $repository->save($user);

    $repository->delete($saved->id());

    $this->assertSoftDeleted('users', ['id' => $saved->id()]);
    expect($repository->findByUsername('todelete'))->toBeNull();
});

test('delete throws when the user does not exist', function () {
    $repository = new UserRepository;

    $repository->delete(999999);
})->throws(ModelNotFoundException::class);
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `php artisan test tests/Feature/Modules/User/UserRepositoryTest.php`
Expected: FAIL — `Call to undefined method App\Modules\User\Infrastructure\Repositories\UserRepository::delete()`

- [ ] **Step 3: Create the migration**

Create `backend/database/migrations/2026_08_18_090000_add_deleted_at_to_users_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->softDeletes()->after('password_changed_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
```

- [ ] **Step 4: Add the `SoftDeletes` trait to the `User` model**

In `backend/app/Modules/User/Infrastructure/Models/User.php`, add the import after the existing `Illuminate\Database\Eloquent\Relations\HasOne;` import (line 19):

```php
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
```

Then change the trait-use line (line 31) from:

```php
    use HasApiTokens, HasFactory, HasRoles, HasStates, Notifiable;
```

to:

```php
    use HasApiTokens, HasFactory, HasRoles, HasStates, Notifiable, SoftDeletes;
```

- [ ] **Step 5: Add `delete()` to the repository interface**

In `backend/app/Modules/User/Domain/Repositories/UserRepositoryInterface.php`, add after `assignRole`:

```php
    public function assignRole(int $userId, string $role): void;

    public function delete(int $id): void;
}
```

- [ ] **Step 6: Implement `delete()` in the repository**

In `backend/app/Modules/User/Infrastructure/Repositories/UserRepository.php`, add after `assignRole`:

```php
    public function assignRole(int $userId, string $role): void
    {
        UserModel::findOrFail($userId)->assignRole($role);
    }

    public function delete(int $id): void
    {
        UserModel::findOrFail($id)->delete();
    }
```

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `php artisan test tests/Feature/Modules/User/UserRepositoryTest.php`
Expected: PASS (6 tests)

- [ ] **Step 8: Stage the changes**

```bash
git status --short
git add backend/database/migrations/2026_08_18_090000_add_deleted_at_to_users_table.php backend/app/Modules/User/Infrastructure/Models/User.php backend/app/Modules/User/Domain/Repositories/UserRepositoryInterface.php backend/app/Modules/User/Infrastructure/Repositories/UserRepository.php backend/tests/Feature/Modules/User/UserRepositoryTest.php
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 2: `DeleteUserUseCase`

**Files:**
- Create: `backend/app/Modules/User/Application/UseCases/DeleteUserUseCase.php`
- Test: `backend/tests/Feature/Modules/User/DeleteUserUseCaseTest.php`

**Interfaces:**
- Consumes: `UserRepositoryInterface::delete(int $id): void` (Task 1); `RevokeAllUserSessionsUseCase::execute(int $userId, ?string $keepSessionId = null): void` (existing, `backend/app/Modules/User/Application/UseCases/RevokeAllUserSessionsUseCase.php`).
- Produces: `DeleteUserUseCase::execute(int $id, int $actingUserId): ?string` — returns an error message string if blocked (self-delete), `null` on success; throws `ModelNotFoundException` if `$id` doesn't exist. Consumed by Task 3's `UserController::destroy`.

- [ ] **Step 1: Write the failing test at `backend/tests/Feature/Modules/User/DeleteUserUseCaseTest.php`**

```php
<?php

use App\Modules\User\Application\UseCases\DeleteUserUseCase;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function insertSessionRowForDeleteUseCase(string $id, int $userId): void
{
    DB::table('sessions')->updateOrInsert(['id' => $id], [
        'user_id' => $userId,
        'ip_address' => '10.0.0.5',
        'user_agent' => 'Mozilla/5.0',
        'payload' => 'x',
        'last_activity' => now()->timestamp,
    ]);
}

test('execute soft-deletes the target user and revokes all of their sessions', function () {
    $actor = User::factory()->create(['user_type' => 'internal']);
    $target = User::factory()->create(['user_type' => 'internal']);
    insertSessionRowForDeleteUseCase('target-session', $target->id);

    $result = app(DeleteUserUseCase::class)->execute($target->id, $actor->id);

    expect($result)->toBeNull();
    $this->assertSoftDeleted('users', ['id' => $target->id]);
    expect(DB::table('sessions')->where('user_id', $target->id)->exists())->toBeFalse();
});

test('execute returns an error message instead of deleting when the target is the acting user', function () {
    $actor = User::factory()->create(['user_type' => 'internal']);

    $result = app(DeleteUserUseCase::class)->execute($actor->id, $actor->id);

    expect($result)->toBe('ไม่สามารถลบบัญชีของตัวเองได้');
    $this->assertDatabaseHas('users', ['id' => $actor->id, 'deleted_at' => null]);
});

test('execute throws when the target user does not exist', function () {
    $actor = User::factory()->create(['user_type' => 'internal']);

    app(DeleteUserUseCase::class)->execute(999999, $actor->id);
})->throws(ModelNotFoundException::class);
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `php artisan test tests/Feature/Modules/User/DeleteUserUseCaseTest.php`
Expected: FAIL — `Class "App\Modules\User\Application\UseCases\DeleteUserUseCase" not found`

- [ ] **Step 3: Implement `DeleteUserUseCase`**

Create `backend/app/Modules/User/Application/UseCases/DeleteUserUseCase.php`:

```php
<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use Illuminate\Support\Facades\DB;

final class DeleteUserUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly RevokeAllUserSessionsUseCase $revokeAllSessions,
    ) {}

    /**
     * @return string|null an error message if the delete was blocked, null on success
     */
    public function execute(int $id, int $actingUserId): ?string
    {
        if ($id === $actingUserId) {
            return 'ไม่สามารถลบบัญชีของตัวเองได้';
        }

        return DB::transaction(function () use ($id): ?string {
            $this->users->delete($id);

            $this->revokeAllSessions->execute($id);

            app_log('User deleted', ['user_id' => $id], 'info', 'user');

            return null;
        });
    }
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `php artisan test tests/Feature/Modules/User/DeleteUserUseCaseTest.php`
Expected: PASS (3 tests)

- [ ] **Step 5: Stage the changes**

```bash
git status --short
git add backend/app/Modules/User/Application/UseCases/DeleteUserUseCase.php backend/tests/Feature/Modules/User/DeleteUserUseCaseTest.php
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 3: Permission, route, controller `destroy`, HTTP test

**Note on file location:** a parallel sibling session restructured the dashboard user routes shortly before this plan was written — the old flat `backend/routes/api/v1/dashboard/users.php` no longer exists; it is now `backend/routes/api/v1/dashboard/user-management/users.php`, using a nested `Route::prefix('users')->group(...)` with relative paths (`/`, `/{id}`, ...) instead of the old flat `users/{id}` strings. Step 4 below targets the new location and syntax. If this file has moved again by the time this task is dispatched, stop and report NEEDS_CONTEXT rather than guessing.

**Files:**
- Modify: `backend/database/seeders/AdminUserSeeder.php`
- Modify: `backend/routes/api/v1/dashboard/user-management/users.php`
- Modify: `backend/app/Modules/User/Presentation/Http/Controllers/UserController.php`
- Test: `backend/tests/Feature/Modules/User/DestroyUserTest.php`

**Interfaces:**
- Consumes: `DeleteUserUseCase::execute(int $id, int $actingUserId): ?string` (Task 2).
- Produces: `DELETE /api/v1/dashboard/users/{id}` — `204` on success, `422` with `{"message": "..."}` when blocked (self-delete), `403` without the `users.delete` permission, `401` unauthenticated, `404` when the user doesn't exist. Consumed by Task 4's frontend `deleteUser`.

- [ ] **Step 1: Write the failing HTTP test at `backend/tests/Feature/Modules/User/DestroyUserTest.php`**

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForUserDestroy(): User
{
    $admin = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'users.delete', 'guard_name' => 'web']));
    $admin->assignRole($role);

    return $admin;
}

test('deleting a user requires authentication', function () {
    $target = User::factory()->create(['user_type' => 'internal']);

    $response = $this->deleteJson("/api/v1/dashboard/users/{$target->id}");

    $response->assertStatus(401);
});

test('an internal user without the users.delete permission cannot delete a user', function () {
    $target = User::factory()->create(['user_type' => 'internal']);
    $actor = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($actor, 'web');

    $response = $this->deleteJson("/api/v1/dashboard/users/{$target->id}");

    $response->assertStatus(403);
});

test('a user with the users.delete permission can delete another user', function () {
    $target = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs(internalAdminUserForUserDestroy(), 'web');

    $response = $this->deleteJson("/api/v1/dashboard/users/{$target->id}");

    $response->assertStatus(204);
    $this->assertSoftDeleted('users', ['id' => $target->id]);
});

test('a soft-deleted user no longer appears in the users index', function () {
    $target = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs(internalAdminUserForUserDestroy(), 'web');

    $this->deleteJson("/api/v1/dashboard/users/{$target->id}")->assertStatus(204);

    $response = $this->getJson('/api/v1/dashboard/users');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('id'))->not->toContain($target->id);
});

test('deleting a user revokes all of their sessions', function () {
    $target = User::factory()->create(['user_type' => 'internal']);
    DB::table('sessions')->insert([
        'id' => 'target-session-http',
        'user_id' => $target->id,
        'ip_address' => '10.0.0.5',
        'user_agent' => 'Mozilla/5.0',
        'payload' => 'x',
        'last_activity' => now()->timestamp,
    ]);
    $this->actingAs(internalAdminUserForUserDestroy(), 'web');

    $this->deleteJson("/api/v1/dashboard/users/{$target->id}")->assertStatus(204);

    expect(DB::table('sessions')->where('id', 'target-session-http')->exists())->toBeFalse();
});

test('deleting your own account is rejected with 422', function () {
    $admin = internalAdminUserForUserDestroy();
    $this->actingAs($admin, 'web');

    $response = $this->deleteJson("/api/v1/dashboard/users/{$admin->id}");

    $response->assertStatus(422)->assertJson(['message' => 'ไม่สามารถลบบัญชีของตัวเองได้']);
    $this->assertDatabaseHas('users', ['id' => $admin->id, 'deleted_at' => null]);
});

test('deleting a nonexistent user returns 404', function () {
    $this->actingAs(internalAdminUserForUserDestroy(), 'web');

    $response = $this->deleteJson('/api/v1/dashboard/users/999999');

    $response->assertStatus(404);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `php artisan test tests/Feature/Modules/User/DestroyUserTest.php`
Expected: FAIL — first test gets a 404 (route not found) instead of 401

- [ ] **Step 3: Seed the `users.delete` permission**

In `backend/database/seeders/AdminUserSeeder.php`, add to the `givePermissionTo([...])` array, after `users.updateStatus`:

```php
            Permission::updateOrCreate(['name' => 'users.updateStatus', 'guard_name' => 'web'], ['label' => 'เปลี่ยนสถานะ user']),
            Permission::updateOrCreate(['name' => 'users.delete', 'guard_name' => 'web'], ['label' => 'ลบ user']),
```

- [ ] **Step 4: Add the route**

In `backend/routes/api/v1/dashboard/user-management/users.php`, add after the `show` route (before the `sessions` routes), matching the file's existing nested-prefix, relative-path style:

```php
        Route::get('/{id}', [UserController::class, 'show'])
            ->middleware('can:users.viewAny')
            ->whereNumber('id')
            ->name('dashboard.users.show');

        Route::delete('/{id}', [UserController::class, 'destroy'])
            ->middleware('can:users.delete')
            ->whereNumber('id')
            ->name('dashboard.users.destroy');

        Route::get('/{id}/sessions', [UserController::class, 'sessions'])
```

- [ ] **Step 5: Add `destroy` to `UserController`**

In `backend/app/Modules/User/Presentation/Http/Controllers/UserController.php`, add the import:

```php
use App\Modules\User\Application\UseCases\DeleteUserUseCase;
use App\Modules\User\Application\UseCases\RevokeAllUserSessionsUseCase;
```

Add the constructor param, after `revokeAllUserSessions`:

```php
    public function __construct(
        private readonly ListUsersQuery $listUsers,
        private readonly GetUserByIdQuery $getUserById,
        private readonly ListUserSessionsQuery $listUserSessions,
        private readonly RevokeUserSessionUseCase $revokeUserSession,
        private readonly RevokeAllUserSessionsUseCase $revokeAllUserSessions,
        private readonly DeleteUserUseCase $deleteUser,
    ) {}
```

Add the method, after `revokeAllSessions`:

```php
    public function destroy(int $id, Request $request): JsonResponse
    {
        $message = $this->deleteUser->execute($id, $request->user()->id);

        if ($message !== null) {
            return response()->json(['message' => $message], 422);
        }

        return response()->json(null, 204);
    }
```

- [ ] **Step 6: Run the test and confirm it passes**

Run: `php artisan test tests/Feature/Modules/User/DestroyUserTest.php`
Expected: PASS (7 tests)

- [ ] **Step 7: Run the full backend suite to check for regressions**

Run: `php artisan test`
Expected: PASS, no new failures

- [ ] **Step 8: Stage the changes**

```bash
git status --short
git add backend/database/seeders/AdminUserSeeder.php backend/routes/api/v1/dashboard/user-management/users.php backend/app/Modules/User/Presentation/Http/Controllers/UserController.php backend/tests/Feature/Modules/User/DestroyUserTest.php
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 4: Frontend `deleteUser` API call and `useDeleteUser` mutation

**Files:**
- Modify: `frontend/lib/user/management/api.ts`
- Create: `frontend/lib/user/management/mutations/useDeleteUser.ts`

**Interfaces:**
- Consumes: `DELETE /api/v1/dashboard/users/{id}` (Task 3); `useInvalidateUsers()` (existing, `frontend/lib/user/management/mutations/useInvalidateUsers.ts`).
- Produces: `deleteUser(id: number): Promise<void>`; `useDeleteUser(): UseMutationResult<void, unknown, number>`. Consumed by Task 5's `DeleteUserDialog`.

- [ ] **Step 1: Add `deleteUser` to `frontend/lib/user/management/api.ts`**

Add after `deletePermission` (end of file):

```ts
export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/api/v1/dashboard/users/${id}`);
}
```

- [ ] **Step 2: Create `frontend/lib/user/management/mutations/useDeleteUser.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { deleteUser } from "@/lib/user/management/api";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useDeleteUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSettled: invalidate,
  });
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no new errors

Run: `npm run lint`
Expected: no new errors

- [ ] **Step 4: Stage the changes**

```bash
git status --short
git add frontend/lib/user/management/api.ts frontend/lib/user/management/mutations/useDeleteUser.ts
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 5: `DeleteUserDialog` component

**Files:**
- Create: `frontend/app/dashboard/users/_components/table/delete-user-dialog.tsx`

**Interfaces:**
- Consumes: `useDeleteUser()` (Task 4); `useUser()` (existing, `frontend/lib/auth/queries/useUser.ts`, returns `{ data: { id: number; ... } | undefined }`); `UserListItem` type (existing, `frontend/lib/user/management/types.ts`, has `id: number` and `username: string`); `AlertDialog*` (existing, `frontend/components/ui/alert-dialog.tsx`); `Tooltip`/`TooltipContent`/`TooltipTrigger` (existing, `frontend/components/ui/tooltip.tsx`); `Button` (existing, `frontend/components/ui/button.tsx`).
- Produces: `DeleteUserDialog({ user: UserListItem }): JSX.Element` — a named export. Consumed by Task 6's `columns.tsx`.

- [ ] **Step 1: Create `frontend/app/dashboard/users/_components/table/delete-user-dialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUser } from "@/lib/auth/queries/useUser";
import { useDeleteUser } from "@/lib/user/management/mutations/useDeleteUser";
import type { UserListItem } from "@/lib/user/management/types";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ลบผู้ใช้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function DeleteUserDialog({ user }: { user: UserListItem }) {
  const [open, setOpen] = useState(false);
  const { data: currentUser } = useUser();
  const deleteUserMutation = useDeleteUser();
  const disabledReason =
    currentUser?.id === user.id ? "ไม่สามารถลบบัญชีของตัวเองได้" : undefined;

  const handleDelete = () => {
    toast.promise(deleteUserMutation.mutateAsync(user.id), {
      loading: "กำลังลบผู้ใช้...",
      success: () => {
        setOpen(false);
        return "ลบผู้ใช้สำเร็จ";
      },
      error: getErrorMessage,
    });
  };

  const trigger = (
    <AlertDialogTrigger
      render={
        <Button
          variant="outline"
          aria-label="ลบ user"
          disabled={!!disabledReason}
          className="size-8 px-1.5 pt-px rounded-md bg-white disabled:cursor-not-allowed"
        />
      }
    >
      <Trash2 className="w-4 h-4 text-red-600" />
    </AlertDialogTrigger>
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {disabledReason ? (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" tabIndex={0} />}>
            {trigger}
          </TooltipTrigger>
          <TooltipContent>{disabledReason}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบผู้ใช้</AlertDialogTitle>
          <AlertDialogDescription>
            ต้องการลบผู้ใช้ &quot;{user.username}&quot; ใช่หรือไม่?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteUserMutation.isPending}
            className="bg-red-700 text-white hover:bg-red-600"
            onClick={handleDelete}
          >
            ลบผู้ใช้
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no new errors (existing errors, if any, are pre-existing and unrelated — see task's own diff only)

Run: `npm run lint`
Expected: no new errors

- [ ] **Step 3: Stage the changes**

```bash
git status --short
git add frontend/app/dashboard/users/_components/table/delete-user-dialog.tsx
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 6: Wire the delete button into the users table, manual QA

**Files:**
- Modify: `frontend/app/dashboard/users/_components/table/columns.tsx`
- Modify: `frontend/app/dashboard/users/page.tsx`

**Interfaces:**
- Consumes: `DeleteUserDialog({ user: UserListItem })` (Task 5); `useHasPermission(permission: string): boolean` (existing, `frontend/lib/auth/permissions.ts`).
- Produces: nothing new — terminal task, wires everything together in the UI.

- [ ] **Step 1: Import `DeleteUserDialog` and extend `createColumns` in `columns.tsx`**

In `frontend/app/dashboard/users/_components/table/columns.tsx`, add the import after the existing `routes` import:

```tsx
import { routes } from "@/lib/routes"
import { getInitials } from "@/lib/utils"
import { DeleteUserDialog } from "./delete-user-dialog"
```

Change the function signature from:

```tsx
export function createColumns(canUpdateStatus: boolean, canUpdateUser: boolean): ColumnDef<UserListItem>[] {
```

to:

```tsx
export function createColumns(
    canUpdateStatus: boolean,
    canUpdateUser: boolean,
    canDeleteUser: boolean,
): ColumnDef<UserListItem>[] {
```

- [ ] **Step 2: Add the delete button to the Actions cell**

Change the actions cell from:

```tsx
            cell: ({ row }) => (
                <div className="flex justify-center gap-1.5">
                    <Button
                        variant="outline"
                        render={<Link href={routes.dashboards.user.detail(row.original.id)} />}
                        nativeButton={false}
                        className="size-8 px-1.5 pt-px rounded-md bg-white"
                    >
                        <Eye className="w-4 h-4 text-gray-500" />
                    </Button>
                    {canUpdateUser && (
                        <Button
                            variant="outline"
                            render={<Link href={routes.dashboards.user.edit(row.original.id)} />}
                            nativeButton={false}
                            aria-label="แก้ไข user"
                            className="size-8 px-1.5 pt-px rounded-md bg-white"
                        >
                            <Pencil className="w-4 h-4 text-gray-500" />
                        </Button>
                    )}
                </div>
            ),
```

to:

```tsx
            cell: ({ row }) => (
                <div className="flex justify-center gap-1.5">
                    <Button
                        variant="outline"
                        render={<Link href={routes.dashboards.user.detail(row.original.id)} />}
                        nativeButton={false}
                        className="size-8 px-1.5 pt-px rounded-md bg-white"
                    >
                        <Eye className="w-4 h-4 text-gray-500" />
                    </Button>
                    {canUpdateUser && (
                        <Button
                            variant="outline"
                            render={<Link href={routes.dashboards.user.edit(row.original.id)} />}
                            nativeButton={false}
                            aria-label="แก้ไข user"
                            className="size-8 px-1.5 pt-px rounded-md bg-white"
                        >
                            <Pencil className="w-4 h-4 text-gray-500" />
                        </Button>
                    )}
                    {canDeleteUser && <DeleteUserDialog user={row.original} />}
                </div>
            ),
```

- [ ] **Step 3: Wire `canDeleteUser` in `page.tsx`**

In `frontend/app/dashboard/users/page.tsx`, change:

```tsx
  const canCreateUser = useHasPermission("users.create");
  const canUpdateStatus = useHasPermission("users.updateStatus");
  const canUpdateUser = useHasPermission("users.update");
  const canManageRoles = useHasRole("admin");
  const columns = useMemo(
    () => createColumns(canUpdateStatus, canUpdateUser),
    [canUpdateStatus, canUpdateUser],
  );
```

to:

```tsx
  const canCreateUser = useHasPermission("users.create");
  const canUpdateStatus = useHasPermission("users.updateStatus");
  const canUpdateUser = useHasPermission("users.update");
  const canDeleteUser = useHasPermission("users.delete");
  const canManageRoles = useHasRole("admin");
  const columns = useMemo(
    () => createColumns(canUpdateStatus, canUpdateUser, canDeleteUser),
    [canUpdateStatus, canUpdateUser, canDeleteUser],
  );
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no new errors

Run: `npm run lint`
Expected: no new errors

- [ ] **Step 5: Disclose manual QA (not automated — no browser tool available in this environment)**

List these steps for the user to verify by hand:
1. Log in as a user with `users.delete` (e.g. the seeded `admin@example.com`) → open `dashboard/users` → every row except the logged-in admin's own row shows a red trash-icon button next to view/edit.
2. Click delete on another user → confirm in the dialog → toast shows "ลบผู้ใช้สำเร็จ" → the row disappears from the table without a page reload.
3. On the logged-in admin's own row, the trash button is disabled and hovering shows the tooltip "ไม่สามารถลบบัญชีของตัวเองได้".
4. Log in as a user without `users.delete` → open `dashboard/users` → no trash button appears in any row.
5. Check both light and dark mode for the button and dialog.

- [ ] **Step 6: Stage the changes**

```bash
git status --short
git add frontend/app/dashboard/users/_components/table/columns.tsx frontend/app/dashboard/users/page.tsx
```

Do not run `git commit` — stage only, per this plan's commit policy.
