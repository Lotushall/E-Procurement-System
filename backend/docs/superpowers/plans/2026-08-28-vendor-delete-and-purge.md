# Vendor Delete + Soft-Delete Auto-Purge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Admin delete a vendor from the Vendor dashboard (soft-deletes the linked user account, keeps profile/document data for audit), and add a daily scheduled job that permanently purges any user account (vendor or internal) soft-deleted for more than 30 days.

**Architecture:** Vendor delete reuses the existing `UserRepository::delete()` soft-delete mechanism (already mutates username/email so they can be reused) via a new `DeleteVendorProfileUseCase`. The vendor list/count queries are updated to exclude vendors whose linked user is gone. The 30-day purge is a new `PurgeSoftDeletedUsersUseCase` in the User module, invoked by a new Artisan command scheduled daily, that force-deletes overdue soft-deleted users — the database's existing `cascadeOnDelete()` foreign keys clean up `vendor_profiles`/detail/document/contact rows automatically (a linked `internal_profiles` row is `nullOnDelete()` instead, so it survives with `user_id` set to `null`, same as the existing internal-profile-delete flow). Uploaded vendor document files must be deleted from storage *before* that force-delete, since the DB-level cascade does not go through Eloquent and there is no way to recover the file paths afterward.

**Tech Stack:** Laravel 13, PHP 8.4, Pest v4, spatie/laravel-permission.

## Global Constraints

- New permission is named `vendors.delete`, following the existing `vendors.viewAny`/`vendors.review` naming (see `database/seeders/AdminUserSeeder.php`). Note: `vendors.view` was renamed to `vendors.viewAny` as part of this work (see the migration `rename_vendors_view_permission_to_vendors_view_any`) — the original name never matched the `can:vendors.viewAny` route middleware it was meant to satisfy, so `GET /vendors` and `GET /vendors/{id}` were 403 for every internal user before this fix.
- Cross-module Application-layer use cases may depend on another module's Domain-layer repository interface (e.g. `UserRepositoryInterface`, `VendorRepositoryInterface`) directly. `DeleteInternalProfileUseCase` also depends on `RevokeAllUserSessionsUseCase`, another module's Application-layer class — that specific dependency is accepted precedent, but it should not be read as license to reach into an arbitrary Application-layer class of another module; prefer the Domain-layer interface whenever it's sufficient, as `DeleteVendorProfileUseCase` and `PurgeSoftDeletedUsersUseCase` both do (aside from the same `RevokeAllUserSessionsUseCase` reuse in `DeleteVendorProfileUseCase`).
- `vendor_profiles.user_id`, `vendor_company_details.vendor_profile_id`, `vendor_individual_details.vendor_profile_id`, `vendor_documents.vendor_profile_id`, and `vendor_contact.vendor_profile_id` are all `cascadeOnDelete()` at the database level (`database/migrations/0001_01_01_000000_create_users_table.php`, `database/migrations/2026_07_15_143235_create_vendor_contact_table.php`). This cascade happens inside the database engine and does not fire Eloquent model events — do not rely on Eloquent hooks for cleanup of these child rows, and always read anything needed from them (like `vendor_documents.file_path`) *before* force-deleting the parent `users` row. `internal_profiles.user_id` is **not** part of this cascade — a later migration (`database/migrations/2026_08_25_134436_update_internal_profiles_make_user_id_nullable.php`) changed it to `nullOnDelete()`, so force-deleting a user with a linked internal profile leaves the profile row intact with `user_id` set to `null` (the same state the existing internal-profile-delete cascade already produces via `unlinkFromUser()`), not deleted.
- The 30-day retention period is a hardcoded constant (`RETENTION_DAYS = 30`), not a config value — this was an explicit scope decision, not an oversight.
- Backend only. No frontend changes in this plan.

---

### Task 1: Delete vendor — permission, policy, route, use case, controller

**Files:**
- Modify: `database/seeders/AdminUserSeeder.php`
- Modify: `database/factories/UserFactory.php`
- Modify: `app/Modules/Vendor/Presentation/Policies/VendorProfilePolicy.php`
- Modify: `routes/api/v1/dashboard/vendors.php`
- Create: `app/Modules/Vendor/Application/Dashboard/UseCases/DeleteVendorProfileUseCase.php`
- Modify: `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`
- Test: `tests/Feature/Modules/Vendor/DestroyVendorTest.php`
- Test: `tests/Feature/Modules/Vendor/DeleteVendorProfileUseCaseTest.php`

**Interfaces:**
- Produces: `DeleteVendorProfileUseCase::execute(int $vendorProfileId, int $actingUserId): void` — throws `Illuminate\Database\Eloquent\ModelNotFoundException` if the vendor profile does not exist. Later tasks do not consume this directly.
- Consumes: `VendorRepositoryInterface::findProfileById(int $id): ?VendorProfile` and `VendorProfile::userId(): int` (both already exist), `UserRepositoryInterface::delete(int $id): void` (already exists, already mutates username/email before soft-deleting), `RevokeAllUserSessionsUseCase::execute(int $userId, ?string $keepSessionId = null): void` (already exists).

- [ ] **Step 1: Write the failing HTTP test**

Create `tests/Feature/Modules/Vendor/DestroyVendorTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('deleting a vendor requires authentication', function () {
    $profile = VendorProfiles::factory()->create();

    $response = $this->deleteJson("/api/v1/vendors/{$profile->id}");

    $response->assertStatus(401);
});

test('a vendor user cannot delete a vendor', function () {
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $profile = VendorProfiles::factory()->create();
    $this->actingAs($vendorUser, 'web');

    $response = $this->deleteJson("/api/v1/vendors/{$profile->id}");

    $response->assertStatus(403);
});

test('an internal user without the vendors.delete permission cannot delete a vendor', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();
    $this->actingAs($internalUser, 'web');

    $response = $this->deleteJson("/api/v1/vendors/{$profile->id}");

    $response->assertStatus(403);
});

test('an internal user can delete a vendor', function () {
    $internalUser = User::factory()->internal()->create();
    $profile = VendorProfiles::factory()->create();
    $vendorUserId = $profile->user_id;
    $this->actingAs($internalUser, 'web');

    $response = $this->deleteJson("/api/v1/vendors/{$profile->id}");

    $response->assertStatus(204);
    $this->assertSoftDeleted('users', ['id' => $vendorUserId]);
    $this->assertDatabaseHas('vendor_profiles', ['id' => $profile->id]);
});

test('deleting a vendor revokes the linked user account sessions', function () {
    $internalUser = User::factory()->internal()->create();
    $profile = VendorProfiles::factory()->create();
    DB::table('sessions')->insert([
        'id' => 'vendor-delete-session',
        'user_id' => $profile->user_id,
        'ip_address' => '10.0.0.6',
        'user_agent' => 'Mozilla/5.0',
        'payload' => 'x',
        'last_activity' => now()->timestamp,
    ]);
    $this->actingAs($internalUser, 'web');

    $this->deleteJson("/api/v1/vendors/{$profile->id}")->assertStatus(204);

    expect(DB::table('sessions')->where('id', 'vendor-delete-session')->exists())->toBeFalse();
});

test('deleting a vendor frees its username and email for reuse', function () {
    $internalUser = User::factory()->internal()->create();
    $vendorUser = User::factory()->create([
        'user_type' => 'company',
        'username' => 'reusable',
        'email' => 'reusable@example.com',
    ]);
    $profile = VendorProfiles::factory()->create(['user_id' => $vendorUser->id]);
    $this->actingAs($internalUser, 'web');

    $this->deleteJson("/api/v1/vendors/{$profile->id}")->assertStatus(204);

    $this->assertDatabaseMissing('users', ['id' => $vendorUser->id, 'username' => 'reusable']);
    $newUser = User::factory()->create(['username' => 'reusable', 'email' => 'reusable@example.com']);
    expect($newUser->id)->not->toBe($vendorUser->id);
});

test('deleting a nonexistent vendor returns 404', function () {
    $internalUser = User::factory()->internal()->create();
    $this->actingAs($internalUser, 'web');

    $response = $this->deleteJson('/api/v1/vendors/999999');

    $response->assertStatus(404);
});
```

Also create `tests/Feature/Modules/Vendor/DeleteVendorProfileUseCaseTest.php` (mirrors the existing `ApproveVendorProfileUseCaseTest.php` pattern — this codebase tests both the HTTP layer and the use case directly for each vendor dashboard action):

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\Dashboard\UseCases\DeleteVendorProfileUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function deleteVendorProfileUseCase(): DeleteVendorProfileUseCase
{
    return app(DeleteVendorProfileUseCase::class);
}

test('execute soft-deletes the linked user account', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    deleteVendorProfileUseCase()->execute($profile->id, $internalUser->id);

    $this->assertSoftDeleted('users', ['id' => $profile->user_id]);
    $this->assertDatabaseHas('vendor_profiles', ['id' => $profile->id]);
});

test('execute revokes the linked user account sessions', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    DB::table('sessions')->insert([
        'id' => 'use-case-session',
        'user_id' => $profile->user_id,
        'ip_address' => '10.0.0.7',
        'user_agent' => 'Mozilla/5.0',
        'payload' => 'x',
        'last_activity' => now()->timestamp,
    ]);

    deleteVendorProfileUseCase()->execute($profile->id, $internalUser->id);

    expect(DB::table('sessions')->where('id', 'use-case-session')->exists())->toBeFalse();
});

test('execute throws when the vendor profile does not exist', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => deleteVendorProfileUseCase()->execute(999999, $internalUser->id))
        ->toThrow(ModelNotFoundException::class);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact --filter=DestroyVendorTest`
Expected: FAIL — route `vendors/{id}` DELETE does not exist (404/`RouteNotFoundException` from `deleteJson`, or Pest reporting no matching route).

Run: `php artisan test --compact --filter=DeleteVendorProfileUseCaseTest`
Expected: FAIL — class `DeleteVendorProfileUseCase` does not exist.

- [ ] **Step 3: Add the `vendors.delete` permission to the seeder**

In `database/seeders/AdminUserSeeder.php`, add a line to the `$admin->givePermissionTo([...])` array, right after the `vendors.review` line:

```php
            Permission::updateOrCreate(['name' => 'vendors.view', 'guard_name' => 'web'], ['label' => 'ดูรายชื่อผู้ค้า']),
            Permission::updateOrCreate(['name' => 'vendors.review', 'guard_name' => 'web'], ['label' => 'อนุมัติ/ปฏิเสธผู้ค้า']),
            Permission::updateOrCreate(['name' => 'vendors.delete', 'guard_name' => 'web'], ['label' => 'ลบผู้ค้า']),
```

- [ ] **Step 4: Grant `vendors.delete` to the `internal()` test factory state**

In `database/factories/UserFactory.php`, add a line to `internal()`'s `afterCreating` permission list:

```php
    public function internal(): static
    {
        return $this->state(['user_type' => UserType::Internal])
            ->afterCreating(function (User $user) {
                $user->givePermissionTo([
                    Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']),
                    Permission::firstOrCreate(['name' => 'vendors.review', 'guard_name' => 'web']),
                    Permission::firstOrCreate(['name' => 'vendors.delete', 'guard_name' => 'web']),
                ]);
            });
    }
```

- [ ] **Step 5: Add the `delete` policy method**

In `app/Modules/Vendor/Presentation/Policies/VendorProfilePolicy.php`, add:

```php
    public function delete(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->can('vendors.delete');
    }
```

(placed after the existing `review()` method, inside the class)

- [ ] **Step 6: Add the route**

In `routes/api/v1/dashboard/vendors.php`, add at the end of the file:

```php
Route::delete('vendors/{id}', [VendorApprovalController::class, 'destroy'])
    ->middleware('can:vendors.delete')
    ->whereNumber('id')
    ->name('vendors.destroy');
```

- [ ] **Step 7: Create the use case**

Create `app/Modules/Vendor/Application/Dashboard/UseCases/DeleteVendorProfileUseCase.php`:

```php
<?php

namespace App\Modules\Vendor\Application\Dashboard\UseCases;

use App\Modules\User\Application\UseCases\RevokeAllUserSessionsUseCase;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class DeleteVendorProfileUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly UserRepositoryInterface $users,
        private readonly RevokeAllUserSessionsUseCase $revokeAllSessions,
    ) {}

    public function execute(int $vendorProfileId, int $actingUserId): void
    {
        $profile = $this->vendors->findProfileById($vendorProfileId);

        if ($profile === null) {
            throw new ModelNotFoundException("Vendor profile {$vendorProfileId} not found.");
        }

        $userId = $profile->userId();

        $this->users->delete($userId);
        $this->revokeAllSessions->execute($userId);

        app_log('Vendor profile deleted', [
            'vendor_profile_id' => $vendorProfileId,
            'linked_user_id' => $userId,
            'acting_user_id' => $actingUserId,
        ], 'info', 'vendor');
    }
}
```

- [ ] **Step 8: Wire the controller**

In `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`:

Add imports:

```php
use App\Modules\Vendor\Application\Dashboard\UseCases\DeleteVendorProfileUseCase;
use Illuminate\Http\Request;
```

Add to the constructor promoted properties (after `private readonly PendingVendorDocumentUseCase $pendingVendorDocument,`):

```php
        private readonly DeleteVendorProfileUseCase $deleteVendorProfile,
```

Add the method (after `pending()`, before `approveDocument()` — or anywhere in the class body):

```php
    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->deleteVendorProfile->execute($id, $request->user()->id);

        return response()->json(null, 204);
    }
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `php artisan test --compact --filter=DestroyVendorTest`
Expected: PASS (7/7)

Run: `php artisan test --compact --filter=DeleteVendorProfileUseCaseTest`
Expected: PASS (3/3)

- [ ] **Step 10: Run Pint and the full Vendor + User test suites**

Run: `vendor/bin/pint --dirty --format agent`
Run: `php artisan test --compact tests/Feature/Modules/Vendor tests/Feature/Modules/User`
Expected: all pass, no formatting changes needed beyond auto-fix.

- [ ] **Step 11: Commit**

```bash
git add database/seeders/AdminUserSeeder.php database/factories/UserFactory.php app/Modules/Vendor/Presentation/Policies/VendorProfilePolicy.php routes/api/v1/dashboard/vendors.php app/Modules/Vendor/Application/Dashboard/UseCases/DeleteVendorProfileUseCase.php app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php tests/Feature/Modules/Vendor/DestroyVendorTest.php tests/Feature/Modules/Vendor/DeleteVendorProfileUseCaseTest.php
git commit -m "feat(vendor): add admin vendor delete endpoint"
```

---

### Task 2: Exclude deleted vendors from list/counts, fix resource null-safety

**Files:**
- Modify: `app/Modules/Vendor/Application/Dashboard/Queries/ListVendorProfilesQuery.php`
- Modify: `app/Modules/Vendor/Application/Dashboard/Queries/CountVendorProfilesByStatusQuery.php`
- Modify: `app/Modules/Vendor/Presentation/Http/Resources/VendorProfileResource.php`
- Test: `tests/Feature/Modules/Vendor/ListVendorsTest.php` (append)
- Test: `tests/Feature/Modules/Vendor/ShowVendorTest.php` (append)

**Interfaces:**
- Consumes: `VendorProfiles::VendorProfilesUser()` (`belongsTo(User::class, 'user_id')`, already exists) — relies on `User`'s existing `SoftDeletes` global scope to exclude trashed users from `whereHas`.

- [ ] **Step 1: Write the failing tests**

In `tests/Feature/Modules/Vendor/ListVendorsTest.php`, add the import:

```php
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
```

and add these two tests at the end of the file:

```php
test('a vendor whose linked user was deleted is excluded from the list', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $repository->saveProfile(VendorProfile::create(userId: $vendorUser->id));
    app(UserRepositoryInterface::class)->delete($vendorUser->id);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors');

    $response->assertOk()->assertJsonCount(0, 'data');
});

test('status counts exclude vendors whose linked user was deleted', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $repository->saveProfile(VendorProfile::create(userId: $vendorUser->id));
    app(UserRepositoryInterface::class)->delete($vendorUser->id);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors');

    $response->assertOk()->assertJsonPath('meta.counts.total', 0);
});
```

In `tests/Feature/Modules/Vendor/ShowVendorTest.php`, add the import:

```php
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
```

and add this test at the end of the file:

```php
test('fetching a vendor whose linked user was deleted returns the profile with a null user', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    $companyUser = User::factory()->create(['user_type' => 'company']);
    $companyProfile = $repository->saveProfile(VendorProfile::create(userId: $companyUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $companyProfile->id(),
        companyName: 'Deleted Vendor Co.',
        businessRegistrationNo: '9990001112223',
        taxId: TaxId::fromString('9990001112223'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));
    app(UserRepositoryInterface::class)->delete($companyUser->id);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson("/api/v1/vendors/{$companyProfile->id()}");

    $response->assertOk()
        ->assertJsonPath('data.id', $companyProfile->id())
        ->assertJsonPath('data.user', null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact --filter=ListVendorsTest`
Expected: the two new tests FAIL (`data` still contains the deleted vendor / `meta.counts.total` is 1, not 0).

Run: `php artisan test --compact --filter=ShowVendorTest`
Expected: the new test FAILS with a 500 response (`Attempt to read property "id" on null` inside `VendorProfileResource`).

- [ ] **Step 3: Exclude vendors with a deleted user from the list query**

In `app/Modules/Vendor/Application/Dashboard/Queries/ListVendorProfilesQuery.php`, add `->whereHas('VendorProfilesUser')` to the query chain, right after the `->select([...])` call:

```php
        $query = VendorProfiles::query()
            ->select(['id', 'created_at', 'updated_at', 'verification_status'])
            ->whereHas('VendorProfilesUser')
            ->withCount([
```

- [ ] **Step 4: Exclude vendors with a deleted user from the count query**

In `app/Modules/Vendor/Application/Dashboard/Queries/CountVendorProfilesByStatusQuery.php`, add the same filter, right after `VendorProfiles::query()`:

```php
        $counts = VendorProfiles::query()
            ->whereHas('VendorProfilesUser')
            ->search($search)
```

- [ ] **Step 5: Make the resource's `user` field null-safe**

In `app/Modules/Vendor/Presentation/Http/Resources/VendorProfileResource.php`, replace:

```php
            'user' => $this->whenLoaded('VendorProfilesUser', fn () => [
                'id' => $this->VendorProfilesUser->id,
                'username' => $this->VendorProfilesUser->username,
                'email' => $this->VendorProfilesUser->email,
            ]),
```

with:

```php
            'user' => $this->whenLoaded('VendorProfilesUser', fn () => $this->VendorProfilesUser !== null ? [
                'id' => $this->VendorProfilesUser->id,
                'username' => $this->VendorProfilesUser->username,
                'email' => $this->VendorProfilesUser->email,
            ] : null),
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `php artisan test --compact --filter=ListVendorsTest`
Run: `php artisan test --compact --filter=ShowVendorTest`
Expected: all PASS.

- [ ] **Step 7: Run Pint and the full Vendor test suite**

Run: `vendor/bin/pint --dirty --format agent`
Run: `php artisan test --compact tests/Feature/Modules/Vendor`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add app/Modules/Vendor/Application/Dashboard/Queries/ListVendorProfilesQuery.php app/Modules/Vendor/Application/Dashboard/Queries/CountVendorProfilesByStatusQuery.php app/Modules/Vendor/Presentation/Http/Resources/VendorProfileResource.php tests/Feature/Modules/Vendor/ListVendorsTest.php tests/Feature/Modules/Vendor/ShowVendorTest.php
git commit -m "fix(vendor): exclude vendors with a deleted user from list/counts and fix resource crash"
```

---

### Task 3: User repository — find overdue soft-deleted ids, force delete

**Files:**
- Modify: `app/Modules/User/Domain/Repositories/UserRepositoryInterface.php`
- Modify: `app/Modules/User/Infrastructure/Repositories/UserRepository.php`
- Test: `tests/Feature/Modules/User/UserRepositoryTest.php` (append)

**Interfaces:**
- Produces: `UserRepositoryInterface::findIdsDeletedBefore(CarbonImmutable $cutoff): array` (returns `array<int, int>` of user ids), `UserRepositoryInterface::forceDelete(int $id): void` (throws `ModelNotFoundException` if no soft-deleted user with that id exists). Consumed by Task 5's `PurgeSoftDeletedUsersUseCase`.

- [ ] **Step 1: Write the failing tests**

In `tests/Feature/Modules/User/UserRepositoryTest.php`, add these imports:

```php
use App\Modules\User\Infrastructure\Models\User as UserModel;
use Carbon\CarbonImmutable;
```

and add these tests at the end of the file:

```php
test('findIdsDeletedBefore returns ids of users soft-deleted at or before the cutoff', function () {
    $repository = new UserRepository;

    $old = $repository->save(User::register('old', Email::fromString('old@example.com'), 'hashed-password', UserType::Internal));
    $repository->delete($old->id());
    UserModel::withTrashed()->whereKey($old->id())->update(['deleted_at' => CarbonImmutable::now()->subDays(31)]);

    $recent = $repository->save(User::register('recent', Email::fromString('recent@example.com'), 'hashed-password', UserType::Internal));
    $repository->delete($recent->id());

    $repository->save(User::register('active', Email::fromString('active@example.com'), 'hashed-password', UserType::Internal));

    $ids = $repository->findIdsDeletedBefore(CarbonImmutable::now()->subDays(30));

    expect($ids)->toBe([$old->id()]);
});

test('forceDelete permanently removes a soft-deleted user', function () {
    $repository = new UserRepository;
    $user = $repository->save(User::register('todelete', Email::fromString('todelete@example.com'), 'hashed-password', UserType::Internal));
    $repository->delete($user->id());

    $repository->forceDelete($user->id());

    expect(UserModel::withTrashed()->find($user->id()))->toBeNull();
});

test('forceDelete throws when the user does not exist', function () {
    $repository = new UserRepository;

    $repository->forceDelete(999999);
})->throws(ModelNotFoundException::class);
```

Note: `UserType::Internal` is already imported in this file, as is the domain `User` (aliased bare, not `UserModel`) — reuse those existing imports, only add the two new ones above.

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact --filter=UserRepositoryTest`
Expected: FAIL — `Call to undefined method ... findIdsDeletedBefore()` / `forceDelete()`.

- [ ] **Step 3: Add the interface methods**

In `app/Modules/User/Domain/Repositories/UserRepositoryInterface.php`, add the import:

```php
use Carbon\CarbonImmutable;
```

and add, after `public function delete(int $id): void;`:

```php
    /**
     * @return array<int, int> ids of users soft-deleted at or before the given cutoff
     */
    public function findIdsDeletedBefore(CarbonImmutable $cutoff): array;

    public function forceDelete(int $id): void;
```

- [ ] **Step 4: Implement in the repository**

In `app/Modules/User/Infrastructure/Repositories/UserRepository.php`, add, after the existing `delete()`/`mutateEmailForDeletion()` methods:

```php
    /**
     * @return array<int, int>
     */
    public function findIdsDeletedBefore(CarbonImmutable $cutoff): array
    {
        return UserModel::onlyTrashed()
            ->where('deleted_at', '<=', $cutoff)
            ->pluck('id')
            ->all();
    }

    public function forceDelete(int $id): void
    {
        UserModel::onlyTrashed()->findOrFail($id)->forceDelete();
    }
```

(`Carbon\CarbonImmutable` is already imported in this file.)

- [ ] **Step 5: Run test to verify it passes**

Run: `php artisan test --compact --filter=UserRepositoryTest`
Expected: PASS (10/10).

- [ ] **Step 6: Run Pint**

Run: `vendor/bin/pint --dirty --format agent`

- [ ] **Step 7: Commit**

```bash
git add app/Modules/User/Domain/Repositories/UserRepositoryInterface.php app/Modules/User/Infrastructure/Repositories/UserRepository.php tests/Feature/Modules/User/UserRepositoryTest.php
git commit -m "feat(user): add repository support for finding and force-deleting overdue soft-deleted users"
```

---

### Task 4: Vendor repository — delete a user's document files

**Files:**
- Modify: `app/Modules/Vendor/Domain/Repositories/VendorRepositoryInterface.php`
- Modify: `app/Modules/Vendor/Infrastructure/Repositories/VendorRepository.php`
- Test: `tests/Feature/Modules/Vendor/VendorRepositoryTest.php` (append)

**Interfaces:**
- Produces: `VendorRepositoryInterface::deleteDocumentFilesForUser(int $userId): void` — no-op if the user has no vendor profile. Consumed by Task 5's `PurgeSoftDeletedUsersUseCase`.

- [ ] **Step 1: Write the failing tests**

In `tests/Feature/Modules/Vendor/VendorRepositoryTest.php`, add the import:

```php
use Illuminate\Support\Facades\Storage;
```

and add these tests at the end of the file:

```php
test('deleteDocumentFilesForUser deletes stored files for the user\'s vendor documents', function () {
    Storage::fake('local');
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));
    Storage::disk('local')->put('vendor-documents/keep.pdf', 'content');
    $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'citizen_id',
        fileName: 'keep.pdf',
        filePath: 'vendor-documents/keep.pdf',
    ));

    $repository->deleteDocumentFilesForUser($user->id);

    Storage::disk('local')->assertMissing('vendor-documents/keep.pdf');
});

test('deleteDocumentFilesForUser is a no-op when the user has no vendor profile', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;

    expect(fn () => $repository->deleteDocumentFilesForUser($user->id))->not->toThrow(Exception::class);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact --filter=VendorRepositoryTest`
Expected: FAIL — `Call to undefined method ... deleteDocumentFilesForUser()`.

- [ ] **Step 3: Add the interface method**

In `app/Modules/Vendor/Domain/Repositories/VendorRepositoryInterface.php`, add, after `public function deleteDocument(VendorDocument $document): void;`:

```php

    /**
     * Delete any uploaded document files (from storage) belonging to the vendor
     * profile linked to the given user id. No-op if the user has no vendor profile.
     */
    public function deleteDocumentFilesForUser(int $userId): void;
```

- [ ] **Step 4: Implement in the repository**

In `app/Modules/Vendor/Infrastructure/Repositories/VendorRepository.php`, add the import:

```php
use Illuminate\Support\Facades\Storage;
```

and add, after the existing `deleteDocument()` method:

```php
    public function deleteDocumentFilesForUser(int $userId): void
    {
        $profile = VendorProfiles::where('user_id', $userId)->first();

        if ($profile === null) {
            return;
        }

        VendorDocuments::where('vendor_profile_id', $profile->id)
            ->pluck('file_path')
            ->each(fn (string $filePath) => Storage::disk('local')->delete($filePath));
    }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `php artisan test --compact --filter=VendorRepositoryTest`
Expected: PASS.

- [ ] **Step 6: Run Pint**

Run: `vendor/bin/pint --dirty --format agent`

- [ ] **Step 7: Commit**

```bash
git add app/Modules/Vendor/Domain/Repositories/VendorRepositoryInterface.php app/Modules/Vendor/Infrastructure/Repositories/VendorRepository.php tests/Feature/Modules/Vendor/VendorRepositoryTest.php
git commit -m "feat(vendor): add repository support for deleting a user's document files"
```

---

### Task 5: PurgeSoftDeletedUsersUseCase

**Files:**
- Create: `app/Modules/User/Application/UseCases/PurgeSoftDeletedUsersUseCase.php`
- Test: `tests/Feature/Modules/User/PurgeSoftDeletedUsersUseCaseTest.php`

**Interfaces:**
- Consumes: `UserRepositoryInterface::findIdsDeletedBefore()` and `::forceDelete()` (Task 3), `VendorRepositoryInterface::deleteDocumentFilesForUser()` (Task 4).
- Produces: `PurgeSoftDeletedUsersUseCase::execute(): int` (returns the number of users purged). Consumed by Task 6's console command.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Modules/User/PurgeSoftDeletedUsersUseCaseTest.php`:

```php
<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\User\Application\UseCases\PurgeSoftDeletedUsersUseCase;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use App\Modules\User\Infrastructure\Repositories\UserRepository;
use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function purgeSoftDeletedUsersUseCase(): PurgeSoftDeletedUsersUseCase
{
    return app(PurgeSoftDeletedUsersUseCase::class);
}

test('execute force-deletes users soft-deleted for more than 30 days', function () {
    $userRepository = new UserRepository;
    $user = $userRepository->save(User::register('old', Email::fromString('old@example.com'), 'hashed-password', UserType::Internal));
    $userRepository->delete($user->id());
    UserModel::withTrashed()->whereKey($user->id())->update(['deleted_at' => now()->subDays(31)]);

    $purged = purgeSoftDeletedUsersUseCase()->execute();

    expect($purged)->toBe(1);
    expect(UserModel::withTrashed()->find($user->id()))->toBeNull();
});

test('execute leaves users soft-deleted less than 30 days ago alone', function () {
    $userRepository = new UserRepository;
    $user = $userRepository->save(User::register('recent', Email::fromString('recent@example.com'), 'hashed-password', UserType::Internal));
    $userRepository->delete($user->id());

    $purged = purgeSoftDeletedUsersUseCase()->execute();

    expect($purged)->toBe(0);
    expect(UserModel::withTrashed()->find($user->id()))->not->toBeNull();
});

test('execute deletes a purged vendor\'s uploaded document files before removing the user', function () {
    Storage::fake('local');
    $userRepository = new UserRepository;
    $vendorRepository = new VendorRepository;

    $vendorUser = $userRepository->save(User::register('vendor', Email::fromString('vendor@example.com'), 'hashed-password', UserType::Company));
    $profile = $vendorRepository->saveProfile(VendorProfile::create(userId: $vendorUser->id()));
    Storage::disk('local')->put('vendor-documents/expired.pdf', 'content');
    $vendorRepository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'citizen_id',
        fileName: 'expired.pdf',
        filePath: 'vendor-documents/expired.pdf',
    ));
    $userRepository->delete($vendorUser->id());
    UserModel::withTrashed()->whereKey($vendorUser->id())->update(['deleted_at' => now()->subDays(31)]);

    purgeSoftDeletedUsersUseCase()->execute();

    Storage::disk('local')->assertMissing('vendor-documents/expired.pdf');
    $this->assertDatabaseMissing('vendor_profiles', ['id' => $profile->id()]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact --filter=PurgeSoftDeletedUsersUseCaseTest`
Expected: FAIL — class `PurgeSoftDeletedUsersUseCase` does not exist.

- [ ] **Step 3: Implement the use case**

Create `app/Modules/User/Application/UseCases/PurgeSoftDeletedUsersUseCase.php`:

```php
<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Carbon\CarbonImmutable;

final class PurgeSoftDeletedUsersUseCase
{
    private const RETENTION_DAYS = 30;

    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly VendorRepositoryInterface $vendors,
    ) {}

    public function execute(): int
    {
        $cutoff = CarbonImmutable::now()->subDays(self::RETENTION_DAYS);
        $ids = $this->users->findIdsDeletedBefore($cutoff);

        foreach ($ids as $id) {
            $this->vendors->deleteDocumentFilesForUser($id);
            $this->users->forceDelete($id);

            app_log('User purged (hard delete)', ['user_id' => $id], 'info', 'user');
        }

        return count($ids);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact --filter=PurgeSoftDeletedUsersUseCaseTest`
Expected: PASS (3/3).

- [ ] **Step 5: Run Pint**

Run: `vendor/bin/pint --dirty --format agent`

- [ ] **Step 6: Commit**

```bash
git add app/Modules/User/Application/UseCases/PurgeSoftDeletedUsersUseCase.php tests/Feature/Modules/User/PurgeSoftDeletedUsersUseCaseTest.php
git commit -m "feat(user): add use case to purge soft-deleted users after 30 days"
```

---

### Task 6: Console command + daily schedule

**Files:**
- Create: `app/Console/Commands/PurgeSoftDeletedUsersCommand.php`
- Create: `routes/console.php`
- Test: `tests/Feature/Modules/User/PurgeSoftDeletedUsersCommandTest.php`

**Interfaces:**
- Consumes: `PurgeSoftDeletedUsersUseCase::execute(): int` (Task 5).

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Modules/User/PurgeSoftDeletedUsersCommandTest.php`:

```php
<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use App\Modules\User\Infrastructure\Repositories\UserRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('the command purges eligible users and reports the count', function () {
    $repository = new UserRepository;
    $user = $repository->save(User::register('old', Email::fromString('old@example.com'), 'hashed-password', UserType::Internal));
    $repository->delete($user->id());
    UserModel::withTrashed()->whereKey($user->id())->update(['deleted_at' => now()->subDays(31)]);

    $this->artisan('app:purge-soft-deleted-users')
        ->expectsOutputToContain('Purged 1 user(s).')
        ->assertExitCode(0);

    expect(UserModel::withTrashed()->find($user->id()))->toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact --filter=PurgeSoftDeletedUsersCommandTest`
Expected: FAIL — command `app:purge-soft-deleted-users` is not defined.

- [ ] **Step 3: Create the command**

Create `app/Console/Commands/PurgeSoftDeletedUsersCommand.php`:

```php
<?php

namespace App\Console\Commands;

use App\Modules\User\Application\UseCases\PurgeSoftDeletedUsersUseCase;
use Illuminate\Console\Command;

final class PurgeSoftDeletedUsersCommand extends Command
{
    protected $signature = 'app:purge-soft-deleted-users';

    protected $description = 'Permanently delete user accounts soft-deleted for more than 30 days.';

    public function handle(PurgeSoftDeletedUsersUseCase $purge): int
    {
        $count = $purge->execute();
        $this->info("Purged {$count} user(s).");

        return self::SUCCESS;
    }
}
```

Laravel auto-discovers commands under `app/Console/Commands` — no manual registration is needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact --filter=PurgeSoftDeletedUsersCommandTest`
Expected: PASS.

- [ ] **Step 5: Create `routes/console.php` and schedule the command**

This file does not exist yet even though `bootstrap/app.php` already points `commands` at it. Create `routes/console.php`:

```php
<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('app:purge-soft-deleted-users')->daily();
```

There is no dedicated test for this line — it is declarative Laravel scheduler wiring, not custom logic. Confirm it registered correctly by running:

Run: `php artisan schedule:list`
Expected: a row for `app:purge-soft-deleted-users` running daily (`0 0 * * *`).

- [ ] **Step 6: Run Pint and the full test suite**

Run: `vendor/bin/pint --dirty --format agent`
Run: `php artisan test --compact`
Expected: all pass (aside from any pre-existing unrelated failures already present before this plan).

- [ ] **Step 7: Commit**

```bash
git add app/Console/Commands/PurgeSoftDeletedUsersCommand.php routes/console.php tests/Feature/Modules/User/PurgeSoftDeletedUsersCommandTest.php
git commit -m "feat: schedule daily purge of soft-deleted users"
```
