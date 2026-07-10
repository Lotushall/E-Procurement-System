# User/Vendor Domain Entities, Value Objects, Enums, States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Domain layer (plain PHP Entities, Value Objects, native enums, `spatie/laravel-model-states` state machines) for the `User` and `Vendor` modules, add a new `Shared` module for cross-module Value Objects, and wire the new state machines into the existing `User`, `VendorProfiles`, `VendorDocuments` Eloquent models.

**Architecture:** Domain Entities are plain, framework-agnostic PHP objects (constructor-promoted readonly properties) — they never extend Eloquent and never know about persistence. Value Objects validate primitive fields that have a clear format (`Email`, `PhoneNumber`, `PostalCode`, `TaxId`, `CitizenId`). Fields that are a fixed category with no transitions use a native PHP backed enum (`UserType`). Fields that are a workflow with transitions use `spatie/laravel-model-states` (`UserStatus`, `VerificationStatus`, `DocumentStatus`) — the state classes themselves live in `Domain/States` (framework-agnostic, no Eloquent dependency), and are wired onto the *existing* Eloquent models in Infrastructure via `HasStates` + a cast, which is the only place the state machine touches persistence.

**Tech Stack:** PHP 8.4, Laravel 13, `nwidart/laravel-modules`, `spatie/laravel-model-states` ^2.14, Pest v4.

## Global Constraints

- PHP 8.4: always use curly braces for control structures, explicit return types and parameter type hints on every method, constructor property promotion for simple value holders.
- TitleCase enum case names (e.g. `Internal`, `Company`, `Individual`) — see `CLAUDE.md` PHP rules.
- Do not add `declare(strict_types=1);` — no existing file in this codebase uses it, stay consistent.
- Pass `--no-interaction` to every Artisan command.
- Run `vendor/bin/pint --dirty --format agent` after every task that touches a `.php` file, before committing that task.
- Do not modify `database/migrations/0001_01_01_000000_create_users_table.php` — every `State` subclass must declare `protected static ?string $name` matching the existing native `enum` column values exactly (`pending`, `active`, `suspended`, `inactive`, `approved`, `rejected`).
- Do not create Repository mapping logic, and do not touch `VendorCompanyDetails.php` / `VendorIndividualDetails.php` (no status field, out of scope) — see spec Non-goals.
- Spec reference: `docs/superpowers/specs/2026-07-10-user-vendor-domain-entities-design.md`.

---

### Task 1: `Shared` module + `Email`/`PhoneNumber`/`PostalCode` Value Objects

**Files:**
- Create (via Artisan, then trim): `app/Modules/Shared/**`
- Create: `app/Modules/Shared/Domain/ValueObjects/Email.php`
- Create: `app/Modules/Shared/Domain/ValueObjects/PhoneNumber.php`
- Create: `app/Modules/Shared/Domain/ValueObjects/PostalCode.php`
- Test: `tests/Unit/Domain/Shared/ValueObjects/EmailTest.php`
- Test: `tests/Unit/Domain/Shared/ValueObjects/PhoneNumberTest.php`
- Test: `tests/Unit/Domain/Shared/ValueObjects/PostalCodeTest.php`

**Interfaces:**
- Produces: `App\Modules\Shared\Domain\ValueObjects\Email::fromString(string $value): self`, readonly `->value: string`, `__toString(): string`
- Produces: `App\Modules\Shared\Domain\ValueObjects\PhoneNumber::fromString(string $value): self`, readonly `->value: string`, `__toString(): string`
- Produces: `App\Modules\Shared\Domain\ValueObjects\PostalCode::fromString(string $value): self`, readonly `->value: string`, `__toString(): string`
- Consumes: nothing from earlier tasks (first task)

- [ ] **Step 1: Scaffold the `Shared` module**

Run:
```bash
php artisan module:make Shared --no-interaction
```

Expected output ends with something like `Module [Shared] created successfully.` and `modules_statuses.json` now contains `"Shared": true`.

- [ ] **Step 2: Delete the auto-generated entity scaffolding the module doesn't need**

`Shared` is a Domain-only shared kernel (Value Objects only) — it has no primary entity, no HTTP surface, and no persistence. Delete the files the custom `module:make` override auto-generates for a "primary entity" named after the module (see `app/Console/Commands/ModuleMakeCommand.php`):

```bash
rm -f "app/Modules/Shared/Infrastructure/Models/Shared.php"
rm -f "app/Modules/Shared/Infrastructure/Repositories/SharedRepository.php"
rm -f "app/Modules/Shared/Domain/Repositories/SharedRepositoryInterface.php"
rm -f "app/Modules/Shared/Presentation/Http/Controllers/SharedController.php"
rm -f "app/Modules/Shared/Presentation/Http/Requests/StoreSharedRequest.php"
rm -f "app/Modules/Shared/Presentation/Http/Requests/UpdateSharedRequest.php"
```

Keep everything else (`module.json`, `Providers/SharedServiceProvider.php`, the empty skeleton folders with `.gitkeep`).

- [ ] **Step 3: Verify what's left**

Run:
```bash
find app/Modules/Shared -type f
```
Expected: only `module.json`, `Providers/SharedServiceProvider.php`, and `.gitkeep` files remain (no `Shared.php`, no `SharedController.php`, etc).

- [ ] **Step 4: Write the failing test for `Email`**

Create `tests/Unit/Domain/Shared/ValueObjects/EmailTest.php`:
```php
<?php

use App\Modules\Shared\Domain\ValueObjects\Email;

test('creates an email from a valid address, trimmed and lowercased', function () {
    $email = Email::fromString('  User@Example.COM  ');

    expect($email->value)->toBe('user@example.com')
        ->and((string) $email)->toBe('user@example.com');
});

test('rejects an invalid email address', function () {
    Email::fromString('not-an-email');
})->throws(InvalidArgumentException::class);
```

- [ ] **Step 5: Run it to verify it fails**

Run: `php artisan test tests/Unit/Domain/Shared/ValueObjects/EmailTest.php`
Expected: FAIL — `Class "App\Modules\Shared\Domain\ValueObjects\Email" not found`

- [ ] **Step 6: Implement `Email`**

Create `app/Modules/Shared/Domain/ValueObjects/Email.php`:
```php
<?php

namespace App\Modules\Shared\Domain\ValueObjects;

use InvalidArgumentException;

final class Email
{
    private function __construct(
        public readonly string $value,
    ) {}

    public static function fromString(string $value): self
    {
        $value = strtolower(trim($value));

        if (filter_var($value, FILTER_VALIDATE_EMAIL) === false) {
            throw new InvalidArgumentException("Invalid email address: {$value}");
        }

        return new self($value);
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
```

- [ ] **Step 7: Run it to verify it passes**

Run: `php artisan test tests/Unit/Domain/Shared/ValueObjects/EmailTest.php`
Expected: PASS (2 tests)

- [ ] **Step 8: Write the failing test for `PhoneNumber`**

Create `tests/Unit/Domain/Shared/ValueObjects/PhoneNumberTest.php`:
```php
<?php

use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;

test('creates a phone number by stripping non-digit characters', function () {
    $phone = PhoneNumber::fromString('081-234-5678');

    expect($phone->value)->toBe('0812345678')
        ->and((string) $phone)->toBe('0812345678');
});

test('accepts a 9-digit phone number', function () {
    $phone = PhoneNumber::fromString('812345678');

    expect($phone->value)->toBe('812345678');
});

test('rejects a phone number shorter than 9 digits', function () {
    PhoneNumber::fromString('12345');
})->throws(InvalidArgumentException::class);

test('rejects a phone number longer than 10 digits', function () {
    PhoneNumber::fromString('123456789012');
})->throws(InvalidArgumentException::class);
```

- [ ] **Step 9: Run it to verify it fails**

Run: `php artisan test tests/Unit/Domain/Shared/ValueObjects/PhoneNumberTest.php`
Expected: FAIL — `Class "App\Modules\Shared\Domain\ValueObjects\PhoneNumber" not found`

- [ ] **Step 10: Implement `PhoneNumber`**

Create `app/Modules/Shared/Domain/ValueObjects/PhoneNumber.php`:
```php
<?php

namespace App\Modules\Shared\Domain\ValueObjects;

use InvalidArgumentException;

final class PhoneNumber
{
    private function __construct(
        public readonly string $value,
    ) {}

    public static function fromString(string $value): self
    {
        $digits = preg_replace('/\D/', '', $value);

        if (! preg_match('/^\d{9,10}$/', $digits)) {
            throw new InvalidArgumentException("Invalid phone number: {$value}");
        }

        return new self($digits);
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
```

- [ ] **Step 11: Run it to verify it passes**

Run: `php artisan test tests/Unit/Domain/Shared/ValueObjects/PhoneNumberTest.php`
Expected: PASS (4 tests)

- [ ] **Step 12: Write the failing test for `PostalCode`**

Create `tests/Unit/Domain/Shared/ValueObjects/PostalCodeTest.php`:
```php
<?php

use App\Modules\Shared\Domain\ValueObjects\PostalCode;

test('creates a postal code from a 5-digit string', function () {
    $postalCode = PostalCode::fromString('10110');

    expect($postalCode->value)->toBe('10110')
        ->and((string) $postalCode)->toBe('10110');
});

test('rejects a postal code that is not 5 digits', function () {
    PostalCode::fromString('101');
})->throws(InvalidArgumentException::class);

test('rejects a postal code containing non-digit characters', function () {
    PostalCode::fromString('abcde');
})->throws(InvalidArgumentException::class);
```

- [ ] **Step 13: Run it to verify it fails**

Run: `php artisan test tests/Unit/Domain/Shared/ValueObjects/PostalCodeTest.php`
Expected: FAIL — `Class "App\Modules\Shared\Domain\ValueObjects\PostalCode" not found`

- [ ] **Step 14: Implement `PostalCode`**

Create `app/Modules/Shared/Domain/ValueObjects/PostalCode.php`:
```php
<?php

namespace App\Modules\Shared\Domain\ValueObjects;

use InvalidArgumentException;

final class PostalCode
{
    private function __construct(
        public readonly string $value,
    ) {}

    public static function fromString(string $value): self
    {
        if (! preg_match('/^\d{5}$/', $value)) {
            throw new InvalidArgumentException("Invalid postal code: {$value}");
        }

        return new self($value);
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
```

- [ ] **Step 15: Run it to verify it passes**

Run: `php artisan test tests/Unit/Domain/Shared/ValueObjects/PostalCodeTest.php`
Expected: PASS (3 tests)

- [ ] **Step 16: Run Pint and commit**

Run:
```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Shared tests/Unit/Domain/Shared modules_statuses.json
git commit -m "feat(shared): add Shared module with Email, PhoneNumber, PostalCode value objects"
```

---

### Task 2: Vendor `TaxId`/`CitizenId` Value Objects

**Files:**
- Create: `app/Modules/Vendor/Domain/ValueObjects/TaxId.php`
- Create: `app/Modules/Vendor/Domain/ValueObjects/CitizenId.php`
- Test: `tests/Unit/Domain/Vendor/ValueObjects/TaxIdTest.php`
- Test: `tests/Unit/Domain/Vendor/ValueObjects/CitizenIdTest.php`

**Interfaces:**
- Produces: `App\Modules\Vendor\Domain\ValueObjects\TaxId::fromString(string $value): self`, readonly `->value: string`, `__toString(): string`
- Produces: `App\Modules\Vendor\Domain\ValueObjects\CitizenId::fromString(string $value): self`, readonly `->value: string`, `__toString(): string`
- Consumes: nothing (independent of Task 1)

- [ ] **Step 1: Write the failing test for `TaxId`**

Create `tests/Unit/Domain/Vendor/ValueObjects/TaxIdTest.php`:
```php
<?php

use App\Modules\Vendor\Domain\ValueObjects\TaxId;

test('creates a tax id from a 13-digit string', function () {
    $taxId = TaxId::fromString('1234567890123');

    expect($taxId->value)->toBe('1234567890123')
        ->and((string) $taxId)->toBe('1234567890123');
});

test('rejects a tax id that is not 13 digits', function () {
    TaxId::fromString('12345');
})->throws(InvalidArgumentException::class);

test('rejects a tax id containing non-digit characters', function () {
    TaxId::fromString('123456789012a');
})->throws(InvalidArgumentException::class);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `php artisan test tests/Unit/Domain/Vendor/ValueObjects/TaxIdTest.php`
Expected: FAIL — `Class "App\Modules\Vendor\Domain\ValueObjects\TaxId" not found`

- [ ] **Step 3: Implement `TaxId`**

Create `app/Modules/Vendor/Domain/ValueObjects/TaxId.php`:
```php
<?php

namespace App\Modules\Vendor\Domain\ValueObjects;

use InvalidArgumentException;

final class TaxId
{
    private function __construct(
        public readonly string $value,
    ) {}

    public static function fromString(string $value): self
    {
        if (! preg_match('/^\d{13}$/', $value)) {
            throw new InvalidArgumentException('Invalid tax ID: must be 13 digits.');
        }

        return new self($value);
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `php artisan test tests/Unit/Domain/Vendor/ValueObjects/TaxIdTest.php`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test for `CitizenId`**

Create `tests/Unit/Domain/Vendor/ValueObjects/CitizenIdTest.php`:
```php
<?php

use App\Modules\Vendor\Domain\ValueObjects\CitizenId;

test('creates a citizen id from a 13-digit string', function () {
    $citizenId = CitizenId::fromString('1234567890123');

    expect($citizenId->value)->toBe('1234567890123')
        ->and((string) $citizenId)->toBe('1234567890123');
});

test('rejects a citizen id that is not 13 digits', function () {
    CitizenId::fromString('12345');
})->throws(InvalidArgumentException::class);

test('rejects a citizen id containing non-digit characters', function () {
    CitizenId::fromString('123456789012a');
})->throws(InvalidArgumentException::class);
```

- [ ] **Step 6: Run it to verify it fails**

Run: `php artisan test tests/Unit/Domain/Vendor/ValueObjects/CitizenIdTest.php`
Expected: FAIL — `Class "App\Modules\Vendor\Domain\ValueObjects\CitizenId" not found`

- [ ] **Step 7: Implement `CitizenId`**

Create `app/Modules/Vendor/Domain/ValueObjects/CitizenId.php`:
```php
<?php

namespace App\Modules\Vendor\Domain\ValueObjects;

use InvalidArgumentException;

final class CitizenId
{
    private function __construct(
        public readonly string $value,
    ) {}

    public static function fromString(string $value): self
    {
        if (! preg_match('/^\d{13}$/', $value)) {
            throw new InvalidArgumentException('Invalid citizen ID: must be 13 digits.');
        }

        return new self($value);
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `php artisan test tests/Unit/Domain/Vendor/ValueObjects/CitizenIdTest.php`
Expected: PASS (3 tests)

- [ ] **Step 9: Run Pint and commit**

Run:
```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Domain/ValueObjects tests/Unit/Domain/Vendor/ValueObjects
git commit -m "feat(vendor): add TaxId and CitizenId value objects"
```

---

### Task 3: `states`/`enums` generator keys + `UserStatus` state machine (User module)

**Files:**
- Modify: `config/modules.php`
- Create: `app/Modules/User/Domain/States/UserStatus.php`
- Create: `app/Modules/User/Domain/States/UserStatus/Pending.php`
- Create: `app/Modules/User/Domain/States/UserStatus/Active.php`
- Create: `app/Modules/User/Domain/States/UserStatus/Suspended.php`
- Create: `app/Modules/User/Domain/States/UserStatus/Inactive.php`
- Test: `tests/Feature/Domain/User/States/UserStatusTest.php`

**Interfaces:**
- Produces: `App\Modules\User\Domain\States\UserStatus` (abstract, extends `Spatie\ModelStates\State`), concrete `UserStatus\{Pending,Active,Suspended,Inactive}`, each with `getMorphClass(): string` returning `'pending'`/`'active'`/`'suspended'`/`'inactive'`
- Consumes: nothing from earlier tasks

- [ ] **Step 1: Add `enums` and `states` generator keys to `config/modules.php`**

In `config/modules.php`, find this block (inside `'generator' => [...]`):
```php
            'entities' => ['path' => 'Domain/Entities', 'generate' => true],       // ยังไม่มีคำสั่ง ต้องเขียนเอง (ข้อ 2)
            'valueobjects' => ['path' => 'Domain/ValueObjects', 'generate' => true], // ยังไม่มีคำสั่ง ต้องเขียนเอง (ข้อ 2)
            // 'event'      => ['path' => 'Domain/Events', 'generate' => false],
            // 'enums'      => ['path' => 'Domain/Enums', 'generate' => false],
            // 'exceptions' => ['path' => 'Domain/Exceptions', 'generate' => false],
            // 'policies'   => ['path' => 'Domain/Policies', 'generate' => false],
```

Replace it with:
```php
            'entities' => ['path' => 'Domain/Entities', 'generate' => true],       // ยังไม่มีคำสั่ง ต้องเขียนเอง (ข้อ 2)
            'valueobjects' => ['path' => 'Domain/ValueObjects', 'generate' => true], // ยังไม่มีคำสั่ง ต้องเขียนเอง (ข้อ 2)
            'enums' => ['path' => 'Domain/Enums', 'generate' => true],     // ยังไม่มีคำสั่ง ต้องเขียนเอง
            'states' => ['path' => 'Domain/States', 'generate' => true],   // ยังไม่มีคำสั่ง ต้องเขียนเอง
            // 'event'      => ['path' => 'Domain/Events', 'generate' => false],
            // 'exceptions' => ['path' => 'Domain/Exceptions', 'generate' => false],
            // 'policies'   => ['path' => 'Domain/Policies', 'generate' => false],
```

- [ ] **Step 2: Write the failing test for `UserStatus`**

Create `tests/Feature/Domain/User/States/UserStatusTest.php`:
```php
<?php

use App\Modules\User\Domain\States\UserStatus;
use App\Modules\User\Domain\States\UserStatus\Active;
use App\Modules\User\Domain\States\UserStatus\Inactive;
use App\Modules\User\Domain\States\UserStatus\Pending;
use App\Modules\User\Domain\States\UserStatus\Suspended;

test('default state is pending', function () {
    expect(UserStatus::config()->defaultStateClass)->toBe(Pending::class);
});

test('morph class values match the existing users.status enum column values', function () {
    expect(Pending::getMorphClass())->toBe('pending')
        ->and(Active::getMorphClass())->toBe('active')
        ->and(Suspended::getMorphClass())->toBe('suspended')
        ->and(Inactive::getMorphClass())->toBe('inactive');
});

test('pending can only transition to active', function () {
    $state = (new Pending(null))->setField('status');

    expect($state->canTransitionTo(Active::class))->toBeTrue()
        ->and($state->canTransitionTo(Suspended::class))->toBeFalse()
        ->and($state->canTransitionTo(Inactive::class))->toBeFalse();
});

test('active can transition to suspended or inactive', function () {
    $state = (new Active(null))->setField('status');

    expect($state->canTransitionTo(Suspended::class))->toBeTrue()
        ->and($state->canTransitionTo(Inactive::class))->toBeTrue()
        ->and($state->canTransitionTo(Pending::class))->toBeFalse();
});

test('suspended can only transition back to active', function () {
    $state = (new Suspended(null))->setField('status');

    expect($state->canTransitionTo(Active::class))->toBeTrue()
        ->and($state->canTransitionTo(Inactive::class))->toBeFalse();
});

test('inactive can only transition back to active', function () {
    $state = (new Inactive(null))->setField('status');

    expect($state->canTransitionTo(Active::class))->toBeTrue()
        ->and($state->canTransitionTo(Suspended::class))->toBeFalse();
});
```

This test extends `TestCase` (booted Laravel app) because it lives under `tests/Feature/` — required here since `Spatie\ModelStates\State::canTransitionTo()` calls the global `config()` helper (via `resolveTransitionClass()`) whenever a transition is allowed; without a booted container this throws `Target class [config] does not exist`. `->setField('status')` is required too, because `State::$field` is otherwise left uninitialized when you construct a state object directly (outside of Eloquent hydration) and `resolveTransitionClass()` reads it directly.

- [ ] **Step 3: Run it to verify it fails**

Run: `php artisan test tests/Feature/Domain/User/States/UserStatusTest.php`
Expected: FAIL — `Class "App\Modules\User\Domain\States\UserStatus" not found`

- [ ] **Step 4: Implement `UserStatus` and its 4 concrete states**

Create `app/Modules/User/Domain/States/UserStatus.php`:
```php
<?php

namespace App\Modules\User\Domain\States;

use App\Modules\User\Domain\States\UserStatus\Active;
use App\Modules\User\Domain\States\UserStatus\Inactive;
use App\Modules\User\Domain\States\UserStatus\Pending;
use App\Modules\User\Domain\States\UserStatus\Suspended;
use Spatie\ModelStates\State;
use Spatie\ModelStates\StateConfig;

abstract class UserStatus extends State
{
    protected static ?string $name = null;

    public static function config(): StateConfig
    {
        return parent::config()
            ->default(Pending::class)
            ->registerState([
                Pending::class,
                Active::class,
                Suspended::class,
                Inactive::class,
            ])
            ->allowTransition(Pending::class, Active::class)
            ->allowTransition(Active::class, Suspended::class)
            ->allowTransition(Suspended::class, Active::class)
            ->allowTransition(Active::class, Inactive::class)
            ->allowTransition(Inactive::class, Active::class);
    }
}
```

Create `app/Modules/User/Domain/States/UserStatus/Pending.php`:
```php
<?php

namespace App\Modules\User\Domain\States\UserStatus;

use App\Modules\User\Domain\States\UserStatus;

class Pending extends UserStatus
{
    protected static ?string $name = 'pending';
}
```

Create `app/Modules/User/Domain/States/UserStatus/Active.php`:
```php
<?php

namespace App\Modules\User\Domain\States\UserStatus;

use App\Modules\User\Domain\States\UserStatus;

class Active extends UserStatus
{
    protected static ?string $name = 'active';
}
```

Create `app/Modules/User/Domain/States/UserStatus/Suspended.php`:
```php
<?php

namespace App\Modules\User\Domain\States\UserStatus;

use App\Modules\User\Domain\States\UserStatus;

class Suspended extends UserStatus
{
    protected static ?string $name = 'suspended';
}
```

Create `app/Modules/User/Domain/States/UserStatus/Inactive.php`:
```php
<?php

namespace App\Modules\User\Domain\States\UserStatus;

use App\Modules\User\Domain\States\UserStatus;

class Inactive extends UserStatus
{
    protected static ?string $name = 'inactive';
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `php artisan test tests/Feature/Domain/User/States/UserStatusTest.php`
Expected: PASS (6 tests)

- [ ] **Step 6: Run Pint and commit**

Run:
```bash
vendor/bin/pint --dirty --format agent
git add config/modules.php app/Modules/User/Domain/States tests/Feature/Domain/User/States
git commit -m "feat(user): add UserStatus state machine and states/enums generator config"
```

---

### Task 4: `VerificationStatus`/`DocumentStatus` state machines (Vendor module)

**Files:**
- Create: `app/Modules/Vendor/Domain/States/VerificationStatus.php`
- Create: `app/Modules/Vendor/Domain/States/VerificationStatus/Pending.php`
- Create: `app/Modules/Vendor/Domain/States/VerificationStatus/Approved.php`
- Create: `app/Modules/Vendor/Domain/States/VerificationStatus/Rejected.php`
- Create: `app/Modules/Vendor/Domain/States/DocumentStatus.php`
- Create: `app/Modules/Vendor/Domain/States/DocumentStatus/Pending.php`
- Create: `app/Modules/Vendor/Domain/States/DocumentStatus/Approved.php`
- Create: `app/Modules/Vendor/Domain/States/DocumentStatus/Rejected.php`
- Test: `tests/Feature/Domain/Vendor/States/VerificationStatusTest.php`
- Test: `tests/Feature/Domain/Vendor/States/DocumentStatusTest.php`

**Interfaces:**
- Produces: `App\Modules\Vendor\Domain\States\VerificationStatus` (+ `Pending`/`Approved`/`Rejected`), `App\Modules\Vendor\Domain\States\DocumentStatus` (+ `Pending`/`Approved`/`Rejected`) — each concrete class `getMorphClass()` returns `'pending'`/`'approved'`/`'rejected'`
- Consumes: `states` generator key added in Task 3 (informational only, not a runtime dependency)

- [ ] **Step 1: Write the failing test for `VerificationStatus`**

Create `tests/Feature/Domain/Vendor/States/VerificationStatusTest.php`:
```php
<?php

use App\Modules\Vendor\Domain\States\VerificationStatus;
use App\Modules\Vendor\Domain\States\VerificationStatus\Approved;
use App\Modules\Vendor\Domain\States\VerificationStatus\Pending;
use App\Modules\Vendor\Domain\States\VerificationStatus\Rejected;

test('default state is pending', function () {
    expect(VerificationStatus::config()->defaultStateClass)->toBe(Pending::class);
});

test('morph class values match the existing vendor_profiles.verification_status enum column values', function () {
    expect(Pending::getMorphClass())->toBe('pending')
        ->and(Approved::getMorphClass())->toBe('approved')
        ->and(Rejected::getMorphClass())->toBe('rejected');
});

test('pending can transition to approved or rejected', function () {
    $state = (new Pending(null))->setField('verification_status');

    expect($state->canTransitionTo(Approved::class))->toBeTrue()
        ->and($state->canTransitionTo(Rejected::class))->toBeTrue();
});

test('approved cannot transition anywhere', function () {
    $state = (new Approved(null))->setField('verification_status');

    expect($state->canTransitionTo(Pending::class))->toBeFalse()
        ->and($state->canTransitionTo(Rejected::class))->toBeFalse();
});

test('rejected can only transition back to pending', function () {
    $state = (new Rejected(null))->setField('verification_status');

    expect($state->canTransitionTo(Pending::class))->toBeTrue()
        ->and($state->canTransitionTo(Approved::class))->toBeFalse();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `php artisan test tests/Feature/Domain/Vendor/States/VerificationStatusTest.php`
Expected: FAIL — `Class "App\Modules\Vendor\Domain\States\VerificationStatus" not found`

- [ ] **Step 3: Implement `VerificationStatus` and its 3 concrete states**

Create `app/Modules/Vendor/Domain/States/VerificationStatus.php`:
```php
<?php

namespace App\Modules\Vendor\Domain\States;

use App\Modules\Vendor\Domain\States\VerificationStatus\Approved;
use App\Modules\Vendor\Domain\States\VerificationStatus\Pending;
use App\Modules\Vendor\Domain\States\VerificationStatus\Rejected;
use Spatie\ModelStates\State;
use Spatie\ModelStates\StateConfig;

abstract class VerificationStatus extends State
{
    protected static ?string $name = null;

    public static function config(): StateConfig
    {
        return parent::config()
            ->default(Pending::class)
            ->registerState([
                Pending::class,
                Approved::class,
                Rejected::class,
            ])
            ->allowTransition(Pending::class, Approved::class)
            ->allowTransition(Pending::class, Rejected::class)
            ->allowTransition(Rejected::class, Pending::class);
    }
}
```

Create `app/Modules/Vendor/Domain/States/VerificationStatus/Pending.php`:
```php
<?php

namespace App\Modules\Vendor\Domain\States\VerificationStatus;

use App\Modules\Vendor\Domain\States\VerificationStatus;

class Pending extends VerificationStatus
{
    protected static ?string $name = 'pending';
}
```

Create `app/Modules/Vendor/Domain/States/VerificationStatus/Approved.php`:
```php
<?php

namespace App\Modules\Vendor\Domain\States\VerificationStatus;

use App\Modules\Vendor\Domain\States\VerificationStatus;

class Approved extends VerificationStatus
{
    protected static ?string $name = 'approved';
}
```

Create `app/Modules/Vendor/Domain/States/VerificationStatus/Rejected.php`:
```php
<?php

namespace App\Modules\Vendor\Domain\States\VerificationStatus;

use App\Modules\Vendor\Domain\States\VerificationStatus;

class Rejected extends VerificationStatus
{
    protected static ?string $name = 'rejected';
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `php artisan test tests/Feature/Domain/Vendor/States/VerificationStatusTest.php`
Expected: PASS (5 tests)

- [ ] **Step 5: Write the failing test for `DocumentStatus`**

Create `tests/Feature/Domain/Vendor/States/DocumentStatusTest.php`:
```php
<?php

use App\Modules\Vendor\Domain\States\DocumentStatus;
use App\Modules\Vendor\Domain\States\DocumentStatus\Approved;
use App\Modules\Vendor\Domain\States\DocumentStatus\Pending;
use App\Modules\Vendor\Domain\States\DocumentStatus\Rejected;

test('default state is pending', function () {
    expect(DocumentStatus::config()->defaultStateClass)->toBe(Pending::class);
});

test('morph class values match the existing vendor_documents.status enum column values', function () {
    expect(Pending::getMorphClass())->toBe('pending')
        ->and(Approved::getMorphClass())->toBe('approved')
        ->and(Rejected::getMorphClass())->toBe('rejected');
});

test('pending can transition to approved or rejected', function () {
    $state = (new Pending(null))->setField('status');

    expect($state->canTransitionTo(Approved::class))->toBeTrue()
        ->and($state->canTransitionTo(Rejected::class))->toBeTrue();
});

test('approved cannot transition anywhere', function () {
    $state = (new Approved(null))->setField('status');

    expect($state->canTransitionTo(Pending::class))->toBeFalse()
        ->and($state->canTransitionTo(Rejected::class))->toBeFalse();
});

test('rejected can only transition back to pending', function () {
    $state = (new Rejected(null))->setField('status');

    expect($state->canTransitionTo(Pending::class))->toBeTrue()
        ->and($state->canTransitionTo(Approved::class))->toBeFalse();
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `php artisan test tests/Feature/Domain/Vendor/States/DocumentStatusTest.php`
Expected: FAIL — `Class "App\Modules\Vendor\Domain\States\DocumentStatus" not found`

- [ ] **Step 7: Implement `DocumentStatus` and its 3 concrete states**

Create `app/Modules/Vendor/Domain/States/DocumentStatus.php`:
```php
<?php

namespace App\Modules\Vendor\Domain\States;

use App\Modules\Vendor\Domain\States\DocumentStatus\Approved;
use App\Modules\Vendor\Domain\States\DocumentStatus\Pending;
use App\Modules\Vendor\Domain\States\DocumentStatus\Rejected;
use Spatie\ModelStates\State;
use Spatie\ModelStates\StateConfig;

abstract class DocumentStatus extends State
{
    protected static ?string $name = null;

    public static function config(): StateConfig
    {
        return parent::config()
            ->default(Pending::class)
            ->registerState([
                Pending::class,
                Approved::class,
                Rejected::class,
            ])
            ->allowTransition(Pending::class, Approved::class)
            ->allowTransition(Pending::class, Rejected::class)
            ->allowTransition(Rejected::class, Pending::class);
    }
}
```

Create `app/Modules/Vendor/Domain/States/DocumentStatus/Pending.php`:
```php
<?php

namespace App\Modules\Vendor\Domain\States\DocumentStatus;

use App\Modules\Vendor\Domain\States\DocumentStatus;

class Pending extends DocumentStatus
{
    protected static ?string $name = 'pending';
}
```

Create `app/Modules/Vendor/Domain/States/DocumentStatus/Approved.php`:
```php
<?php

namespace App\Modules\Vendor\Domain\States\DocumentStatus;

use App\Modules\Vendor\Domain\States\DocumentStatus;

class Approved extends DocumentStatus
{
    protected static ?string $name = 'approved';
}
```

Create `app/Modules/Vendor/Domain/States/DocumentStatus/Rejected.php`:
```php
<?php

namespace App\Modules\Vendor\Domain\States\DocumentStatus;

use App\Modules\Vendor\Domain\States\DocumentStatus;

class Rejected extends DocumentStatus
{
    protected static ?string $name = 'rejected';
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `php artisan test tests/Feature/Domain/Vendor/States/DocumentStatusTest.php`
Expected: PASS (5 tests)

- [ ] **Step 9: Run Pint and commit**

Run:
```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Domain/States tests/Feature/Domain/Vendor/States
git commit -m "feat(vendor): add VerificationStatus and DocumentStatus state machines"
```

---

### Task 5: `UserType` enum (User module)

**Files:**
- Create: `app/Modules/User/Domain/Enums/UserType.php`
- Test: `tests/Unit/Domain/User/Enums/UserTypeTest.php`

**Interfaces:**
- Produces: `App\Modules\User\Domain\Enums\UserType` (backed `string` enum, cases `Internal`, `Company`, `Individual`)
- Consumes: nothing from earlier tasks

- [ ] **Step 1: Write the failing test**

Create `tests/Unit/Domain/User/Enums/UserTypeTest.php`:
```php
<?php

use App\Modules\User\Domain\Enums\UserType;

test('backed values match the users.user_type enum column values', function () {
    expect(UserType::Internal->value)->toBe('internal')
        ->and(UserType::Company->value)->toBe('company')
        ->and(UserType::Individual->value)->toBe('individual');
});

test('can be constructed from a raw column value', function () {
    expect(UserType::from('company'))->toBe(UserType::Company);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `php artisan test tests/Unit/Domain/User/Enums/UserTypeTest.php`
Expected: FAIL — `Class "App\Modules\User\Domain\Enums\UserType" not found`

- [ ] **Step 3: Implement `UserType`**

Create `app/Modules/User/Domain/Enums/UserType.php`:
```php
<?php

namespace App\Modules\User\Domain\Enums;

enum UserType: string
{
    case Internal = 'internal';
    case Company = 'company';
    case Individual = 'individual';
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `php artisan test tests/Unit/Domain/User/Enums/UserTypeTest.php`
Expected: PASS (2 tests)

- [ ] **Step 5: Run Pint and commit**

Run:
```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/User/Domain/Enums tests/Unit/Domain/User/Enums
git commit -m "feat(user): add UserType enum"
```

---

### Task 6: `User`/`InternalProfile` Domain Entities

**Files:**
- Create: `app/Modules/User/Domain/Entities/User.php`
- Create: `app/Modules/User/Domain/Entities/InternalProfile.php`
- Test: `tests/Unit/Domain/User/Entities/UserTest.php`
- Test: `tests/Unit/Domain/User/Entities/InternalProfileTest.php`

**Interfaces:**
- Consumes: `App\Modules\Shared\Domain\ValueObjects\Email` (Task 1), `App\Modules\Shared\Domain\ValueObjects\PhoneNumber` (Task 1), `App\Modules\User\Domain\Enums\UserType` (Task 5), `App\Modules\User\Domain\States\UserStatus` (Task 3)
- Produces: `App\Modules\User\Domain\Entities\User` (readonly: `id`, `username`, `email`, `password`, `userType`, `status`, `emailVerifiedAt`), `App\Modules\User\Domain\Entities\InternalProfile` (readonly: `id`, `userId`, `employeeNo`, `prefix`, `firstname`, `lastname`, `department`, `position`, `phone`)

- [ ] **Step 1: Write the failing test for `User`**

Create `tests/Unit/Domain/User/Entities/UserTest.php`:
```php
<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Domain\States\UserStatus\Pending;
use Carbon\CarbonImmutable;

test('holds the given values', function () {
    $email = Email::fromString('user@example.com');
    $status = new Pending(null);
    $emailVerifiedAt = CarbonImmutable::parse('2026-07-10 10:00:00');

    $user = new User(
        id: 1,
        username: 'jdoe',
        email: $email,
        password: 'hashed-password',
        userType: UserType::Internal,
        status: $status,
        emailVerifiedAt: $emailVerifiedAt,
    );

    expect($user->id)->toBe(1)
        ->and($user->username)->toBe('jdoe')
        ->and($user->email)->toBe($email)
        ->and($user->password)->toBe('hashed-password')
        ->and($user->userType)->toBe(UserType::Internal)
        ->and($user->status)->toBe($status)
        ->and($user->emailVerifiedAt)->toBe($emailVerifiedAt);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `php artisan test tests/Unit/Domain/User/Entities/UserTest.php`
Expected: FAIL — `Class "App\Modules\User\Domain\Entities\User" not found`

- [ ] **Step 3: Implement `User`**

Create `app/Modules/User/Domain/Entities/User.php`:
```php
<?php

namespace App\Modules\User\Domain\Entities;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Domain\States\UserStatus;
use Carbon\CarbonImmutable;

final class User
{
    public function __construct(
        public readonly ?int $id,
        public readonly string $username,
        public readonly Email $email,
        public readonly string $password,
        public readonly UserType $userType,
        public readonly UserStatus $status,
        public readonly ?CarbonImmutable $emailVerifiedAt,
    ) {}
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `php artisan test tests/Unit/Domain/User/Entities/UserTest.php`
Expected: PASS (1 test)

- [ ] **Step 5: Write the failing test for `InternalProfile`**

Create `tests/Unit/Domain/User/Entities/InternalProfileTest.php`:
```php
<?php

use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\User\Domain\Entities\InternalProfile;

test('holds the given values', function () {
    $phone = PhoneNumber::fromString('0812345678');

    $profile = new InternalProfile(
        id: 1,
        userId: 10,
        employeeNo: 'EMP-001',
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        department: 'IT',
        position: 'Developer',
        phone: $phone,
    );

    expect($profile->id)->toBe(1)
        ->and($profile->userId)->toBe(10)
        ->and($profile->employeeNo)->toBe('EMP-001')
        ->and($profile->prefix)->toBe('Mr.')
        ->and($profile->firstname)->toBe('John')
        ->and($profile->lastname)->toBe('Doe')
        ->and($profile->department)->toBe('IT')
        ->and($profile->position)->toBe('Developer')
        ->and($profile->phone)->toBe($phone);
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `php artisan test tests/Unit/Domain/User/Entities/InternalProfileTest.php`
Expected: FAIL — `Class "App\Modules\User\Domain\Entities\InternalProfile" not found`

- [ ] **Step 7: Implement `InternalProfile`**

Create `app/Modules/User/Domain/Entities/InternalProfile.php`:
```php
<?php

namespace App\Modules\User\Domain\Entities;

use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;

final class InternalProfile
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $userId,
        public readonly ?string $employeeNo,
        public readonly ?string $prefix,
        public readonly string $firstname,
        public readonly string $lastname,
        public readonly ?string $department,
        public readonly ?string $position,
        public readonly ?PhoneNumber $phone,
    ) {}
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `php artisan test tests/Unit/Domain/User/Entities/InternalProfileTest.php`
Expected: PASS (1 test)

- [ ] **Step 9: Run Pint and commit**

Run:
```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/User/Domain/Entities tests/Unit/Domain/User/Entities
git commit -m "feat(user): add User and InternalProfile domain entities"
```

---

### Task 7: Vendor Domain Entities

**Files:**
- Create: `app/Modules/Vendor/Domain/Entities/VendorProfile.php`
- Create: `app/Modules/Vendor/Domain/Entities/VendorCompanyDetail.php`
- Create: `app/Modules/Vendor/Domain/Entities/VendorIndividualDetail.php`
- Create: `app/Modules/Vendor/Domain/Entities/VendorDocument.php`
- Test: `tests/Unit/Domain/Vendor/Entities/VendorProfileTest.php`
- Test: `tests/Unit/Domain/Vendor/Entities/VendorCompanyDetailTest.php`
- Test: `tests/Unit/Domain/Vendor/Entities/VendorIndividualDetailTest.php`
- Test: `tests/Unit/Domain/Vendor/Entities/VendorDocumentTest.php`

**Interfaces:**
- Consumes: `App\Modules\Shared\Domain\ValueObjects\{Email,PhoneNumber,PostalCode}` (Task 1), `App\Modules\Vendor\Domain\ValueObjects\{TaxId,CitizenId}` (Task 2), `App\Modules\Vendor\Domain\States\{VerificationStatus,DocumentStatus}` (Task 4)
- Produces: `App\Modules\Vendor\Domain\Entities\{VendorProfile,VendorCompanyDetail,VendorIndividualDetail,VendorDocument}`

- [ ] **Step 1: Write the failing test for `VendorProfile`**

Create `tests/Unit/Domain/Vendor/Entities/VendorProfileTest.php`:
```php
<?php

use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\States\VerificationStatus\Pending;
use Carbon\CarbonImmutable;

test('holds the given values', function () {
    $status = new Pending(null);
    $verifiedAt = CarbonImmutable::parse('2026-07-10 10:00:00');

    $profile = new VendorProfile(
        id: 1,
        userId: 10,
        status: $status,
        verifiedAt: $verifiedAt,
        verifiedBy: 2,
        remark: 'Looks good',
    );

    expect($profile->id)->toBe(1)
        ->and($profile->userId)->toBe(10)
        ->and($profile->status)->toBe($status)
        ->and($profile->verifiedAt)->toBe($verifiedAt)
        ->and($profile->verifiedBy)->toBe(2)
        ->and($profile->remark)->toBe('Looks good');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `php artisan test tests/Unit/Domain/Vendor/Entities/VendorProfileTest.php`
Expected: FAIL — `Class "App\Modules\Vendor\Domain\Entities\VendorProfile" not found`

- [ ] **Step 3: Implement `VendorProfile`**

Create `app/Modules/Vendor/Domain/Entities/VendorProfile.php`:
```php
<?php

namespace App\Modules\Vendor\Domain\Entities;

use App\Modules\Vendor\Domain\States\VerificationStatus;
use Carbon\CarbonImmutable;

final class VendorProfile
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $userId,
        public readonly VerificationStatus $status,
        public readonly ?CarbonImmutable $verifiedAt,
        public readonly ?int $verifiedBy,
        public readonly ?string $remark,
    ) {}
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `php artisan test tests/Unit/Domain/Vendor/Entities/VendorProfileTest.php`
Expected: PASS (1 test)

- [ ] **Step 5: Write the failing test for `VendorCompanyDetail`**

Create `tests/Unit/Domain/Vendor/Entities/VendorCompanyDetailTest.php`:
```php
<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;

test('holds the given values', function () {
    $taxId = TaxId::fromString('1234567890123');
    $postalCode = PostalCode::fromString('10110');
    $contactPhone = PhoneNumber::fromString('0812345678');
    $contactEmail = Email::fromString('contact@company.com');

    $detail = new VendorCompanyDetail(
        id: 1,
        vendorProfileId: 10,
        companyName: 'Acme Co., Ltd.',
        businessRegistrationNo: '0123456789012',
        taxId: $taxId,
        branchNo: '00000',
        businessType: 'Trading',
        address: '123 Main St.',
        country: 'Thailand',
        province: 'Bangkok',
        postalCode: $postalCode,
        contactName: 'Jane Doe',
        contactPosition: 'Manager',
        contactPhone: $contactPhone,
        contactEmail: $contactEmail,
        lineId: 'acme-co',
        otherContact: null,
    );

    expect($detail->id)->toBe(1)
        ->and($detail->vendorProfileId)->toBe(10)
        ->and($detail->companyName)->toBe('Acme Co., Ltd.')
        ->and($detail->businessRegistrationNo)->toBe('0123456789012')
        ->and($detail->taxId)->toBe($taxId)
        ->and($detail->branchNo)->toBe('00000')
        ->and($detail->businessType)->toBe('Trading')
        ->and($detail->address)->toBe('123 Main St.')
        ->and($detail->country)->toBe('Thailand')
        ->and($detail->province)->toBe('Bangkok')
        ->and($detail->postalCode)->toBe($postalCode)
        ->and($detail->contactName)->toBe('Jane Doe')
        ->and($detail->contactPosition)->toBe('Manager')
        ->and($detail->contactPhone)->toBe($contactPhone)
        ->and($detail->contactEmail)->toBe($contactEmail)
        ->and($detail->lineId)->toBe('acme-co')
        ->and($detail->otherContact)->toBeNull();
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `php artisan test tests/Unit/Domain/Vendor/Entities/VendorCompanyDetailTest.php`
Expected: FAIL — `Class "App\Modules\Vendor\Domain\Entities\VendorCompanyDetail" not found`

- [ ] **Step 7: Implement `VendorCompanyDetail`**

Create `app/Modules/Vendor/Domain/Entities/VendorCompanyDetail.php`:
```php
<?php

namespace App\Modules\Vendor\Domain\Entities;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;

final class VendorCompanyDetail
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $vendorProfileId,
        public readonly string $companyName,
        public readonly ?string $businessRegistrationNo,
        public readonly TaxId $taxId,
        public readonly ?string $branchNo,
        public readonly ?string $businessType,
        public readonly ?string $address,
        public readonly ?string $country,
        public readonly ?string $province,
        public readonly ?PostalCode $postalCode,
        public readonly ?string $contactName,
        public readonly ?string $contactPosition,
        public readonly PhoneNumber $contactPhone,
        public readonly Email $contactEmail,
        public readonly ?string $lineId,
        public readonly ?string $otherContact,
    ) {}
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `php artisan test tests/Unit/Domain/Vendor/Entities/VendorCompanyDetailTest.php`
Expected: PASS (1 test)

- [ ] **Step 9: Write the failing test for `VendorIndividualDetail`**

Create `tests/Unit/Domain/Vendor/Entities/VendorIndividualDetailTest.php`:
```php
<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;

test('holds the given values', function () {
    $citizenId = CitizenId::fromString('1234567890123');
    $taxId = TaxId::fromString('9876543210123');
    $email = Email::fromString('individual@example.com');
    $phone = PhoneNumber::fromString('0812345678');
    $postalCode = PostalCode::fromString('10110');

    $detail = new VendorIndividualDetail(
        id: 1,
        vendorProfileId: 10,
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        citizenId: $citizenId,
        shopName: 'John\'s Shop',
        businessType: 'Retail',
        taxId: $taxId,
        email: $email,
        phone: $phone,
        address: '456 Side St.',
        country: 'Thailand',
        province: 'Bangkok',
        postalCode: $postalCode,
        contactName: 'John Doe',
        lineId: 'john-doe',
        otherContact: null,
    );

    expect($detail->id)->toBe(1)
        ->and($detail->vendorProfileId)->toBe(10)
        ->and($detail->prefix)->toBe('Mr.')
        ->and($detail->firstname)->toBe('John')
        ->and($detail->lastname)->toBe('Doe')
        ->and($detail->citizenId)->toBe($citizenId)
        ->and($detail->shopName)->toBe('John\'s Shop')
        ->and($detail->businessType)->toBe('Retail')
        ->and($detail->taxId)->toBe($taxId)
        ->and($detail->email)->toBe($email)
        ->and($detail->phone)->toBe($phone)
        ->and($detail->address)->toBe('456 Side St.')
        ->and($detail->country)->toBe('Thailand')
        ->and($detail->province)->toBe('Bangkok')
        ->and($detail->postalCode)->toBe($postalCode)
        ->and($detail->contactName)->toBe('John Doe')
        ->and($detail->lineId)->toBe('john-doe')
        ->and($detail->otherContact)->toBeNull();
});
```

- [ ] **Step 10: Run it to verify it fails**

Run: `php artisan test tests/Unit/Domain/Vendor/Entities/VendorIndividualDetailTest.php`
Expected: FAIL — `Class "App\Modules\Vendor\Domain\Entities\VendorIndividualDetail" not found`

- [ ] **Step 11: Implement `VendorIndividualDetail`**

Create `app/Modules/Vendor/Domain/Entities/VendorIndividualDetail.php`:
```php
<?php

namespace App\Modules\Vendor\Domain\Entities;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;

final class VendorIndividualDetail
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $vendorProfileId,
        public readonly ?string $prefix,
        public readonly string $firstname,
        public readonly string $lastname,
        public readonly CitizenId $citizenId,
        public readonly ?string $shopName,
        public readonly ?string $businessType,
        public readonly ?TaxId $taxId,
        public readonly ?Email $email,
        public readonly PhoneNumber $phone,
        public readonly ?string $address,
        public readonly ?string $country,
        public readonly ?string $province,
        public readonly ?PostalCode $postalCode,
        public readonly ?string $contactName,
        public readonly ?string $lineId,
        public readonly ?string $otherContact,
    ) {}
}
```

- [ ] **Step 12: Run it to verify it passes**

Run: `php artisan test tests/Unit/Domain/Vendor/Entities/VendorIndividualDetailTest.php`
Expected: PASS (1 test)

- [ ] **Step 13: Write the failing test for `VendorDocument`**

Create `tests/Unit/Domain/Vendor/Entities/VendorDocumentTest.php`:
```php
<?php

use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\States\DocumentStatus\Pending;
use Carbon\CarbonImmutable;

test('holds the given values', function () {
    $status = new Pending(null);
    $verifiedAt = CarbonImmutable::parse('2026-07-10 10:00:00');

    $document = new VendorDocument(
        id: 1,
        vendorProfileId: 10,
        documentType: 'id_card',
        fileName: 'id-card.pdf',
        filePath: 'documents/id-card.pdf',
        status: $status,
        verifiedBy: 2,
        verifiedAt: $verifiedAt,
        remark: 'Clear copy',
    );

    expect($document->id)->toBe(1)
        ->and($document->vendorProfileId)->toBe(10)
        ->and($document->documentType)->toBe('id_card')
        ->and($document->fileName)->toBe('id-card.pdf')
        ->and($document->filePath)->toBe('documents/id-card.pdf')
        ->and($document->status)->toBe($status)
        ->and($document->verifiedBy)->toBe(2)
        ->and($document->verifiedAt)->toBe($verifiedAt)
        ->and($document->remark)->toBe('Clear copy');
});
```

- [ ] **Step 14: Run it to verify it fails**

Run: `php artisan test tests/Unit/Domain/Vendor/Entities/VendorDocumentTest.php`
Expected: FAIL — `Class "App\Modules\Vendor\Domain\Entities\VendorDocument" not found`

- [ ] **Step 15: Implement `VendorDocument`**

Create `app/Modules/Vendor/Domain/Entities/VendorDocument.php`:
```php
<?php

namespace App\Modules\Vendor\Domain\Entities;

use App\Modules\Vendor\Domain\States\DocumentStatus;
use Carbon\CarbonImmutable;

final class VendorDocument
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $vendorProfileId,
        public readonly string $documentType,
        public readonly string $fileName,
        public readonly string $filePath,
        public readonly DocumentStatus $status,
        public readonly ?int $verifiedBy,
        public readonly ?CarbonImmutable $verifiedAt,
        public readonly ?string $remark,
    ) {}
}
```

- [ ] **Step 16: Run it to verify it passes**

Run: `php artisan test tests/Unit/Domain/Vendor/Entities/VendorDocumentTest.php`
Expected: PASS (1 test)

- [ ] **Step 17: Run Pint and commit**

Run:
```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Domain/Entities tests/Unit/Domain/Vendor/Entities
git commit -m "feat(vendor): add VendorProfile, VendorCompanyDetail, VendorIndividualDetail, VendorDocument domain entities"
```

---

### Task 8: Wire `HasStates` into `Infrastructure/Models/User.php`

**Files:**
- Modify: `app/Modules/User/Infrastructure/Models/User.php`
- Test: `tests/Feature/Modules/User/UserStatusCastTest.php`

**Interfaces:**
- Consumes: `App\Modules\User\Domain\States\UserStatus` and its concrete states (Task 3)
- Produces: `User::$status` accessor returns a `UserStatus` instance; `User::factory()->create(['status' => 'pending'])` and `$user->status->transitionTo(...)` both work end-to-end against the existing `users.status` enum column

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Modules/User/UserStatusCastTest.php`:
```php
<?php

use App\Modules\User\Domain\States\UserStatus\Active;
use App\Modules\User\Domain\States\UserStatus\Pending;
use App\Modules\User\Domain\States\UserStatus\Suspended;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\ModelStates\Exceptions\CouldNotPerformTransition;

uses(RefreshDatabase::class);

test('status column casts to a UserStatus instance', function () {
    $user = User::factory()->create(['status' => 'pending']);

    expect($user->fresh()->status)->toBeInstanceOf(Pending::class);
});

test('status can transition to an allowed state and persists', function () {
    $user = User::factory()->create(['status' => 'pending']);

    $user->status->transitionTo(Active::class);

    expect($user->fresh()->status)->toBeInstanceOf(Active::class);
});

test('status cannot transition to a disallowed state', function () {
    $user = User::factory()->create(['status' => 'pending']);

    expect(fn () => $user->status->transitionTo(Suspended::class))
        ->toThrow(CouldNotPerformTransition::class);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `php artisan test tests/Feature/Modules/User/UserStatusCastTest.php`
Expected: FAIL — `$user->fresh()->status` is a plain string `'pending'`, not an instance of `Pending` (assertion `toBeInstanceOf` fails)

- [ ] **Step 3: Wire `HasStates` into `User.php`**

Modify `app/Modules/User/Infrastructure/Models/User.php` — add the import and trait, and add the `status` cast:
```php
<?php

namespace App\Modules\User\Infrastructure\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Modules\User\Domain\States\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\ModelStates\HasStates;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['username', 'email', 'password', 'user_type', 'status'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, HasStates, Notifiable;

    /**
     * The model's default values for attributes.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'pending',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'status' => UserStatus::class,
        ];
    }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `php artisan test tests/Feature/Modules/User/UserStatusCastTest.php`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `php artisan test --compact`
Expected: all tests pass (no regressions in existing `Auth`/`User` tests)

- [ ] **Step 6: Run Pint and commit**

Run:
```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/User/Infrastructure/Models/User.php tests/Feature/Modules/User
git commit -m "feat(user): wire HasStates into the User model status column"
```

---

### Task 9: Wire `HasStates` into `VendorProfiles.php` and `VendorDocuments.php`

**Files:**
- Modify: `app/Modules/Vendor/Infrastructure/Models/VendorProfiles.php`
- Modify: `app/Modules/Vendor/Infrastructure/Models/VendorDocuments.php`
- Test: `tests/Feature/Modules/Vendor/VendorStatusCastTest.php`

**Interfaces:**
- Consumes: `App\Modules\Vendor\Domain\States\VerificationStatus` and `App\Modules\Vendor\Domain\States\DocumentStatus` (Task 4), `App\Modules\User\Infrastructure\Models\User::factory()` (existing)
- Produces: `VendorProfiles::$verification_status` and `VendorDocuments::$status` accessors return state instances end-to-end against the existing enum columns

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Modules/Vendor/VendorStatusCastTest.php`:
```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\States\DocumentStatus\Approved as DocumentApproved;
use App\Modules\Vendor\Domain\States\DocumentStatus\Pending as DocumentPending;
use App\Modules\Vendor\Domain\States\VerificationStatus\Approved as VerificationApproved;
use App\Modules\Vendor\Domain\States\VerificationStatus\Pending as VerificationPending;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('vendor_profiles.verification_status casts to a VerificationStatus instance', function () {
    $user = User::factory()->create();

    $profile = VendorProfiles::create([
        'user_id' => $user->id,
        'verification_status' => 'pending',
    ]);

    expect($profile->fresh()->verification_status)->toBeInstanceOf(VerificationPending::class);
});

test('vendor_profiles.verification_status can transition to approved and persists', function () {
    $user = User::factory()->create();

    $profile = VendorProfiles::create([
        'user_id' => $user->id,
        'verification_status' => 'pending',
    ]);

    $profile->verification_status->transitionTo(VerificationApproved::class);

    expect($profile->fresh()->verification_status)->toBeInstanceOf(VerificationApproved::class);
});

test('vendor_documents.status casts to a DocumentStatus instance', function () {
    $user = User::factory()->create();

    $profile = VendorProfiles::create([
        'user_id' => $user->id,
        'verification_status' => 'pending',
    ]);

    $document = VendorDocuments::create([
        'vendor_profile_id' => $profile->id,
        'document_type' => 'id_card',
        'file_name' => 'id-card.pdf',
        'file_path' => 'documents/id-card.pdf',
        'status' => 'pending',
    ]);

    expect($document->fresh()->status)->toBeInstanceOf(DocumentPending::class);
});

test('vendor_documents.status can transition to approved and persists', function () {
    $user = User::factory()->create();

    $profile = VendorProfiles::create([
        'user_id' => $user->id,
        'verification_status' => 'pending',
    ]);

    $document = VendorDocuments::create([
        'vendor_profile_id' => $profile->id,
        'document_type' => 'id_card',
        'file_name' => 'id-card.pdf',
        'file_path' => 'documents/id-card.pdf',
        'status' => 'pending',
    ]);

    $document->status->transitionTo(DocumentApproved::class);

    expect($document->fresh()->status)->toBeInstanceOf(DocumentApproved::class);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `php artisan test tests/Feature/Modules/Vendor/VendorStatusCastTest.php`
Expected: FAIL — both `verification_status` and `status` come back as plain strings, not state instances

- [ ] **Step 3: Wire `HasStates` into `VendorProfiles.php`**

Modify `app/Modules/Vendor/Infrastructure/Models/VendorProfiles.php`:
```php
<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use App\Modules\Vendor\Domain\States\VerificationStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\ModelStates\HasStates;

// use App\Modules\Vendor\Database\Factories\VendorProfilesFactory;
#[Table('vendor_profiles')]
#[Fillable([
    'user_id',
    'verification_status',
    'verified_at',
    'verified_by',
    'remark',
])]
class VendorProfiles extends Model
{
    use HasFactory, HasStates;

    // protected static function newFactory(): VendorProfilesFactory
    // {
    //     // return VendorProfilesFactory::new();
    // }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
            'verification_status' => VerificationStatus::class,
        ];
    }
}
```

- [ ] **Step 4: Wire `HasStates` into `VendorDocuments.php`**

Modify `app/Modules/Vendor/Infrastructure/Models/VendorDocuments.php`:
```php
<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use App\Modules\Vendor\Domain\States\DocumentStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\ModelStates\HasStates;

// use App\Modules\Vendor\Database\Factories\VendorDocumentsFactory;
#[Table('vendor_documents')]
#[Fillable([
    'vendor_profile_id',
    'document_type',
    'file_name',
    'file_path',
    'status',
    'verified_by',
    'verified_at',
    'remark',
])]
#[Hidden(['file_path'])]
class VendorDocuments extends Model
{
    use HasFactory, HasStates;

    // protected static function newFactory(): VendorDocumentsFactory
    // {
    //     // return VendorDocumentsFactory::new();
    // }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
            'status' => DocumentStatus::class,
        ];
    }
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `php artisan test tests/Feature/Modules/Vendor/VendorStatusCastTest.php`
Expected: PASS (4 tests)

- [ ] **Step 6: Run the full test suite to check for regressions**

Run: `php artisan test --compact`
Expected: all tests pass

- [ ] **Step 7: Run Pint and commit**

Run:
```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Infrastructure/Models/VendorProfiles.php app/Modules/Vendor/Infrastructure/Models/VendorDocuments.php tests/Feature/Modules/Vendor
git commit -m "feat(vendor): wire HasStates into VendorProfiles and VendorDocuments models"
```
