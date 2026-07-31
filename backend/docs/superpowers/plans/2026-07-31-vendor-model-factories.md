# Vendor Model Factories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add working `HasFactory` factories for all 5 Vendor Eloquent models (`VendorProfiles`, `VendorCompanyDetails`, `VendorIndividualDetails`, `VendorContact`, `VendorDocuments`), which currently have the trait but a commented-out, broken `newFactory()` stub.

**Architecture:** Each model gets a flat factory file in `database/factories/` (not the module-nested path the old commented-out code suggested — that path guess is the exact pattern that caused a real bug for the `User` model in this codebase) with an explicit `protected $model = ...` and the model itself gets `newFactory()` uncommented and pointed at the real factory class.

**Tech Stack:** Laravel 13, PHP 8.4, Pest 4 (feature tests).

## Global Constraints

- Factory files live at `database/factories/{Model}Factory.php`, namespace `Database\Factories` — matching the existing, working `database/factories/UserFactory.php`, not the commented-out `App\Modules\Vendor\Database\Factories\...` path already in each model (that guessed path is the same shape of bug already fixed once for `User` in this codebase: Laravel's default factory-name resolution assumes `App\Models\` → `Database\Factories\`, which doesn't hold for this project's DDD module structure).
- Every new factory class must declare `protected $model = {Model}::class;` explicitly — required regardless of the `newFactory()` override, because `Factory::modelName()` falls back to guessing the model from the factory's own class name when `$model` isn't set, and that guess is equally wrong here.
- `VendorCompanyDetails`/`VendorIndividualDetails` factories must generate `tax_id`/`citizen_id` values and compute their matching `tax_id_hash`/`citizen_id_hash` via the existing static helpers (`VendorCompanyDetails::hashTaxId()`, `VendorIndividualDetails::hashCitizenId()`, `VendorIndividualDetails::hashTaxId()`) — both hash columns are unique in the database.
- Generated `contact_phone` must be 9-10 digits (matches `App\Modules\Shared\Domain\ValueObjects\PhoneNumber::fromString()`'s `^\d{9,10}$` check after stripping non-digits) and `postal_code` must be exactly 5 digits (matches `PostalCode::fromString()`'s `^\d{5}$`) — so a test that reads factory-created rows back through the domain layer doesn't fail validation.
- Do not modify any existing test file that builds Vendor fixtures via `new VendorRepository` + domain entity `::create()` — those keep working as-is; factories are an additive alternative.
- After any PHP file change, run `vendor/bin/pint --dirty --format agent` before considering the task done.

---

### Task 1: Factories for all 5 Vendor models

**Files:**
- Create: `database/factories/VendorProfilesFactory.php`
- Modify: `app/Modules/Vendor/Infrastructure/Models/VendorProfiles.php`
- Create: `database/factories/VendorCompanyDetailsFactory.php`
- Modify: `app/Modules/Vendor/Infrastructure/Models/VendorCompanyDetails.php`
- Create: `database/factories/VendorIndividualDetailsFactory.php`
- Modify: `app/Modules/Vendor/Infrastructure/Models/VendorIndividualDetails.php`
- Create: `database/factories/VendorContactFactory.php`
- Modify: `app/Modules/Vendor/Infrastructure/Models/VendorContact.php`
- Create: `database/factories/VendorDocumentsFactory.php`
- Modify: `app/Modules/Vendor/Infrastructure/Models/VendorDocuments.php`
- Test: `tests/Feature/Modules/Vendor/VendorFactoriesTest.php`

**Interfaces:**
- Consumes: `App\Modules\Vendor\Infrastructure\Models\{VendorProfiles,VendorCompanyDetails,VendorIndividualDetails,VendorContact,VendorDocuments}` (existing Eloquent models); `App\Modules\User\Infrastructure\Models\User` + its existing `database/factories/UserFactory.php`; `VendorCompanyDetails::hashTaxId(string): string`, `VendorIndividualDetails::hashCitizenId(string): string`, `VendorIndividualDetails::hashTaxId(string): string` (existing static helpers); `App\Modules\Vendor\Infrastructure\Repositories\VendorRepository::findContactsByVendorProfileId(int): array` (existing, used only in the test to prove factory-created phone numbers round-trip through the domain value object).
- Produces: `VendorProfiles::factory()`, `VendorCompanyDetails::factory()`, `VendorIndividualDetails::factory()`, `VendorContact::factory()`, `VendorDocuments::factory()` — each a working `Illuminate\Database\Eloquent\Factories\Factory` instance, with `VendorProfiles::factory()->approved()` / `->rejected()` and `VendorDocuments::factory()->approved()` / `->rejected()` states. No other task or file in this plan depends on these — this is the whole deliverable.

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/Modules/Vendor/VendorFactoriesTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorContact;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('VendorProfiles factory creates a pending profile with a user', function () {
    $profile = VendorProfiles::factory()->create();

    expect($profile->verification_status->getValue())->toBe('pending');
    expect($profile->user_id)->not->toBeNull();
    expect(User::find($profile->user_id))->not->toBeNull();
});

test('VendorProfiles factory approved state sets verification fields', function () {
    $profile = VendorProfiles::factory()->approved()->create();

    expect($profile->verification_status->getValue())->toBe('approved');
    expect($profile->verified_at)->not->toBeNull();
    expect($profile->verified_by)->not->toBeNull();
});

test('VendorProfiles factory rejected state sets verification fields and a remark', function () {
    $profile = VendorProfiles::factory()->rejected()->create();

    expect($profile->verification_status->getValue())->toBe('rejected');
    expect($profile->verified_at)->not->toBeNull();
    expect($profile->verified_by)->not->toBeNull();
    expect($profile->remark)->not->toBeNull();
});

test('VendorCompanyDetails factory creates a detail row with its own parent profile', function () {
    $detail = VendorCompanyDetails::factory()->create();

    expect($detail->vendor_profile_id)->not->toBeNull();
    expect(VendorProfiles::find($detail->vendor_profile_id))->not->toBeNull();
});

test('VendorCompanyDetails factory can create multiple rows without unique constraint collisions', function () {
    $details = VendorCompanyDetails::factory()->count(3)->create();

    expect($details)->toHaveCount(3);
});

test('VendorIndividualDetails factory creates a detail row with its own parent profile', function () {
    $detail = VendorIndividualDetails::factory()->create();

    expect($detail->vendor_profile_id)->not->toBeNull();
    expect(VendorProfiles::find($detail->vendor_profile_id))->not->toBeNull();
});

test('VendorIndividualDetails factory can create multiple rows without unique constraint collisions', function () {
    $details = VendorIndividualDetails::factory()->count(3)->create();

    expect($details)->toHaveCount(3);
});

test('VendorContact factory produces a phone number the domain value object accepts', function () {
    $contact = VendorContact::factory()->create();

    $repository = new VendorRepository;
    $contacts = $repository->findContactsByVendorProfileId($contact->vendor_profile_id);

    expect($contacts)->toHaveCount(1);
    expect($contacts[0]->contactPhone()->value)->toBe($contact->contact_phone);
});

test('VendorDocuments factory rejected state sets verification fields and a remark', function () {
    $document = VendorDocuments::factory()->rejected()->create();

    expect($document->status->getValue())->toBe('rejected');
    expect($document->verified_by)->not->toBeNull();
    expect($document->verified_at)->not->toBeNull();
    expect($document->remark)->not->toBeNull();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=VendorFactoriesTest`
Expected: FAIL on every test — `newFactory()` is still commented out on every model, so `{Model}::factory()`
falls back to Laravel's default factory-name guess (`Database\Factories\Modules\Vendor\Infrastructure\Models\{Model}Factory`), which doesn't exist, producing a "class not found" error.

- [ ] **Step 3: Create `VendorProfilesFactory` and wire it into `VendorProfiles`**

Create `database/factories/VendorProfilesFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VendorProfiles>
 */
class VendorProfilesFactory extends Factory
{
    protected $model = VendorProfiles::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'verification_status' => 'pending',
            'verified_at' => null,
            'verified_by' => null,
            'remark' => null,
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'verification_status' => 'approved',
            'verified_at' => now(),
            'verified_by' => User::factory()->state(['user_type' => 'internal']),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'verification_status' => 'rejected',
            'verified_at' => now(),
            'verified_by' => User::factory()->state(['user_type' => 'internal']),
            'remark' => 'Rejected during testing.',
        ]);
    }
}
```

Replace the full content of `app/Modules/Vendor/Infrastructure/Models/VendorProfiles.php` (current content
below) with the version that follows it:

Current content:

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\States\VerificationStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
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

    // Relations
    public function VendorProfilesUser(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function VendorProfilesVerifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function VendorProfilesCompanyDetail(): HasOne
    {
        return $this->hasOne(VendorCompanyDetails::class, 'vendor_profile_id', 'id');
    }

    public function VendorProfilesIndividualDetail(): HasOne
    {
        return $this->hasOne(VendorIndividualDetails::class, 'vendor_profile_id', 'id');
    }

    public function VendorProfilesDocuments(): HasMany
    {
        return $this->hasMany(VendorDocuments::class, 'vendor_profile_id', 'id');
    }

    public function VendorProfilesContact(): HasMany
    {
        return $this->hasMany(VendorContact::class, 'vendor_profile_id', 'id');
    }
}
```

New content:

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\States\VerificationStatus;
use Database\Factories\VendorProfilesFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Spatie\ModelStates\HasStates;

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

    protected static function newFactory(): VendorProfilesFactory
    {
        return VendorProfilesFactory::new();
    }

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

    // Relations
    public function VendorProfilesUser(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function VendorProfilesVerifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function VendorProfilesCompanyDetail(): HasOne
    {
        return $this->hasOne(VendorCompanyDetails::class, 'vendor_profile_id', 'id');
    }

    public function VendorProfilesIndividualDetail(): HasOne
    {
        return $this->hasOne(VendorIndividualDetails::class, 'vendor_profile_id', 'id');
    }

    public function VendorProfilesDocuments(): HasMany
    {
        return $this->hasMany(VendorDocuments::class, 'vendor_profile_id', 'id');
    }

    public function VendorProfilesContact(): HasMany
    {
        return $this->hasMany(VendorContact::class, 'vendor_profile_id', 'id');
    }
}
```

- [ ] **Step 4: Create `VendorCompanyDetailsFactory` and wire it into `VendorCompanyDetails`**

Create `database/factories/VendorCompanyDetailsFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VendorCompanyDetails>
 */
class VendorCompanyDetailsFactory extends Factory
{
    protected $model = VendorCompanyDetails::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $taxId = fake()->unique()->numerify('#############');

        return [
            'vendor_profile_id' => VendorProfiles::factory(),
            'company_name' => fake()->company(),
            'business_registration_no' => fake()->unique()->numerify('#############'),
            'tax_id' => $taxId,
            'tax_id_hash' => VendorCompanyDetails::hashTaxId($taxId),
            'branch_no' => '00000',
            'business_type' => fake()->word(),
            'address' => fake()->address(),
            'province' => fake()->city(),
            'postal_code' => fake()->numerify('#####'),
        ];
    }
}
```

Replace the full content of `app/Modules/Vendor/Infrastructure/Models/VendorCompanyDetails.php` (current
content below) with the version that follows it:

Current content:

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// use App\Modules\Vendor\Database\Factories\VendorCompanyDetailsFactory;

#[Table('vendor_company_details')]
#[Fillable([
    'vendor_profile_id',
    'company_name',
    'business_registration_no',
    'tax_id',
    'tax_id_hash',
    'branch_no',
    'business_type',
    'address',
    'province',
    'postal_code',
])]
#[Hidden(['tax_id', 'tax_id_hash'])]
class VendorCompanyDetails extends Model
{
    use HasFactory;

    // protected static function newFactory(): VendorCompanyDetailsFactory
    // {
    //     // return VendorCompanyDetailsFactory::new();
    // }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tax_id' => 'encrypted',
        ];
    }

    /**
     * Deterministic lookup hash for a tax ID, used because `tax_id` itself is
     * encrypted (non-deterministic ciphertext) and can't be queried directly.
     */
    public static function hashTaxId(string $taxId): string
    {
        return hash('sha256', $taxId);
    }

    // Relations
    public function VendorDocumentsVendorProfile(): BelongsTo
    {
        return $this->belongsTo(VendorProfiles::class, 'vendor_profile_id', 'id');
    }
}
```

New content:

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use Database\Factories\VendorCompanyDetailsFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Table('vendor_company_details')]
#[Fillable([
    'vendor_profile_id',
    'company_name',
    'business_registration_no',
    'tax_id',
    'tax_id_hash',
    'branch_no',
    'business_type',
    'address',
    'province',
    'postal_code',
])]
#[Hidden(['tax_id', 'tax_id_hash'])]
class VendorCompanyDetails extends Model
{
    use HasFactory;

    protected static function newFactory(): VendorCompanyDetailsFactory
    {
        return VendorCompanyDetailsFactory::new();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tax_id' => 'encrypted',
        ];
    }

    /**
     * Deterministic lookup hash for a tax ID, used because `tax_id` itself is
     * encrypted (non-deterministic ciphertext) and can't be queried directly.
     */
    public static function hashTaxId(string $taxId): string
    {
        return hash('sha256', $taxId);
    }

    // Relations
    public function VendorDocumentsVendorProfile(): BelongsTo
    {
        return $this->belongsTo(VendorProfiles::class, 'vendor_profile_id', 'id');
    }
}
```

- [ ] **Step 5: Create `VendorIndividualDetailsFactory` and wire it into `VendorIndividualDetails`**

Create `database/factories/VendorIndividualDetailsFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VendorIndividualDetails>
 */
class VendorIndividualDetailsFactory extends Factory
{
    protected $model = VendorIndividualDetails::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $citizenId = fake()->unique()->numerify('#############');
        $taxId = fake()->unique()->numerify('#############');

        return [
            'vendor_profile_id' => VendorProfiles::factory(),
            'store_name' => fake()->company(),
            'prefix' => fake()->randomElement(['นาย', 'นาง', 'นางสาว']),
            'firstname' => fake()->firstName(),
            'lastname' => fake()->lastName(),
            'citizen_id' => $citizenId,
            'citizen_id_hash' => VendorIndividualDetails::hashCitizenId($citizenId),
            'business_type' => fake()->word(),
            'tax_id' => $taxId,
            'tax_id_hash' => VendorIndividualDetails::hashTaxId($taxId),
            'address' => fake()->address(),
            'province' => fake()->city(),
            'postal_code' => fake()->numerify('#####'),
        ];
    }
}
```

Replace the full content of `app/Modules/Vendor/Infrastructure/Models/VendorIndividualDetails.php` (current
content below) with the version that follows it:

Current content:

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// use App\Modules\Vendor\Database\Factories\VendorIndividualDetailsFactory;
#[Table('vendor_individual_details')]
#[Fillable([
    'vendor_profile_id',
    'store_name',
    'prefix',
    'firstname',
    'lastname',
    'citizen_id',
    'citizen_id_hash',
    'business_type',
    'tax_id',
    'tax_id_hash',
    'address',
    'province',
    'postal_code',
])]
#[Hidden(['citizen_id', 'citizen_id_hash', 'tax_id', 'tax_id_hash'])]
class VendorIndividualDetails extends Model
{
    use HasFactory;

    // protected static function newFactory(): VendorIndividualDetailsFactory
    // {
    //     // return VendorIndividualDetailsFactory::new();
    // }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'citizen_id' => 'encrypted',
            'tax_id' => 'encrypted',
        ];
    }

    /**
     * Deterministic lookup hash for a citizen ID, used because `citizen_id` itself is
     * encrypted (non-deterministic ciphertext) and can't be queried directly.
     */
    public static function hashCitizenId(string $citizenId): string
    {
        return hash('sha256', $citizenId);
    }

    /**
     * Deterministic lookup hash for a tax ID (same reasoning as hashCitizenId).
     */
    public static function hashTaxId(string $taxId): string
    {
        return hash('sha256', $taxId);
    }

    // Relations
    public function VendorIndividualDetailsVendorProfile(): BelongsTo
    {
        return $this->belongsTo(VendorProfiles::class, 'vendor_profile_id', 'id');
    }
}
```

New content:

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use Database\Factories\VendorIndividualDetailsFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Table('vendor_individual_details')]
#[Fillable([
    'vendor_profile_id',
    'store_name',
    'prefix',
    'firstname',
    'lastname',
    'citizen_id',
    'citizen_id_hash',
    'business_type',
    'tax_id',
    'tax_id_hash',
    'address',
    'province',
    'postal_code',
])]
#[Hidden(['citizen_id', 'citizen_id_hash', 'tax_id', 'tax_id_hash'])]
class VendorIndividualDetails extends Model
{
    use HasFactory;

    protected static function newFactory(): VendorIndividualDetailsFactory
    {
        return VendorIndividualDetailsFactory::new();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'citizen_id' => 'encrypted',
            'tax_id' => 'encrypted',
        ];
    }

    /**
     * Deterministic lookup hash for a citizen ID, used because `citizen_id` itself is
     * encrypted (non-deterministic ciphertext) and can't be queried directly.
     */
    public static function hashCitizenId(string $citizenId): string
    {
        return hash('sha256', $citizenId);
    }

    /**
     * Deterministic lookup hash for a tax ID (same reasoning as hashCitizenId).
     */
    public static function hashTaxId(string $taxId): string
    {
        return hash('sha256', $taxId);
    }

    // Relations
    public function VendorIndividualDetailsVendorProfile(): BelongsTo
    {
        return $this->belongsTo(VendorProfiles::class, 'vendor_profile_id', 'id');
    }
}
```

- [ ] **Step 6: Create `VendorContactFactory` and wire it into `VendorContact`**

Create `database/factories/VendorContactFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Modules\Vendor\Infrastructure\Models\VendorContact;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VendorContact>
 */
class VendorContactFactory extends Factory
{
    protected $model = VendorContact::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'vendor_profile_id' => VendorProfiles::factory(),
            'contact_name' => fake()->name(),
            'contact_position' => fake()->jobTitle(),
            'contact_phone' => fake()->numerify('0#########'),
            'contact_email' => fake()->safeEmail(),
            'line_id' => fake()->userName(),
            'other_contact' => null,
            'is_main_contact' => false,
        ];
    }
}
```

Replace the full content of `app/Modules/Vendor/Infrastructure/Models/VendorContact.php` (current content
below) with the version that follows it:

Current content:

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// use App\Modules\Vendor\Database\Factories\VendorContactFactory;
#[Table('vendor_contact')]
#[Fillable([
    'vendor_profile_id',
    'contact_name',
    'contact_position',
    'contact_phone',
    'contact_email',
    'line_id',
    'other_contact',
    'is_main_contact',
])]
class VendorContact extends Model
{
    use HasFactory;

    // protected static function newFactory(): VendorContactFactory
    // {
    //     // return VendorContactFactory::new();
    // }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_main_contact' => 'boolean',
        ];
    }

    // Relations
    public function VendorContactVendorProfile(): BelongsTo
    {
        return $this->belongsTo(VendorProfiles::class, 'vendor_profile_id', 'id');
    }
}
```

New content:

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use Database\Factories\VendorContactFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Table('vendor_contact')]
#[Fillable([
    'vendor_profile_id',
    'contact_name',
    'contact_position',
    'contact_phone',
    'contact_email',
    'line_id',
    'other_contact',
    'is_main_contact',
])]
class VendorContact extends Model
{
    use HasFactory;

    protected static function newFactory(): VendorContactFactory
    {
        return VendorContactFactory::new();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_main_contact' => 'boolean',
        ];
    }

    // Relations
    public function VendorContactVendorProfile(): BelongsTo
    {
        return $this->belongsTo(VendorProfiles::class, 'vendor_profile_id', 'id');
    }
}
```

- [ ] **Step 7: Create `VendorDocumentsFactory` and wire it into `VendorDocuments`**

Create `database/factories/VendorDocumentsFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VendorDocuments>
 */
class VendorDocumentsFactory extends Factory
{
    protected $model = VendorDocuments::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'vendor_profile_id' => VendorProfiles::factory(),
            'document_type' => fake()->randomElement(['company_registration', 'id_card', 'vat_registration']),
            'file_name' => fake()->word().'.pdf',
            'file_path' => 'vendor-documents/'.fake()->uuid().'.pdf',
            'status' => 'pending',
            'verified_by' => null,
            'verified_at' => null,
            'remark' => null,
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'approved',
            'verified_by' => User::factory()->state(['user_type' => 'internal']),
            'verified_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'rejected',
            'verified_by' => User::factory()->state(['user_type' => 'internal']),
            'verified_at' => now(),
            'remark' => 'Rejected during testing.',
        ]);
    }
}
```

Replace the full content of `app/Modules/Vendor/Infrastructure/Models/VendorDocuments.php` (current content
below) with the version that follows it:

Current content:

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\States\DocumentStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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

    // Relations
    public function VendorDocumentsVendorProfile(): BelongsTo
    {
        return $this->belongsTo(VendorProfiles::class, 'vendor_profile_id', 'id');
    }

    public function VendorDocumentsVerifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
```

New content:

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\States\DocumentStatus;
use Database\Factories\VendorDocumentsFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\ModelStates\HasStates;

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

    protected static function newFactory(): VendorDocumentsFactory
    {
        return VendorDocumentsFactory::new();
    }

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

    // Relations
    public function VendorDocumentsVendorProfile(): BelongsTo
    {
        return $this->belongsTo(VendorProfiles::class, 'vendor_profile_id', 'id');
    }

    public function VendorDocumentsVerifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
```

- [ ] **Step 8: Run the tests to verify everything passes**

Run: `php artisan test --compact --filter=VendorFactoriesTest`
Expected: PASS — all 9 tests green.

- [ ] **Step 9: Format with Pint**

Run: `vendor/bin/pint --dirty --format agent`
Expected: reports the modified/created files as formatted (or already clean).

- [ ] **Step 10: Run the full test suite to check for regressions**

Run: `php artisan test --compact`
Expected: same baseline as before this plan plus 9 new passing tests, 1 pre-existing unrelated failure
(`Tests\Feature\ExampleTest`, a stub root-route test that has failed since before any of this vendor work
started — do not touch it). No existing Vendor test (the ones using `VendorRepository` + domain entities
directly) should be affected, since this plan never modifies any of them.

- [ ] **Step 11: Commit**

```bash
git add database/factories/VendorProfilesFactory.php \
        database/factories/VendorCompanyDetailsFactory.php \
        database/factories/VendorIndividualDetailsFactory.php \
        database/factories/VendorContactFactory.php \
        database/factories/VendorDocumentsFactory.php \
        app/Modules/Vendor/Infrastructure/Models/VendorProfiles.php \
        app/Modules/Vendor/Infrastructure/Models/VendorCompanyDetails.php \
        app/Modules/Vendor/Infrastructure/Models/VendorIndividualDetails.php \
        app/Modules/Vendor/Infrastructure/Models/VendorContact.php \
        app/Modules/Vendor/Infrastructure/Models/VendorDocuments.php \
        tests/Feature/Modules/Vendor/VendorFactoriesTest.php
git commit -m "feat(vendor): add factories for all 5 vendor Eloquent models"
```
