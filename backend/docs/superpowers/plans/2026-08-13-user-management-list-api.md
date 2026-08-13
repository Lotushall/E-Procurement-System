# User Management List API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the two read-only endpoints (`GET /api/v1/dashboard/users`, `GET /api/v1/dashboard/users/{id}`) that a sibling frontend session already built and shipped against (`frontend/lib/user/management/api.ts`, `frontend/docs/superpowers/specs/2026-08-13-user-management-list-design.md`), plus the one-field `VendorProfileResource` addition (`user.id`) that the already-shipped Vendor-detail-page cross-link needs.

**Architecture:** New `Application/Queries` layer on `App\Modules\User` (2 query classes, querying the `User` Eloquent model directly — no repository) backed by 4 new local scopes (`type`/`status`/`search`/`sort`) on the `User` model, mirroring the exact pattern `VendorProfiles` already uses for its own list endpoint. New `Presentation` layer (Policy + Gate, FormRequest, 2 Resources, Controller rewriting the currently-dead `UserController.php` scaffold) exposes the 2 endpoints under a literal `/api/v1/dashboard/users` path (matching the URL the frontend already hardcodes), mounted in the existing `auth` middleware group.

**Tech Stack:** Laravel 13, PHP 8.4, Pest 4, spatie/laravel-model-states (`User::$status`), native PHP enum (`User::$user_type`).

## Global Constraints

- Full design/rationale doc: `backend/docs/superpowers/specs/2026-08-13-user-management-list-api-design.md` — read it if anything below is ambiguous.
- Both endpoints require authentication (`auth` middleware) and gate `users.viewAny` (`user_type === UserType::Internal`, no permission check yet — deferred to a future role/permission sub-project per the frontend spec). Unauthenticated → 401, non-internal → 403.
- **Response shapes are a fixed external contract already consumed by shipped frontend code — copy them exactly:**
  - `GET /api/v1/dashboard/users` → `{ "data": [{ "id", "username", "email", "name", "userType", "status", "createdAt" }], "meta": { "currentPage", "lastPage", "perPage", "total" } }` — `meta` is **camelCase**, **no `links` key**. Build the response array explicitly in the controller (do NOT use `Resource::collection($paginator)->response()`, which produces Laravel's default snake_case+`links` envelope).
  - `GET /api/v1/dashboard/users/{id}` → same item shape plus `"vendorProfileId"` (number for `company`/`individual`, `null` for `internal`).
- `type` ∈ `internal|company|individual`; `status` ∈ `pending|active|suspended|inactive`; `sort_by` ∈ `created_at|username|email` only (no `name` — it's resolved from 3 different tables depending on type, matching why the Vendor list also excludes cross-table `name` from easy sorting). Any other value for these three, or `search` over 255 chars, → 422.
- `name` is resolved server-side per `user_type`: `internal` → `internal_profiles.firstname` + `' '` + `lastname`; `company` → `vendor_company_details.company_name`; `individual` → `vendor_individual_details.store_name`. Resolve it via eager-loaded relations in the Resource (never an extra per-row query).
- URL path literally contains `/dashboard/` (`routes/api/v1/dashboard/users.php` gets an actual `Route::prefix('dashboard')` wrapper) — this deliberately deviates from the sibling `routes/api/v1/dashboard/vendors.php`, whose real URL is `/api/v1/vendors` with no `/dashboard/` segment. The frontend already hardcodes the literal `/api/v1/dashboard/users` path, so this plan matches that rather than the Vendor file's convention. Do not touch `routes/api/v1/dashboard/vendors.php` or any existing `/api/v1/vendors*` URL.
- Gate name is the namespaced `users.viewAny`, not the bare `viewAny` that `VendorServiceProvider::boot()` already defines for Vendor routes — `Gate::define()` has no collision protection, and reusing the bare name would make behavior depend on module boot order. Do not modify `VendorServiceProvider.php`.
- The dead `app/Modules/User/Presentation/Http/Controllers/UserController.php` scaffold (returns `view('user::index')` etc., not wired to any route, verified via `php artisan route:list`) is rewritten in place for this feature — do not create a second controller class.
- No new migrations — `users`, `internal_profiles`, `vendor_profiles`, `vendor_company_details`, `vendor_individual_details` all already exist with the columns this plan needs.
- No frontend changes in this plan (already shipped in a separate session).

### Baseline (record before starting Task 1)

`php artisan test --compact`: 372 tests, 371 passed, 1 pre-existing unrelated failure (`Tests\Feature\ExampleTest` — root `/` route returns 404 instead of 200, present since before this plan). After this plan, the same 1 pre-existing failure should remain, plus every new test added below passing.

**Pre-existing uncommitted WIP in the working tree (not part of this plan, do not touch beyond what's noted):** `VendorServiceProvider.php`, `routes/api/v1/dashboard/vendors.php`, `database/factories/UserFactory.php`, `database/seeders/AdminUserSeeder.php`, and 7 files under `tests/Feature/Modules/Vendor/` carry an uncommitted Vendor-policy migration (adds `VendorProfilePolicy` + bare `viewAny`/`review` gates + route `can:` middleware). This plan's Task 3 modifies `tests/Feature/Modules/Vendor/ShowVendorTest.php`, one of those 7 already-dirty files — its commit will therefore necessarily bundle in that file's pre-existing uncommitted diff too (git commits the file's full current state, not just this plan's lines). Flag this to the user before Task 3's commit: either they commit the pending Vendor-policy WIP first (as its own, separate commit, giving Task 3 a clean diff), or accept Task 3's commit bundling both changes together with clear disclosure of which lines are whose.

---

### Task 1: Application layer — `type`/`status`/`search`/`sort` scopes + `ListUsersQuery` + `GetUserByIdQuery`

**Files:**
- Modify: `app/Modules/User/Infrastructure/Models/User.php`
- Create: `app/Modules/User/Application/Queries/ListUsersQuery.php`
- Create: `app/Modules/User/Application/Queries/GetUserByIdQuery.php`
- Test: `tests/Feature/Modules/User/ListUsersQueryTest.php`
- Test: `tests/Feature/Modules/User/GetUserByIdQueryTest.php`

**Interfaces:**
- Consumes: `App\Modules\User\Infrastructure\Models\User` (existing), `App\Modules\User\Infrastructure\Models\InternalProfiles` (existing, same namespace), `App\Modules\Vendor\Infrastructure\Models\{VendorProfiles,VendorCompanyDetails,VendorIndividualDetails}` (existing).
- Produces (consumed directly by Task 2's controller):
  - `ListUsersQuery::execute(?string $type = null, ?string $status = null, ?string $search = null, ?string $sortBy = null, ?string $sortDirection = null, ?int $page = null, ?int $perPage = null): Illuminate\Pagination\LengthAwarePaginator` — items are `User` models with `UserInternalProfile`, `UserVendorProfile.VendorProfilesCompanyDetail`, `UserVendorProfile.VendorProfilesIndividualDetail` eager-loaded.
  - `GetUserByIdQuery::execute(int $id): App\Modules\User\Infrastructure\Models\User` — same eager loads, throws `Illuminate\Database\Eloquent\ModelNotFoundException` when not found.

- [ ] **Step 1: Write the failing tests for `ListUsersQuery`**

Create `tests/Feature/Modules/User/ListUsersQueryTest.php`:

```php
<?php

use App\Modules\User\Application\Queries\ListUsersQuery;
use App\Modules\User\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function listUsersQuery(): ListUsersQuery
{
    return app(ListUsersQuery::class);
}

test('execute returns all users when no filters are given', function () {
    User::factory()->create(['user_type' => 'internal']);
    User::factory()->create(['user_type' => 'company']);
    User::factory()->create(['user_type' => 'individual']);

    $result = listUsersQuery()->execute();

    expect($result->total())->toBe(3);
});

test('execute filters by type', function () {
    User::factory()->create(['user_type' => 'internal']);
    User::factory()->create(['user_type' => 'company']);

    $result = listUsersQuery()->execute(type: 'internal');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->user_type->value)->toBe('internal');
});

test('execute filters by status', function () {
    User::factory()->create(['user_type' => 'internal', 'status' => 'active']);
    User::factory()->create(['user_type' => 'internal', 'status' => 'suspended']);

    $result = listUsersQuery()->execute(status: 'suspended');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->status->getValue())->toBe('suspended');
});

test('execute searches by username or email', function () {
    User::factory()->create(['username' => 'somchai_j', 'email' => 'somchai@example.com', 'user_type' => 'internal']);
    User::factory()->create(['username' => 'other_user', 'email' => 'other@example.com', 'user_type' => 'internal']);

    expect(listUsersQuery()->execute(search: 'somchai_j')->total())->toBe(1);
    expect(listUsersQuery()->execute(search: 'somchai@example.com')->total())->toBe(1);
});

test('execute searches internal users by firstname or lastname', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $user->id, 'firstname' => 'Somchai', 'lastname' => 'Jaidee']);
    $other = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $other->id, 'firstname' => 'Somsri', 'lastname' => 'Somboon']);

    $result = listUsersQuery()->execute(search: 'Jaidee');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($user->id);
});

test('execute searches company users by company name', function () {
    $repository = new VendorRepository;

    $companyUser = User::factory()->create(['user_type' => 'company']);
    $profile = $repository->saveProfile(VendorProfile::create(userId: $companyUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $profile->id(),
        companyName: 'Acme Co., Ltd.',
        businessRegistrationNo: '0123456789012',
        taxId: TaxId::fromString('1234567890123'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));
    User::factory()->create(['user_type' => 'company']);
    User::factory()->create(['user_type' => 'internal']);

    $result = listUsersQuery()->execute(search: 'Acme');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($companyUser->id);
});

test('execute searches individual users by store name', function () {
    $repository = new VendorRepository;

    $individualUser = User::factory()->create(['user_type' => 'individual']);
    $profile = $repository->saveProfile(VendorProfile::create(userId: $individualUser->id));
    $repository->saveIndividualDetail(VendorIndividualDetail::create(
        vendorProfileId: $profile->id(),
        storeName: "John's Store",
        prefix: null,
        firstname: 'John',
        lastname: 'Doe',
        citizenId: CitizenId::fromString('1234567890124'),
        businessType: null,
        taxId: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $result = listUsersQuery()->execute(search: "John's Store");

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($individualUser->id);
});

test('execute sorts by the given column and direction', function () {
    User::factory()->create(['username' => 'bravo', 'user_type' => 'internal']);
    User::factory()->create(['username' => 'alpha', 'user_type' => 'internal']);

    $result = listUsersQuery()->execute(sortBy: 'username', sortDirection: 'asc');

    expect(collect($result->items())->pluck('username')->toArray())->toBe(['alpha', 'bravo']);
});

test('execute defaults to sorting by created_at descending', function () {
    $older = User::factory()->create(['user_type' => 'internal']);
    $older->forceFill(['created_at' => now()->subDay()])->save();
    $newer = User::factory()->create(['user_type' => 'internal']);

    $result = listUsersQuery()->execute();

    expect($result->items()[0]->id)->toBe($newer->id);
});

test('execute paginates results', function () {
    User::factory()->count(25)->create(['user_type' => 'internal']);

    $result = listUsersQuery()->execute(page: 2, perPage: 10);

    expect($result->count())->toBe(10)
        ->and($result->currentPage())->toBe(2)
        ->and($result->total())->toBe(25);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test tests/Feature/Modules/User/ListUsersQueryTest.php --compact`
Expected: FAIL — `Class "App\Modules\User\Application\Queries\ListUsersQuery" not found`

- [ ] **Step 3: Implement the `type`/`status`/`search`/`sort` scopes on `User` and `ListUsersQuery`**

Modify `app/Modules/User/Infrastructure/Models/User.php` — find the import block:

```php
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Domain\States\UserStatus;
use App\Modules\User\Infrastructure\Notifications\QueuedResetPassword;
use App\Modules\User\Infrastructure\Notifications\QueuedVerifyEmail;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\ModelStates\HasStates;
use Spatie\Permission\Traits\HasRoles;
```

Replace with:

```php
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Domain\States\UserStatus;
use App\Modules\User\Infrastructure\Notifications\QueuedResetPassword;
use App\Modules\User\Infrastructure\Notifications\QueuedVerifyEmail;
use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\ModelStates\HasStates;
use Spatie\Permission\Traits\HasRoles;
```

Find the end of the class:

```php
    // Relations
    public function UserVendorProfile(): HasOne
    {
        return $this->hasOne(VendorProfiles::class);
    }

    public function UserInternalProfile(): HasOne
    {
        return $this->hasOne(InternalProfiles::class);
    }
}
```

Replace with:

```php
    // Relations
    public function UserVendorProfile(): HasOne
    {
        return $this->hasOne(VendorProfiles::class);
    }

    public function UserInternalProfile(): HasOne
    {
        return $this->hasOne(InternalProfiles::class);
    }

    /**
     * Scope a query to only include users of the given type.
     */
    #[Scope]
    protected function type(Builder $query, ?string $type): void
    {
        $query->when($type !== null, fn (Builder $query) => $query->where('user_type', $type));
    }

    /**
     * Scope a query to only include users with the given status.
     */
    #[Scope]
    protected function status(Builder $query, ?string $status): void
    {
        $query->when($status !== null, fn (Builder $query) => $query->where('status', $status));
    }

    /**
     * Scope a query to users whose username, email, resolved internal name, company
     * name, or individual store name matches the given search term.
     */
    #[Scope]
    protected function search(Builder $query, ?string $search): void
    {
        if ($search === null || trim($search) === '') {
            return;
        }

        $term = '%'.$search.'%';

        $query->where(function (Builder $query) use ($term) {
            $query->where('username', 'like', $term)
                ->orWhere('email', 'like', $term)
                ->orWhereIn('id', InternalProfiles::query()
                    ->where(function (Builder $query) use ($term) {
                        $query->where('firstname', 'like', $term)
                            ->orWhere('lastname', 'like', $term);
                    })
                    ->select('user_id'))
                ->orWhereIn('id', VendorProfiles::query()
                    ->whereIn('id', VendorCompanyDetails::query()
                        ->where('company_name', 'like', $term)
                        ->select('vendor_profile_id'))
                    ->select('user_id'))
                ->orWhereIn('id', VendorProfiles::query()
                    ->whereIn('id', VendorIndividualDetails::query()
                        ->where('store_name', 'like', $term)
                        ->select('vendor_profile_id'))
                    ->select('user_id'));
        });
    }

    /**
     * Scope a query to sort by the given whitelisted column (defaults to created_at).
     */
    #[Scope]
    protected function sort(Builder $query, ?string $sortBy, ?string $sortDirection = null): void
    {
        $direction = $sortDirection === 'asc' ? 'asc' : 'desc';

        $query->orderBy(
            in_array($sortBy, ['username', 'email'], true) ? $sortBy : 'created_at',
            $direction,
        );
    }
}
```

Create `app/Modules/User/Application/Queries/ListUsersQuery.php`:

```php
<?php

namespace App\Modules\User\Application\Queries;

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListUsersQuery
{
    private const DEFAULT_PER_PAGE = 20;

    public function execute(
        ?string $type = null,
        ?string $status = null,
        ?string $search = null,
        ?string $sortBy = null,
        ?string $sortDirection = null,
        ?int $page = null,
        ?int $perPage = null,
    ): LengthAwarePaginator {
        return User::query()
            ->with([
                'UserInternalProfile',
                'UserVendorProfile.VendorProfilesCompanyDetail',
                'UserVendorProfile.VendorProfilesIndividualDetail',
            ])
            ->type($type)
            ->status($status)
            ->search($search)
            ->sort($sortBy, $sortDirection)
            ->orderByDesc('id')
            ->paginate(perPage: $perPage ?? self::DEFAULT_PER_PAGE, page: $page ?? 1);
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test tests/Feature/Modules/User/ListUsersQueryTest.php --compact`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add app/Modules/User/Infrastructure/Models/User.php app/Modules/User/Application/Queries/ListUsersQuery.php tests/Feature/Modules/User/ListUsersQueryTest.php
git commit -m "feat(user): add type/status/search/sort scopes and ListUsersQuery"
```

- [ ] **Step 6: Write the failing tests for `GetUserByIdQuery`**

Create `tests/Feature/Modules/User/GetUserByIdQueryTest.php`:

```php
<?php

use App\Modules\User\Application\Queries\GetUserByIdQuery;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function getUserByIdQuery(): GetUserByIdQuery
{
    return app(GetUserByIdQuery::class);
}

test('execute returns the user with the given id', function () {
    $user = User::factory()->create(['user_type' => 'internal']);

    $result = getUserByIdQuery()->execute($user->id);

    expect($result->id)->toBe($user->id);
});

test('execute throws when the id does not exist', function () {
    expect(fn () => getUserByIdQuery()->execute(999999))
        ->toThrow(ModelNotFoundException::class);
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `php artisan test tests/Feature/Modules/User/GetUserByIdQueryTest.php --compact`
Expected: FAIL — `Class "App\Modules\User\Application\Queries\GetUserByIdQuery" not found`

- [ ] **Step 8: Implement `GetUserByIdQuery`**

Create `app/Modules/User/Application/Queries/GetUserByIdQuery.php`:

```php
<?php

namespace App\Modules\User\Application\Queries;

use App\Modules\User\Infrastructure\Models\User;

final class GetUserByIdQuery
{
    public function execute(int $id): User
    {
        return User::query()
            ->with([
                'UserInternalProfile',
                'UserVendorProfile.VendorProfilesCompanyDetail',
                'UserVendorProfile.VendorProfilesIndividualDetail',
            ])
            ->findOrFail($id);
    }
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `php artisan test tests/Feature/Modules/User/GetUserByIdQueryTest.php --compact`
Expected: PASS (2 tests)

- [ ] **Step 10: Commit**

```bash
git add app/Modules/User/Application/Queries/GetUserByIdQuery.php tests/Feature/Modules/User/GetUserByIdQueryTest.php
git commit -m "feat(user): add GetUserByIdQuery"
```

---

### Task 2: Presentation layer — Policy/Gate, list endpoint, detail endpoint

**Files:**
- Create: `app/Modules/User/Presentation/Policies/UserPolicy.php`
- Modify: `app/Modules/User/Providers/UserServiceProvider.php`
- Create: `app/Modules/User/Presentation/Http/Requests/ListUsersRequest.php`
- Create: `app/Modules/User/Presentation/Http/Resources/UserResource.php`
- Create: `app/Modules/User/Presentation/Http/Resources/UserDetailResource.php`
- Modify: `app/Modules/User/Presentation/Http/Controllers/UserController.php` (rewrite the dead scaffold)
- Create: `routes/api/v1/dashboard/users.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Modules/User/ListUsersTest.php`
- Test: `tests/Feature/Modules/User/ShowUserTest.php`

**Interfaces:**
- Consumes (from Task 1): `ListUsersQuery::execute(...)`, `GetUserByIdQuery::execute(int $id): User`.
- Produces: `GET /api/v1/dashboard/users`, `GET /api/v1/dashboard/users/{id}` — final; a sibling frontend session (`frontend/lib/user/management/api.ts`) already consumes exactly this contract.

**This task's response shapes are an external contract already relied upon by shipped frontend code — see Global Constraints above. Do not deviate from the exact JSON shapes, field casing, or the `users.viewAny` gate name.**

- [ ] **Step 1: Write the failing test for listing users**

Create `tests/Feature/Modules/User/ListUsersTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('listing users requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/users');

    $response->assertStatus(401);
});

test('a non-internal user cannot list users', function () {
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $this->actingAs($vendorUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users');

    $response->assertStatus(403);
});

test('an internal user can list all users with resolved names', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $internalUser->id, 'firstname' => 'Somchai', 'lastname' => 'Jaidee']);

    $repository = new VendorRepository;
    $companyUser = User::factory()->create(['user_type' => 'company']);
    $profile = $repository->saveProfile(VendorProfile::create(userId: $companyUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $profile->id(),
        companyName: 'Acme Co., Ltd.',
        businessRegistrationNo: '0123456789012',
        taxId: TaxId::fromString('1234567890123'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonStructure([
            'data' => [['id', 'username', 'email', 'name', 'userType', 'status', 'createdAt']],
            'meta' => ['currentPage', 'lastPage', 'perPage', 'total'],
        ]);

    $items = collect($response->json('data'));
    expect($items->firstWhere('id', $internalUser->id))->toMatchArray(['name' => 'Somchai Jaidee', 'userType' => 'internal']);
    expect($items->firstWhere('id', $companyUser->id))->toMatchArray(['name' => 'Acme Co., Ltd.', 'userType' => 'company']);
});

test('listing users filters by type', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    User::factory()->create(['user_type' => 'company']);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users?type=company');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.userType', 'company');
});

test('listing users filters by status', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    User::factory()->create(['user_type' => 'internal', 'status' => 'suspended']);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users?status=suspended');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.status', 'suspended');
});

test('listing users searches by keyword', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal', 'username' => 'somchai_j']);
    User::factory()->create(['user_type' => 'internal', 'username' => 'other_user']);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users?search=somchai_j');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $internalUser->id);
});

test('listing users sorts by the given column', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal', 'username' => 'zzz_admin']);
    User::factory()->create(['user_type' => 'internal', 'username' => 'aaa_user']);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users?sort_by=username&sort_direction=asc');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('username')->toArray())->toBe(['aaa_user', 'zzz_admin']);
});

test('listing users returns camelCase pagination meta with no links', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    User::factory()->count(2)->create(['user_type' => 'internal']);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users?page=1&per_page=2');

    $response->assertOk()
        ->assertJson(['meta' => ['currentPage' => 1, 'lastPage' => 2, 'perPage' => 2, 'total' => 3]])
        ->assertJsonMissingPath('links');
});

test('an invalid type value is rejected', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users?type=bogus');

    $response->assertStatus(422);
});

test('an invalid status value is rejected', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users?status=bogus');

    $response->assertStatus(422);
});

test('an invalid sort_by value is rejected', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users?sort_by=name');

    $response->assertStatus(422);
});

test('a too long search value is rejected', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users?search='.str_repeat('a', 256));

    $response->assertStatus(422);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test tests/Feature/Modules/User/ListUsersTest.php --compact`
Expected: FAIL (11 tests) — the route doesn't exist yet, so every request 404s, including the "requires authentication" test which asserts 401

- [ ] **Step 3: Implement the Policy, Gate, FormRequest, `UserResource`, controller's `index()` action, and the route**

Create `app/Modules/User/Presentation/Policies/UserPolicy.php`:

```php
<?php

namespace App\Modules\User\Presentation\Policies;

use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->user_type === UserType::Internal;
    }
}
```

Modify `app/Modules/User/Providers/UserServiceProvider.php` — find:

```php
<?php

namespace App\Modules\User\Providers;

use App\Modules\User\Domain\Contracts\EmailVerificationSenderInterface;
use App\Modules\User\Domain\Contracts\PasswordResetLinkSenderInterface;
use App\Modules\User\Domain\Repositories\InternalProfilesRepositoryInterface;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use App\Modules\User\Infrastructure\Notifications\EmailVerificationSender;
use App\Modules\User\Infrastructure\Notifications\PasswordResetLinkSender;
use App\Modules\User\Infrastructure\Repositories\InternalProfilesRepository;
use App\Modules\User\Infrastructure\Repositories\UserRepository;
use Nwidart\Modules\Support\ModuleServiceProvider;

class UserServiceProvider extends ModuleServiceProvider
{
    /**
     * The name of the module.
     */
    protected string $name = 'User';

    /**
     * The lowercase version of the module name.
     */
    protected string $nameLower = 'user';

    public function register(): void
    {
        parent::register();

        $this->app->bind(InternalProfilesRepositoryInterface::class, InternalProfilesRepository::class);
        $this->app->bind(UserRepositoryInterface::class, UserRepository::class);
        $this->app->bind(EmailVerificationSenderInterface::class, EmailVerificationSender::class);
        $this->app->bind(PasswordResetLinkSenderInterface::class, PasswordResetLinkSender::class);
    }
}
```

Replace with:

```php
<?php

namespace App\Modules\User\Providers;

use App\Modules\User\Domain\Contracts\EmailVerificationSenderInterface;
use App\Modules\User\Domain\Contracts\PasswordResetLinkSenderInterface;
use App\Modules\User\Domain\Repositories\InternalProfilesRepositoryInterface;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use App\Modules\User\Infrastructure\Notifications\EmailVerificationSender;
use App\Modules\User\Infrastructure\Notifications\PasswordResetLinkSender;
use App\Modules\User\Infrastructure\Repositories\InternalProfilesRepository;
use App\Modules\User\Infrastructure\Repositories\UserRepository;
use App\Modules\User\Presentation\Policies\UserPolicy;
use Illuminate\Support\Facades\Gate;
use Nwidart\Modules\Support\ModuleServiceProvider;

class UserServiceProvider extends ModuleServiceProvider
{
    /**
     * The name of the module.
     */
    protected string $name = 'User';

    /**
     * The lowercase version of the module name.
     */
    protected string $nameLower = 'user';

    public function register(): void
    {
        parent::register();

        $this->app->bind(InternalProfilesRepositoryInterface::class, InternalProfilesRepository::class);
        $this->app->bind(UserRepositoryInterface::class, UserRepository::class);
        $this->app->bind(EmailVerificationSenderInterface::class, EmailVerificationSender::class);
        $this->app->bind(PasswordResetLinkSenderInterface::class, PasswordResetLinkSender::class);
    }

    public function boot(): void
    {
        parent::boot();

        Gate::define('users.viewAny', [UserPolicy::class, 'viewAny']);
    }
}
```

Create `app/Modules/User/Presentation/Http/Requests/ListUsersRequest.php`:

```php
<?php

namespace App\Modules\User\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListUsersRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['nullable', 'string', Rule::in(['internal', 'company', 'individual'])],
            'status' => ['nullable', 'string', Rule::in(['pending', 'active', 'suspended', 'inactive'])],
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'string', Rule::in(['created_at', 'username', 'email'])],
            'sort_direction' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
```

Create `app/Modules/User/Presentation/Http/Resources/UserResource.php`:

```php
<?php

namespace App\Modules\User\Presentation\Http\Resources;

use App\Modules\User\Domain\Enums\UserType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public static $wrap = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'username' => $this->username,
            'email' => $this->email,
            'name' => $this->resolveName(),
            'userType' => $this->user_type->value,
            'status' => $this->status->getValue(),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }

    private function resolveName(): ?string
    {
        return match ($this->user_type) {
            UserType::Internal => $this->UserInternalProfile !== null
                ? trim($this->UserInternalProfile->firstname.' '.$this->UserInternalProfile->lastname)
                : null,
            UserType::Company => $this->UserVendorProfile?->VendorProfilesCompanyDetail?->company_name,
            UserType::Individual => $this->UserVendorProfile?->VendorProfilesIndividualDetail?->store_name,
        };
    }
}
```

Modify `app/Modules/User/Presentation/Http/Controllers/UserController.php` — replace the entire dead scaffold with:

```php
<?php

namespace App\Modules\User\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\User\Application\Queries\ListUsersQuery;
use App\Modules\User\Presentation\Http\Requests\ListUsersRequest;
use App\Modules\User\Presentation\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function __construct(
        private readonly ListUsersQuery $listUsers,
    ) {}

    public function index(ListUsersRequest $request): JsonResponse
    {
        $users = $this->listUsers->execute(
            type: $request->validated('type'),
            status: $request->validated('status'),
            search: $request->validated('search'),
            sortBy: $request->validated('sort_by'),
            sortDirection: $request->validated('sort_direction'),
            page: $request->validated('page'),
            perPage: $request->validated('per_page'),
        );

        return response()->json([
            'data' => UserResource::collection($users->getCollection()),
            'meta' => [
                'currentPage' => $users->currentPage(),
                'lastPage' => $users->lastPage(),
                'perPage' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }
}
```

Create `routes/api/v1/dashboard/users.php`:

```php
<?php

use App\Modules\User\Presentation\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {
    Route::get('users', [UserController::class, 'index'])
        ->middleware('can:users.viewAny')
        ->name('dashboard.users.index');
});
```

Modify `routes/api.php` — find:

```php
<?php

use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    Route::middleware('auth')->group(function () {
        require __DIR__.'/api/v1/vendor.php';
        require __DIR__.'/api/v1/dashboard/vendors.php';
        require __DIR__.'/api/v1/notification.php';
    });

    require __DIR__.'/api/v1/auth.php';
});
```

Replace with:

```php
<?php

use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    Route::middleware('auth')->group(function () {
        require __DIR__.'/api/v1/vendor.php';
        require __DIR__.'/api/v1/dashboard/vendors.php';
        require __DIR__.'/api/v1/notification.php';
        require __DIR__.'/api/v1/dashboard/users.php';
    });

    require __DIR__.'/api/v1/auth.php';
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test tests/Feature/Modules/User/ListUsersTest.php --compact`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add app/Modules/User/Presentation/Policies/UserPolicy.php app/Modules/User/Providers/UserServiceProvider.php app/Modules/User/Presentation/Http/Requests/ListUsersRequest.php app/Modules/User/Presentation/Http/Resources/UserResource.php app/Modules/User/Presentation/Http/Controllers/UserController.php routes/api/v1/dashboard/users.php routes/api.php tests/Feature/Modules/User/ListUsersTest.php
git commit -m "feat(user): add GET /api/v1/dashboard/users list endpoint"
```

- [ ] **Step 6: Write the failing test for fetching a user by id**

Create `tests/Feature/Modules/User/ShowUserTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('fetching a user by id requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/users/1');

    $response->assertStatus(401);
});

test('a non-internal user cannot fetch a user by id', function () {
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $this->actingAs($vendorUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users/1');

    $response->assertStatus(403);
});

test('fetching an internal user returns a null vendorProfileId', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $internalUser->id, 'firstname' => 'Somchai', 'lastname' => 'Jaidee']);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson("/api/v1/dashboard/users/{$internalUser->id}");

    $response->assertOk()
        ->assertJsonPath('data.id', $internalUser->id)
        ->assertJsonPath('data.name', 'Somchai Jaidee')
        ->assertJsonPath('data.userType', 'internal')
        ->assertJsonPath('data.vendorProfileId', null);
});

test('fetching a company user returns its vendorProfileId', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $repository = new VendorRepository;
    $companyUser = User::factory()->create(['user_type' => 'company']);
    $profile = $repository->saveProfile(VendorProfile::create(userId: $companyUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $profile->id(),
        companyName: 'Acme Co., Ltd.',
        businessRegistrationNo: '0123456789012',
        taxId: TaxId::fromString('1234567890123'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson("/api/v1/dashboard/users/{$companyUser->id}");

    $response->assertOk()
        ->assertJsonPath('data.name', 'Acme Co., Ltd.')
        ->assertJsonPath('data.userType', 'company')
        ->assertJsonPath('data.vendorProfileId', $profile->id());
});

test('fetching a nonexistent user returns 404', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users/999999');

    $response->assertStatus(404);
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `php artisan test tests/Feature/Modules/User/ShowUserTest.php --compact`
Expected: FAIL (5 tests) — the `{id}` route doesn't exist yet, so every request 404s, including the "requires authentication" test which asserts 401

- [ ] **Step 8: Implement `UserDetailResource`, the controller's `show()` action, and the route**

Create `app/Modules/User/Presentation/Http/Resources/UserDetailResource.php`:

```php
<?php

namespace App\Modules\User\Presentation\Http\Resources;

use Illuminate\Http\Request;

class UserDetailResource extends UserResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'vendorProfileId' => $this->UserVendorProfile?->id,
        ];
    }
}
```

Modify `app/Modules/User/Presentation/Http/Controllers/UserController.php` — add the `GetUserByIdQuery` dependency and the `show()` action:

```php
<?php

namespace App\Modules\User\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\User\Application\Queries\GetUserByIdQuery;
use App\Modules\User\Application\Queries\ListUsersQuery;
use App\Modules\User\Presentation\Http\Requests\ListUsersRequest;
use App\Modules\User\Presentation\Http\Resources\UserDetailResource;
use App\Modules\User\Presentation\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function __construct(
        private readonly ListUsersQuery $listUsers,
        private readonly GetUserByIdQuery $getUserById,
    ) {}

    public function index(ListUsersRequest $request): JsonResponse
    {
        $users = $this->listUsers->execute(
            type: $request->validated('type'),
            status: $request->validated('status'),
            search: $request->validated('search'),
            sortBy: $request->validated('sort_by'),
            sortDirection: $request->validated('sort_direction'),
            page: $request->validated('page'),
            perPage: $request->validated('per_page'),
        );

        return response()->json([
            'data' => UserResource::collection($users->getCollection()),
            'meta' => [
                'currentPage' => $users->currentPage(),
                'lastPage' => $users->lastPage(),
                'perPage' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'data' => new UserDetailResource($this->getUserById->execute($id)),
        ]);
    }
}
```

Modify `routes/api/v1/dashboard/users.php`:

```php
<?php

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
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `php artisan test tests/Feature/Modules/User/ShowUserTest.php --compact`
Expected: PASS (5 tests)

- [ ] **Step 10: Commit**

```bash
git add app/Modules/User/Presentation/Http/Resources/UserDetailResource.php app/Modules/User/Presentation/Http/Controllers/UserController.php routes/api/v1/dashboard/users.php tests/Feature/Modules/User/ShowUserTest.php
git commit -m "feat(user): add GET /api/v1/dashboard/users/{id} detail endpoint"
```

---

### Task 3: `VendorProfileResource` — add `user.id`

**Files:**
- Modify: `app/Modules/Vendor/Presentation/Http/Resources/VendorProfileResource.php`
- Modify: `tests/Feature/Modules/Vendor/ShowVendorTest.php`

**Interfaces:**
- Produces: `VendorProfileResource`'s `user` block now includes `id` — consumed by the already-shipped frontend Vendor-detail-page cross-link (`frontend/app/dashboard/vendors/detail/page.tsx`'s `vendor.user?.id` guard, currently always `undefined`).

**Before starting this task:** this plan's Baseline section flags that `tests/Feature/Modules/Vendor/ShowVendorTest.php` already carries pre-existing uncommitted changes from a sibling Vendor-policy-migration session. Confirm with the user whether to commit that pending work first (as its own separate commit, so this task's commit is clean) or proceed knowing this task's commit will bundle both changes together.

- [ ] **Step 1: Add the failing assertion to the existing vendor-detail test**

Modify `tests/Feature/Modules/Vendor/ShowVendorTest.php` — find:

```php
        ->assertJsonPath('data.user.email', 'vendor@example.com')
```

Replace with:

```php
        ->assertJsonPath('data.user.email', 'vendor@example.com')
        ->assertJsonPath('data.user.id', $companyUser->id)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test tests/Feature/Modules/Vendor/ShowVendorTest.php --compact`
Expected: FAIL — `data.user.id` path doesn't exist in the response yet

- [ ] **Step 3: Add `id` to `VendorProfileResource`'s `user` block**

Modify `app/Modules/Vendor/Presentation/Http/Resources/VendorProfileResource.php` — find:

```php
            'user' => $this->whenLoaded('VendorProfilesUser', fn () => [
                'username' => $this->VendorProfilesUser->username,
                'email' => $this->VendorProfilesUser->email,
            ]),
```

Replace with:

```php
            'user' => $this->whenLoaded('VendorProfilesUser', fn () => [
                'id' => $this->VendorProfilesUser->id,
                'username' => $this->VendorProfilesUser->username,
                'email' => $this->VendorProfilesUser->email,
            ]),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test tests/Feature/Modules/Vendor/ShowVendorTest.php --compact`
Expected: PASS

- [ ] **Step 5: Run the full test suite to confirm no regressions**

Run: `php artisan test --compact`
Expected: Same baseline as before this plan (372 tests, 371 passed, 1 pre-existing unrelated `ExampleTest` failure) plus every new test from Tasks 1–3 passing — total new tests: 10 (Task 1 `ListUsersQueryTest`) + 2 (Task 1 `GetUserByIdQueryTest`) + 11 (Task 2 `ListUsersTest`) + 5 (Task 2 `ShowUserTest`) + 1 (Task 3, added to existing `ShowVendorTest`) = 29 new passing tests.

- [ ] **Step 6: Run Pint on all touched PHP files**

Run: `vendor/bin/pint --dirty --format agent`
Expected: No remaining style issues (Pint auto-fixes in place; re-run confirms clean).

- [ ] **Step 7: Commit**

```bash
git add app/Modules/Vendor/Presentation/Http/Resources/VendorProfileResource.php tests/Feature/Modules/Vendor/ShowVendorTest.php
git commit -m "feat(vendor): expose user id in VendorProfileResource for the user-detail cross-link"
```
