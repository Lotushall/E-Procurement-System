# Vendor Document Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real backend endpoint to delete a vendor document (`DELETE /api/v1/vendor/document/{id}`), and expose each document's `id` in the API response so a future frontend change can target it.

**Architecture:** `VendorDocumentResource` starts returning `id`. A new `DeleteVendorDocumentUseCase` looks up the document among the requesting vendor's own documents (ownership check, same pattern as the vendor-contact-update-by-id plan), deletes both the DB row and the stored file, and resubmits the vendor profile for review if it wasn't already pending — reusing the same resubmit logic `UpdateVendorDocumentUseCase` already has, extracted into a small shared service so it isn't duplicated. A new controller action + route wire it up. **Backend only** — no frontend changes in this plan.

**Tech Stack:** PHP 8.4, Laravel 13, Pest 4. No new packages.

## Global Constraints

- Spec: `backend/docs/superpowers/specs/2026-07-23-vendor-document-delete-design.md`.
- Backend only. Do not touch any file under `frontend/` in this plan.
- New route: `DELETE /api/v1/vendor/document/{id}`, constrained with `->whereNumber('id')` so a non-numeric id 404s at the routing layer.
- `id` not owned by the requesting vendor's profile (or doesn't exist at all) → `DeleteVendorDocumentUseCase::execute()` throws `Illuminate\Database\Eloquent\ModelNotFoundException`; nothing is deleted (neither the DB row nor the file). Do not change `VendorController`'s existing `catch (Throwable $th)` → 500 Thai-message pattern — every action in this controller already follows it, this one does too.
- Documents stay keyed by `(vendor_profile_id, document_type)` for upload/reupload — this plan does not change that. It only adds the ability to delete an existing row by `id`.
- No duplicate "resubmit profile if not pending" logic: extract it out of `UpdateVendorDocumentUseCase` into `App\Modules\Vendor\Application\Services\ResubmitVendorProfileOnChange` and have both use cases call the same class. `UpdateVendorDocumentUseCase`'s existing behavior and existing tests (`tests/Feature/Modules/Vendor/UpdateVendorDocumentUseCaseTest.php`) must be unaffected — this is a pure refactor for that file.
- Backend: after editing any `.php` file, run `vendor/bin/pint --dirty --format agent` before committing.
- Tests: `php artisan test --compact <path>` or `--filter=<name>`, run from `backend/`.
- File paths below are relative to the repo root (`d:\E-Procurement-System\`); all commands run with cwd `backend/`.

---

### Task 1: Expose `id` in the vendor document API response

**Files:**
- Modify: `backend/app/Modules/Vendor/Presentation/Http/Resources/VendorDocumentResource.php`
- Test: `backend/tests/Feature/Modules/Vendor/UpdateVendorDocumentTest.php`

**Interfaces:**
- Produces (used by Task 3's tests, and eventually a frontend not built in this plan): `data.document[].id` in the JSON response wherever `VendorDocumentResource`/`VendorProfileResource` is used.

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/Feature/Modules/Vendor/UpdateVendorDocumentTest.php` (the file already imports `User`, `VendorProfile`, `VendorRepository`, `RefreshDatabase`, `UploadedFile`, `Storage` — no new imports needed):

```php
test('vendor document response includes the document id', function () {
    Storage::fake('local');
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $this->actingAs($user, 'web');

    $response = $this->post('/api/v1/vendor/document', [
        'documentType' => 'company_registration',
        'file' => UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf'),
    ]);

    $response->assertOk();

    $document = $repository->findDocumentByVendorProfileIdAndType($profile->id(), 'company_registration');

    $response->assertJsonPath('data.document.0.id', $document->id());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `backend/`): `php artisan test --compact --filter="vendor document response includes the document id"`
Expected: FAIL — `data.document.0.id` does not exist in the response yet.

- [ ] **Step 3: Add `id` to the resource**

Replace the `toArray()` method body in `backend/app/Modules/Vendor/Presentation/Http/Resources/VendorDocumentResource.php`:

```php
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'documentType' => $this->document_type,
            'fileName' => $this->file_name,
            'filePath' => $this->file_path,
            'status' => $this->status,
            'verifiedBy' => $this->verified_by,
            'verifiedAt' => $this->verified_at,
            'remark' => $this->remark,
        ];
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `backend/`): `php artisan test --compact --filter="vendor document response includes the document id"`
Expected: PASS

- [ ] **Step 5: Run the full document feature test file to check for regressions**

Run (from `backend/`): `php artisan test --compact tests/Feature/Modules/Vendor/UpdateVendorDocumentTest.php`
Expected: PASS (all tests)

- [ ] **Step 6: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Presentation/Http/Resources/VendorDocumentResource.php tests/Feature/Modules/Vendor/UpdateVendorDocumentTest.php
git commit -m "feat(vendor): include document id in vendor document resource"
```

---

### Task 2: Extract the resubmit-on-change logic into a shared service

**Files:**
- Create: `backend/app/Modules/Vendor/Application/Services/ResubmitVendorProfileOnChange.php`
- Modify: `backend/app/Modules/Vendor/Application/UseCases/UpdateVendorDocumentUseCase.php`

**Interfaces:**
- Produces (used by Task 3): `ResubmitVendorProfileOnChange` — invokable class, `__invoke(int $vendorProfileId): void`.

This is a pure refactor — no behavior change. `UpdateVendorDocumentUseCase`'s existing tests are the safety net; there is no new test to write.

- [ ] **Step 1: Confirm the current baseline is green**

Run (from `backend/`): `php artisan test --compact tests/Feature/Modules/Vendor/UpdateVendorDocumentUseCaseTest.php`
Expected: PASS (4/4) — this is the behavior this refactor must not change.

- [ ] **Step 2: Create the shared service**

```php
<?php

namespace App\Modules\Vendor\Application\Services;

use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;

final class ResubmitVendorProfileOnChange
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
    ) {}

    public function __invoke(int $vendorProfileId): void
    {
        $profile = $this->vendors->findProfileById($vendorProfileId);

        if ($profile === null || $profile->isPending()) {
            return;
        }

        $profile->resubmit();
        $this->vendors->saveProfile($profile);

        app_log('Vendor profile resubmitted for review after document change', [
            'vendor_profile_id' => $vendorProfileId,
        ], 'info', 'vendor');
    }
}
```

- [ ] **Step 3: Use it from `UpdateVendorDocumentUseCase`**

Replace the full contents of `backend/app/Modules/Vendor/Application/UseCases/UpdateVendorDocumentUseCase.php`:

```php
<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Vendor\Application\DTOs\UpdateVendorDocumentData;
use App\Modules\Vendor\Application\Services\ResubmitVendorProfileOnChange;
use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

final class UpdateVendorDocumentUseCase
{
    private const DISK = 'local';

    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly ResubmitVendorProfileOnChange $resubmitter,
    ) {}

    public function execute(int $vendorProfileId, UpdateVendorDocumentData $data): void
    {
        DB::transaction(function () use ($vendorProfileId, $data): void {
            $filePath = $data->file->store("vendor-documents/{$vendorProfileId}", self::DISK);
            $fileName = $data->file->getClientOriginalName();

            $existing = $this->vendors->findDocumentByVendorProfileIdAndType($vendorProfileId, $data->documentType);

            if ($existing !== null) {
                $previousFilePath = $existing->filePath();

                $existing->reupload($fileName, $filePath);
                $this->vendors->saveDocument($existing);

                Storage::disk(self::DISK)->delete($previousFilePath);

                app_log('Vendor document reuploaded', [
                    'vendor_profile_id' => $vendorProfileId,
                    'document_type' => $data->documentType,
                ], 'info', 'vendor');
            } else {
                $this->vendors->saveDocument(VendorDocument::create(
                    vendorProfileId: $vendorProfileId,
                    documentType: $data->documentType,
                    fileName: $fileName,
                    filePath: $filePath,
                ));

                app_log('Vendor document uploaded', [
                    'vendor_profile_id' => $vendorProfileId,
                    'document_type' => $data->documentType,
                ], 'info', 'vendor');
            }

            ($this->resubmitter)($vendorProfileId);
        });
    }
}
```

Note what got removed: the private `resubmitProfileIfNeeded()` method is gone entirely, replaced by the injected `$this->resubmitter` called as `($this->resubmitter)($vendorProfileId)`.

- [ ] **Step 4: Run the same test file again to confirm behavior is unchanged**

Run (from `backend/`): `php artisan test --compact tests/Feature/Modules/Vendor/UpdateVendorDocumentUseCaseTest.php`
Expected: PASS (4/4) — identical result to Step 1.

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Application/Services/ResubmitVendorProfileOnChange.php app/Modules/Vendor/Application/UseCases/UpdateVendorDocumentUseCase.php
git commit -m "refactor(vendor): extract resubmit-on-document-change into a shared service"
```

---

### Task 3: Add the delete use case

**Files:**
- Modify: `backend/app/Modules/Vendor/Domain/Repositories/VendorRepositoryInterface.php`
- Modify: `backend/app/Modules/Vendor/Infrastructure/Repositories/VendorRepository.php`
- Create: `backend/app/Modules/Vendor/Application/UseCases/DeleteVendorDocumentUseCase.php`
- Test: Create `backend/tests/Feature/Modules/Vendor/DeleteVendorDocumentUseCaseTest.php`

**Interfaces:**
- Consumes: `ResubmitVendorProfileOnChange` from Task 2 (`__invoke(int $vendorProfileId): void`).
- Produces (used by Task 4): `DeleteVendorDocumentUseCase::execute(int $vendorProfileId, int $documentId): void`.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/Feature/Modules/Vendor/DeleteVendorDocumentUseCaseTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\UseCases\DeleteVendorDocumentUseCase;
use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function deleteVendorDocumentUseCase(): DeleteVendorDocumentUseCase
{
    return app(DeleteVendorDocumentUseCase::class);
}

test('execute deletes the document and its file', function () {
    Storage::fake('local');
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $filePath = UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf')
        ->store("vendor-documents/{$profile->id()}", 'local');

    $document = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'company_registration',
        fileName: 'registration.pdf',
        filePath: $filePath,
    ));

    deleteVendorDocumentUseCase()->execute($profile->id(), $document->id());

    $this->assertDatabaseMissing('vendor_documents', ['id' => $document->id()]);
    Storage::disk('local')->assertMissing($filePath);
});

test('execute throws when the document does not belong to the vendor profile', function () {
    Storage::fake('local');
    $ownerUser = User::factory()->create(['user_type' => 'company']);
    $otherUser = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $ownerProfile = $repository->saveProfile(VendorProfile::create(userId: $ownerUser->id));
    $otherProfile = $repository->saveProfile(VendorProfile::create(userId: $otherUser->id));

    $otherFilePath = UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf')
        ->store("vendor-documents/{$otherProfile->id()}", 'local');

    $otherDocument = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $otherProfile->id(),
        documentType: 'company_registration',
        fileName: 'registration.pdf',
        filePath: $otherFilePath,
    ));

    expect(fn () => deleteVendorDocumentUseCase()->execute($ownerProfile->id(), $otherDocument->id()))
        ->toThrow(ModelNotFoundException::class);

    $this->assertDatabaseHas('vendor_documents', ['id' => $otherDocument->id()]);
    Storage::disk('local')->assertExists($otherFilePath);
});

test('execute throws when the document id does not exist', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    expect(fn () => deleteVendorDocumentUseCase()->execute($profile->id(), 999999))
        ->toThrow(ModelNotFoundException::class);
});

test('execute resubmits an approved vendor profile back to pending after a document is deleted', function () {
    Storage::fake('local');
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));
    $profile->approve(verifiedBy: $user->id);
    $repository->saveProfile($profile);

    $filePath = UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf')
        ->store("vendor-documents/{$profile->id()}", 'local');

    $document = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'company_registration',
        fileName: 'registration.pdf',
        filePath: $filePath,
    ));

    deleteVendorDocumentUseCase()->execute($profile->id(), $document->id());

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id(),
        'verification_status' => 'pending',
    ]);
});

test('execute does not error when the vendor profile is already pending', function () {
    Storage::fake('local');
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $filePath = UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf')
        ->store("vendor-documents/{$profile->id()}", 'local');

    $document = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'company_registration',
        fileName: 'registration.pdf',
        filePath: $filePath,
    ));

    deleteVendorDocumentUseCase()->execute($profile->id(), $document->id());

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id(),
        'verification_status' => 'pending',
    ]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `backend/`): `php artisan test --compact tests/Feature/Modules/Vendor/DeleteVendorDocumentUseCaseTest.php`
Expected: FAIL — fatal error, `Class "App\Modules\Vendor\Application\UseCases\DeleteVendorDocumentUseCase" not found` (neither the use case nor the repository method exist yet).

- [ ] **Step 3: Add the repository method**

Replace the full contents of `backend/app/Modules/Vendor/Domain/Repositories/VendorRepositoryInterface.php`:

```php
<?php

namespace App\Modules\Vendor\Domain\Repositories;

use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorContact;
use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;

interface VendorRepositoryInterface
{
    public function saveProfile(VendorProfile $profile): VendorProfile;

    public function findProfileById(int $id): ?VendorProfile;

    public function saveCompanyDetail(VendorCompanyDetail $detail): VendorCompanyDetail;

    public function findCompanyDetailByVendorProfileId(int $vendorProfileId): ?VendorCompanyDetail;

    public function saveIndividualDetail(VendorIndividualDetail $detail): VendorIndividualDetail;

    public function findIndividualDetailByVendorProfileId(int $vendorProfileId): ?VendorIndividualDetail;

    public function saveContact(VendorContact $contact): VendorContact;

    /**
     * @return array<int, VendorContact>
     */
    public function findContactsByVendorProfileId(int $vendorProfileId): array;

    public function saveDocument(VendorDocument $document): VendorDocument;

    /**
     * @return array<int, VendorDocument>
     */
    public function findDocumentsByVendorProfileId(int $vendorProfileId): array;

    public function findDocumentByVendorProfileIdAndType(int $vendorProfileId, string $documentType): ?VendorDocument;

    public function deleteDocument(VendorDocument $document): void;
}
```

In `backend/app/Modules/Vendor/Infrastructure/Repositories/VendorRepository.php`, insert this new method immediately after `findDocumentByVendorProfileIdAndType()` and before the `private function mapProfileToEntity(...)` line:

```php
    public function deleteDocument(VendorDocument $document): void
    {
        VendorDocuments::findOrFail($document->id())->delete();
    }
```

- [ ] **Step 4: Create the use case**

Create `backend/app/Modules/Vendor/Application/UseCases/DeleteVendorDocumentUseCase.php`:

```php
<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Vendor\Application\Services\ResubmitVendorProfileOnChange;
use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

final class DeleteVendorDocumentUseCase
{
    private const DISK = 'local';

    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly ResubmitVendorProfileOnChange $resubmitter,
    ) {}

    public function execute(int $vendorProfileId, int $documentId): void
    {
        DB::transaction(function () use ($vendorProfileId, $documentId): void {
            $document = $this->findOwnedDocument($vendorProfileId, $documentId);

            if ($document === null) {
                throw new ModelNotFoundException(
                    "Vendor document {$documentId} not found for vendor profile {$vendorProfileId}."
                );
            }

            $filePath = $document->filePath();

            $this->vendors->deleteDocument($document);

            Storage::disk(self::DISK)->delete($filePath);

            app_log('Vendor document deleted', [
                'vendor_profile_id' => $vendorProfileId,
                'document_type' => $document->documentType(),
            ], 'info', 'vendor');

            ($this->resubmitter)($vendorProfileId);
        });
    }

    private function findOwnedDocument(int $vendorProfileId, int $documentId): ?VendorDocument
    {
        foreach ($this->vendors->findDocumentsByVendorProfileId($vendorProfileId) as $document) {
            if ($document->id() === $documentId) {
                return $document;
            }
        }

        return null;
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run (from `backend/`): `php artisan test --compact tests/Feature/Modules/Vendor/DeleteVendorDocumentUseCaseTest.php`
Expected: PASS (5/5)

- [ ] **Step 6: Run the full vendor test suite to check for regressions**

Run (from `backend/`): `php artisan test --compact --filter=Vendor`
Expected: PASS (all vendor feature/unit tests, including `UpdateVendorDocumentUseCaseTest.php` from Task 2)

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Domain/Repositories/VendorRepositoryInterface.php app/Modules/Vendor/Infrastructure/Repositories/VendorRepository.php app/Modules/Vendor/Application/UseCases/DeleteVendorDocumentUseCase.php tests/Feature/Modules/Vendor/DeleteVendorDocumentUseCaseTest.php
git commit -m "feat(vendor): add use case to delete an owned vendor document"
```

---

### Task 4: Wire the delete route and controller action

**Files:**
- Modify: `backend/routes/api/v1/vendor.php`
- Modify: `backend/app/Modules/Vendor/Presentation/Http/Controllers/VendorController.php`
- Test: Create `backend/tests/Feature/Modules/Vendor/DeleteVendorDocumentTest.php`

**Interfaces:**
- Consumes: `DeleteVendorDocumentUseCase::execute(int $vendorProfileId, int $documentId): void` from Task 3.
- Produces: `DELETE /api/v1/vendor/document/{id}` — 200 with the updated `VendorProfileResource` on success, 401 if unauthenticated, 404 if `{id}` is non-numeric, 500 with a Thai message on any other failure (not-owned/not-found id included, matching every other action in this controller).

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/Feature/Modules/Vendor/DeleteVendorDocumentTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('a vendor can delete their document', function () {
    Storage::fake('local');
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $filePath = UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf')
        ->store("vendor-documents/{$profile->id()}", 'local');

    $document = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'company_registration',
        fileName: 'registration.pdf',
        filePath: $filePath,
    ));

    $this->actingAs($user, 'web');

    $response = $this->deleteJson("/api/v1/vendor/document/{$document->id()}");

    $response->assertOk();

    $this->assertDatabaseMissing('vendor_documents', ['id' => $document->id()]);
});

test('deleting a vendor document requires authentication', function () {
    $response = $this->deleteJson('/api/v1/vendor/document/1');

    $response->assertStatus(401);
});

test('deleting a non-numeric document id returns a 404', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $this->actingAs($user, 'web');

    $response = $this->deleteJson('/api/v1/vendor/document/not-a-number');

    $response->assertStatus(404);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `backend/`): `php artisan test --compact tests/Feature/Modules/Vendor/DeleteVendorDocumentTest.php`
Expected: FAIL on the first two tests — `'a vendor can delete their document'` gets a 404 (no route registered yet, so it never reaches auth or the use case) instead of 200; `'deleting a vendor document requires authentication'` gets a 404 instead of 401 for the same reason. `'deleting a non-numeric document id returns a 404'` will already pass (a nonexistent route also 404s) — that's a coincidence of the current empty state, not a false pass to worry about; it'll still be 404 for the right reason (`whereNumber`) once the route exists.

- [ ] **Step 3: Add the route**

Replace the full contents of `backend/routes/api/v1/vendor.php`:

```php
<?php

use App\Modules\Vendor\Presentation\Http\Controllers\VendorController;
use Illuminate\Support\Facades\Route;

Route::prefix('vendor')->group(function () {
    Route::get('profile', [VendorController::class, 'profile'])->name('vendor.profile');

    Route::post('info', [VendorController::class, 'updateVendorInfo'])->name('vendor.info.update');

    Route::post('contact', [VendorController::class, 'updateVendorContact'])->name('vendor.contact.update');

    Route::post('document', [VendorController::class, 'updateVendorDocument'])->name('vendor.document.update');

    Route::delete('document/{id}', [VendorController::class, 'deleteVendorDocument'])
        ->whereNumber('id')
        ->name('vendor.document.delete');
});
```

- [ ] **Step 4: Add the controller action**

Replace the full contents of `backend/app/Modules/Vendor/Presentation/Http/Controllers/VendorController.php`:

```php
<?php

namespace App\Modules\Vendor\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Vendor\Application\DTOs\UpdateVendorContactData;
use App\Modules\Vendor\Application\DTOs\UpdateVendorDocumentData;
use App\Modules\Vendor\Application\DTOs\UpdateVendorInfoData;
use App\Modules\Vendor\Application\Queries\GetVendorProfileQuery;
use App\Modules\Vendor\Application\UseCases\DeleteVendorDocumentUseCase;
use App\Modules\Vendor\Application\UseCases\UpdateVendorContactUseCase;
use App\Modules\Vendor\Application\UseCases\UpdateVendorDocumentUseCase;
use App\Modules\Vendor\Application\UseCases\UpdateVendorInfoUseCase;
use App\Modules\Vendor\Presentation\Http\Requests\UpdateVendorContactRequest;
use App\Modules\Vendor\Presentation\Http\Requests\UpdateVendorDocumentRequest;
use App\Modules\Vendor\Presentation\Http\Requests\UpdateVendorInfoRequest;
use App\Modules\Vendor\Presentation\Http\Resources\VendorProfileResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class VendorController extends Controller
{
    public function __construct(
        private readonly GetVendorProfileQuery $getVendorProfile,
        private readonly UpdateVendorInfoUseCase $updateVendorInfo,
        private readonly UpdateVendorContactUseCase $updateVendorContact,
        private readonly UpdateVendorDocumentUseCase $updateVendorDocument,
        private readonly DeleteVendorDocumentUseCase $deleteVendorDocument,
    ) {}

    public function profile(Request $request): JsonResponse
    {
        $vendorProfile = $this->getVendorProfile->execute($request->user()->id);

        return response()->json([
            'data' => new VendorProfileResource($vendorProfile),
        ]);
    }

    public function updateVendorInfo(UpdateVendorInfoRequest $request): JsonResponse
    {
        $vendorProfile = $this->getVendorProfile->execute($request->user()->id);

        try {
            $this->updateVendorInfo->execute(
                $vendorProfile->id,
                UpdateVendorInfoData::from($request->validated())
            );
        } catch (Throwable $th) {
            app_log('Vendor info update failed.', ['error' => $th], 'error', 'vendor');

            return response()->json(['message' => 'บันทึกข้อมูลกิจการไม่สำเร็จ'], 500);
        }

        return response()->json([
            'message' => 'บันทึกข้อมูลกิจการสำเร็จ',
            'data' => new VendorProfileResource($this->getVendorProfile->execute($request->user()->id)),
        ]);
    }

    public function updateVendorContact(UpdateVendorContactRequest $request): JsonResponse
    {
        $vendorProfile = $this->getVendorProfile->execute($request->user()->id);

        try {
            $this->updateVendorContact->execute(
                $vendorProfile->id,
                UpdateVendorContactData::from($request->validated())
            );
        } catch (Throwable $th) {
            app_log('Vendor contact update failed.', ['error' => $th], 'error', 'vendor');

            return response()->json(['message' => 'บันทึกข้อมูลผู้ติดต่อไม่สำเร็จ'], 500);
        }

        return response()->json([
            'message' => 'บันทึกข้อมูลผู้ติดต่อสำเร็จ',
            'data' => new VendorProfileResource($this->getVendorProfile->execute($request->user()->id)),
        ]);
    }

    public function updateVendorDocument(UpdateVendorDocumentRequest $request): JsonResponse
    {
        $vendorProfile = $this->getVendorProfile->execute($request->user()->id);

        try {
            $this->updateVendorDocument->execute(
                $vendorProfile->id,
                UpdateVendorDocumentData::from($request->validated())
            );
        } catch (Throwable $th) {
            app_log('Vendor document upload failed.', ['error' => $th], 'error', 'vendor');

            return response()->json(['message' => 'อัปโหลดเอกสารไม่สำเร็จ'], 500);
        }

        return response()->json([
            'message' => 'อัปโหลดเอกสารสำเร็จ',
            'data' => new VendorProfileResource($this->getVendorProfile->execute($request->user()->id)),
        ]);
    }

    public function deleteVendorDocument(int $id, Request $request): JsonResponse
    {
        $vendorProfile = $this->getVendorProfile->execute($request->user()->id);

        try {
            $this->deleteVendorDocument->execute($vendorProfile->id, $id);
        } catch (Throwable $th) {
            app_log('Vendor document delete failed.', ['error' => $th], 'error', 'vendor');

            return response()->json(['message' => 'ลบเอกสารไม่สำเร็จ'], 500);
        }

        return response()->json([
            'message' => 'ลบเอกสารสำเร็จ',
            'data' => new VendorProfileResource($this->getVendorProfile->execute($request->user()->id)),
        ]);
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run (from `backend/`): `php artisan test --compact tests/Feature/Modules/Vendor/DeleteVendorDocumentTest.php`
Expected: PASS (3/3)

- [ ] **Step 6: Run the full vendor test suite to check for regressions**

Run (from `backend/`): `php artisan test --compact --filter=Vendor`
Expected: PASS (all vendor feature/unit tests)

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add routes/api/v1/vendor.php app/Modules/Vendor/Presentation/Http/Controllers/VendorController.php tests/Feature/Modules/Vendor/DeleteVendorDocumentTest.php
git commit -m "feat(vendor): wire up the delete-document route and controller action"
```
