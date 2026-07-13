# Login / Logout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement working `POST /api/v1/auth/login` and `POST /api/v1/auth/logout` endpoints using Sanctum SPA session-cookie authentication, replacing the empty stubs currently in the `Auth` module.

**Architecture:** `LoginUseCase` (Application layer) validates credentials and business rules (email verified, account not suspended/inactive) and returns the domain `User`; `AuthController` then establishes the actual HTTP session (`Auth::guard('web')->loginUsingId()`, session regeneration). `LogoutUseCase` tears down the session via `Auth`/`Session` facades. Both use cases follow the existing `RegisterVendorUseCase`/`VerifyEmailUseCase` pattern already in this module.

**Tech Stack:** Laravel 13, Sanctum v4 (SPA session-cookie mode via `statefulApi()`), Spatie Laravel Data, spatie/laravel-model-states, Pest v4.

## Global Constraints

- PHP 8.4 — use constructor property promotion, explicit return types on every method (per `CLAUDE.md` PHP rules).
- Follow existing module structure: `app/Modules/Auth/{Application,Presentation}` — do not create new base folders.
- Session-cookie auth only (Sanctum SPA, guard `web`) — no Bearer token issuance.
- Do not implement `ResetPassword` — out of scope, leave the existing stub untouched.
- Do not block login for `status = pending` (only block `!isVerified()`, `Suspended`, `Inactive`) — no code path currently transitions a user to `Active`, so blocking `Pending` would make login unusable.
- After modifying any PHP file, run `vendor/bin/pint --dirty --format agent` before committing (per `CLAUDE.md` Pint rule).
- Run tests with `php artisan test --compact --filter=<name>` (per `CLAUDE.md` Pest rule).

---

### Task 1: `UserRepository::findByUsername`

**Files:**
- Modify: `app/Modules/User/Domain/Repositories/UserRepositoryInterface.php`
- Modify: `app/Modules/User/Infrastructure/Repositories/UserRepository.php`
- Test: `tests/Feature/Modules/User/UserRepositoryTest.php`

**Interfaces:**
- Produces: `UserRepositoryInterface::findByUsername(string $username): ?User` — used by `LoginUseCase` in Task 2.

- [ ] **Step 1: Write the failing tests**

Append to `tests/Feature/Modules/User/UserRepositoryTest.php` (keep existing tests and imports as-is, just add these two `test(...)` blocks at the end of the file):

```php
test('findByUsername returns the domain user matching the given username', function () {
    $repository = new UserRepository;
    $user = User::register('jdoe', Email::fromString('jdoe@example.com'), 'hashed-password', UserType::Internal);
    $repository->save($user);

    $found = $repository->findByUsername('jdoe');

    expect($found)->not->toBeNull()
        ->and($found->username())->toBe('jdoe')
        ->and($found->email()->value)->toBe('jdoe@example.com');
});

test('findByUsername returns null when no user matches', function () {
    $repository = new UserRepository;

    expect($repository->findByUsername('missing'))->toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact --filter=findByUsername`
Expected: FAIL — `Call to undefined method ... findByUsername()`

- [ ] **Step 3: Add `findByUsername` to the interface**

In `app/Modules/User/Domain/Repositories/UserRepositoryInterface.php`, add this method inside the interface (after `findByEmail`):

```php
    public function findByUsername(string $username): ?User;
```

- [ ] **Step 4: Implement `findByUsername` in the repository**

In `app/Modules/User/Infrastructure/Repositories/UserRepository.php`, add this method (after `findByEmail`):

```php
    public function findByUsername(string $username): ?User
    {
        $model = UserModel::where('username', $username)->first();

        return $model !== null ? $this->toDomain($model) : null;
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `php artisan test --compact --filter=findByUsername`
Expected: PASS (2 passed)

- [ ] **Step 6: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/User/Domain/Repositories/UserRepositoryInterface.php app/Modules/User/Infrastructure/Repositories/UserRepository.php tests/Feature/Modules/User/UserRepositoryTest.php
git commit -m "feat(user): add findByUsername to UserRepository"
```

---

### Task 2: `LoginData` DTO + `LoginUseCase`

**Files:**
- Modify: `app/Modules/Auth/Application/DTOs/LoginData.php`
- Modify: `app/Modules/Auth/Application/UseCases/LoginUseCase.php` (currently contains a copy-paste bug — the file literally defines `class RegisterVendorUseCase {}`; replace the whole file contents)
- Test: `tests/Feature/Modules/Auth/LoginUseCaseTest.php` (new)

**Interfaces:**
- Consumes: `UserRepositoryInterface::findByEmail(string): ?User`, `::findByUsername(string): ?User` (Task 1), `User::passwordHash(): string`, `::isVerified(): bool`, `::status(): UserStatus` (existing).
- Produces: `LoginData` constructor `(string $identifier, string $identifierField, string $password, bool $remember)`; `LoginUseCase::execute(LoginData $data): User` (throws `Illuminate\Validation\ValidationException` on any failure) — used by `AuthController::login()` in Task 4.

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/Modules/Auth/LoginUseCaseTest.php`:

```php
<?php

use App\Modules\Auth\Application\DTOs\LoginData;
use App\Modules\Auth\Application\UseCases\LoginUseCase;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use App\Modules\User\Infrastructure\Repositories\UserRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

function loginUseCase(): LoginUseCase
{
    return new LoginUseCase(new UserRepository);
}

test('login succeeds with a verified active user identified by email', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'username' => 'jdoe',
        'password' => Hash::make('secret123'),
    ]);

    $user = loginUseCase()->execute(new LoginData(
        identifier: 'jdoe@example.com',
        identifierField: 'email',
        password: 'secret123',
        remember: false,
    ));

    expect($user->email()->value)->toBe('jdoe@example.com');
});

test('login succeeds with a verified active user identified by username', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'username' => 'jdoe',
        'password' => Hash::make('secret123'),
    ]);

    $user = loginUseCase()->execute(new LoginData(
        identifier: 'jdoe',
        identifierField: 'username',
        password: 'secret123',
        remember: false,
    ));

    expect($user->username())->toBe('jdoe');
});

test('login succeeds when status is pending but the email is verified', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
        'status' => 'pending',
    ]);

    $user = loginUseCase()->execute(new LoginData(
        identifier: 'jdoe@example.com',
        identifierField: 'email',
        password: 'secret123',
        remember: false,
    ));

    expect($user->email()->value)->toBe('jdoe@example.com');
});

test('login fails when the identifier does not exist', function () {
    $threw = false;

    try {
        loginUseCase()->execute(new LoginData(
            identifier: 'missing@example.com',
            identifierField: 'email',
            password: 'secret123',
            remember: false,
        ));
    } catch (ValidationException $e) {
        $threw = true;
        expect($e->errors()['identifier'][0])->toBe('These credentials do not match our records.');
    }

    expect($threw)->toBeTrue();
});

test('login fails when the password is wrong', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
    ]);

    $threw = false;

    try {
        loginUseCase()->execute(new LoginData(
            identifier: 'jdoe@example.com',
            identifierField: 'email',
            password: 'wrong-password',
            remember: false,
        ));
    } catch (ValidationException $e) {
        $threw = true;
        expect($e->errors()['identifier'][0])->toBe('These credentials do not match our records.');
    }

    expect($threw)->toBeTrue();
});

test('login fails when the email is not verified', function () {
    UserModel::factory()->unverified()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
    ]);

    $threw = false;

    try {
        loginUseCase()->execute(new LoginData(
            identifier: 'jdoe@example.com',
            identifierField: 'email',
            password: 'secret123',
            remember: false,
        ));
    } catch (ValidationException $e) {
        $threw = true;
        expect($e->errors()['identifier'][0])->toBe('Please verify your email before logging in.');
    }

    expect($threw)->toBeTrue();
});

test('login fails when the account is suspended', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
        'status' => 'suspended',
    ]);

    $threw = false;

    try {
        loginUseCase()->execute(new LoginData(
            identifier: 'jdoe@example.com',
            identifierField: 'email',
            password: 'secret123',
            remember: false,
        ));
    } catch (ValidationException $e) {
        $threw = true;
        expect($e->errors()['identifier'][0])->toBe('Your account has been suspended.');
    }

    expect($threw)->toBeTrue();
});

test('login fails when the account is inactive', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
        'status' => 'inactive',
    ]);

    $threw = false;

    try {
        loginUseCase()->execute(new LoginData(
            identifier: 'jdoe@example.com',
            identifierField: 'email',
            password: 'secret123',
            remember: false,
        ));
    } catch (ValidationException $e) {
        $threw = true;
        expect($e->errors()['identifier'][0])->toBe('Your account is inactive.');
    }

    expect($threw)->toBeTrue();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact --filter=LoginUseCaseTest`
Expected: FAIL — `LoginData::__construct()` takes no arguments (the DTO is currently an empty class) and/or `LoginUseCase::__construct()` argument count mismatch.

- [ ] **Step 3: Implement `LoginData`**

Replace the full contents of `app/Modules/Auth/Application/DTOs/LoginData.php`:

```php
<?php

namespace App\Modules\Auth\Application\DTOs;

use Spatie\LaravelData\Data;

final class LoginData extends Data
{
    public function __construct(
        public readonly string $identifier,
        public readonly string $identifierField,
        public readonly string $password,
        public readonly bool $remember,
    ) {}
}
```

- [ ] **Step 4: Implement `LoginUseCase`**

Replace the full contents of `app/Modules/Auth/Application/UseCases/LoginUseCase.php` (this file currently has a copy-paste bug and defines an empty `RegisterVendorUseCase` class — replace it entirely):

```php
<?php

namespace App\Modules\Auth\Application\UseCases;

use App\Modules\Auth\Application\DTOs\LoginData;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use App\Modules\User\Domain\States\UserStatus\Inactive;
use App\Modules\User\Domain\States\UserStatus\Suspended;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

final class LoginUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
    ) {}

    public function execute(LoginData $data): User
    {
        $user = $data->identifierField === 'email'
            ? $this->users->findByEmail($data->identifier)
            : $this->users->findByUsername($data->identifier);

        if ($user === null || ! Hash::check($data->password, $user->passwordHash())) {
            throw ValidationException::withMessages([
                'identifier' => 'These credentials do not match our records.',
            ]);
        }

        if (! $user->isVerified()) {
            throw ValidationException::withMessages([
                'identifier' => 'Please verify your email before logging in.',
            ]);
        }

        if ($user->status() instanceof Suspended) {
            throw ValidationException::withMessages([
                'identifier' => 'Your account has been suspended.',
            ]);
        }

        if ($user->status() instanceof Inactive) {
            throw ValidationException::withMessages([
                'identifier' => 'Your account is inactive.',
            ]);
        }

        return $user;
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `php artisan test --compact --filter=LoginUseCaseTest`
Expected: PASS (8 passed)

- [ ] **Step 6: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Auth/Application/DTOs/LoginData.php app/Modules/Auth/Application/UseCases/LoginUseCase.php tests/Feature/Modules/Auth/LoginUseCaseTest.php
git commit -m "feat(auth): implement LoginUseCase with credential and account-status checks"
```

---

### Task 3: `LogoutUseCase`

**Files:**
- Create: `app/Modules/Auth/Application/UseCases/LogoutUseCase.php`
- Test: `tests/Feature/Modules/Auth/LogoutUseCaseTest.php` (new)

**Interfaces:**
- Produces: `LogoutUseCase::execute(): void` — used by `AuthController::logout()` in Task 5.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Modules/Auth/LogoutUseCaseTest.php`:

```php
<?php

use App\Modules\Auth\Application\UseCases\LogoutUseCase;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;

uses(RefreshDatabase::class);

test('logout clears the authenticated session', function () {
    $user = UserModel::factory()->create();
    Auth::guard('web')->login($user);

    expect(Auth::guard('web')->check())->toBeTrue();

    (new LogoutUseCase)->execute();

    expect(Auth::guard('web')->check())->toBeFalse();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact --filter=LogoutUseCaseTest`
Expected: FAIL — `Class "App\Modules\Auth\Application\UseCases\LogoutUseCase" not found`

- [ ] **Step 3: Implement `LogoutUseCase`**

Create `app/Modules/Auth/Application/UseCases/LogoutUseCase.php`:

```php
<?php

namespace App\Modules\Auth\Application\UseCases;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;

final class LogoutUseCase
{
    public function execute(): void
    {
        Auth::guard('web')->logout();
        Session::invalidate();
        Session::regenerateToken();
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact --filter=LogoutUseCaseTest`
Expected: PASS (1 passed)

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Auth/Application/UseCases/LogoutUseCase.php tests/Feature/Modules/Auth/LogoutUseCaseTest.php
git commit -m "feat(auth): add LogoutUseCase"
```

---

### Task 4: `AuthController::login` + `POST /api/v1/auth/login` route

**Files:**
- Modify: `app/Modules/Auth/Presentation/Http/Controllers/AuthController.php`
- Modify: `routes/api/v1/auth.php`
- Test: `tests/Feature/Modules/Auth/LoginTest.php` (new)

**Interfaces:**
- Consumes: `LoginUseCase::execute(LoginData $data): User` (Task 2), `LoginData` constructor (Task 2), `LoginRequest::identifierField(): string` (existing, unchanged).
- Produces: route `auth.login` (`POST /api/v1/auth/login`), `AuthController::login(LoginRequest $request): JsonResponse`.

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/Modules/Auth/LoginTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('a verified active user can login with email and password', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'username' => 'jdoe',
        'password' => Hash::make('secret123'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'identifier' => 'jdoe@example.com',
        'password' => 'secret123',
    ]);

    $response->assertOk()
        ->assertJson(['message' => 'Login successful.'])
        ->assertJsonPath('data.email', 'jdoe@example.com');

    $this->assertAuthenticated('web');
});

test('a verified active user can login with username and password', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'username' => 'jdoe',
        'password' => Hash::make('secret123'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'identifier' => 'jdoe',
        'password' => 'secret123',
    ]);

    $response->assertOk();
    $this->assertAuthenticated('web');
});

test('login fails with 422 when the password is wrong', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'identifier' => 'jdoe@example.com',
        'password' => 'wrong-password',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('identifier');

    $this->assertGuest('web');
});

test('login fails with 422 when the email is not verified', function () {
    UserModel::factory()->unverified()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'identifier' => 'jdoe@example.com',
        'password' => 'secret123',
    ]);

    $response->assertStatus(422)
        ->assertJsonFragment(['identifier' => ['Please verify your email before logging in.']]);
});

test('login fails with 422 when the account is suspended', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
        'status' => 'suspended',
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'identifier' => 'jdoe@example.com',
        'password' => 'secret123',
    ]);

    $response->assertStatus(422)
        ->assertJsonFragment(['identifier' => ['Your account has been suspended.']]);
});

test('login validation requires identifier and password', function () {
    $response = $this->postJson('/api/v1/auth/login', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['identifier', 'password']);
});

test('remember=true issues a new remember token for the user', function () {
    $user = UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
        'remember_token' => 'original-token',
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'identifier' => 'jdoe@example.com',
        'password' => 'secret123',
        'remember' => true,
    ]);

    $response->assertOk();

    expect($user->fresh()->remember_token)->not->toBe('original-token');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact --filter=LoginTest`
Expected: FAIL — 404 Not Found (route `auth.login` does not exist yet)

- [ ] **Step 3: Add the `login` route**

In `routes/api/v1/auth.php`, add this route inside the `Route::prefix('auth')->group(function () { ... })` block, right after the `register` route:

```php
    Route::post('login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1')
        ->name('auth.login');
```

- [ ] **Step 4: Implement `AuthController::login`**

In `app/Modules/Auth/Presentation/Http/Controllers/AuthController.php`:

1. Add imports at the top of the file (alongside the existing `use` statements):

```php
use App\Modules\Auth\Application\DTOs\LoginData;
use App\Modules\Auth\Application\UseCases\LoginUseCase;
use Illuminate\Support\Facades\Auth;
```

2. Update the constructor to inject `LoginUseCase`:

```php
    public function __construct(
        private readonly RegisterVendorUseCase $registerVendor,
        private readonly LoginUseCase $login,
        private readonly VerifyEmailUseCase $verifyEmail,
        private readonly ResendVerificationEmailUseCase $resendVerificationEmail,
    ) {}
```

3. Replace the empty `public function Login(LoginRequest $request) {}` stub with:

```php
    public function login(LoginRequest $request): JsonResponse
    {
        $user = $this->login->execute(LoginData::from([
            ...$request->validated(),
            'identifierField' => $request->identifierField(),
            'remember' => $request->boolean('remember'),
        ]));

        Auth::guard('web')->loginUsingId($user->id(), remember: $request->boolean('remember'));
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Login successful.',
            'data' => [
                'id' => $user->id(),
                'username' => $user->username(),
                'email' => (string) $user->email(),
                'userType' => $user->userType()->value,
            ],
        ]);
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `php artisan test --compact --filter=LoginTest`
Expected: PASS (7 passed)

- [ ] **Step 6: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Auth/Presentation/Http/Controllers/AuthController.php routes/api/v1/auth.php tests/Feature/Modules/Auth/LoginTest.php
git commit -m "feat(auth): wire up POST /api/v1/auth/login"
```

---

### Task 5: `AuthController::logout` + `POST /api/v1/auth/logout` route

**Files:**
- Modify: `app/Modules/Auth/Presentation/Http/Controllers/AuthController.php`
- Modify: `routes/api/v1/auth.php`
- Test: `tests/Feature/Modules/Auth/LogoutTest.php` (new)

**Interfaces:**
- Consumes: `LogoutUseCase::execute(): void` (Task 3).
- Produces: route `auth.logout` (`POST /api/v1/auth/logout`, middleware `auth:sanctum`), `AuthController::logout(): JsonResponse`.

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/Modules/Auth/LogoutTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('an authenticated user can logout', function () {
    $user = UserModel::factory()->create();
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/auth/logout');

    $response->assertOk()
        ->assertJson(['message' => 'Logout successful.']);

    $this->assertGuest('web');
});

test('logout requires authentication', function () {
    $response = $this->postJson('/api/v1/auth/logout');

    $response->assertStatus(401);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact --filter=LogoutTest`
Expected: FAIL — 404 Not Found (route `auth.logout` does not exist yet)

- [ ] **Step 3: Add the `logout` route**

In `routes/api/v1/auth.php`, add this route inside the `Route::prefix('auth')->group(function () { ... })` block, right after the `login` route added in Task 4:

```php
    Route::post('logout', [AuthController::class, 'logout'])
        ->middleware('auth:sanctum')
        ->name('auth.logout');
```

- [ ] **Step 4: Implement `AuthController::logout`**

In `app/Modules/Auth/Presentation/Http/Controllers/AuthController.php`:

1. Add this import alongside the others added in Task 4:

```php
use App\Modules\Auth\Application\UseCases\LogoutUseCase;
```

2. Update the constructor to inject `LogoutUseCase`:

```php
    public function __construct(
        private readonly RegisterVendorUseCase $registerVendor,
        private readonly LoginUseCase $login,
        private readonly LogoutUseCase $logout,
        private readonly VerifyEmailUseCase $verifyEmail,
        private readonly ResendVerificationEmailUseCase $resendVerificationEmail,
    ) {}
```

3. Add this method (after `login`):

```php
    public function logout(): JsonResponse
    {
        $this->logout->execute();

        return response()->json(['message' => 'Logout successful.']);
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `php artisan test --compact --filter=LogoutTest`
Expected: PASS (2 passed)

- [ ] **Step 6: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Auth/Presentation/Http/Controllers/AuthController.php routes/api/v1/auth.php tests/Feature/Modules/Auth/LogoutTest.php
git commit -m "feat(auth): wire up POST /api/v1/auth/logout"
```

---

### Task 6: Full regression check

**Files:** none (verification only — no new code)

- [ ] **Step 1: Run the full test suite**

Run: `php artisan test --compact`
Expected: All tests pass, including the new `Auth` and `User` tests from Tasks 1-5.

- [ ] **Step 2: Confirm the new routes are registered**

Run: `php artisan route:list --path=api/v1/auth`
Expected: Output includes `POST api/v1/auth/login` and `POST api/v1/auth/logout` alongside the existing `register`, `email/verify`, `email/resend` routes.

- [ ] **Step 3: Confirm code style is clean**

Run: `vendor/bin/pint --format agent`
Expected: No further changes needed (all files already formatted per-task in Steps 6 above). If it reports fixes, stage and commit them:

```bash
git add -u
git commit -m "style: pint formatting"
```
