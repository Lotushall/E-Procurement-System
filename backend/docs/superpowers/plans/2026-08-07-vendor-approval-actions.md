# Vendor & Document Approve/Reject/Pending Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the six backend endpoints (`approve`/`reject`/`pending` at both the vendor-profile and vendor-document level) that the already-shipped vendor detail UI (`frontend/app/dashboard/vendors/detail/`) calls but that don't exist yet.

**Architecture:** Modular monolith, DDD-flavored: `Domain\Entities` hold pure business logic (state transitions), `Application\UseCases` orchestrate a single load→mutate→save via `VendorRepositoryInterface`, `Presentation\Http` (FormRequests + `VendorApprovalController`) is the thin HTTP layer. All new code lives in the existing `App\Modules\Vendor` module and its existing `VendorApprovalController`.

**Tech Stack:** PHP 8.4, Laravel 13, Pest 4 (feature + unit tests), Spatie Laravel Model States (already wired, no changes to its config needed).

## Global Constraints

- Follow existing module conventions exactly — this plan adds to an established pattern (`DeleteVendorDocumentUseCase`, `VendorProfile::resubmit()`, etc.), it does not invent a new one.
- No new authorization checks. `index`/`show` on `VendorApprovalController` currently have no `user_type` restriction beyond the `auth` middleware; the user confirmed (2026-08-07) new endpoints should match that, ahead of a planned Policy/middleware-based authorization migration.
- `remark` is required and non-empty for every reject action, optional for approve, absent entirely for pending — per the spec at `docs/superpowers/specs/2026-08-07-vendor-approval-actions-design.md`.
- Run `vendor/bin/pint --dirty --format agent` after any PHP file change, before considering a task done.
- Tests use Pest's `test()` function style (not `it()`) and `Illuminate\Foundation\Testing\RefreshDatabase` — matches every existing file in `tests/Feature/Modules/Vendor/` and `tests/Unit/Domain/Vendor/Entities/`.
- Use specific Pest assertions (`assertOk()`, `assertStatus(404)` is fine where no more specific helper exists, but prefer `assertNotFound()` where used already in this codebase — check sibling tests) over generic ones.

---

### Task 1: `VendorDocument::resubmit()` domain method

**Files:**
- Modify: `app/Modules/Vendor/Domain/Entities/VendorDocument.php`
- Test: `tests/Unit/Domain/Vendor/Entities/VendorDocumentTest.php`

**Interfaces:**
- Produces: `VendorDocument::resubmit(): void` — resets status to `Pending`, clears `verifiedBy`/`verifiedAt`/`remark`. No-op if already `Pending`. Mirrors the existing `VendorProfile::resubmit()` (`app/Modules/Vendor/Domain/Entities/VendorProfile.php:76-86`) exactly. Later tasks (5, and the `PendingVendorDocumentUseCase` it powers) call this method.

- [ ] **Step 1: Write the failing unit tests**

Append to the end of `tests/Unit/Domain/Vendor/Entities/VendorDocumentTest.php` (the file already imports `VendorDocument`, `Approved`, `Pending`, `Rejected`, `CarbonImmutable` — no new imports needed):

```php
test('resubmit transitions a rejected document back to pending and clears verification', function () {
    $document = VendorDocument::create(
        vendorProfileId: 10,
        documentType: 'id_card',
        fileName: 'id-card.pdf',
        filePath: 'documents/id-card.pdf',
    );
    $document->reject(verifiedBy: 2, remark: 'Blurry image');

    $document->resubmit();

    expect($document->status())->toBeInstanceOf(Pending::class)
        ->and($document->isPending())->toBeTrue()
        ->and($document->verifiedAt())->toBeNull()
        ->and($document->verifiedBy())->toBeNull()
        ->and($document->remark())->toBeNull();
});

test('resubmit transitions an approved document back to pending and clears verification', function () {
    $document = VendorDocument::create(
        vendorProfileId: 10,
        documentType: 'id_card',
        fileName: 'id-card.pdf',
        filePath: 'documents/id-card.pdf',
    );
    $document->approve(verifiedBy: 2, remark: 'Clear copy');

    $document->resubmit();

    expect($document->status())->toBeInstanceOf(Pending::class)
        ->and($document->isPending())->toBeTrue()
        ->and($document->verifiedAt())->toBeNull()
        ->and($document->verifiedBy())->toBeNull()
        ->and($document->remark())->toBeNull();
});

test('resubmit is a no-op when already pending', function () {
    $document = VendorDocument::create(
        vendorProfileId: 10,
        documentType: 'id_card',
        fileName: 'id-card.pdf',
        filePath: 'documents/id-card.pdf',
    );
    $pendingState = $document->status();

    $document->resubmit();

    expect($document->status())->toBe($pendingState);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact tests/Unit/Domain/Vendor/Entities/VendorDocumentTest.php`
Expected: FAIL — `Call to undefined method App\Modules\Vendor\Domain\Entities\VendorDocument::resubmit()`

- [ ] **Step 3: Implement `resubmit()`**

In `app/Modules/Vendor/Domain/Entities/VendorDocument.php`, find the `reupload()` method (currently immediately followed by the `// Getters` comment block):

```php
    public function reupload(string $fileName, string $filePath): void
    {
        $this->fileName = $fileName;
        $this->filePath = $filePath;
        $this->status = new Pending($this);
        $this->verifiedBy = null;
        $this->verifiedAt = null;
        $this->remark = null;
    }

    // -----------------------------
    // Getters
    // -----------------------------
```

Replace it with:

```php
    public function reupload(string $fileName, string $filePath): void
    {
        $this->fileName = $fileName;
        $this->filePath = $filePath;
        $this->status = new Pending($this);
        $this->verifiedBy = null;
        $this->verifiedAt = null;
        $this->remark = null;
    }

    public function resubmit(): void
    {
        if ($this->status instanceof Pending) {
            return;
        }

        $this->status = new Pending($this);
        $this->verifiedBy = null;
        $this->verifiedAt = null;
        $this->remark = null;
    }

    // -----------------------------
    // Getters
    // -----------------------------
```

(`Pending` is already imported at the top of the file — no new `use` needed.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `php artisan test --compact tests/Unit/Domain/Vendor/Entities/VendorDocumentTest.php`
Expected: PASS (9 tests total — 6 existing + 3 new)

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Domain/Entities/VendorDocument.php tests/Unit/Domain/Vendor/Entities/VendorDocumentTest.php
git commit -m "feat(vendor): add VendorDocument::resubmit() to reset a document back to pending"
```

---

### Task 2: `ApproveVendorProfileUseCase`

**Files:**
- Create: `app/Modules/Vendor/Application/UseCases/ApproveVendorProfileUseCase.php`
- Test: `tests/Feature/Modules/Vendor/ApproveVendorProfileUseCaseTest.php`

**Interfaces:**
- Consumes: `VendorRepositoryInterface::findProfileById(int): ?VendorProfile`, `VendorRepositoryInterface::saveProfile(VendorProfile): VendorProfile` (`app/Modules/Vendor/Domain/Repositories/VendorRepositoryInterface.php`); `VendorProfile::approve(int $verifiedBy, ?string $remark = null): void` (already exists, `app/Modules/Vendor/Domain/Entities/VendorProfile.php:52-62`); the `app_log()` helper (`app/Shared/Support/helpers.php`).
- Produces: `ApproveVendorProfileUseCase::execute(int $vendorProfileId, int $verifiedBy, ?string $remark = null): void`, throwing `Illuminate\Database\Eloquent\ModelNotFoundException` if the profile doesn't exist. Used by Task 8's controller `approve()` method.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Modules/Vendor/ApproveVendorProfileUseCaseTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\UseCases\ApproveVendorProfileUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function approveVendorProfileUseCase(): ApproveVendorProfileUseCase
{
    return app(ApproveVendorProfileUseCase::class);
}

test('execute approves a pending vendor profile', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorProfileUseCase()->execute($profile->id, $internalUser->id, 'Looks good');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'approved',
        'verified_by' => $internalUser->id,
        'remark' => 'Looks good',
    ]);
});

test('execute approves a rejected vendor profile', function () {
    $profile = VendorProfiles::factory()->rejected()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorProfileUseCase()->execute($profile->id, $internalUser->id);

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'approved',
        'verified_by' => $internalUser->id,
    ]);
});

test('execute throws when the vendor profile does not exist', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => approveVendorProfileUseCase()->execute(999999, $internalUser->id))
        ->toThrow(ModelNotFoundException::class);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/ApproveVendorProfileUseCaseTest.php`
Expected: FAIL — `Class "App\Modules\Vendor\Application\UseCases\ApproveVendorProfileUseCase" not found`

- [ ] **Step 3: Implement the UseCase**

Create `app/Modules/Vendor/Application/UseCases/ApproveVendorProfileUseCase.php`:

```php
<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class ApproveVendorProfileUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
    ) {}

    public function execute(int $vendorProfileId, int $verifiedBy, ?string $remark = null): void
    {
        $profile = $this->vendors->findProfileById($vendorProfileId);

        if ($profile === null) {
            throw new ModelNotFoundException("Vendor profile {$vendorProfileId} not found.");
        }

        $profile->approve($verifiedBy, $remark);
        $this->vendors->saveProfile($profile);

        app_log('Vendor profile approved', [
            'vendor_profile_id' => $vendorProfileId,
            'verified_by' => $verifiedBy,
        ], 'info', 'vendor');
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/ApproveVendorProfileUseCaseTest.php`
Expected: PASS (3 tests)

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Application/UseCases/ApproveVendorProfileUseCase.php tests/Feature/Modules/Vendor/ApproveVendorProfileUseCaseTest.php
git commit -m "feat(vendor): add ApproveVendorProfileUseCase"
```

---

### Task 3: `RejectVendorProfileUseCase`

**Files:**
- Create: `app/Modules/Vendor/Application/UseCases/RejectVendorProfileUseCase.php`
- Test: `tests/Feature/Modules/Vendor/RejectVendorProfileUseCaseTest.php`

**Interfaces:**
- Consumes: same repository methods as Task 2; `VendorProfile::reject(int $verifiedBy, ?string $remark = null): void` (already exists, `VendorProfile.php:64-74`).
- Produces: `RejectVendorProfileUseCase::execute(int $vendorProfileId, int $verifiedBy, string $remark): void` (note: `$remark` is **required**, not nullable, unlike approve), throwing `ModelNotFoundException` if missing. Used by Task 8's controller `reject()` method.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Modules/Vendor/RejectVendorProfileUseCaseTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\UseCases\RejectVendorProfileUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function rejectVendorProfileUseCase(): RejectVendorProfileUseCase
{
    return app(RejectVendorProfileUseCase::class);
}

test('execute rejects a pending vendor profile', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorProfileUseCase()->execute($profile->id, $internalUser->id, 'Missing documents');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'rejected',
        'verified_by' => $internalUser->id,
        'remark' => 'Missing documents',
    ]);
});

test('execute rejects an approved vendor profile', function () {
    $profile = VendorProfiles::factory()->approved()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorProfileUseCase()->execute($profile->id, $internalUser->id, 'Revoked');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'rejected',
        'remark' => 'Revoked',
    ]);
});

test('execute throws when the vendor profile does not exist', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => rejectVendorProfileUseCase()->execute(999999, $internalUser->id, 'Missing documents'))
        ->toThrow(ModelNotFoundException::class);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/RejectVendorProfileUseCaseTest.php`
Expected: FAIL — `Class "App\Modules\Vendor\Application\UseCases\RejectVendorProfileUseCase" not found`

- [ ] **Step 3: Implement the UseCase**

Create `app/Modules/Vendor/Application/UseCases/RejectVendorProfileUseCase.php`:

```php
<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class RejectVendorProfileUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
    ) {}

    public function execute(int $vendorProfileId, int $verifiedBy, string $remark): void
    {
        $profile = $this->vendors->findProfileById($vendorProfileId);

        if ($profile === null) {
            throw new ModelNotFoundException("Vendor profile {$vendorProfileId} not found.");
        }

        $profile->reject($verifiedBy, $remark);
        $this->vendors->saveProfile($profile);

        app_log('Vendor profile rejected', [
            'vendor_profile_id' => $vendorProfileId,
            'verified_by' => $verifiedBy,
        ], 'info', 'vendor');
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/RejectVendorProfileUseCaseTest.php`
Expected: PASS (3 tests)

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Application/UseCases/RejectVendorProfileUseCase.php tests/Feature/Modules/Vendor/RejectVendorProfileUseCaseTest.php
git commit -m "feat(vendor): add RejectVendorProfileUseCase"
```

---

### Task 4: `PendingVendorProfileUseCase`

**Files:**
- Create: `app/Modules/Vendor/Application/UseCases/PendingVendorProfileUseCase.php`
- Test: `tests/Feature/Modules/Vendor/PendingVendorProfileUseCaseTest.php`

**Interfaces:**
- Consumes: `VendorRepositoryInterface::findProfileById`/`saveProfile`; `VendorProfile::resubmit(): void` (already exists, `VendorProfile.php:76-86`).
- Produces: `PendingVendorProfileUseCase::execute(int $vendorProfileId): void`, throwing `ModelNotFoundException` if missing. Used by Task 8's controller `pending()` method.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Modules/Vendor/PendingVendorProfileUseCaseTest.php`:

```php
<?php

use App\Modules\Vendor\Application\UseCases\PendingVendorProfileUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function pendingVendorProfileUseCase(): PendingVendorProfileUseCase
{
    return app(PendingVendorProfileUseCase::class);
}

test('execute sends an approved vendor profile back to pending and clears verification', function () {
    $profile = VendorProfiles::factory()->approved()->create();

    pendingVendorProfileUseCase()->execute($profile->id);

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'pending',
        'verified_by' => null,
        'verified_at' => null,
        'remark' => null,
    ]);
});

test('execute sends a rejected vendor profile back to pending and clears verification', function () {
    $profile = VendorProfiles::factory()->rejected()->create();

    pendingVendorProfileUseCase()->execute($profile->id);

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'pending',
        'verified_by' => null,
        'verified_at' => null,
        'remark' => null,
    ]);
});

test('execute throws when the vendor profile does not exist', function () {
    expect(fn () => pendingVendorProfileUseCase()->execute(999999))
        ->toThrow(ModelNotFoundException::class);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/PendingVendorProfileUseCaseTest.php`
Expected: FAIL — `Class "App\Modules\Vendor\Application\UseCases\PendingVendorProfileUseCase" not found`

- [ ] **Step 3: Implement the UseCase**

Create `app/Modules/Vendor/Application/UseCases/PendingVendorProfileUseCase.php`:

```php
<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class PendingVendorProfileUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
    ) {}

    public function execute(int $vendorProfileId): void
    {
        $profile = $this->vendors->findProfileById($vendorProfileId);

        if ($profile === null) {
            throw new ModelNotFoundException("Vendor profile {$vendorProfileId} not found.");
        }

        $profile->resubmit();
        $this->vendors->saveProfile($profile);

        app_log('Vendor profile set back to pending', [
            'vendor_profile_id' => $vendorProfileId,
        ], 'info', 'vendor');
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/PendingVendorProfileUseCaseTest.php`
Expected: PASS (3 tests)

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Application/UseCases/PendingVendorProfileUseCase.php tests/Feature/Modules/Vendor/PendingVendorProfileUseCaseTest.php
git commit -m "feat(vendor): add PendingVendorProfileUseCase"
```

---

### Task 5: `ApproveVendorDocumentUseCase`

**Files:**
- Create: `app/Modules/Vendor/Application/UseCases/ApproveVendorDocumentUseCase.php`
- Test: `tests/Feature/Modules/Vendor/ApproveVendorDocumentUseCaseTest.php`

**Interfaces:**
- Consumes: `VendorRepositoryInterface::findDocumentByVendorProfileIdAndId(int $vendorProfileId, int $documentId): ?VendorDocument`, `VendorRepositoryInterface::saveDocument(VendorDocument): VendorDocument`; `VendorDocument::approve(int $verifiedBy, ?string $remark = null): void` (already exists, `app/Modules/Vendor/Domain/Entities/VendorDocument.php:68-78`).
- Produces: `ApproveVendorDocumentUseCase::execute(int $vendorProfileId, int $documentId, int $verifiedBy): void`, throwing `ModelNotFoundException` if the document doesn't exist or doesn't belong to that vendor profile. Used by Task 9's controller `approveDocument()` method.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Modules/Vendor/ApproveVendorDocumentUseCaseTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\UseCases\ApproveVendorDocumentUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function approveVendorDocumentUseCase(): ApproveVendorDocumentUseCase
{
    return app(ApproveVendorDocumentUseCase::class);
}

test('execute approves a pending vendor document', function () {
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorDocumentUseCase()->execute($profile->id, $document->id, $internalUser->id);

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'approved',
        'verified_by' => $internalUser->id,
    ]);
});

test('execute throws when the document does not belong to the vendor profile', function () {
    $ownerProfile = VendorProfiles::factory()->create();
    $otherProfile = VendorProfiles::factory()->create();
    $otherDocument = VendorDocuments::factory()->create(['vendor_profile_id' => $otherProfile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => approveVendorDocumentUseCase()->execute($ownerProfile->id, $otherDocument->id, $internalUser->id))
        ->toThrow(ModelNotFoundException::class);
});

test('execute throws when the document id does not exist', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => approveVendorDocumentUseCase()->execute($profile->id, 999999, $internalUser->id))
        ->toThrow(ModelNotFoundException::class);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/ApproveVendorDocumentUseCaseTest.php`
Expected: FAIL — `Class "App\Modules\Vendor\Application\UseCases\ApproveVendorDocumentUseCase" not found`

- [ ] **Step 3: Implement the UseCase**

Create `app/Modules/Vendor/Application/UseCases/ApproveVendorDocumentUseCase.php`:

```php
<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class ApproveVendorDocumentUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
    ) {}

    public function execute(int $vendorProfileId, int $documentId, int $verifiedBy): void
    {
        $document = $this->vendors->findDocumentByVendorProfileIdAndId($vendorProfileId, $documentId);

        if ($document === null) {
            throw new ModelNotFoundException(
                "Vendor document {$documentId} not found for vendor profile {$vendorProfileId}."
            );
        }

        $document->approve($verifiedBy);
        $this->vendors->saveDocument($document);

        app_log('Vendor document approved', [
            'vendor_profile_id' => $vendorProfileId,
            'document_id' => $documentId,
            'verified_by' => $verifiedBy,
        ], 'info', 'vendor');
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/ApproveVendorDocumentUseCaseTest.php`
Expected: PASS (3 tests)

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Application/UseCases/ApproveVendorDocumentUseCase.php tests/Feature/Modules/Vendor/ApproveVendorDocumentUseCaseTest.php
git commit -m "feat(vendor): add ApproveVendorDocumentUseCase"
```

---

### Task 6: `RejectVendorDocumentUseCase`

**Files:**
- Create: `app/Modules/Vendor/Application/UseCases/RejectVendorDocumentUseCase.php`
- Test: `tests/Feature/Modules/Vendor/RejectVendorDocumentUseCaseTest.php`

**Interfaces:**
- Consumes: same repository methods as Task 5; `VendorDocument::reject(int $verifiedBy, ?string $remark = null): void` (already exists, `VendorDocument.php:80-90`).
- Produces: `RejectVendorDocumentUseCase::execute(int $vendorProfileId, int $documentId, int $verifiedBy, string $remark): void` (note: `$remark` required), throwing `ModelNotFoundException` if missing/mismatched. Used by Task 9's controller `rejectDocument()` method.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Modules/Vendor/RejectVendorDocumentUseCaseTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\UseCases\RejectVendorDocumentUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function rejectVendorDocumentUseCase(): RejectVendorDocumentUseCase
{
    return app(RejectVendorDocumentUseCase::class);
}

test('execute rejects a pending vendor document', function () {
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorDocumentUseCase()->execute($profile->id, $document->id, $internalUser->id, 'Blurry image');

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'rejected',
        'verified_by' => $internalUser->id,
        'remark' => 'Blurry image',
    ]);
});

test('execute throws when the document does not belong to the vendor profile', function () {
    $ownerProfile = VendorProfiles::factory()->create();
    $otherProfile = VendorProfiles::factory()->create();
    $otherDocument = VendorDocuments::factory()->create(['vendor_profile_id' => $otherProfile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => rejectVendorDocumentUseCase()->execute($ownerProfile->id, $otherDocument->id, $internalUser->id, 'Blurry image'))
        ->toThrow(ModelNotFoundException::class);
});

test('execute throws when the document id does not exist', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => rejectVendorDocumentUseCase()->execute($profile->id, 999999, $internalUser->id, 'Blurry image'))
        ->toThrow(ModelNotFoundException::class);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/RejectVendorDocumentUseCaseTest.php`
Expected: FAIL — `Class "App\Modules\Vendor\Application\UseCases\RejectVendorDocumentUseCase" not found`

- [ ] **Step 3: Implement the UseCase**

Create `app/Modules/Vendor/Application/UseCases/RejectVendorDocumentUseCase.php`:

```php
<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class RejectVendorDocumentUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
    ) {}

    public function execute(int $vendorProfileId, int $documentId, int $verifiedBy, string $remark): void
    {
        $document = $this->vendors->findDocumentByVendorProfileIdAndId($vendorProfileId, $documentId);

        if ($document === null) {
            throw new ModelNotFoundException(
                "Vendor document {$documentId} not found for vendor profile {$vendorProfileId}."
            );
        }

        $document->reject($verifiedBy, $remark);
        $this->vendors->saveDocument($document);

        app_log('Vendor document rejected', [
            'vendor_profile_id' => $vendorProfileId,
            'document_id' => $documentId,
            'verified_by' => $verifiedBy,
        ], 'info', 'vendor');
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/RejectVendorDocumentUseCaseTest.php`
Expected: PASS (3 tests)

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Application/UseCases/RejectVendorDocumentUseCase.php tests/Feature/Modules/Vendor/RejectVendorDocumentUseCaseTest.php
git commit -m "feat(vendor): add RejectVendorDocumentUseCase"
```

---

### Task 7: `PendingVendorDocumentUseCase`

**Files:**
- Create: `app/Modules/Vendor/Application/UseCases/PendingVendorDocumentUseCase.php`
- Test: `tests/Feature/Modules/Vendor/PendingVendorDocumentUseCaseTest.php`

**Interfaces:**
- Consumes: `VendorRepositoryInterface::findDocumentByVendorProfileIdAndId`/`saveDocument`; `VendorDocument::resubmit(): void` (added in Task 1).
- Produces: `PendingVendorDocumentUseCase::execute(int $vendorProfileId, int $documentId): void`, throwing `ModelNotFoundException` if missing/mismatched. Used by Task 9's controller `pendingDocument()` method.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Modules/Vendor/PendingVendorDocumentUseCaseTest.php`:

```php
<?php

use App\Modules\Vendor\Application\UseCases\PendingVendorDocumentUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function pendingVendorDocumentUseCase(): PendingVendorDocumentUseCase
{
    return app(PendingVendorDocumentUseCase::class);
}

test('execute sends an approved vendor document back to pending and clears verification', function () {
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->approved()->create(['vendor_profile_id' => $profile->id]);

    pendingVendorDocumentUseCase()->execute($profile->id, $document->id);

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'pending',
        'verified_by' => null,
        'verified_at' => null,
        'remark' => null,
    ]);
});

test('execute sends a rejected vendor document back to pending and clears verification', function () {
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->rejected()->create(['vendor_profile_id' => $profile->id]);

    pendingVendorDocumentUseCase()->execute($profile->id, $document->id);

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'pending',
        'verified_by' => null,
        'verified_at' => null,
        'remark' => null,
    ]);
});

test('execute throws when the document does not belong to the vendor profile', function () {
    $ownerProfile = VendorProfiles::factory()->create();
    $otherProfile = VendorProfiles::factory()->create();
    $otherDocument = VendorDocuments::factory()->approved()->create(['vendor_profile_id' => $otherProfile->id]);

    expect(fn () => pendingVendorDocumentUseCase()->execute($ownerProfile->id, $otherDocument->id))
        ->toThrow(ModelNotFoundException::class);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/PendingVendorDocumentUseCaseTest.php`
Expected: FAIL — `Class "App\Modules\Vendor\Application\UseCases\PendingVendorDocumentUseCase" not found`

- [ ] **Step 3: Implement the UseCase**

Create `app/Modules/Vendor/Application/UseCases/PendingVendorDocumentUseCase.php`:

```php
<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class PendingVendorDocumentUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
    ) {}

    public function execute(int $vendorProfileId, int $documentId): void
    {
        $document = $this->vendors->findDocumentByVendorProfileIdAndId($vendorProfileId, $documentId);

        if ($document === null) {
            throw new ModelNotFoundException(
                "Vendor document {$documentId} not found for vendor profile {$vendorProfileId}."
            );
        }

        $document->resubmit();
        $this->vendors->saveDocument($document);

        app_log('Vendor document set back to pending', [
            'vendor_profile_id' => $vendorProfileId,
            'document_id' => $documentId,
        ], 'info', 'vendor');
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/PendingVendorDocumentUseCaseTest.php`
Expected: PASS (3 tests)

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Application/UseCases/PendingVendorDocumentUseCase.php tests/Feature/Modules/Vendor/PendingVendorDocumentUseCaseTest.php
git commit -m "feat(vendor): add PendingVendorDocumentUseCase"
```

---

### Task 8: Vendor-level HTTP endpoints (`approve`/`reject`/`pending`)

**Files:**
- Create: `app/Modules/Vendor/Presentation/Http/Requests/ApproveVendorRequest.php`
- Create: `app/Modules/Vendor/Presentation/Http/Requests/RejectVendorRequest.php`
- Modify: `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`
- Modify: `routes/api/v1/dashboard/vendors.php`
- Test: `tests/Feature/Modules/Vendor/ApproveVendorTest.php`
- Test: `tests/Feature/Modules/Vendor/RejectVendorTest.php`
- Test: `tests/Feature/Modules/Vendor/PendingVendorTest.php`

**Interfaces:**
- Consumes: `ApproveVendorProfileUseCase` (Task 2), `RejectVendorProfileUseCase` (Task 3), `PendingVendorProfileUseCase` (Task 4), all constructor-injected.
- Produces: routes `POST vendors/{id}/approve`, `POST vendors/{id}/reject`, `POST vendors/{id}/pending`; a private `VendorApprovalController::vendorResponse(int $id): JsonResponse` helper that Task 9 reuses for the document-level endpoints.

- [ ] **Step 1: Write the failing HTTP tests**

Create `tests/Feature/Modules/Vendor/ApproveVendorTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('approving a vendor requires authentication', function () {
    $response = $this->postJson('/api/v1/vendors/1/approve');

    $response->assertStatus(401);
});

test('an internal user can approve a pending vendor', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/approve", ['remark' => 'Looks good']);

    $response->assertOk()
        ->assertJsonPath('data.verificationStatus', 'approved')
        ->assertJsonPath('data.remark', 'Looks good');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'approved',
        'verified_by' => $internalUser->id,
    ]);
});

test('approving a nonexistent vendor returns 404', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->postJson('/api/v1/vendors/99999/approve');

    $response->assertStatus(404);
});
```

Create `tests/Feature/Modules/Vendor/RejectVendorTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('rejecting a vendor requires authentication', function () {
    $response = $this->postJson('/api/v1/vendors/1/reject', ['remark' => 'Missing documents']);

    $response->assertStatus(401);
});

test('an internal user can reject a pending vendor', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/reject", ['remark' => 'Missing documents']);

    $response->assertOk()
        ->assertJsonPath('data.verificationStatus', 'rejected')
        ->assertJsonPath('data.remark', 'Missing documents');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'rejected',
        'verified_by' => $internalUser->id,
    ]);
});

test('rejecting a vendor requires a remark', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/reject", []);

    $response->assertStatus(422)->assertJsonValidationErrors('remark');
});

test('rejecting a nonexistent vendor returns 404', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->postJson('/api/v1/vendors/99999/reject', ['remark' => 'Missing documents']);

    $response->assertStatus(404);
});
```

Create `tests/Feature/Modules/Vendor/PendingVendorTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('setting a vendor back to pending requires authentication', function () {
    $response = $this->postJson('/api/v1/vendors/1/pending');

    $response->assertStatus(401);
});

test('an internal user can send an approved vendor back to pending', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->approved()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/pending");

    $response->assertOk()->assertJsonPath('data.verificationStatus', 'pending');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'pending',
        'verified_by' => null,
    ]);
});

test('setting a nonexistent vendor back to pending returns 404', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->postJson('/api/v1/vendors/99999/pending');

    $response->assertStatus(404);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/ApproveVendorTest.php tests/Feature/Modules/Vendor/RejectVendorTest.php tests/Feature/Modules/Vendor/PendingVendorTest.php`
Expected: FAIL — 404/500 responses instead of the expected statuses (routes don't exist yet, so Laravel returns 404 for all of them, including the "requires authentication" tests since the route itself is unmatched)

- [ ] **Step 3: Create the two FormRequests**

Create `app/Modules/Vendor/Presentation/Http/Requests/ApproveVendorRequest.php`:

```php
<?php

namespace App\Modules\Vendor\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ApproveVendorRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'remark' => ['nullable', 'string'],
        ];
    }
}
```

Create `app/Modules/Vendor/Presentation/Http/Requests/RejectVendorRequest.php`:

```php
<?php

namespace App\Modules\Vendor\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RejectVendorRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'remark' => ['required', 'string'],
        ];
    }
}
```

- [ ] **Step 4: Update the controller**

In `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`, replace the imports block:

```php
use App\Http\Controllers\Controller;
use App\Modules\Vendor\Application\Queries\CountVendorProfilesByStatusQuery;
use App\Modules\Vendor\Application\Queries\GetVendorProfileByIdQuery;
use App\Modules\Vendor\Application\Queries\ListVendorProfilesQuery;
use App\Modules\Vendor\Presentation\Http\Requests\ListVendorsRequest;
use App\Modules\Vendor\Presentation\Http\Requests\ShowVendorRequest;
use App\Modules\Vendor\Presentation\Http\Resources\VendorProfileResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;
```

with:

```php
use App\Http\Controllers\Controller;
use App\Modules\Vendor\Application\Queries\CountVendorProfilesByStatusQuery;
use App\Modules\Vendor\Application\Queries\GetVendorProfileByIdQuery;
use App\Modules\Vendor\Application\Queries\ListVendorProfilesQuery;
use App\Modules\Vendor\Application\UseCases\ApproveVendorProfileUseCase;
use App\Modules\Vendor\Application\UseCases\PendingVendorProfileUseCase;
use App\Modules\Vendor\Application\UseCases\RejectVendorProfileUseCase;
use App\Modules\Vendor\Presentation\Http\Requests\ApproveVendorRequest;
use App\Modules\Vendor\Presentation\Http\Requests\ListVendorsRequest;
use App\Modules\Vendor\Presentation\Http\Requests\RejectVendorRequest;
use App\Modules\Vendor\Presentation\Http\Requests\ShowVendorRequest;
use App\Modules\Vendor\Presentation\Http\Resources\VendorProfileResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
```

Replace the constructor:

```php
    public function __construct(
        private readonly ListVendorProfilesQuery $listVendorProfiles,
        private readonly CountVendorProfilesByStatusQuery $countVendorProfilesByStatus,
        private readonly GetVendorProfileByIdQuery $getVendorProfileById,
    ) {}
```

with:

```php
    public function __construct(
        private readonly ListVendorProfilesQuery $listVendorProfiles,
        private readonly CountVendorProfilesByStatusQuery $countVendorProfilesByStatus,
        private readonly GetVendorProfileByIdQuery $getVendorProfileById,
        private readonly ApproveVendorProfileUseCase $approveVendorProfile,
        private readonly RejectVendorProfileUseCase $rejectVendorProfile,
        private readonly PendingVendorProfileUseCase $pendingVendorProfile,
    ) {}
```

Replace the end of the class (the `show()` method through the closing brace):

```php
    public function show(int $id): JsonResponse
    {
        $vendor = $this->getVendorProfileById->execute($id);

        return response()->json([
            'data' => new VendorProfileResource($vendor),
        ]);
    }
}
```

with:

```php
    public function show(int $id): JsonResponse
    {
        $vendor = $this->getVendorProfileById->execute($id);

        return response()->json([
            'data' => new VendorProfileResource($vendor),
        ]);
    }

    public function approve(ApproveVendorRequest $request, int $id): JsonResponse
    {
        $this->approveVendorProfile->execute($id, $request->user()->id, $request->validated('remark'));

        return $this->vendorResponse($id);
    }

    public function reject(RejectVendorRequest $request, int $id): JsonResponse
    {
        $this->rejectVendorProfile->execute($id, $request->user()->id, $request->validated('remark'));

        return $this->vendorResponse($id);
    }

    public function pending(int $id): JsonResponse
    {
        $this->pendingVendorProfile->execute($id);

        return $this->vendorResponse($id);
    }

    private function vendorResponse(int $id): JsonResponse
    {
        return response()->json([
            'data' => new VendorProfileResource($this->getVendorProfileById->execute($id)),
        ]);
    }
}
```

- [ ] **Step 5: Add the routes**

In `routes/api/v1/dashboard/vendors.php`, replace:

```php
Route::get('vendors', [VendorApprovalController::class, 'index'])->name('vendors.index');
Route::get('vendors/{id}', [VendorApprovalController::class, 'show'])->name('vendors.show')->whereNumber('id');
```

with:

```php
Route::get('vendors', [VendorApprovalController::class, 'index'])->name('vendors.index');
Route::get('vendors/{id}', [VendorApprovalController::class, 'show'])->name('vendors.show')->whereNumber('id');

Route::post('vendors/{id}/approve', [VendorApprovalController::class, 'approve'])->whereNumber('id')->name('vendors.approve');
Route::post('vendors/{id}/reject', [VendorApprovalController::class, 'reject'])->whereNumber('id')->name('vendors.reject');
Route::post('vendors/{id}/pending', [VendorApprovalController::class, 'pending'])->whereNumber('id')->name('vendors.pending');
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/ApproveVendorTest.php tests/Feature/Modules/Vendor/RejectVendorTest.php tests/Feature/Modules/Vendor/PendingVendorTest.php`
Expected: PASS (9 tests total)

Also re-run the full existing vendor suite to make sure nothing regressed (the controller's constructor and imports changed):

Run: `php artisan test --compact tests/Feature/Modules/Vendor/ListVendorsTest.php tests/Feature/Modules/Vendor/ShowVendorTest.php`
Expected: same pass/fail counts as before this task (`ShowVendorTest`'s pre-existing "a vendor user cannot fetch a vendor by id" failure, expecting 403 but getting 404, is unrelated to this change and out of scope — do not fix it here)

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Presentation/Http/Requests/ApproveVendorRequest.php app/Modules/Vendor/Presentation/Http/Requests/RejectVendorRequest.php app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php routes/api/v1/dashboard/vendors.php tests/Feature/Modules/Vendor/ApproveVendorTest.php tests/Feature/Modules/Vendor/RejectVendorTest.php tests/Feature/Modules/Vendor/PendingVendorTest.php
git commit -m "feat(vendor): wire up vendor-level approve/reject/pending endpoints"
```

---

### Task 9: Document-level HTTP endpoints (`approve`/`reject`/`pending`)

**Files:**
- Create: `app/Modules/Vendor/Presentation/Http/Requests/RejectVendorDocumentRequest.php`
- Modify: `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`
- Modify: `routes/api/v1/dashboard/vendors.php`
- Test: `tests/Feature/Modules/Vendor/ApproveVendorDocumentTest.php`
- Test: `tests/Feature/Modules/Vendor/RejectVendorDocumentTest.php`
- Test: `tests/Feature/Modules/Vendor/PendingVendorDocumentTest.php`

**Interfaces:**
- Consumes: `ApproveVendorDocumentUseCase` (Task 5), `RejectVendorDocumentUseCase` (Task 6), `PendingVendorDocumentUseCase` (Task 7); the `vendorResponse(int $id): JsonResponse` private helper added in Task 8.
- Produces: routes `POST vendors/{vendorId}/documents/{documentId}/approve`, `.../reject`, `.../pending`.

- [ ] **Step 1: Write the failing HTTP tests**

Create `tests/Feature/Modules/Vendor/ApproveVendorDocumentTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('approving a vendor document requires authentication', function () {
    $response = $this->postJson('/api/v1/vendors/1/documents/1/approve');

    $response->assertStatus(401);
});

test('an internal user can approve a pending vendor document', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/{$document->id}/approve");

    $response->assertOk()->assertJsonPath('data.document.0.status', 'approved');

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'approved',
        'verified_by' => $internalUser->id,
    ]);
});

test('approving a nonexistent vendor document returns 404', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/99999/approve");

    $response->assertStatus(404);
});
```

Create `tests/Feature/Modules/Vendor/RejectVendorDocumentTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('rejecting a vendor document requires authentication', function () {
    $response = $this->postJson('/api/v1/vendors/1/documents/1/reject', ['remark' => 'Blurry image']);

    $response->assertStatus(401);
});

test('an internal user can reject a pending vendor document', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/{$document->id}/reject", ['remark' => 'Blurry image']);

    $response->assertOk()->assertJsonPath('data.document.0.status', 'rejected');

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'rejected',
        'verified_by' => $internalUser->id,
        'remark' => 'Blurry image',
    ]);
});

test('rejecting a vendor document requires a remark', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/{$document->id}/reject", []);

    $response->assertStatus(422)->assertJsonValidationErrors('remark');
});

test('rejecting a nonexistent vendor document returns 404', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/99999/reject", ['remark' => 'Blurry image']);

    $response->assertStatus(404);
});
```

Create `tests/Feature/Modules/Vendor/PendingVendorDocumentTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('setting a vendor document back to pending requires authentication', function () {
    $response = $this->postJson('/api/v1/vendors/1/documents/1/pending');

    $response->assertStatus(401);
});

test('an internal user can send an approved vendor document back to pending', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->approved()->create(['vendor_profile_id' => $profile->id]);

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/{$document->id}/pending");

    $response->assertOk()->assertJsonPath('data.document.0.status', 'pending');

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'pending',
        'verified_by' => null,
    ]);
});

test('setting a nonexistent vendor document back to pending returns 404', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/99999/pending");

    $response->assertStatus(404);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/ApproveVendorDocumentTest.php tests/Feature/Modules/Vendor/RejectVendorDocumentTest.php tests/Feature/Modules/Vendor/PendingVendorDocumentTest.php`
Expected: FAIL — routes don't exist yet, all requests 404

- [ ] **Step 3: Create the FormRequest**

Create `app/Modules/Vendor/Presentation/Http/Requests/RejectVendorDocumentRequest.php`:

```php
<?php

namespace App\Modules\Vendor\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RejectVendorDocumentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'remark' => ['required', 'string'],
        ];
    }
}
```

- [ ] **Step 4: Update the controller**

In `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`, replace the imports block. **Note:** Task 8's actual committed output differs slightly from what an earlier draft of this plan expected — running `vendor/bin/pint --dirty` after Task 8 stripped two now-genuinely-unused imports (`ShowVendorRequest`, a pre-existing dead import unrelated to this plan; and `Illuminate\Http\Request`, unused by Task 8's own methods since only `pending()` was added without a `Request` param). The old_string below matches the real current file:

```php
use App\Http\Controllers\Controller;
use App\Modules\Vendor\Application\Queries\CountVendorProfilesByStatusQuery;
use App\Modules\Vendor\Application\Queries\GetVendorProfileByIdQuery;
use App\Modules\Vendor\Application\Queries\ListVendorProfilesQuery;
use App\Modules\Vendor\Application\UseCases\ApproveVendorProfileUseCase;
use App\Modules\Vendor\Application\UseCases\PendingVendorProfileUseCase;
use App\Modules\Vendor\Application\UseCases\RejectVendorProfileUseCase;
use App\Modules\Vendor\Presentation\Http\Requests\ApproveVendorRequest;
use App\Modules\Vendor\Presentation\Http\Requests\ListVendorsRequest;
use App\Modules\Vendor\Presentation\Http\Requests\RejectVendorRequest;
use App\Modules\Vendor\Presentation\Http\Resources\VendorProfileResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;
```

with (this reintroduces `Illuminate\Http\Request`, now genuinely needed by `approveDocument()`/`rejectDocument()` below — but does NOT reintroduce `ShowVendorRequest`, which stays removed as dead code):

```php
use App\Http\Controllers\Controller;
use App\Modules\Vendor\Application\Queries\CountVendorProfilesByStatusQuery;
use App\Modules\Vendor\Application\Queries\GetVendorProfileByIdQuery;
use App\Modules\Vendor\Application\Queries\ListVendorProfilesQuery;
use App\Modules\Vendor\Application\UseCases\ApproveVendorDocumentUseCase;
use App\Modules\Vendor\Application\UseCases\ApproveVendorProfileUseCase;
use App\Modules\Vendor\Application\UseCases\PendingVendorDocumentUseCase;
use App\Modules\Vendor\Application\UseCases\PendingVendorProfileUseCase;
use App\Modules\Vendor\Application\UseCases\RejectVendorDocumentUseCase;
use App\Modules\Vendor\Application\UseCases\RejectVendorProfileUseCase;
use App\Modules\Vendor\Presentation\Http\Requests\ApproveVendorRequest;
use App\Modules\Vendor\Presentation\Http\Requests\ListVendorsRequest;
use App\Modules\Vendor\Presentation\Http\Requests\RejectVendorDocumentRequest;
use App\Modules\Vendor\Presentation\Http\Requests\RejectVendorRequest;
use App\Modules\Vendor\Presentation\Http\Resources\VendorProfileResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
```

Replace the constructor (as left by Task 8):

```php
    public function __construct(
        private readonly ListVendorProfilesQuery $listVendorProfiles,
        private readonly CountVendorProfilesByStatusQuery $countVendorProfilesByStatus,
        private readonly GetVendorProfileByIdQuery $getVendorProfileById,
        private readonly ApproveVendorProfileUseCase $approveVendorProfile,
        private readonly RejectVendorProfileUseCase $rejectVendorProfile,
        private readonly PendingVendorProfileUseCase $pendingVendorProfile,
    ) {}
```

with:

```php
    public function __construct(
        private readonly ListVendorProfilesQuery $listVendorProfiles,
        private readonly CountVendorProfilesByStatusQuery $countVendorProfilesByStatus,
        private readonly GetVendorProfileByIdQuery $getVendorProfileById,
        private readonly ApproveVendorProfileUseCase $approveVendorProfile,
        private readonly RejectVendorProfileUseCase $rejectVendorProfile,
        private readonly PendingVendorProfileUseCase $pendingVendorProfile,
        private readonly ApproveVendorDocumentUseCase $approveVendorDocument,
        private readonly RejectVendorDocumentUseCase $rejectVendorDocument,
        private readonly PendingVendorDocumentUseCase $pendingVendorDocument,
    ) {}
```

Replace the end of the class (the `vendorResponse()` helper through the closing brace, as left by Task 8):

```php
    private function vendorResponse(int $id): JsonResponse
    {
        return response()->json([
            'data' => new VendorProfileResource($this->getVendorProfileById->execute($id)),
        ]);
    }
}
```

with:

```php
    public function approveDocument(Request $request, int $vendorId, int $documentId): JsonResponse
    {
        $this->approveVendorDocument->execute($vendorId, $documentId, $request->user()->id);

        return $this->vendorResponse($vendorId);
    }

    public function rejectDocument(RejectVendorDocumentRequest $request, int $vendorId, int $documentId): JsonResponse
    {
        $this->rejectVendorDocument->execute($vendorId, $documentId, $request->user()->id, $request->validated('remark'));

        return $this->vendorResponse($vendorId);
    }

    public function pendingDocument(int $vendorId, int $documentId): JsonResponse
    {
        $this->pendingVendorDocument->execute($vendorId, $documentId);

        return $this->vendorResponse($vendorId);
    }

    private function vendorResponse(int $id): JsonResponse
    {
        return response()->json([
            'data' => new VendorProfileResource($this->getVendorProfileById->execute($id)),
        ]);
    }
}
```

- [ ] **Step 5: Add the routes**

In `routes/api/v1/dashboard/vendors.php`, append after the three routes added in Task 8:

```php
Route::post('vendors/{vendorId}/documents/{documentId}/approve', [VendorApprovalController::class, 'approveDocument'])->whereNumber(['vendorId', 'documentId'])->name('vendors.documents.approve');
Route::post('vendors/{vendorId}/documents/{documentId}/reject', [VendorApprovalController::class, 'rejectDocument'])->whereNumber(['vendorId', 'documentId'])->name('vendors.documents.reject');
Route::post('vendors/{vendorId}/documents/{documentId}/pending', [VendorApprovalController::class, 'pendingDocument'])->whereNumber(['vendorId', 'documentId'])->name('vendors.documents.pending');
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/ApproveVendorDocumentTest.php tests/Feature/Modules/Vendor/RejectVendorDocumentTest.php tests/Feature/Modules/Vendor/PendingVendorDocumentTest.php`
Expected: PASS (11 tests total)

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Presentation/Http/Requests/RejectVendorDocumentRequest.php app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php routes/api/v1/dashboard/vendors.php tests/Feature/Modules/Vendor/ApproveVendorDocumentTest.php tests/Feature/Modules/Vendor/RejectVendorDocumentTest.php tests/Feature/Modules/Vendor/PendingVendorDocumentTest.php
git commit -m "feat(vendor): wire up document-level approve/reject/pending endpoints"
```

---

### Task 10: Full verification pass

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Run the entire vendor test suite**

Run: `php artisan test --compact tests/Unit/Domain/Vendor tests/Feature/Modules/Vendor`
Expected: all pass except the pre-existing, out-of-scope `ShowVendorTest.php` failure ("a vendor user cannot fetch a vendor by id" expecting 403, getting 404) — confirm no *new* failures were introduced

- [ ] **Step 2: Run the full test suite**

Run: `php artisan test --compact`
Expected: same pass/fail delta as Step 1 — no regressions outside the Vendor module

- [ ] **Step 3: Final Pint check**

Run: `vendor/bin/pint --format agent`
Expected: no changes needed (each task already ran `pint --dirty` after its own edits)

- [ ] **Step 4: Manual sanity check against the frontend contract**

Confirm each of the 6 URLs in `frontend/lib/vendor/approval/api.ts` (`approveVendor`, `rejectVendor`, `pendingVendor`, `approveVendorDocument`, `rejectVendorDocument`, `pendingVendorDocument`) now has a matching route in `php artisan route:list --path=vendors`.

Run: `php artisan route:list --path=vendors`
Expected: 8 routes total — the original `index`/`show` plus the 6 new ones, all under `api/v1`.
