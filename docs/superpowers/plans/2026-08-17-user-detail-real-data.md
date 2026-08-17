# User Detail Page — Real Data Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock-data-only User Detail page (`frontend/app/dashboard/users/detail/`) with real backend data across Overview, Permissions, and Sessions tabs, including new backend support (Laravel `sessions`-table-backed session management, `last_login_at`/`password_changed_at` tracking, and exposing already-existing `role`/`internalProfile`/`permissions`/`email_verified_at` data that the API currently withholds).

**Architecture:** Backend tasks run first (they define the API contract the frontend consumes), then frontend tasks rewire the mock page to real hooks. Sessions are read directly from Laravel's own `sessions` DB table (real, already populated on every request via `SESSION_DRIVER=database`) rather than Sanctum tokens (confirmed unused — `HasApiTokens` is attached but nothing ever calls `createToken()`). Two-Factor Authentication and the Activity log tab are removed from the UI entirely — no backend work for either.

**Tech Stack:** Laravel 13 / PHP 8.3 / nwidart/laravel-modules / spatie/laravel-permission / Pest (backend); Next.js / React / TypeScript / TanStack Query (frontend).

## Global Constraints

- Backend permission gate for all new session-management routes: `users.update` (already seeded in `AdminUserSeeder.php`) — matches the existing gate used for `edit/page.tsx` on the frontend.
- No new backend concept for Two-Factor Authentication or Activity log — both are deleted from the frontend UI, not stubbed.
- The admin "reset another user's password" / "suspend another user's account" backend endpoints do not exist yet (confirmed: no `PATCH /dashboard/users/{id}` route). Do not build them as part of this plan — `UserDetailHeader`'s Reset Password / Suspend / Activate actions stay demo-only toasts.
- Several backend files this plan touches (Domain entities, Repositories, Controllers, Resources, everything under `app/Modules/Auth`) may be outside this session's currently-granted backend directory write access. A permission prompt for an additional path during implementation is expected, not a bug.
- Frontend has no test runner. Verification is `npx tsc --noEmit` + `npm run lint` (baseline: 11 pre-existing problems, 8 errors/3 warnings, all in files this plan does not touch — any new error/warning is a regression) + a disclosed-as-not-yet-performed manual QA checklist (no browser automation available in this dev environment).
- Backend tests use Pest's functional style (`test()`/`expect()`), `uses(RefreshDatabase::class)`, and a local helper function per test file — follow the exact style already in `tests/Feature/Modules/User/` and `tests/Feature/Modules/Auth/`.

---

### Task 1: `last_login_at` / `password_changed_at` tracking

**Files:**
- Create: `backend/database/migrations/2026_08_17_120000_add_last_login_and_password_changed_at_to_users_table.php`
- Modify: `backend/app/Modules/User/Infrastructure/Models/User.php:26` (Fillable attribute), `:47-55` (casts)
- Modify: `backend/app/Modules/User/Domain/Entities/User.php` (constructor, `register()`, `reconstitute()`, `changePassword()`, add `recordLogin()`, add two getters)
- Modify: `backend/app/Modules/User/Infrastructure/Repositories/UserRepository.php:13-28` (`save()`), `:56-71` (`toDomain()`)
- Modify: `backend/app/Modules/Auth/Application/UseCases/LoginUseCase.php:19-50` (`execute()`)
- Test: `backend/tests/Feature/Modules/Auth/LoginUseCaseTest.php` (append), `backend/tests/Feature/Modules/Auth/ChangePasswordUseCaseTest.php` (append)

**Interfaces:**
- Produces: `User::recordLogin(): void` (domain entity method, sets `lastLoginAt` to now), `User::lastLoginAt(): ?CarbonImmutable`, `User::passwordChangedAt(): ?CarbonImmutable` (getters). `User::changePassword()` now also sets `passwordChangedAt`. Eloquent `User` model gains readable `last_login_at`/`password_changed_at` datetime-cast attributes. Task 2 consumes these getters/columns to expose them via API resources.

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/Feature/Modules/Auth/LoginUseCaseTest.php` (after line 179, the closing `});` of the `'login fails when the account is inactive'` test):

```php

test('login records last_login_at on success', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
    ]);

    $user = loginUseCase()->execute(new LoginData(
        identifier: 'jdoe@example.com',
        identifierField: 'email',
        password: 'secret123',
        remember: false,
    ));

    expect($user->lastLoginAt())->not->toBeNull();
});
```

Append to `backend/tests/Feature/Modules/Auth/ChangePasswordUseCaseTest.php` (after line 52, the closing `});` of the `'execute throws when the current password is wrong'` test):

```php

test('execute records password_changed_at', function () {
    $user = UserModel::factory()->create([
        'password' => Hash::make('old-secret123'),
    ]);

    changePasswordUseCase()->execute(new ChangePasswordData(
        userId: $user->id,
        currentPassword: 'old-secret123',
        password: 'new-secret123',
    ));

    expect($user->fresh()->password_changed_at)->not->toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && php artisan test --filter="records last_login_at|records password_changed_at"`
Expected: FAIL — `lastLoginAt()` and `recordLogin()` don't exist yet (`Call to undefined method`), and `password_changed_at` column doesn't exist yet (or is always null).

- [ ] **Step 3: Create the migration**

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
            $table->timestamp('last_login_at')->nullable()->after('email_verified_at');
            $table->timestamp('password_changed_at')->nullable()->after('last_login_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['last_login_at', 'password_changed_at']);
        });
    }
};
```

- [ ] **Step 4: Update the Eloquent model**

In `backend/app/Modules/User/Infrastructure/Models/User.php`, change line 26 from:

```php
#[Fillable(['username', 'email', 'password', 'user_type', 'status'])]
```

to:

```php
#[Fillable(['username', 'email', 'password', 'user_type', 'status', 'last_login_at', 'password_changed_at'])]
```

And change the `casts()` method (lines 47-55) from:

```php
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'user_type' => UserType::class,
            'status' => UserStatus::class,
        ];
    }
```

to:

```php
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password_changed_at' => 'datetime',
            'password' => 'hashed',
            'user_type' => UserType::class,
            'status' => UserStatus::class,
        ];
    }
```

- [ ] **Step 5: Update the domain entity**

In `backend/app/Modules/User/Domain/Entities/User.php`, change the constructor (lines 17-27) from:

```php
    private function __construct(
        private readonly ?int $id,
        private string $username,
        private Email $email,
        private string $password,
        private readonly UserType $userType,
        private UserStatus $status,
        private ?CarbonImmutable $emailVerifiedAt,
        private ?CarbonImmutable $createdAt,
        private ?CarbonImmutable $updatedAt,
    ) {}
```

to:

```php
    private function __construct(
        private readonly ?int $id,
        private string $username,
        private Email $email,
        private string $password,
        private readonly UserType $userType,
        private UserStatus $status,
        private ?CarbonImmutable $emailVerifiedAt,
        private ?CarbonImmutable $lastLoginAt,
        private ?CarbonImmutable $passwordChangedAt,
        private ?CarbonImmutable $createdAt,
        private ?CarbonImmutable $updatedAt,
    ) {}
```

Change `register()` (lines 29-46) from:

```php
    public static function register(
        string $username,
        Email $email,
        string $passwordHash,
        UserType $userType
    ): self {
        return new self(
            id: null,
            username: $username,
            email: $email,
            password: $passwordHash,
            userType: $userType,
            status: new Pending(null),
            emailVerifiedAt: null,
            createdAt: null,
            updatedAt: null,
        );
    }
```

to:

```php
    public static function register(
        string $username,
        Email $email,
        string $passwordHash,
        UserType $userType
    ): self {
        return new self(
            id: null,
            username: $username,
            email: $email,
            password: $passwordHash,
            userType: $userType,
            status: new Pending(null),
            emailVerifiedAt: null,
            lastLoginAt: null,
            passwordChangedAt: null,
            createdAt: null,
            updatedAt: null,
        );
    }
```

Change `reconstitute()` (lines 48-70) from:

```php
    public static function reconstitute(
        int $id,
        string $username,
        Email $email,
        string $passwordHash,
        UserType $userType,
        UserStatus $status,
        ?CarbonImmutable $emailVerifiedAt,
        CarbonImmutable $createdAt,
        CarbonImmutable $updatedAt,
    ): self {
        return new self(
            id: $id,
            username: $username,
            email: $email,
            password: $passwordHash,
            userType: $userType,
            status: $status,
            emailVerifiedAt: $emailVerifiedAt,
            createdAt: $createdAt,
            updatedAt: $updatedAt,
        );
    }
```

to:

```php
    public static function reconstitute(
        int $id,
        string $username,
        Email $email,
        string $passwordHash,
        UserType $userType,
        UserStatus $status,
        ?CarbonImmutable $emailVerifiedAt,
        ?CarbonImmutable $lastLoginAt,
        ?CarbonImmutable $passwordChangedAt,
        CarbonImmutable $createdAt,
        CarbonImmutable $updatedAt,
    ): self {
        return new self(
            id: $id,
            username: $username,
            email: $email,
            password: $passwordHash,
            userType: $userType,
            status: $status,
            emailVerifiedAt: $emailVerifiedAt,
            lastLoginAt: $lastLoginAt,
            passwordChangedAt: $passwordChangedAt,
            createdAt: $createdAt,
            updatedAt: $updatedAt,
        );
    }
```

Change `changePassword()` (lines 133-137) from:

```php
    public function changePassword(string $passwordHash): void
    {
        $this->password = $passwordHash;
        $this->touch();
    }
```

to:

```php
    public function changePassword(string $passwordHash): void
    {
        $this->password = $passwordHash;
        $this->passwordChangedAt = CarbonImmutable::now();
        $this->touch();
    }
```

Add a new `recordLogin()` method directly after `changePassword()` (i.e. after the new line 138, before the `private function touch()` block):

```php

    public function recordLogin(): void
    {
        $this->lastLoginAt = CarbonImmutable::now();
        $this->touch();
    }
```

Add two new getters directly after `emailVerifiedAt()` (currently lines 177-180):

```php

    public function lastLoginAt(): ?CarbonImmutable
    {
        return $this->lastLoginAt;
    }

    public function passwordChangedAt(): ?CarbonImmutable
    {
        return $this->passwordChangedAt;
    }
```

- [ ] **Step 6: Update the repository**

In `backend/app/Modules/User/Infrastructure/Repositories/UserRepository.php`, change `save()` (lines 13-28) from:

```php
    public function save(User $user): User
    {
        $model = $user->id() !== null
            ? UserModel::findOrFail($user->id())
            : new UserModel;

        $model->username = $user->username();
        $model->email = (string) $user->email();
        $model->password = $user->passwordHash();
        $model->user_type = $user->userType();
        $model->status = $user->status();
        $model->email_verified_at = $user->emailVerifiedAt();
        $model->save();

        return $this->toDomain($model);
    }
```

to:

```php
    public function save(User $user): User
    {
        $model = $user->id() !== null
            ? UserModel::findOrFail($user->id())
            : new UserModel;

        $model->username = $user->username();
        $model->email = (string) $user->email();
        $model->password = $user->passwordHash();
        $model->user_type = $user->userType();
        $model->status = $user->status();
        $model->email_verified_at = $user->emailVerifiedAt();
        $model->last_login_at = $user->lastLoginAt();
        $model->password_changed_at = $user->passwordChangedAt();
        $model->save();

        return $this->toDomain($model);
    }
```

Change `toDomain()` (lines 56-71) from:

```php
    private function toDomain(UserModel $model): User
    {
        return User::reconstitute(
            id: $model->id,
            username: $model->username,
            email: Email::fromString($model->email),
            passwordHash: $model->password,
            userType: $model->user_type,
            status: $model->status,
            emailVerifiedAt: $model->email_verified_at !== null
                ? CarbonImmutable::instance($model->email_verified_at)
                : null,
            createdAt: CarbonImmutable::instance($model->created_at),
            updatedAt: CarbonImmutable::instance($model->updated_at),
        );
    }
```

to:

```php
    private function toDomain(UserModel $model): User
    {
        return User::reconstitute(
            id: $model->id,
            username: $model->username,
            email: Email::fromString($model->email),
            passwordHash: $model->password,
            userType: $model->user_type,
            status: $model->status,
            emailVerifiedAt: $model->email_verified_at !== null
                ? CarbonImmutable::instance($model->email_verified_at)
                : null,
            lastLoginAt: $model->last_login_at !== null
                ? CarbonImmutable::instance($model->last_login_at)
                : null,
            passwordChangedAt: $model->password_changed_at !== null
                ? CarbonImmutable::instance($model->password_changed_at)
                : null,
            createdAt: CarbonImmutable::instance($model->created_at),
            updatedAt: CarbonImmutable::instance($model->updated_at),
        );
    }
```

- [ ] **Step 7: Wire `recordLogin()` into `LoginUseCase`**

In `backend/app/Modules/Auth/Application/UseCases/LoginUseCase.php`, change the end of `execute()` (lines 43-49) from:

```php
        if ($user->status() instanceof Inactive) {
            throw ValidationException::withMessages([
                'identifier' => 'บัญชีของคุณถูกปิดใช้งาน',
            ]);
        }

        return $user;
    }
```

to:

```php
        if ($user->status() instanceof Inactive) {
            throw ValidationException::withMessages([
                'identifier' => 'บัญชีของคุณถูกปิดใช้งาน',
            ]);
        }

        $user->recordLogin();

        return $this->users->save($user);
    }
```

- [ ] **Step 8: Run migration and tests, verify they pass**

Run: `cd backend && php artisan migrate`
Expected: `2026_08_17_120000_add_last_login_and_password_changed_at_to_users_table` runs successfully.

Run: `cd backend && php artisan test --filter="records last_login_at|records password_changed_at"`
Expected: PASS (2 tests).

Run: `cd backend && php artisan test tests/Feature/Modules/Auth/LoginUseCaseTest.php tests/Feature/Modules/Auth/ChangePasswordUseCaseTest.php`
Expected: PASS (all existing + 2 new tests — confirms no regression).

- [ ] **Step 9: Commit**

```bash
git add backend/database/migrations/2026_08_17_120000_add_last_login_and_password_changed_at_to_users_table.php backend/app/Modules/User/Infrastructure/Models/User.php backend/app/Modules/User/Domain/Entities/User.php backend/app/Modules/User/Infrastructure/Repositories/UserRepository.php backend/app/Modules/Auth/Application/UseCases/LoginUseCase.php backend/tests/Feature/Modules/Auth/LoginUseCaseTest.php backend/tests/Feature/Modules/Auth/ChangePasswordUseCaseTest.php
git commit -m "feat(user): track last_login_at and password_changed_at"
```

---

### Task 2: Expose role, internalProfile, permissions, and security timestamps via API

**Files:**
- Modify: `backend/app/Modules/User/Presentation/Http/Resources/UserResource.php` (full rewrite of `toArray()`)
- Test: `backend/tests/Feature/Modules/User/UserResourceFieldsTest.php` (new)

**Interfaces:**
- Consumes: `last_login_at`/`password_changed_at` columns from Task 1, `email_verified_at` (already existed), `getRoleNames()`/`getAllPermissions()` (Spatie `HasRoles`, already on the model), `UserInternalProfile()` relation (already on the model).
- Produces: `GET /api/v1/dashboard/users` and `GET /api/v1/dashboard/users/{id}` responses gain `role: string|undefined`, `internalProfile: {employeeNo,prefix,firstname,lastname,department,position,phone}|undefined`, `permissions: string[]`, `emailVerifiedAt: string|undefined`, `lastLoginAt: string|undefined`, `passwordChangedAt: string|undefined`. **The key is omitted entirely when the value is absent, not sent as `null`** — matching the existing `AuthenticatedUserResource.php:27-28` idiom (`whenNotNull()`), rather than the earlier `spec` draft's plain-null approach. Task 4 (frontend) normalizes these back to `null` at the API boundary so the rest of the frontend never has to deal with `undefined`. Task 5 (frontend) consumes the normalized field names.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/Modules/User/UserResourceFieldsTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function actingInternalAdmin(): User
{
    $admin = User::factory()->create(['user_type' => 'internal']);
    $role = Role::create(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'users.viewAny', 'guard_name' => 'web']));
    $admin->assignRole($role);

    return $admin;
}

test('user detail exposes role, internalProfile, and permissions for an internal user', function () {
    $admin = actingInternalAdmin();
    $this->actingAs($admin, 'web');

    $target = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create([
        'user_id' => $target->id,
        'employee_no' => 'EMP-001',
        'prefix' => 'นาย',
        'firstname' => 'สมชาย',
        'lastname' => 'ใจดี',
        'department' => 'ฝ่ายจัดซื้อ',
        'position' => 'เจ้าหน้าที่',
        'phone' => '0812345678',
    ]);
    $staffRole = Role::create(['name' => 'staff', 'guard_name' => 'web']);
    $staffRole->givePermissionTo(Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']));
    $target->assignRole($staffRole);

    $response = $this->getJson("/api/v1/dashboard/users/{$target->id}");

    $response->assertOk()
        ->assertJsonPath('data.role', 'staff')
        ->assertJsonPath('data.internalProfile.employeeNo', 'EMP-001')
        ->assertJsonPath('data.internalProfile.firstname', 'สมชาย')
        ->assertJsonPath('data.permissions', ['vendors.view']);
});

test('user detail omits internalProfile, role, emailVerifiedAt, lastLoginAt, and passwordChangedAt when absent', function () {
    $admin = actingInternalAdmin();
    $this->actingAs($admin, 'web');

    $target = User::factory()->unverified()->create(['user_type' => 'company']);

    $response = $this->getJson("/api/v1/dashboard/users/{$target->id}");

    $response->assertOk()
        ->assertJsonMissingPath('data.internalProfile')
        ->assertJsonMissingPath('data.role')
        ->assertJsonMissingPath('data.emailVerifiedAt')
        ->assertJsonMissingPath('data.lastLoginAt')
        ->assertJsonMissingPath('data.passwordChangedAt');
});

test('user detail exposes emailVerifiedAt, lastLoginAt, and passwordChangedAt', function () {
    $admin = actingInternalAdmin();
    $this->actingAs($admin, 'web');

    $target = User::factory()->create([
        'user_type' => 'internal',
        'last_login_at' => now(),
        'password_changed_at' => now(),
    ]);

    $response = $this->getJson("/api/v1/dashboard/users/{$target->id}");

    $response->assertOk();
    expect($response->json('data.emailVerifiedAt'))->not->toBeNull();
    expect($response->json('data.lastLoginAt'))->not->toBeNull();
    expect($response->json('data.passwordChangedAt'))->not->toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && php artisan test tests/Feature/Modules/User/UserResourceFieldsTest.php`
Expected: FAIL — `data.role`, `data.internalProfile`, `data.permissions`, `data.lastLoginAt`, `data.passwordChangedAt` are missing from the response in the first test (which needs them present with real values); the second test's `assertJsonMissingPath` calls will currently pass vacuously since none of these keys exist yet at all, but the first and third tests will fail.

- [ ] **Step 3: Update `UserResource`**

Replace the full contents of `backend/app/Modules/User/Presentation/Http/Resources/UserResource.php`:

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
            'role' => $this->whenNotNull($this->getRoleNames()->first()),
            'internalProfile' => $this->whenNotNull($this->user_type === UserType::Internal ? [
                'employeeNo' => $this->UserInternalProfile?->employee_no,
                'prefix' => $this->UserInternalProfile?->prefix,
                'firstname' => $this->UserInternalProfile?->firstname,
                'lastname' => $this->UserInternalProfile?->lastname,
                'department' => $this->UserInternalProfile?->department,
                'position' => $this->UserInternalProfile?->position,
                'phone' => $this->UserInternalProfile?->phone,
            ] : null),
            'permissions' => $this->getAllPermissions()->pluck('name'),
            'emailVerifiedAt' => $this->whenNotNull($this->email_verified_at?->toIso8601String()),
            'lastLoginAt' => $this->whenNotNull($this->last_login_at?->toIso8601String()),
            'passwordChangedAt' => $this->whenNotNull($this->password_changed_at?->toIso8601String()),
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

(`UserDetailResource` needs no changes — it already spreads `parent::toArray($request)` and only adds `vendorProfileId`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && php artisan test tests/Feature/Modules/User/UserResourceFieldsTest.php`
Expected: PASS (3 tests).

Run: `cd backend && php artisan test tests/Feature/Modules/User/`
Expected: PASS (all tests in the module — confirms no regression to `ListUsersTest.php`/`GetUserByIdQueryTest.php`/etc.)

- [ ] **Step 5: Commit**

```bash
git add backend/app/Modules/User/Presentation/Http/Resources/UserResource.php backend/tests/Feature/Modules/User/UserResourceFieldsTest.php
git commit -m "feat(user): expose role, internalProfile, permissions, and security timestamps in the user API"
```

---

### Task 3: Sessions feature (list + revoke)

**Files:**
- Modify: `backend/composer.json` (new dependency)
- Create: `backend/app/Modules/User/Application/Queries/ListUserSessionsQuery.php`
- Create: `backend/app/Modules/User/Application/UseCases/RevokeUserSessionUseCase.php`
- Create: `backend/app/Modules/User/Application/UseCases/RevokeAllUserSessionsUseCase.php`
- Create: `backend/app/Modules/User/Presentation/Http/Resources/SessionResource.php`
- Modify: `backend/app/Modules/User/Presentation/Http/Controllers/UserController.php` (full rewrite)
- Modify: `backend/routes/api/v1/dashboard/users.php` (append routes)
- Test: `backend/tests/Feature/Modules/User/UserSessionsTest.php` (new)

**Interfaces:**
- Consumes: existing `users.update` permission (seeded in `AdminUserSeeder.php`), existing `can:` route middleware convention (see `roles`/`users` routes in the same file).
- Produces: `GET /api/v1/dashboard/users/{id}/sessions` → `{ data: SessionInfo[] }` where `SessionInfo = { id: string, device: "Desktop"|"Mobile"|"Tablet"|"Unknown", browser: string, os: string, ipAddress: string, lastActiveAt: string, current: boolean }`. `DELETE /api/v1/dashboard/users/{id}/sessions/{sessionId}` and `DELETE /api/v1/dashboard/users/{id}/sessions[?keep_current=1]`, both returning `{ message: string }`. Task 6 (frontend) consumes this exact shape and these exact routes.

- [ ] **Step 1: Add the `jenssegers/agent` dependency**

Run: `cd backend && composer require jenssegers/agent`
Expected: `composer.json`'s `require` block gains a `"jenssegers/agent": "^..."` line; `composer.lock` updates.

- [ ] **Step 2: Write the failing tests**

Create `backend/tests/Feature/Modules/User/UserSessionsTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function actingSessionsAdmin(): User
{
    $admin = User::factory()->create(['user_type' => 'internal']);
    $role = Role::create(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'users.update', 'guard_name' => 'web']));
    $admin->assignRole($role);

    return $admin;
}

function insertSessionRow(string $id, int $userId, string $userAgent, ?int $lastActivity = null): void
{
    DB::table('sessions')->updateOrInsert(['id' => $id], [
        'user_id' => $userId,
        'ip_address' => '10.0.0.5',
        'user_agent' => $userAgent,
        'payload' => 'x',
        'last_activity' => $lastActivity ?? now()->timestamp,
    ]);
}

test('fetching sessions requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/users/1/sessions');

    $response->assertStatus(401);
});

test('fetching sessions requires the users.update permission', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson("/api/v1/dashboard/users/{$user->id}/sessions");

    $response->assertStatus(403);
});

test('sessions list marks the row matching the current session as current and parses the user agent', function () {
    $admin = actingSessionsAdmin();
    $this->actingAs($admin, 'web');

    insertSessionRow(
        session()->getId(),
        $admin->id,
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );

    $response = $this->getJson("/api/v1/dashboard/users/{$admin->id}/sessions");

    $response->assertOk()
        ->assertJsonPath('data.0.current', true)
        ->assertJsonPath('data.0.browser', 'Chrome')
        ->assertJsonPath('data.0.os', 'Windows')
        ->assertJsonPath('data.0.device', 'Desktop');
});

test('sessions list only returns rows for the requested user', function () {
    $admin = actingSessionsAdmin();
    $this->actingAs($admin, 'web');
    $otherUser = User::factory()->create(['user_type' => 'internal']);

    insertSessionRow(session()->getId(), $admin->id, 'Mozilla/5.0');
    insertSessionRow('unrelated-session-id', $otherUser->id, 'Mozilla/5.0');

    $response = $this->getJson("/api/v1/dashboard/users/{$admin->id}/sessions");

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
});

test('revoking a single session removes only that row, scoped to the user', function () {
    $admin = actingSessionsAdmin();
    $this->actingAs($admin, 'web');
    $otherUser = User::factory()->create(['user_type' => 'internal']);

    insertSessionRow('target-session', $admin->id, 'Mozilla/5.0');
    insertSessionRow('other-users-session', $otherUser->id, 'Mozilla/5.0');

    $this->deleteJson("/api/v1/dashboard/users/{$admin->id}/sessions/target-session")->assertOk();
    $this->deleteJson("/api/v1/dashboard/users/{$admin->id}/sessions/other-users-session")->assertOk();

    expect(DB::table('sessions')->where('id', 'target-session')->exists())->toBeFalse();
    expect(DB::table('sessions')->where('id', 'other-users-session')->exists())->toBeTrue();
});

test('revoking all sessions with keep_current preserves only the current row', function () {
    $admin = actingSessionsAdmin();
    $this->actingAs($admin, 'web');

    $currentId = session()->getId();
    insertSessionRow($currentId, $admin->id, 'Mozilla/5.0');
    insertSessionRow('stale-session', $admin->id, 'Mozilla/5.0', now()->subDay()->timestamp);

    $this->deleteJson("/api/v1/dashboard/users/{$admin->id}/sessions?keep_current=1")->assertOk();

    expect(DB::table('sessions')->where('id', $currentId)->exists())->toBeTrue();
    expect(DB::table('sessions')->where('id', 'stale-session')->exists())->toBeFalse();
});

test('revoking all sessions without keep_current removes every row including current', function () {
    $admin = actingSessionsAdmin();
    $this->actingAs($admin, 'web');

    $currentId = session()->getId();
    insertSessionRow($currentId, $admin->id, 'Mozilla/5.0');
    insertSessionRow('stale-session', $admin->id, 'Mozilla/5.0', now()->subDay()->timestamp);

    $this->deleteJson("/api/v1/dashboard/users/{$admin->id}/sessions")->assertOk();

    expect(DB::table('sessions')->where('user_id', $admin->id)->count())->toBe(0);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && php artisan test tests/Feature/Modules/User/UserSessionsTest.php`
Expected: FAIL — routes don't exist yet (404s).

- [ ] **Step 4: Create `ListUserSessionsQuery`**

```php
<?php

namespace App\Modules\User\Application\Queries;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class ListUserSessionsQuery
{
    public function execute(int $userId): Collection
    {
        return DB::table('sessions')
            ->where('user_id', $userId)
            ->orderByDesc('last_activity')
            ->get();
    }
}
```

- [ ] **Step 5: Create the revoke use-cases**

`backend/app/Modules/User/Application/UseCases/RevokeUserSessionUseCase.php`:

```php
<?php

namespace App\Modules\User\Application\UseCases;

use Illuminate\Support\Facades\DB;

final class RevokeUserSessionUseCase
{
    public function execute(int $userId, string $sessionId): void
    {
        DB::table('sessions')
            ->where('user_id', $userId)
            ->where('id', $sessionId)
            ->delete();
    }
}
```

`backend/app/Modules/User/Application/UseCases/RevokeAllUserSessionsUseCase.php`:

```php
<?php

namespace App\Modules\User\Application\UseCases;

use Illuminate\Support\Facades\DB;

final class RevokeAllUserSessionsUseCase
{
    public function execute(int $userId, ?string $keepSessionId = null): void
    {
        DB::table('sessions')
            ->where('user_id', $userId)
            ->when($keepSessionId !== null, fn ($query) => $query->where('id', '!=', $keepSessionId))
            ->delete();
    }
}
```

- [ ] **Step 6: Create `SessionResource`**

```php
<?php

namespace App\Modules\User\Presentation\Http\Resources;

use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Jenssegers\Agent\Agent;

class SessionResource extends JsonResource
{
    public static $wrap = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $agent = new Agent;
        $agent->setUserAgent($this->user_agent ?? '');

        return [
            'id' => $this->id,
            'device' => match (true) {
                $agent->isMobile() => 'Mobile',
                $agent->isTablet() => 'Tablet',
                $agent->isDesktop() => 'Desktop',
                default => 'Unknown',
            },
            'browser' => $agent->browser() ?: 'Unknown',
            'os' => $agent->platform() ?: 'Unknown',
            'ipAddress' => $this->ip_address,
            'lastActiveAt' => CarbonImmutable::createFromTimestamp((int) $this->last_activity)->toIso8601String(),
            'current' => $this->id === $request->session()->getId(),
        ];
    }
}
```

- [ ] **Step 7: Wire the controller**

Replace the full contents of `backend/app/Modules/User/Presentation/Http/Controllers/UserController.php`:

```php
<?php

namespace App\Modules\User\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\User\Application\Queries\GetUserByIdQuery;
use App\Modules\User\Application\Queries\ListUserSessionsQuery;
use App\Modules\User\Application\Queries\ListUsersQuery;
use App\Modules\User\Application\UseCases\RevokeAllUserSessionsUseCase;
use App\Modules\User\Application\UseCases\RevokeUserSessionUseCase;
use App\Modules\User\Presentation\Http\Requests\ListUsersRequest;
use App\Modules\User\Presentation\Http\Resources\SessionResource;
use App\Modules\User\Presentation\Http\Resources\UserDetailResource;
use App\Modules\User\Presentation\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(
        private readonly ListUsersQuery $listUsers,
        private readonly GetUserByIdQuery $getUserById,
        private readonly ListUserSessionsQuery $listUserSessions,
        private readonly RevokeUserSessionUseCase $revokeUserSession,
        private readonly RevokeAllUserSessionsUseCase $revokeAllUserSessions,
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

    public function sessions(int $id): JsonResponse
    {
        return response()->json([
            'data' => SessionResource::collection($this->listUserSessions->execute($id)),
        ]);
    }

    public function revokeSession(int $id, string $sessionId): JsonResponse
    {
        $this->revokeUserSession->execute($id, $sessionId);

        return response()->json(['message' => 'เพิกถอน session สำเร็จ']);
    }

    public function revokeAllSessions(int $id, Request $request): JsonResponse
    {
        $this->revokeAllUserSessions->execute(
            $id,
            $request->boolean('keep_current') ? $request->session()->getId() : null,
        );

        return response()->json(['message' => 'เพิกถอน session สำเร็จ']);
    }
}
```

- [ ] **Step 8: Add the routes**

In `backend/routes/api/v1/dashboard/users.php`, insert immediately after the `users/{id}` route block (after line 12, before the blank line preceding the `permissions` group):

```php

    Route::get('users/{id}/sessions', [UserController::class, 'sessions'])
        ->middleware('can:users.update')
        ->whereNumber('id')
        ->name('dashboard.users.sessions.index');
    Route::delete('users/{id}/sessions/{sessionId}', [UserController::class, 'revokeSession'])
        ->middleware('can:users.update')
        ->whereNumber('id')
        ->where('sessionId', '[A-Za-z0-9]+')
        ->name('dashboard.users.sessions.revoke');
    Route::delete('users/{id}/sessions', [UserController::class, 'revokeAllSessions'])
        ->middleware('can:users.update')
        ->whereNumber('id')
        ->name('dashboard.users.sessions.revokeAll');
```

The full file should read:

```php
<?php

use App\Modules\User\Presentation\Http\Controllers\PermissionController;
use App\Modules\User\Presentation\Http\Controllers\RoleController;
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

    Route::get('users/{id}/sessions', [UserController::class, 'sessions'])
        ->middleware('can:users.update')
        ->whereNumber('id')
        ->name('dashboard.users.sessions.index');
    Route::delete('users/{id}/sessions/{sessionId}', [UserController::class, 'revokeSession'])
        ->middleware('can:users.update')
        ->whereNumber('id')
        ->where('sessionId', '[A-Za-z0-9]+')
        ->name('dashboard.users.sessions.revoke');
    Route::delete('users/{id}/sessions', [UserController::class, 'revokeAllSessions'])
        ->middleware('can:users.update')
        ->whereNumber('id')
        ->name('dashboard.users.sessions.revokeAll');

    Route::get('permissions', [PermissionController::class, 'index'])
        ->middleware('role:admin')
        ->name('dashboard.permissions.index');

    Route::get('roles', [RoleController::class, 'index'])
        ->middleware('can:users.viewAny')
        ->name('dashboard.roles.index');
    Route::post('roles', [RoleController::class, 'store'])
        ->middleware('role:admin')
        ->name('dashboard.roles.store');
});
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `cd backend && php artisan test tests/Feature/Modules/User/UserSessionsTest.php`
Expected: PASS (7 tests).

Run: `cd backend && php artisan test`
Expected: full suite PASS — confirms no regression anywhere (in particular `RolesIndexTest.php`/`PermissionsIndexTest.php`, which exercise the same routes file).

- [ ] **Step 10: Commit**

```bash
git add backend/composer.json backend/composer.lock backend/app/Modules/User/Application/Queries/ListUserSessionsQuery.php backend/app/Modules/User/Application/UseCases/RevokeUserSessionUseCase.php backend/app/Modules/User/Application/UseCases/RevokeAllUserSessionsUseCase.php backend/app/Modules/User/Presentation/Http/Resources/SessionResource.php backend/app/Modules/User/Presentation/Http/Controllers/UserController.php backend/routes/api/v1/dashboard/users.php backend/tests/Feature/Modules/User/UserSessionsTest.php
git commit -m "feat(user): add session list/revoke endpoints backed by the sessions table"
```

---

### Task 4: Frontend types, hooks, and mock-data removal

**Files:**
- Delete: `frontend/app/dashboard/users/detail/_data/mock-user-detail.ts`
- Modify: `frontend/lib/user/management/types.ts`
- Modify: `frontend/lib/user/management/api.ts`
- Create: `frontend/lib/user/management/queries/useUserSessions.ts`
- Create: `frontend/lib/user/management/mutations/useRevokeUserSession.ts`
- Create: `frontend/lib/user/management/mutations/useRevokeAllUserSessions.ts`

**Interfaces:**
- Consumes: Task 3's exact response shape and routes.
- Produces: `SessionInfo` type, `useUserSessions(id)`, `useRevokeUserSession(userId)`, `useRevokeAllUserSessions(userId)` — Task 6 consumes all four. `UserDetail` gains `emailVerifiedAt`/`lastLoginAt`/`passwordChangedAt` — Task 5 consumes these.

- [ ] **Step 1: Delete the mock data file**

```bash
rm frontend/app/dashboard/users/detail/_data/mock-user-detail.ts
```

- [ ] **Step 2: Extend `UserDetail` and add `SessionInfo`**

In `frontend/lib/user/management/types.ts`, change:

```ts
export interface UserDetail extends UserListItem {
  vendorProfileId: number | null;
  role: string | null;
  internalProfile: InternalProfileFields | null;
  permissions: string[] | null;
}
```

to:

```ts
export interface UserDetail extends UserListItem {
  vendorProfileId: number | null;
  role: string | null;
  internalProfile: InternalProfileFields | null;
  permissions: string[] | null;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
}
```

Add at the end of the file:

```ts

export interface SessionInfo {
  id: string;
  device: "Desktop" | "Mobile" | "Tablet" | "Unknown";
  browser: string;
  os: string;
  ipAddress: string;
  lastActiveAt: string;
  current: boolean;
}
```

- [ ] **Step 3: Normalize `fetchUserDetail`'s response, then add the session API functions**

Task 2's `UserResource` omits `role`/`internalProfile`/`emailVerifiedAt`/`lastLoginAt`/`passwordChangedAt` from the JSON entirely when absent (matching the existing `AuthenticatedUserResource` idiom), rather than sending them as `null`. Left as-is, `data.data.role` etc. would be `undefined` at runtime while the `UserDetail` type claims `string | null` — a type lie that would also break any strict `=== null`/`!== null` check downstream (Task 5's `OverviewTab` uses exactly that kind of check for `emailVerifiedAt`). Normalize once, at this API-boundary function, so nothing downstream ever has to think about `undefined`.

In `frontend/lib/user/management/api.ts`, change:

```ts
export async function fetchUserDetail(id: number): Promise<UserDetail> {
  const { data } = await api.get<{ data: UserDetail }>(`/api/v1/dashboard/users/${id}`);
  return data.data;
}
```

to:

```ts
export async function fetchUserDetail(id: number): Promise<UserDetail> {
  const { data } = await api.get<{ data: UserDetail }>(`/api/v1/dashboard/users/${id}`);
  return {
    ...data.data,
    role: data.data.role ?? null,
    internalProfile: data.data.internalProfile ?? null,
    permissions: data.data.permissions ?? [],
    emailVerifiedAt: data.data.emailVerifiedAt ?? null,
    lastLoginAt: data.data.lastLoginAt ?? null,
    passwordChangedAt: data.data.passwordChangedAt ?? null,
  };
}
```

Add `SessionInfo` to the type import (change the `import type { ... } from "@/lib/user/management/types";` block to include `SessionInfo`), and append these functions after `fetchUserDetail`:

```ts

export async function fetchUserSessions(id: number): Promise<SessionInfo[]> {
  const { data } = await api.get<{ data: SessionInfo[] }>(`/api/v1/dashboard/users/${id}/sessions`);
  return data.data;
}

export async function revokeUserSession(userId: number, sessionId: string): Promise<void> {
  await api.delete(`/api/v1/dashboard/users/${userId}/sessions/${sessionId}`);
}

export async function revokeAllUserSessions(userId: number, keepCurrent: boolean): Promise<void> {
  await api.delete(`/api/v1/dashboard/users/${userId}/sessions`, {
    params: keepCurrent ? { keep_current: 1 } : undefined,
  });
}
```

- [ ] **Step 4: Add the query hook**

Create `frontend/lib/user/management/queries/useUserSessions.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchUserSessions } from "@/lib/user/management/api";

export function useUserSessions(id: number) {
  return useQuery({
    queryKey: ["users", "detail", id, "sessions"],
    queryFn: () => fetchUserSessions(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
```

- [ ] **Step 5: Add the revoke mutations**

Create `frontend/lib/user/management/mutations/useRevokeUserSession.ts`:

```ts
import { useMutation } from "@tanstack/react-query";
import { revokeUserSession } from "@/lib/user/management/api";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useRevokeUserSession(userId: number) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (sessionId: string) => revokeUserSession(userId, sessionId),
    onSettled: invalidate,
  });
}
```

Create `frontend/lib/user/management/mutations/useRevokeAllUserSessions.ts`:

```ts
import { useMutation } from "@tanstack/react-query";
import { revokeAllUserSessions } from "@/lib/user/management/api";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useRevokeAllUserSessions(userId: number) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (keepCurrent: boolean) => revokeAllUserSessions(userId, keepCurrent),
    onSettled: invalidate,
  });
}
```

- [ ] **Step 6: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: New errors in `app/dashboard/users/detail/page.tsx` and its `_components/*` (they still import the now-deleted `mock-user-detail.ts` / reference `MockUserDetail`) — this is expected and gets fixed in Tasks 5-6. No errors should appear in any file this task touched directly (`types.ts`, `api.ts`, the new hooks).

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/user/management/types.ts frontend/lib/user/management/api.ts frontend/lib/user/management/queries/useUserSessions.ts frontend/lib/user/management/mutations/useRevokeUserSession.ts frontend/lib/user/management/mutations/useRevokeAllUserSessions.ts
git rm frontend/app/dashboard/users/detail/_data/mock-user-detail.ts
git commit -m "feat(users): add session hooks and extend UserDetail with security fields"
```

---

### Task 5: Rewire `page.tsx` and `OverviewTab`/`PermissionsTab` to real data

**Files:**
- Modify: `frontend/app/dashboard/users/detail/page.tsx` (full rewrite)
- Modify: `frontend/app/dashboard/users/detail/_components/overview-tab.tsx` (full rewrite)
- Modify: `frontend/app/dashboard/users/detail/_components/permissions-tab.tsx` (full rewrite)

**Interfaces:**
- Consumes: `useUserDetail(id)` (existing, from `lib/user/management/queries/useUserDetail.ts`), `useRoles()` (existing), the extended `UserDetail` type from Task 4.
- Produces: `page.tsx` passes a real `UserDetail` (not `MockUserDetail`) to `UserDetailHeader`/`OverviewTab`/`PermissionsTab`/`SessionsTab` — Task 6 finishes wiring `SessionsTab` and deletes `ActivityTab`.

- [ ] **Step 1: Rewrite `OverviewTab`**

Replace the full contents of `frontend/app/dashboard/users/detail/_components/overview-tab.tsx`:

```tsx
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNotificationTime } from "@/lib/notification/utils";
import type { UserDetail, UserStatus, UserType } from "@/lib/user/management/types";
import { formatCitizenId, maskCitizenId } from "@/lib/utils";

const USER_TYPE_LABEL: Record<UserType, string> = {
  internal: "พนักงานภายใน",
  company: "นิติบุคคล",
  individual: "ร้านค้า",
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "-" : format(date, "dd-MM-yyyy", { locale: th });
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge className="bg-green-700/15 text-green-800">ยืนยันแล้ว</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">ยังไม่ยืนยัน</Badge>
  );
}

export function OverviewTab({ user, status }: { user: UserDetail; status: UserStatus }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลบัญชี</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <InfoRow label="Username" value={user.username} />
            <InfoRow label="อีเมล" value={user.email} />
            <InfoRow label="ประเภทผู้ใช้" value={USER_TYPE_LABEL[user.userType]} />
            <InfoRow label="สถานะ" value={<Badge variant="outline" className="capitalize">{status}</Badge>} />
            <InfoRow label="การยืนยันอีเมล" value={<VerifiedBadge verified={user.emailVerifiedAt !== null} />} />
            <InfoRow label="วันที่สร้างบัญชี" value={formatDate(user.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลส่วนตัว</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {user.userType === "internal" && user.internalProfile ? (
              <>
                <InfoRow label="รหัสพนักงาน" value={user.internalProfile.employeeNo ?? "-"} />
                <InfoRow
                  label="ชื่อ-นามสกุล"
                  value={`${user.internalProfile.prefix ?? ""}${user.internalProfile.firstname} ${user.internalProfile.lastname}`}
                />
                <InfoRow label="แผนก" value={user.internalProfile.department ?? "-"} />
                <InfoRow label="ตำแหน่ง" value={user.internalProfile.position ?? "-"} />
                <InfoRow label="เบอร์โทร" value={user.internalProfile.phone ?? "-"} />
              </>
            ) : (
              <p className="py-2 text-sm text-muted-foreground">ไม่มีข้อมูลส่วนตัวเพิ่มเติมสำหรับผู้ใช้ประเภทนี้</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ความปลอดภัย</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <InfoRow label="การยืนยันอีเมล" value={<VerifiedBadge verified={user.emailVerifiedAt !== null} />} />
          <InfoRow
            label="เข้าสู่ระบบล่าสุด"
            value={
              user.lastLoginAt ? (
                <Tooltip>
                  <TooltipTrigger render={<span className="cursor-default" />}>
                    {formatNotificationTime(user.lastLoginAt)}
                  </TooltipTrigger>
                  <TooltipContent>{formatDate(user.lastLoginAt)}</TooltipContent>
                </Tooltip>
              ) : (
                "ยังไม่เคยเข้าสู่ระบบ"
              )
            }
          />
          <InfoRow
            label="เปลี่ยนรหัสผ่านล่าสุด"
            value={user.passwordChangedAt ? formatNotificationTime(user.passwordChangedAt) : "ยังไม่เคยเปลี่ยนรหัสผ่าน"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

(`formatCitizenId`/`maskCitizenId` are no longer used here — the mock's company/individual profile fields don't exist in the real `UserDetail` type, so those branches are dropped along with the import. `Tooltip` import list stays as-is.)

- [ ] **Step 2: Rewrite `PermissionsTab`**

Replace the full contents of `frontend/app/dashboard/users/detail/_components/permissions-tab.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useRoles } from "@/lib/user/management/queries/useRoles";
import type { UserDetail } from "@/lib/user/management/types";

export function PermissionsTab({ user }: { user: UserDetail }) {
  const { data: roles } = useRoles();
  const matchedRole = roles?.find((role) => role.name === user.role);
  const rolePermissions = new Set(matchedRole?.permissions ?? []);
  const permissions = user.permissions ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Role</CardTitle>
        </CardHeader>
        <CardContent>
          {!user.role ? (
            <p className="text-sm text-muted-foreground">ผู้ใช้นี้ยังไม่ได้กำหนด role</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-red-700 text-white capitalize">{user.role}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>สิทธิ์การใช้งาน (Permissions)</CardTitle>
        </CardHeader>
        <CardContent>
          {permissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">ผู้ใช้นี้ยังไม่มีสิทธิ์การใช้งาน</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>สิทธิ์การใช้งาน</TableHead>
                  <TableHead>ที่มา</TableHead>
                  <TableHead className="text-right">สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((name) => (
                  <TableRow key={name}>
                    <TableCell>
                      <span className="text-sm font-medium">{name}</span>
                    </TableCell>
                    <TableCell>
                      {rolePermissions.has(name) ? (
                        <Badge variant="outline">Role</Badge>
                      ) : (
                        <Badge variant="secondary">กำหนดเอง (Direct)</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-green-700/15 text-green-800">เปิดใช้งาน</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

(The mock version showed a `label` plus raw `name` per permission; the real `UserDetail.permissions` is just `string[]` of raw names, matching what `useRoles()`'s `RoleDetail.permissions` also is — so the table now shows just the raw name, consistent with how permission names are already displayed elsewhere in this codebase, e.g. `RoleSelect`.)

- [ ] **Step 3: Rewrite `page.tsx` to fetch the real user**

Replace the full contents of `frontend/app/dashboard/users/detail/page.tsx`:

```tsx
"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { useUserDetail } from "@/lib/user/management/queries/useUserDetail";
import { routes } from "@/lib/routes";
import type { UserStatus } from "@/lib/user/management/types";
import { cn } from "@/lib/utils";
import { OverviewTab } from "./_components/overview-tab";
import { PermissionsTab } from "./_components/permissions-tab";
import { SessionsTab } from "./_components/sessions-tab";
import { UserDetailHeader } from "./_components/user-detail-header";

type ActiveTab = "overview" | "permissions" | "sessions";

export default function UserDetailPage() {
  return (
    <Suspense fallback={null}>
      <UserDetailContent />
    </Suspense>
  );
}

function UserDetailContent() {
  const searchParams = useSearchParams();
  const userId = Number(searchParams.get("id"));
  const isValidId = Number.isFinite(userId) && userId > 0;

  const { data: user, isPending, isError } = useUserDetail(userId);
  const notFound = !isValidId || (isError && !user) || (!isPending && !user);

  const [status, setStatus] = useState<UserStatus | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  useBreadcrumb([
    { label: "จัดการผู้ใช้", href: routes.dashboards.user.index },
    isValidId && isPending ? { loading: true } : { label: user?.name ?? "ไม่พบข้อมูล" },
  ]);

  if (isValidId && isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        ไม่พบข้อมูลผู้ใช้รายนี้
      </p>
    );
  }

  const currentStatus = status ?? user.status;

  return (
    <div className="flex flex-col gap-6">
      <UserDetailHeader user={user} status={currentStatus} onStatusChange={setStatus} />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)}>
        <TabsList
          className={cn(
            "min-h-11 w-fit border p-1 rounded-md space-x-1",
            "*:data-active:bg-red-700 *:data-active:text-white *:data-active:hover:text-white",
            "*:font-bold tracking-wide *:cursor-pointer *:rounded-md *:px-3"
          )}
        >
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <OverviewTab user={user} status={currentStatus} />
        </TabsContent>
        <TabsContent value="permissions" className="pt-4">
          <PermissionsTab user={user} />
        </TabsContent>
        <TabsContent value="sessions" className="pt-4">
          <SessionsTab userId={user.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

Note: `UserDetailHeader`'s `user` prop type changes from `MockUserDetail` to the real `UserDetail` — this is addressed in Task 6 alongside `SessionsTab` and `ActivityTab` removal, since `UserDetailHeader` also needs its import updated. Until Task 6 lands, `tsc` will show a type-mismatch error on the `UserDetailHeader` line — expected, not a regression to fix in this task.

- [ ] **Step 4: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: Errors only in `user-detail-header.tsx` (prop type mismatch, still typed against `MockUserDetail`) and `sessions-tab.tsx`/`activity-tab.tsx` (still reference the deleted mock file) — all addressed in Task 6. No errors in `overview-tab.tsx`, `permissions-tab.tsx`, or `page.tsx` itself.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/dashboard/users/detail/page.tsx frontend/app/dashboard/users/detail/_components/overview-tab.tsx frontend/app/dashboard/users/detail/_components/permissions-tab.tsx
git commit -m "feat(users): wire Overview and Permissions tabs to real user data"
```

---

### Task 6: Rewire `SessionsTab`, remove `ActivityTab`/2FA, finish `UserDetailHeader`

**Files:**
- Modify: `frontend/app/dashboard/users/detail/_components/sessions-tab.tsx` (full rewrite)
- Modify: `frontend/app/dashboard/users/detail/_components/user-detail-header.tsx` (type-only change)
- Delete: `frontend/app/dashboard/users/detail/_components/activity-tab.tsx`

**Interfaces:**
- Consumes: `useUserSessions`, `useRevokeUserSession`, `useRevokeAllUserSessions` from Task 4; `UserDetail` from Task 4/existing.
- Produces: a fully real, mock-free User Detail page.

- [ ] **Step 1: Rewrite `SessionsTab`**

Replace the full contents of `frontend/app/dashboard/users/detail/_components/sessions-tab.tsx`:

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Laptop, MapPin, MonitorSmartphone, ShieldOff, Smartphone } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { formatNotificationTime } from "@/lib/notification/utils";
import { useUserSessions } from "@/lib/user/management/queries/useUserSessions";
import { useRevokeUserSession } from "@/lib/user/management/mutations/useRevokeUserSession";
import { useRevokeAllUserSessions } from "@/lib/user/management/mutations/useRevokeAllUserSessions";
import type { SessionInfo } from "@/lib/user/management/types";

type ConfirmState =
  | { type: "single"; session: SessionInfo }
  | { type: "others" }
  | { type: "all" }
  | null;

function DeviceIcon({ device }: { device: SessionInfo["device"] }) {
  if (device === "Mobile" || device === "Tablet") return <Smartphone className="size-5" />;
  return <Laptop className="size-5" />;
}

export function SessionsTab({ userId }: { userId: number }) {
  const { data: sessions, isPending, isError } = useUserSessions(userId);
  const revokeOne = useRevokeUserSession(userId);
  const revokeAll = useRevokeAllUserSessions(userId);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  if (isPending) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (isError || !sessions) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        ไม่สามารถโหลดรายการ session ได้ กรุณาลองใหม่อีกครั้ง
      </p>
    );
  }

  const otherSessionsCount = sessions.filter((session) => !session.current).length;

  const handleConfirm = () => {
    if (!confirm) return;

    if (confirm.type === "single") {
      toast.promise(revokeOne.mutateAsync(confirm.session.id), {
        loading: "กำลังเพิกถอน session...",
        success: "เพิกถอน session แล้ว",
        error: "เพิกถอน session ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      });
    } else if (confirm.type === "others") {
      toast.promise(revokeAll.mutateAsync(true), {
        loading: "กำลังเพิกถอน session อื่นทั้งหมด...",
        success: "เพิกถอน session อื่นทั้งหมดแล้ว",
        error: "เพิกถอน session ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      });
    } else {
      toast.promise(revokeAll.mutateAsync(false), {
        loading: "กำลังเพิกถอน session ทั้งหมด...",
        success: "เพิกถอน session ทั้งหมดแล้ว",
        error: "เพิกถอน session ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      });
    }
    setConfirm(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-medium">Active Sessions ({sessions.length})</h3>
        {sessions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {otherSessionsCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => setConfirm({ type: "others" })}>
                เพิกถอน session อื่นทั้งหมด
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirm({ type: "all" })}
            >
              เพิกถอน session ทั้งหมด
            </Button>
          </div>
        )}
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <MonitorSmartphone className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">ไม่มี session ที่ใช้งานอยู่</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <DeviceIcon device={session.device} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {session.browser} · {session.os}
                      </span>
                      {session.current && (
                        <Badge className="bg-green-700/15 text-green-800">เซสชันปัจจุบัน</Badge>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {session.ipAddress}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ใช้งานล่าสุด {formatNotificationTime(session.lastActiveAt)}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setConfirm({ type: "single", session })}
                >
                  <ShieldOff />
                  เพิกถอน
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          {confirm?.type === "single" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>เพิกถอน Session</AlertDialogTitle>
                <AlertDialogDescription>
                  ต้องการเพิกถอน session นี้ใช่หรือไม่? ({confirm.session.browser} · {confirm.session.os} ·{" "}
                  {confirm.session.ipAddress}) ผู้ใช้จะต้องเข้าสู่ระบบใหม่บนอุปกรณ์นี้
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction className="bg-red-700 text-white hover:bg-red-600" onClick={handleConfirm}>
                  เพิกถอน Session
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {confirm?.type === "others" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>เพิกถอน Session อื่นทั้งหมด</AlertDialogTitle>
                <AlertDialogDescription>
                  การดำเนินการนี้จะออกจากระบบผู้ใช้จากทุกอุปกรณ์ ยกเว้นอุปกรณ์ปัจจุบัน ({otherSessionsCount} session
                  จะถูกเพิกถอน)
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction className="bg-red-700 text-white hover:bg-red-600" onClick={handleConfirm}>
                  เพิกถอน Session อื่นทั้งหมด
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {confirm?.type === "all" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>เพิกถอน Session ทั้งหมด</AlertDialogTitle>
                <AlertDialogDescription>
                  การดำเนินการนี้จะออกจากระบบผู้ใช้จากทุกอุปกรณ์ที่ใช้งานอยู่ ({sessions.length} session จะถูกเพิกถอน)
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction className="bg-red-700 text-white hover:bg-red-600" onClick={handleConfirm}>
                  เพิกถอน Session ทั้งหมด
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 2: Update `UserDetailHeader`'s type and drop the 2FA-irrelevant nothing (header never had 2FA)**

In `frontend/app/dashboard/users/detail/_components/user-detail-header.tsx`, change the import:

```tsx
import type { MockUserDetail } from "../_data/mock-user-detail";
```

to:

```tsx
import type { UserDetail } from "@/lib/user/management/types";
```

And change every `user: MockUserDetail` prop-type reference to `user: UserDetail` (there is one, in the component's props destructuring type). `getInitials(user.name)`, `user.username`, `user.email`, `user.id`, `user.userType` all already match field names on the real `UserDetail` type — no other changes needed in this file.

- [ ] **Step 3: Delete `ActivityTab`**

```bash
rm frontend/app/dashboard/users/detail/_components/activity-tab.tsx
```

(Its `TabsTrigger`/`TabsContent` were already removed from `page.tsx` in Task 5 — this step just deletes the now-orphaned component file.)

- [ ] **Step 4: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean, zero errors.

Run: `cd frontend && npm run lint`
Expected: same 11 pre-existing problems as the Global Constraints baseline (8 errors/3 warnings, all in files this plan never touches) — zero new problems.

Run: `cd frontend && npm run build`
Expected: succeeds, `/dashboard/users/detail` prerenders with no runtime error.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/dashboard/users/detail/_components/sessions-tab.tsx frontend/app/dashboard/users/detail/_components/user-detail-header.tsx
git rm frontend/app/dashboard/users/detail/_components/activity-tab.tsx
git commit -m "feat(users): wire Sessions tab to real data and remove the Activity tab"
```

- [ ] **Step 6: Manual QA checklist (disclose as not-yet-performed if no browser is available)**

1. Open a real internal user's detail page — Overview shows real account info, profile info, and Security card (email verification, last login, password changed) with no mock artifacts.
2. Open a company/individual user's detail page — Profile Information section shows the "no additional info" message (no crash on `internalProfile: null`).
3. Permissions tab shows the user's real role badge and permission table, with correct Role/Direct source split.
4. Sessions tab: log in as the same user from a second browser/device, confirm a second row appears; revoke it, confirm it disappears and that browser session is now logged out.
5. Revoke-all/keep-current button visibility: viewing your own account detail page shows both buttons; viewing another user's page hides "เพิกถอน session อื่นทั้งหมด" (no current session in that list).
6. Confirm the 2FA row and Activity tab are fully gone from the page — no leftover mock UI or dead links.
7. Confirm nothing else in the frontend imports the deleted `mock-user-detail.ts` (already covered by Step 4's clean `tsc`, but worth a final `grep -r "mock-user-detail" frontend/app` to be sure).
