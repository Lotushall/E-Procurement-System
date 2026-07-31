# List Vendors Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /api/v1/vendors` — an internal-user-only endpoint that lists vendors (optionally filtered by `status`), matching the frontend contract already coded in `frontend/lib/vendor-approval/api.ts`.

**Architecture:** New route file `routes/api/v1/vendors.php` (plural, separate from the existing self-service `vendor.php`) wires a new `VendorApprovalController@index` through a `FormRequest` (auth + validation), an Application `Query` class that talks to the `VendorProfiles` Eloquent model directly (mirrors `GetVendorProfileQuery`), and a `JsonResource` that shapes the response to match the frontend's `VendorSummary` type exactly.

**Tech Stack:** Laravel 13, PHP 8.4, Pest 4 (feature tests), Spatie ModelStates (`verification_status`).

## Global Constraints

- Response body must be exactly `{ data: { id, displayName, vendorType, verificationStatus, submittedAt }[] }` — this is a fixed contract another (already-written) frontend session depends on. Do not rename fields.
- Only `user_type === UserType::Internal` (`App\Modules\User\Domain\Enums\UserType`) may call this endpoint; every other authenticated user gets 403.
- Unauthenticated requests get 401 (existing `auth` middleware group in `routes/api.php`).
- `status` query param, when present, must be one of `pending`/`approved`/`rejected`; anything else is a 422. Omitting it returns vendors in every status.
- Follow the existing DDD module layout under `app/Modules/Vendor/` — `Application/Queries` for read queries, `Presentation/Http/{Controllers,Requests,Resources}` for the HTTP layer. Do not modify the existing `VendorController` (self-service, scoped to the calling user) — this is a separate controller.
- After any PHP file change, run `vendor/bin/pint --dirty --format agent` before considering the task done.
- No dedicated model factories exist for `VendorProfiles`/`VendorCompanyDetails`/`VendorIndividualDetails` — tests build them via `new VendorRepository` + domain entity `::create(...)` calls, exactly like `tests/Feature/Modules/Vendor/VendorProfileTest.php` and `ViewVendorDocumentTest.php` already do. Do not add new factories.

---

### Task 1: `GET /api/v1/vendors` list endpoint

**Files:**
- Create: `app/Modules/Vendor/Presentation/Http/Requests/ListVendorsRequest.php`
- Create: `app/Modules/Vendor/Application/Queries/ListVendorProfilesQuery.php`
- Create: `app/Modules/Vendor/Presentation/Http/Resources/VendorSummaryResource.php`
- Create: `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`
- Create: `routes/api/v1/vendors.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Modules/Vendor/ListVendorsTest.php`

**Interfaces:**
- Consumes: `App\Modules\Vendor\Infrastructure\Models\VendorProfiles` (existing Eloquent model, relations `VendorProfilesCompanyDetail`/`VendorProfilesIndividualDetail`, column `verification_status` cast to `App\Modules\Vendor\Domain\States\VerificationStatus`, `created_at` timestamp); `App\Modules\User\Domain\Enums\UserType::Internal`; `App\Modules\Vendor\Infrastructure\Repositories\VendorRepository` + `App\Modules\Vendor\Domain\Entities\{VendorProfile,VendorCompanyDetail,VendorIndividualDetail}` + `App\Modules\Vendor\Domain\ValueObjects\{TaxId,CitizenId}` (for test setup only).
- Produces: `ListVendorProfilesQuery::execute(?string $status): \Illuminate\Database\Eloquent\Collection` (used only by `VendorApprovalController`); route named `vendors.index` at `GET /api/v1/vendors`.

- [ ] **Step 1: Write the failing feature test**

Create `tests/Feature/Modules/Vendor/ListVendorsTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('listing vendors requires authentication', function () {
    $response = $this->getJson('/api/v1/vendors');

    $response->assertStatus(401);
});

test('a vendor user cannot list vendors', function () {
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $this->actingAs($vendorUser, 'web');

    $response = $this->getJson('/api/v1/vendors');

    $response->assertStatus(403);
});

test('an internal user can list all vendors regardless of status', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $repository = new VendorRepository;

    $companyUser = User::factory()->create(['user_type' => 'company']);
    $companyProfile = $repository->saveProfile(VendorProfile::create(userId: $companyUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $companyProfile->id(),
        companyName: 'Acme Co., Ltd.',
        businessRegistrationNo: '0123456789012',
        taxId: TaxId::fromString('1234567890123'),
        branchNo: '00000',
        businessType: 'Trading',
        address: '123 Main St.',
        province: 'Bangkok',
        postalCode: null,
    ));

    $individualUser = User::factory()->create(['user_type' => 'individual']);
    $individualProfile = $repository->saveProfile(VendorProfile::create(userId: $individualUser->id));
    $repository->saveIndividualDetail(VendorIndividualDetail::create(
        vendorProfileId: $individualProfile->id(),
        storeName: "John's Store",
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        citizenId: CitizenId::fromString('1234567890124'),
        businessType: 'Retail',
        taxId: null,
        address: '456 Side St.',
        province: 'Bangkok',
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors');

    $response->assertOk()->assertJsonCount(2, 'data');

    $companyEntry = collect($response->json('data'))->firstWhere('id', $companyProfile->id());
    expect($companyEntry)->toMatchArray([
        'displayName' => 'Acme Co., Ltd.',
        'vendorType' => 'company',
        'verificationStatus' => 'pending',
    ]);

    $individualEntry = collect($response->json('data'))->firstWhere('id', $individualProfile->id());
    expect($individualEntry)->toMatchArray([
        'displayName' => "John's Store",
        'vendorType' => 'individual',
        'verificationStatus' => 'pending',
    ]);
});

test('an internal user can filter vendors by status', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $repository = new VendorRepository;

    $pendingUser = User::factory()->create(['user_type' => 'company']);
    $pendingProfile = $repository->saveProfile(VendorProfile::create(userId: $pendingUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $pendingProfile->id(),
        companyName: 'Pending Co.',
        businessRegistrationNo: '1111111111111',
        taxId: TaxId::fromString('1111111111111'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $approvedUser = User::factory()->create(['user_type' => 'company']);
    $approvedProfile = VendorProfile::create(userId: $approvedUser->id);
    $approvedProfile->approve(verifiedBy: $internalUser->id);
    $approvedProfile = $repository->saveProfile($approvedProfile);
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $approvedProfile->id(),
        companyName: 'Approved Co.',
        businessRegistrationNo: '2222222222222',
        taxId: TaxId::fromString('2222222222222'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?status=approved');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $approvedProfile->id())
        ->assertJsonPath('data.0.verificationStatus', 'approved');
});

test('an invalid status value is rejected', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?status=bogus');

    $response->assertStatus(422);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact --filter=ListVendorsTest`
Expected: FAIL on every test — the route `/api/v1/vendors` does not exist yet, so every request 404s
instead of returning the expected status code.

- [ ] **Step 3: Create the `ListVendorsRequest`**

Create `app/Modules/Vendor/Presentation/Http/Requests/ListVendorsRequest.php`:

```php
<?php

namespace App\Modules\Vendor\Presentation\Http\Requests;

use App\Modules\User\Domain\Enums\UserType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListVendorsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->user_type === UserType::Internal;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string', Rule::in(['pending', 'approved', 'rejected'])],
        ];
    }
}
```

- [ ] **Step 4: Create the `ListVendorProfilesQuery`**

Create `app/Modules/Vendor/Application/Queries/ListVendorProfilesQuery.php`:

```php
<?php

namespace App\Modules\Vendor\Application\Queries;

use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Collection;

final class ListVendorProfilesQuery
{
    public function execute(?string $status): Collection
    {
        return VendorProfiles::query()
            ->with(['VendorProfilesCompanyDetail', 'VendorProfilesIndividualDetail'])
            ->when($status !== null, fn ($query) => $query->where('verification_status', $status))
            ->latest()
            ->get();
    }
}
```

- [ ] **Step 5: Create the `VendorSummaryResource`**

Create `app/Modules/Vendor/Presentation/Http/Resources/VendorSummaryResource.php`:

```php
<?php

namespace App\Modules\Vendor\Presentation\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VendorSummaryResource extends JsonResource
{
    public static $wrap = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $isCompany = $this->VendorProfilesCompanyDetail !== null;

        return [
            'id' => $this->id,
            'displayName' => $isCompany
                ? $this->VendorProfilesCompanyDetail->company_name
                : $this->VendorProfilesIndividualDetail->store_name,
            'vendorType' => $isCompany ? 'company' : 'individual',
            'verificationStatus' => $this->verification_status->getValue(),
            'submittedAt' => $this->created_at->toIso8601String(),
        ];
    }
}
```

- [ ] **Step 6: Create the `VendorApprovalController`**

Create `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`:

```php
<?php

namespace App\Modules\Vendor\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Vendor\Application\Queries\ListVendorProfilesQuery;
use App\Modules\Vendor\Presentation\Http\Requests\ListVendorsRequest;
use App\Modules\Vendor\Presentation\Http\Resources\VendorSummaryResource;
use Illuminate\Http\JsonResponse;

class VendorApprovalController extends Controller
{
    public function __construct(
        private readonly ListVendorProfilesQuery $listVendorProfiles,
    ) {}

    public function index(ListVendorsRequest $request): JsonResponse
    {
        $vendors = $this->listVendorProfiles->execute($request->validated('status'));

        return response()->json([
            'data' => VendorSummaryResource::collection($vendors),
        ]);
    }
}
```

- [ ] **Step 7: Create the route file**

Create `routes/api/v1/vendors.php`:

```php
<?php

use App\Modules\Vendor\Presentation\Http\Controllers\VendorApprovalController;
use Illuminate\Support\Facades\Route;

Route::get('vendors', [VendorApprovalController::class, 'index'])->name('vendors.index');
```

- [ ] **Step 8: Register the route file**

Modify `routes/api.php` — current content is:

```php
<?php

use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    Route::middleware('auth')->group(function () {
        require __DIR__.'/api/v1/vendor.php';
    });

    require __DIR__.'/api/v1/auth.php';
});
```

Change the `Route::middleware('auth')` group to also require the new file:

```php
<?php

use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    Route::middleware('auth')->group(function () {
        require __DIR__.'/api/v1/vendor.php';
        require __DIR__.'/api/v1/vendors.php';
    });

    require __DIR__.'/api/v1/auth.php';
});
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `php artisan test --compact --filter=ListVendorsTest`
Expected: PASS — all 5 tests green.

- [ ] **Step 10: Format with Pint**

Run: `vendor/bin/pint --dirty --format agent`
Expected: reports the new/modified files as formatted (or already clean); fix anything it flags and
re-run the test suite if it changed logic-bearing whitespace (it shouldn't).

- [ ] **Step 11: Run the full test suite to check for regressions**

Run: `php artisan test --compact`
Expected: PASS — no existing test broken by the `routes/api.php` change.

- [ ] **Step 12: Commit**

```bash
git add app/Modules/Vendor/Presentation/Http/Requests/ListVendorsRequest.php \
        app/Modules/Vendor/Application/Queries/ListVendorProfilesQuery.php \
        app/Modules/Vendor/Presentation/Http/Resources/VendorSummaryResource.php \
        app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php \
        routes/api/v1/vendors.php \
        routes/api.php \
        tests/Feature/Modules/Vendor/ListVendorsTest.php
git commit -m "feat(vendor): add GET /api/v1/vendors list endpoint for internal users"
```
