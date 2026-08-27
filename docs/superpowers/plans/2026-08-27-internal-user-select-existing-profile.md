# Internal user create/update: select existing Internal Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual internal-employee data entry on user create/update with selecting an existing, unlinked `InternalProfile`.

**Architecture:** `POST /users` now takes `internalProfileId` (must reference an `internal_profiles` row with `user_id IS NULL`) instead of profile fields, and `CreateInternalUserUseCase` links that existing profile to the new user instead of creating one. `PATCH /users/{id}` drops profile fields entirely — profile edits happen only via the internal-employees module. A new `GET /internal-profiles/select-available` endpoint lists unlinked profiles for the (future) frontend picker.

**Tech Stack:** PHP 8.4, Laravel 13, `spatie/laravel-data` (Data DTOs), Pest v4.

**Spec:** `docs/superpowers/specs/2026-08-27-internal-user-select-existing-profile-design.md`

## Global Constraints

- Backend only — do not touch any file under `../frontend`.
- After every PHP file change, run `vendor/bin/pint --dirty --format agent` before the task's final test run.
- Run only the tests relevant to the task being worked (`php artisan test --compact --filter=...`); the full-suite regression run happens in Task 5.
- Follow existing DDD module layout (`Domain/Application/Infrastructure/Presentation`) — no new top-level folders.
- Tests that assert behavior this plan removes are rewritten, not silently deleted — each such removal is called out in the task steps below.
- Do not `git commit` without the user's go-ahead for that specific commit — pause and ask before each commit step instead of running it automatically.

---

## Task 1: `InternalProfile::linkToUser()` domain method

**Files:**
- Modify: `app/Modules/InternalProfiles/Domain/Entities/InternalProfile.php`
- Test: `tests/Unit/Domain/User/Entities/InternalProfileTest.php`

**Interfaces:**
- Produces: `InternalProfile::linkToUser(int $userId): void` — sets the profile's `userId` if currently `null`; throws `DomainException` if it's already set. Later tasks (Task 3) call this method.

- [ ] **Step 1: Write the failing unit tests**

Append to `tests/Unit/Domain/User/Entities/InternalProfileTest.php` (after the existing `'update replaces the editable profile fields'` test):

```php
test('linkToUser assigns the given user id when unlinked', function () {
    $profile = InternalProfile::create(
        userId: null,
        employeeNo: null,
        prefix: null,
        firstname: 'John',
        lastname: 'Doe',
        departmentId: null,
        positionId: null,
        phone: null,
    );

    $profile->linkToUser(42);

    expect($profile->userId())->toBe(42);
});

test('linkToUser throws when the profile is already linked', function () {
    $profile = InternalProfile::create(
        userId: 10,
        employeeNo: null,
        prefix: null,
        firstname: 'John',
        lastname: 'Doe',
        departmentId: null,
        positionId: null,
        phone: null,
    );

    $profile->linkToUser(99);
})->throws(DomainException::class, 'Internal profile is already linked to a user.');
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=InternalProfileTest`
Expected: FAIL — `Call to undefined method App\Modules\InternalProfiles\Domain\Entities\InternalProfile::linkToUser()`

- [ ] **Step 3: Implement `linkToUser()`**

Replace the full content of `app/Modules/InternalProfiles/Domain/Entities/InternalProfile.php` with:

```php
<?php

namespace App\Modules\InternalProfiles\Domain\Entities;

use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use DomainException;

final class InternalProfile
{
    private function __construct(
        private readonly ?int $id,
        private ?int $userId,
        private ?string $employeeNo,
        private ?string $prefix,
        private string $firstname,
        private string $lastname,
        private ?int $departmentId,
        private ?int $positionId,
        private ?PhoneNumber $phone,
    ) {}

    public static function create(
        ?int $userId,
        ?string $employeeNo,
        ?string $prefix,
        string $firstname,
        string $lastname,
        ?int $departmentId,
        ?int $positionId,
        ?PhoneNumber $phone,
    ): self {
        return new self(
            id: null,
            userId: $userId,
            employeeNo: $employeeNo,
            prefix: $prefix,
            firstname: $firstname,
            lastname: $lastname,
            departmentId: $departmentId,
            positionId: $positionId,
            phone: $phone,
        );
    }

    public static function reconstitute(
        int $id,
        ?int $userId,
        ?string $employeeNo,
        ?string $prefix,
        string $firstname,
        string $lastname,
        ?int $departmentId,
        ?int $positionId,
        ?PhoneNumber $phone,
    ): self {
        return new self(
            id: $id,
            userId: $userId,
            employeeNo: $employeeNo,
            prefix: $prefix,
            firstname: $firstname,
            lastname: $lastname,
            departmentId: $departmentId,
            positionId: $positionId,
            phone: $phone,
        );
    }

    public function update(
        ?string $employeeNo,
        ?string $prefix,
        string $firstname,
        string $lastname,
        ?int $departmentId,
        ?int $positionId,
        ?PhoneNumber $phone,
    ): void {
        $this->employeeNo = $employeeNo;
        $this->prefix = $prefix;
        $this->firstname = $firstname;
        $this->lastname = $lastname;
        $this->departmentId = $departmentId;
        $this->positionId = $positionId;
        $this->phone = $phone;
    }

    public function linkToUser(int $userId): void
    {
        if ($this->userId !== null) {
            throw new DomainException('Internal profile is already linked to a user.');
        }

        $this->userId = $userId;
    }

    // -----------------------------
    // Getters
    // -----------------------------
    public function id(): ?int
    {
        return $this->id;
    }

    public function userId(): ?int
    {
        return $this->userId;
    }

    public function employeeNo(): ?string
    {
        return $this->employeeNo;
    }

    public function prefix(): ?string
    {
        return $this->prefix;
    }

    public function firstname(): string
    {
        return $this->firstname;
    }

    public function lastname(): string
    {
        return $this->lastname;
    }

    public function departmentId(): ?int
    {
        return $this->departmentId;
    }

    public function positionId(): ?int
    {
        return $this->positionId;
    }

    public function phone(): ?PhoneNumber
    {
        return $this->phone;
    }
}
```

(Only change from the current file: `private readonly ?int $userId` → `private ?int $userId`, the new `use DomainException;` import, and the new `linkToUser()` method.)

- [ ] **Step 4: Run Pint and the tests to verify they pass**

Run: `vendor/bin/pint --dirty --format agent`
Run: `php artisan test --compact --filter=InternalProfileTest`
Expected: PASS (5 tests: the 3 existing + the 2 new)

- [ ] **Step 5: Commit** (ask the user before running this)

```bash
git add app/Modules/InternalProfiles/Domain/Entities/InternalProfile.php tests/Unit/Domain/User/Entities/InternalProfileTest.php
git commit -m "feat: allow linking an internal profile to a user"
```

---

## Task 2: `GET /internal-profiles/select-available` endpoint

**Files:**
- Create: `app/Modules/InternalProfiles/Application/Queries/ListAvailableInternalProfilesQuery.php`
- Modify: `app/Modules/InternalProfiles/Presentation/Http/Controllers/InternalProfilesController.php`
- Modify: `routes/api/v1/dashboard/internal-profiles.php`
- Test: `tests/Feature/Modules/User/SelectAvailableInternalProfilesTest.php` (new)

**Interfaces:**
- Consumes: `App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles` (existing Eloquent model, columns `id`, `prefix`, `firstname`, `lastname`, `employee_no`, `user_id`).
- Produces: `ListAvailableInternalProfilesQuery::execute(): array<int, array{id: int, name: string}>` — used directly by the controller; no other task depends on it.

- [ ] **Step 1: Write the failing feature test**

Create `tests/Feature/Modules/User/SelectAvailableInternalProfilesTest.php`:

```php
<?php

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForSelectAvailable(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));

    return $user;
}

test('fetching available internal profiles requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/internal-profiles/select-available');

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot fetch available internal profiles', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/internal-profiles/select-available');

    $response->assertStatus(403);
});

test('available internal profiles only include profiles with no linked user, ordered by firstname', function () {
    InternalProfiles::create(['firstname' => 'Somchai', 'lastname' => 'Jaidee']);
    InternalProfiles::create(['firstname' => 'Anan', 'lastname' => 'Suk', 'employee_no' => 'EMP002']);
    $linkedUser = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['firstname' => 'Malee', 'lastname' => 'Rak', 'user_id' => $linkedUser->id]);
    $this->actingAs(internalAdminUserForSelectAvailable(), 'web');

    $response = $this->getJson('/api/v1/dashboard/internal-profiles/select-available');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'Anan Suk (EMP002)')
        ->assertJsonPath('data.1.name', 'Somchai Jaidee');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact --filter=SelectAvailableInternalProfilesTest`
Expected: FAIL — 404 (route doesn't exist yet)

- [ ] **Step 3: Create the query class**

Create `app/Modules/InternalProfiles/Application/Queries/ListAvailableInternalProfilesQuery.php`:

```php
<?php

namespace App\Modules\InternalProfiles\Application\Queries;

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;

final class ListAvailableInternalProfilesQuery
{
    /**
     * @return array<int, array{id: int, name: string}>
     */
    public function execute(): array
    {
        return InternalProfiles::query()
            ->whereNull('user_id')
            ->orderBy('firstname')
            ->orderBy('lastname')
            ->get(['id', 'prefix', 'firstname', 'lastname', 'employee_no'])
            ->map(fn (InternalProfiles $profile): array => [
                'id' => $profile->id,
                'name' => self::formatName($profile),
            ])
            ->all();
    }

    private static function formatName(InternalProfiles $profile): string
    {
        $name = implode(' ', array_filter([$profile->prefix, $profile->firstname, $profile->lastname]));

        return $profile->employee_no !== null
            ? "{$name} ({$profile->employee_no})"
            : $name;
    }
}
```

- [ ] **Step 4: Wire up the controller**

In `app/Modules/InternalProfiles/Presentation/Http/Controllers/InternalProfilesController.php`, add the import and constructor parameter, and add the `selectAvailable()` action:

```php
use App\Modules\InternalProfiles\Application\Queries\ListAvailableInternalProfilesQuery;
```

(add alongside the other `Application\Queries` import)

```php
    public function __construct(
        private readonly ListIneternalProfilesQuery $listIneternalProfilesQuery,
        private readonly ListAvailableInternalProfilesQuery $listAvailableInternalProfiles,
        private readonly GetInternalProfileByIdQuery $getInternalProfileById,
        private readonly CreateInternalProfileUseCase $createInternalProfile,
        private readonly UpdateInternalProfileUseCase $updateInternalProfile,
        private readonly DeleteInternalProfileUseCase $deleteInternalProfile,
    ) {}

    public function selectAvailable(): JsonResponse
    {
        return response()->json([
            'data' => $this->listAvailableInternalProfiles->execute(),
        ]);
    }
```

(add `selectAvailable()` right after the constructor, before `index()`)

- [ ] **Step 5: Add the route**

In `routes/api/v1/dashboard/internal-profiles.php`, add as the first route inside the `internal-profiles` group (before `Route::get('/', ...)`):

```php
        Route::get('/select-available', [InternalProfilesController::class, 'selectAvailable'])
            ->middleware('role:admin')
            ->name('dashboard.internal-profiles.select-available');

```

- [ ] **Step 6: Run Pint and the test to verify it passes**

Run: `vendor/bin/pint --dirty --format agent`
Run: `php artisan test --compact --filter=SelectAvailableInternalProfilesTest`
Expected: PASS (3 tests)

- [ ] **Step 7: Commit** (ask the user before running this)

```bash
git add app/Modules/InternalProfiles/Application/Queries/ListAvailableInternalProfilesQuery.php app/Modules/InternalProfiles/Presentation/Http/Controllers/InternalProfilesController.php routes/api/v1/dashboard/internal-profiles.php tests/Feature/Modules/User/SelectAvailableInternalProfilesTest.php
git commit -m "feat: add endpoint to list internal profiles available for linking"
```

---

## Task 3: Create-user flow uses `internalProfileId`

**Depends on:** Task 1 (`InternalProfile::linkToUser()`)

**Files:**
- Modify: `app/Modules/User/Application/DTOs/CreateInternalUserData.php`
- Modify: `app/Modules/User/Presentation/Http/Requests/StoreUserRequest.php`
- Modify: `app/Modules/User/Application/UseCases/CreateInternalUserUseCase.php`
- Test: `tests/Feature/Modules/User/CreateInternalUserUseCaseTest.php`
- Test: `tests/Feature/Modules/User/StoreUserTest.php`

**Interfaces:**
- Consumes: `InternalProfilesRepositoryInterface::findById(int $id): ?InternalProfile`, `InternalProfile::linkToUser(int $userId): void` (both already exist / Task 1).
- Produces: `CreateInternalUserData` now has `public readonly int $internalProfileId` instead of the 7 profile fields — no other task consumes this DTO.

- [ ] **Step 1: Write the failing use-case tests**

Replace the full content of `tests/Feature/Modules/User/CreateInternalUserUseCaseTest.php`:

```php
<?php

use App\Modules\Auth\Application\DTOs\LoginData;
use App\Modules\Auth\Application\UseCases\LoginUseCase;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Application\DTOs\CreateInternalUserData;
use App\Modules\User\Application\UseCases\CreateInternalUserUseCase;
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Domain\States\UserStatus\Active;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function createInternalUserUseCase(): CreateInternalUserUseCase
{
    return app(CreateInternalUserUseCase::class);
}

function unlinkedInternalProfile(array $overrides = []): InternalProfiles
{
    return InternalProfiles::create(array_merge([
        'firstname' => 'Jane',
        'lastname' => 'Doe',
    ], $overrides));
}

function internalUserData(array $overrides = []): CreateInternalUserData
{
    return CreateInternalUserData::from(array_merge([
        'username' => 'jdoe',
        'email' => 'jdoe@example.com',
        'password' => 'super-secret',
        'role' => 'admin',
        'internalProfileId' => unlinkedInternalProfile()->id,
    ], $overrides));
}

test('execute creates an active, verified internal user linked to the given internal profile', function () {
    Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $profile = unlinkedInternalProfile(['firstname' => 'Jane', 'lastname' => 'Doe']);

    $user = createInternalUserUseCase()->execute(internalUserData(['internalProfileId' => $profile->id]));

    expect($user->userType())->toBe(UserType::Internal)
        ->and($user->status())->toBeInstanceOf(Active::class)
        ->and($user->isVerified())->toBeTrue();

    $this->assertDatabaseHas('users', [
        'id' => $user->id(),
        'username' => 'jdoe',
        'email' => 'jdoe@example.com',
        'user_type' => 'internal',
        'status' => 'active',
    ]);

    $this->assertDatabaseHas('internal_profiles', [
        'id' => $profile->id,
        'user_id' => $user->id(),
        'firstname' => 'Jane',
        'lastname' => 'Doe',
    ]);
});

test('execute assigns the given role to the created user', function () {
    Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

    $user = createInternalUserUseCase()->execute(internalUserData());

    expect(UserModel::find($user->id())->hasRole('admin'))->toBeTrue();
});

test('execute syncs the given direct permissions to the created user', function () {
    Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']);

    $user = createInternalUserUseCase()->execute(internalUserData([
        'permissions' => ['vendors.view'],
    ]));

    expect(UserModel::find($user->id())->hasDirectPermission('vendors.view'))->toBeTrue();
});

test('execute throws when the internal profile does not exist', function () {
    Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

    createInternalUserUseCase()->execute(internalUserData(['internalProfileId' => 999999]));
})->throws(ModelNotFoundException::class);

test('execute throws when the internal profile is already linked to another user', function () {
    Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $existingUser = UserModel::factory()->create(['user_type' => 'internal']);
    $linkedProfile = unlinkedInternalProfile(['user_id' => $existingUser->id]);

    createInternalUserUseCase()->execute(internalUserData(['internalProfileId' => $linkedProfile->id]));
})->throws(DomainException::class);

test('a newly created internal user can log in immediately', function () {
    Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

    createInternalUserUseCase()->execute(internalUserData());

    $loggedInUser = app(LoginUseCase::class)->execute(new LoginData(
        identifier: 'jdoe@example.com',
        identifierField: 'email',
        password: 'super-secret',
        remember: false,
    ));

    expect($loggedInUser->username())->toBe('jdoe');
});
```

Note: this removes the old `'execute saves the optional internal profile fields'` test — that behavior (passing `employeeNo`/`prefix`/`departmentId`/`positionId`/`phone` through `CreateInternalUserData`) no longer exists; those fields now live only on the pre-existing `InternalProfile` being linked.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=CreateInternalUserUseCaseTest`
Expected: FAIL — `CreateInternalUserData::from()` errors because `internalProfileId` isn't a known property yet and `firstname`/`lastname` are still required.

- [ ] **Step 3: Update the DTO**

Replace the full content of `app/Modules/User/Application/DTOs/CreateInternalUserData.php`:

```php
<?php

namespace App\Modules\User\Application\DTOs;

use Spatie\LaravelData\Data;

final class CreateInternalUserData extends Data
{
    /**
     * @param  array<int, string>  $permissions
     */
    public function __construct(
        public readonly string $username,
        public readonly string $email,
        public readonly string $password,
        public readonly string $role,
        public readonly int $internalProfileId,
        public readonly array $permissions = [],
    ) {}
}
```

- [ ] **Step 4: Update the use case**

Replace the full content of `app/Modules/User/Application/UseCases/CreateInternalUserUseCase.php`:

```php
<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\InternalProfiles\Domain\Entities\InternalProfile;
use App\Modules\InternalProfiles\Domain\Repositories\InternalProfilesRepositoryInterface;
use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\User\Application\DTOs\CreateInternalUserData;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class CreateInternalUserUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly InternalProfilesRepositoryInterface $internalProfiles,
    ) {}

    public function execute(CreateInternalUserData $data): User
    {
        return DB::transaction(function () use ($data): User {
            $profile = $this->internalProfiles->findById($data->internalProfileId)
                ?? throw (new ModelNotFoundException)->setModel(InternalProfile::class, [$data->internalProfileId]);

            $user = User::register(
                username: $data->username,
                email: Email::fromString($data->email),
                passwordHash: Hash::make($data->password),
                userType: UserType::Internal,
            );

            // Internal users are created directly by an administrator/seeder,
            // not via self-registration, so they skip the pending/email
            // verification flow that LoginUseCase enforces for vendors.
            $user->activate();
            $user->verifyEmail();

            $user = $this->users->save($user);

            $this->users->assignRole($user->id(), $data->role);
            $this->users->syncPermissions($user->id(), $data->permissions);

            $profile->linkToUser($user->id());
            $this->internalProfiles->saveProfile($profile);

            app_log('Internal user created', [
                'user_id' => $user->id(),
                'role' => $data->role,
            ], 'info', 'user');

            return $user;
        });
    }
}
```

- [ ] **Step 5: Run Pint and the use-case tests to verify they pass**

Run: `vendor/bin/pint --dirty --format agent`
Run: `php artisan test --compact --filter=CreateInternalUserUseCaseTest`
Expected: PASS (6 tests)

- [ ] **Step 6: Write the failing feature tests**

Replace the full content of `tests/Feature/Modules/User/StoreUserTest.php`:

```php
<?php

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForStoreUser(): User
{
    $admin = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'users.create', 'guard_name' => 'web']));
    $admin->assignRole($role);

    return $admin;
}

function unlinkedInternalProfileForStoreUser(array $overrides = []): InternalProfiles
{
    return InternalProfiles::create(array_merge([
        'firstname' => 'Jane',
        'lastname' => 'Doe',
    ], $overrides));
}

function validCreateUserPayload(array $overrides = []): array
{
    return array_merge([
        'username' => 'jdoe',
        'email' => 'jdoe@example.com',
        'password' => 'super-secret',
        'internalProfileId' => unlinkedInternalProfileForStoreUser()->id,
        'role' => 'staff',
        'permissions' => [],
    ], $overrides);
}

test('creating a user requires authentication', function () {
    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload());

    $response->assertStatus(401);
});

test('an internal user without the users.create permission cannot create a user', function () {
    $actor = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($actor, 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload());

    $response->assertStatus(403);
});

test('a user with the users.create permission can create an internal user', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForStoreUser(), 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload());

    $response->assertStatus(201)
        ->assertJsonPath('data.username', 'jdoe')
        ->assertJsonPath('data.email', 'jdoe@example.com')
        ->assertJsonPath('data.userType', 'internal')
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.role', 'staff');
    $this->assertDatabaseHas('users', ['username' => 'jdoe', 'email' => 'jdoe@example.com']);
});

test('username must be unique on create', function () {
    User::factory()->create(['username' => 'jdoe']);
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForStoreUser(), 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload());

    $response->assertStatus(422)->assertJsonValidationErrors('username');
});

test('email must be unique on create', function () {
    User::factory()->create(['email' => 'jdoe@example.com']);
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForStoreUser(), 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload());

    $response->assertStatus(422)->assertJsonValidationErrors('email');
});

test('password must be at least 8 characters on create', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForStoreUser(), 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload(['password' => 'short']));

    $response->assertStatus(422)->assertJsonValidationErrors('password');
});

test('role must exist in the known catalog on create', function () {
    $this->actingAs(internalAdminUserForStoreUser(), 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload(['role' => 'not-a-real-role']));

    $response->assertStatus(422)->assertJsonValidationErrors('role');
});

test('permissions must be within the known catalog on create', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForStoreUser(), 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload([
        'permissions' => ['not.a.real.permission'],
    ]));

    $response->assertStatus(422)->assertJsonValidationErrors('permissions.0');
});

test('internalProfileId is required on create', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForStoreUser(), 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload(['internalProfileId' => null]));

    $response->assertStatus(422)->assertJsonValidationErrors('internalProfileId');
});

test('internalProfileId must reference an existing internal profile', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForStoreUser(), 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload(['internalProfileId' => 999999]));

    $response->assertStatus(422)->assertJsonValidationErrors('internalProfileId');
});

test('internalProfileId must not already be linked to another user', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForStoreUser(), 'web');
    $existingUser = User::factory()->create(['user_type' => 'internal']);
    $linkedProfile = unlinkedInternalProfileForStoreUser(['user_id' => $existingUser->id]);

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload(['internalProfileId' => $linkedProfile->id]));

    $response->assertStatus(422)->assertJsonValidationErrors('internalProfileId');
});
```

- [ ] **Step 7: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=StoreUserTest`
Expected: FAIL — `internalProfileId` isn't validated yet (still validates old profile fields), so the "required"/"exists"/"already linked" cases won't produce the expected 422 on that field.

- [ ] **Step 8: Update the request validation**

Replace the full content of `app/Modules/User/Presentation/Http/Requests/StoreUserRequest.php`:

```php
<?php

namespace App\Modules\User\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'username' => ['required', 'string', Rule::unique('users', 'username')],
            'email' => ['required', 'email', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'string', Rule::exists('roles', 'name')],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')],
            'internalProfileId' => ['required', 'integer', Rule::exists('internal_profiles', 'id')->whereNull('user_id')],
        ];
    }
}
```

- [ ] **Step 9: Run Pint and the tests to verify they pass**

Run: `vendor/bin/pint --dirty --format agent`
Run: `php artisan test --compact --filter=StoreUserTest`
Expected: PASS (11 tests)

- [ ] **Step 10: Commit** (ask the user before running this)

```bash
git add app/Modules/User/Application/DTOs/CreateInternalUserData.php app/Modules/User/Presentation/Http/Requests/StoreUserRequest.php app/Modules/User/Application/UseCases/CreateInternalUserUseCase.php tests/Feature/Modules/User/CreateInternalUserUseCaseTest.php tests/Feature/Modules/User/StoreUserTest.php
git commit -m "feat: create internal user by linking an existing internal profile"
```

---

## Task 4: Update-user flow drops profile fields entirely

**Files:**
- Modify: `app/Modules/User/Application/DTOs/UpdateInternalUserData.php`
- Modify: `app/Modules/User/Presentation/Http/Requests/UpdateUserRequest.php`
- Modify: `app/Modules/User/Application/UseCases/UpdateInternalUserUseCase.php`
- Test: `tests/Feature/Modules/User/UpdateInternalUserUseCaseTest.php`
- Test: `tests/Feature/Modules/User/UpdateUserTest.php`

**Interfaces:**
- Produces: `UpdateInternalUserData` now has only `username`, `email`, `role`, `password`, `permissions` — no other task consumes this DTO.

- [ ] **Step 1: Write the failing use-case tests**

Replace the full content of `tests/Feature/Modules/User/UpdateInternalUserUseCaseTest.php`:

```php
<?php

use App\Modules\User\Application\DTOs\UpdateInternalUserData;
use App\Modules\User\Application\UseCases\UpdateInternalUserUseCase;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function updateInternalUserData(array $overrides = []): UpdateInternalUserData
{
    return UpdateInternalUserData::from(array_merge([
        'username' => 'newname',
        'email' => 'newemail@example.com',
        'role' => 'staff',
    ], $overrides));
}

test('execute updates account fields for an internal user', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $target = UserModel::factory()->create(['user_type' => 'internal', 'username' => 'oldname']);

    app(UpdateInternalUserUseCase::class)->execute($target->id, updateInternalUserData());

    $this->assertDatabaseHas('users', ['id' => $target->id, 'username' => 'newname', 'email' => 'newemail@example.com']);
});

test('execute replaces the role rather than accumulating it', function () {
    $oldRole = Role::firstOrCreate(['name' => 'viewer', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $target = UserModel::factory()->create(['user_type' => 'internal']);
    $target->assignRole($oldRole);

    app(UpdateInternalUserUseCase::class)->execute($target->id, updateInternalUserData());

    $fresh = $target->fresh();
    expect($fresh->hasRole('staff'))->toBeTrue()
        ->and($fresh->hasRole('viewer'))->toBeFalse();
});

test('execute syncs direct permissions', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']);
    $target = UserModel::factory()->create(['user_type' => 'internal']);

    app(UpdateInternalUserUseCase::class)->execute($target->id, updateInternalUserData([
        'permissions' => ['vendors.view'],
    ]));

    expect($target->fresh()->hasDirectPermission('vendors.view'))->toBeTrue();
});

test('execute changes the password when one is given', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $target = UserModel::factory()->create(['user_type' => 'internal']);

    app(UpdateInternalUserUseCase::class)->execute($target->id, updateInternalUserData(['password' => 'new-secret-1']));

    expect(Hash::check('new-secret-1', $target->fresh()->password))->toBeTrue();
});

test('execute throws when the user does not exist', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);

    app(UpdateInternalUserUseCase::class)->execute(999999, updateInternalUserData());
})->throws(ModelNotFoundException::class);
```

Note: this removes the old `'execute updates account fields and internal profile fields for an existing profile'` and `'execute creates an internal profile when the user has none yet'` tests — `UpdateInternalUserUseCase` no longer touches `internal_profiles` at all.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=UpdateInternalUserUseCaseTest`
Expected: FAIL — `UpdateInternalUserData::from()` errors because `firstname`/`lastname` are still required and missing from the payload.

- [ ] **Step 3: Update the DTO**

Replace the full content of `app/Modules/User/Application/DTOs/UpdateInternalUserData.php`:

```php
<?php

namespace App\Modules\User\Application\DTOs;

use Spatie\LaravelData\Data;

final class UpdateInternalUserData extends Data
{
    /**
     * @param  array<int, string>  $permissions
     */
    public function __construct(
        public readonly string $username,
        public readonly string $email,
        public readonly string $role,
        public readonly ?string $password = null,
        public readonly array $permissions = [],
    ) {}
}
```

- [ ] **Step 4: Update the use case**

Replace the full content of `app/Modules/User/Application/UseCases/UpdateInternalUserUseCase.php`:

```php
<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\User\Application\DTOs\UpdateInternalUserData;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class UpdateInternalUserUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
    ) {}

    public function execute(int $id, UpdateInternalUserData $data): User
    {
        return DB::transaction(function () use ($id, $data): User {
            $user = $this->users->findById($id) ?? throw (new ModelNotFoundException)->setModel(User::class, [$id]);

            $user->changeUsername($data->username);
            $user->changeEmail(Email::fromString($data->email));

            if ($data->password !== null) {
                $user->changePassword(Hash::make($data->password));
            }

            $user = $this->users->save($user);

            $this->users->syncRole($user->id(), $data->role);
            $this->users->syncPermissions($user->id(), $data->permissions);

            app_log('Internal user updated', [
                'user_id' => $id,
                'role' => $data->role,
            ], 'info', 'user');

            return $user;
        });
    }
}
```

- [ ] **Step 5: Run Pint and the use-case tests to verify they pass**

Run: `vendor/bin/pint --dirty --format agent`
Run: `php artisan test --compact --filter=UpdateInternalUserUseCaseTest`
Expected: PASS (5 tests)

- [ ] **Step 6: Write the failing feature tests**

Replace the full content of `tests/Feature/Modules/User/UpdateUserTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForUpdateUser(): User
{
    $admin = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'users.update', 'guard_name' => 'web']));
    $admin->assignRole($role);

    return $admin;
}

test('updating a user requires authentication', function () {
    $target = User::factory()->create(['user_type' => 'company']);

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}", ['username' => 'x', 'email' => 'x@example.com']);

    $response->assertStatus(401);
});

test('an internal user without the users.update permission cannot update a user', function () {
    $target = User::factory()->create(['user_type' => 'company']);
    $actor = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($actor, 'web');

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}", ['username' => 'x', 'email' => 'x@example.com']);

    $response->assertStatus(403);
});

test('a vendor user account can be updated with just username, email, and password', function () {
    $target = User::factory()->create(['user_type' => 'company', 'username' => 'oldname']);
    $this->actingAs(internalAdminUserForUpdateUser(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}", [
        'username' => 'newname',
        'email' => 'newemail@example.com',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.username', 'newname')
        ->assertJsonPath('data.email', 'newemail@example.com');
    $this->assertDatabaseHas('users', ['id' => $target->id, 'username' => 'newname']);
});

test('a vendor user update rejects role and permissions being required', function () {
    $target = User::factory()->create(['user_type' => 'company']);
    $this->actingAs(internalAdminUserForUpdateUser(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}", [
        'username' => 'newname',
        'email' => 'newemail@example.com',
    ]);

    $response->assertOk();
    $this->assertDatabaseMissing('internal_profiles', ['user_id' => $target->id]);
});

test('an internal user can be updated with a new role and permissions', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']);
    $target = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs(internalAdminUserForUpdateUser(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}", [
        'username' => 'newname',
        'email' => 'newemail@example.com',
        'role' => 'staff',
        'permissions' => ['vendors.view'],
    ]);

    $response->assertOk()
        ->assertJsonPath('data.username', 'newname')
        ->assertJsonPath('data.role', 'staff');
    expect($target->fresh()->hasRole('staff'))->toBeTrue();
});

test('an internal user update requires role', function () {
    $target = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs(internalAdminUserForUpdateUser(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}", [
        'username' => 'newname',
        'email' => 'newemail@example.com',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors(['role']);
});

test('username must stay unique on update, ignoring itself', function () {
    User::factory()->create(['username' => 'taken']);
    $target = User::factory()->create(['user_type' => 'company', 'username' => 'original']);
    $this->actingAs(internalAdminUserForUpdateUser(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}", [
        'username' => 'taken',
        'email' => 'newemail@example.com',
    ]);
    $response->assertStatus(422)->assertJsonValidationErrors('username');

    $sameNameResponse = $this->patchJson("/api/v1/dashboard/users/{$target->id}", [
        'username' => 'original',
        'email' => 'newemail@example.com',
    ]);
    $sameNameResponse->assertOk();
});

test('updating a nonexistent user returns 404', function () {
    $this->actingAs(internalAdminUserForUpdateUser(), 'web');

    $response = $this->patchJson('/api/v1/dashboard/users/999999', [
        'username' => 'x',
        'email' => 'x@example.com',
    ]);

    $response->assertStatus(404);
});
```

Note: `'an internal user can be updated with full profile, role, and permissions'` is renamed to `'...with a new role and permissions'` and drops the `firstname`/`lastname`/`internal_profiles` assertions; `'an internal user update requires firstname, lastname, and role'` is renamed to `'...requires role'` and drops the `firstname`/`lastname` expectations, since those fields are no longer part of this endpoint's contract.

- [ ] **Step 7: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=UpdateUserTest`
Expected: FAIL — the internal-user branch still validates/requires `firstname`/`lastname`, so the "role and permissions" test 500s and the "requires role" test's validation-error set doesn't match.

- [ ] **Step 8: Update the request validation**

Replace the full content of `app/Modules/User/Presentation/Http/Requests/UpdateUserRequest.php`:

```php
<?php

namespace App\Modules\User\Presentation\Http\Requests;

use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $userId = (int) $this->route('id');

        $rules = [
            'username' => ['required', 'string', Rule::unique('users', 'username')->ignore($userId)],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($userId)],
            'password' => ['nullable', 'string', 'min:8'],
        ];

        if (User::find($userId)?->user_type !== UserType::Internal) {
            return $rules;
        }

        return [
            ...$rules,
            'role' => ['required', 'string', Rule::exists('roles', 'name')],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')],
        ];
    }
}
```

- [ ] **Step 9: Run Pint and the tests to verify they pass**

Run: `vendor/bin/pint --dirty --format agent`
Run: `php artisan test --compact --filter=UpdateUserTest`
Expected: PASS (8 tests)

- [ ] **Step 10: Commit** (ask the user before running this)

```bash
git add app/Modules/User/Application/DTOs/UpdateInternalUserData.php app/Modules/User/Presentation/Http/Requests/UpdateUserRequest.php app/Modules/User/Application/UseCases/UpdateInternalUserUseCase.php tests/Feature/Modules/User/UpdateInternalUserUseCaseTest.php tests/Feature/Modules/User/UpdateUserTest.php
git commit -m "feat: drop internal profile fields from user update"
```

---

## Task 5: Full regression check

**Files:** none (verification only)

- [ ] **Step 1: Run the full User + InternalProfiles feature and unit suites**

Run: `php artisan test --compact tests/Feature/Modules/User tests/Unit/Domain/User`
Expected: PASS — all tests green, including the two pre-existing unrelated failures noted below staying exactly as they were (not newly broken):
  - `RolesIndexTest::an internal user without the admin role can still fetch roles`
  - `UserResourceFieldsTest::user detail omits internalProfile, role, emailVerifiedAt, lastLoginAt, and passwordChangedAt when absent`

  If either of those two shows a *different* failure message than before, or if any other test fails, stop and investigate — do not proceed to sign-off.

- [ ] **Step 2: Run Pint across the whole diff**

Run: `vendor/bin/pint --dirty --format agent`
Expected: `{"tool":"pint","result":"passed"}` — if it reformats anything, re-run the affected task's test filter to confirm still green.

- [ ] **Step 3: Confirm spec coverage**

Re-read `docs/superpowers/specs/2026-08-27-internal-user-select-existing-profile-design.md` section by section and confirm each is implemented:
  - §1 request validation (`internalProfileId` on Store, profile fields gone from Update) — Tasks 3, 4
  - §2 DTOs — Tasks 3, 4
  - §3 domain + use cases (`linkToUser`, use case rewiring) — Tasks 1, 3, 4
  - §4 new endpoint (uncached, `role:admin`) — Task 2
  - §5 test impact — Tasks 1-4

- [ ] **Step 4: Report to the user**

Summarize: all tasks complete, full suite green, no new regressions. Do not commit anything at this step — Task 5 is verification-only.
