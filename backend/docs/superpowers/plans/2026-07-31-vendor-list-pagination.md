# Vendor List Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional, backward-compatible pagination to `GET /api/v1/vendors` — omitting `page`/`per_page` keeps today's exact response shape; passing either switches to Laravel's standard paginated response.

**Architecture:** `ListVendorsRequest` gains `page`/`per_page` validation rules. `ListVendorProfilesQuery::execute()` returns either a plain `Collection` (unchanged path, no pagination params given) or a `LengthAwarePaginator` (either param given). `VendorApprovalController::index()` branches on the return type to pick the response shape.

**Tech Stack:** Laravel 13, PHP 8.4, Pest 4 (feature tests).

## Global Constraints

- When neither `page` nor `per_page` is present in the request, the response must be byte-for-byte the same shape as today: `{ data: VendorSummary[] }`, no `links`/`meta` keys. This is proven by running the 6 existing tests in `tests/Feature/Modules/Vendor/ListVendorsTest.php` **unmodified** — do not edit any of the 6 existing `test(...)` blocks in that file.
- When either `page` or `per_page` is present, the response switches to Laravel's standard paginated resource-collection shape: `{ data: [...], links: {...}, meta: {...} }`.
- `page` must be an integer ≥ 1; `per_page` must be an integer between 1 and 100 inclusive. Invalid values return 422 (same pattern as the existing `status` validation in the same `FormRequest`).
- Default per-page when only one of the two params is given: 15 (Laravel's own `paginate()` default). Default page when only `per_page` is given: 1.
- No frontend changes in this plan — `frontend/lib/vendor/approval/api.ts` and everything downstream of it is untouched; the current frontend never sends `page`/`per_page`, so it is unaffected either way.
- Do not touch `VendorSummaryResource` — its `$wrap = false` only affects the non-paginated branch (already controller-wrapped in `response()->json(['data' => ...])`); the paginated branch's `links`/`meta` come from Laravel's `AnonymousResourceCollection` automatically wrapping a `LengthAwarePaginator`, unrelated to `$wrap`.
- After any PHP file change, run `vendor/bin/pint --dirty --format agent` before considering the task done.

---

### Task 1: Backward-compatible pagination on `GET /api/v1/vendors`

**Files:**
- Modify: `app/Modules/Vendor/Presentation/Http/Requests/ListVendorsRequest.php`
- Modify: `app/Modules/Vendor/Application/Queries/ListVendorProfilesQuery.php`
- Modify: `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`
- Test: `tests/Feature/Modules/Vendor/ListVendorsTest.php` (add new tests; do not touch the 6 existing ones)

**Interfaces:**
- Consumes: `Illuminate\Pagination\LengthAwarePaginator` (Laravel built-in, via `Illuminate\Database\Eloquent\Builder::paginate(?int $perPage = null, array $columns = ['*'], string $pageName = 'page', ?int $page = null)`); `Illuminate\Http\Resources\Json\JsonResource::response(): Illuminate\Http\JsonResponse` (built-in, called on the `AnonymousResourceCollection` returned by `VendorSummaryResource::collection()`).
- Produces: `ListVendorProfilesQuery::execute(?string $status, ?int $page = null, ?int $perPage = null): Collection|LengthAwarePaginator` (only consumer is `VendorApprovalController::index()`, same file being modified in this task).

- [ ] **Step 1: Write the failing tests**

Append these 4 tests to the end of `tests/Feature/Modules/Vendor/ListVendorsTest.php` (after the existing `'an invalid status value is rejected'` test, keeping every existing test untouched):

```php
test('listing vendors supports pagination via page and per_page', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $repository = new VendorRepository;

    foreach ([1, 2, 3] as $i) {
        $vendorUser = User::factory()->create(['user_type' => 'company']);
        $profile = $repository->saveProfile(VendorProfile::create(userId: $vendorUser->id));
        $repository->saveCompanyDetail(VendorCompanyDetail::create(
            vendorProfileId: $profile->id(),
            companyName: "Vendor {$i}",
            businessRegistrationNo: str_repeat((string) $i, 13),
            taxId: TaxId::fromString(str_repeat((string) $i, 13)),
            branchNo: null,
            businessType: null,
            address: null,
            province: null,
            postalCode: null,
        ));
    }

    $this->actingAs($internalUser, 'web');

    $firstPage = $this->getJson('/api/v1/vendors?page=1&per_page=2');

    $firstPage->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 3)
        ->assertJsonPath('meta.current_page', 1)
        ->assertJsonPath('meta.per_page', 2);

    expect($firstPage->json('links.next'))->not->toBeNull();
    expect($firstPage->json('links.prev'))->toBeNull();

    $secondPage = $this->getJson('/api/v1/vendors?page=2&per_page=2');

    $secondPage->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('meta.current_page', 2);

    expect($secondPage->json('links.next'))->toBeNull();
    expect($secondPage->json('links.prev'))->not->toBeNull();
});

test('an invalid page value is rejected', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?page=0');

    $response->assertStatus(422);
});

test('an invalid per_page value is rejected', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?per_page=101');

    $response->assertStatus(422);
});

test('pagination respects the status filter', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $repository = new VendorRepository;

    foreach ([1, 2, 3] as $i) {
        $vendorUser = User::factory()->create(['user_type' => 'company']);
        $profile = $repository->saveProfile(VendorProfile::create(userId: $vendorUser->id));
        $repository->saveCompanyDetail(VendorCompanyDetail::create(
            vendorProfileId: $profile->id(),
            companyName: "Pending Vendor {$i}",
            businessRegistrationNo: str_repeat((string) $i, 13),
            taxId: TaxId::fromString(str_repeat((string) $i, 13)),
            branchNo: null,
            businessType: null,
            address: null,
            province: null,
            postalCode: null,
        ));
    }

    $approvedUser = User::factory()->create(['user_type' => 'company']);
    $approvedProfile = VendorProfile::create(userId: $approvedUser->id);
    $approvedProfile->approve(verifiedBy: $internalUser->id);
    $approvedProfile = $repository->saveProfile($approvedProfile);
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $approvedProfile->id(),
        companyName: 'Approved Vendor',
        businessRegistrationNo: '9999999999999',
        taxId: TaxId::fromString('9999999999999'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?status=pending&page=1&per_page=2');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 3);

    collect($response->json('data'))->each(
        fn (array $vendor) => expect($vendor['verificationStatus'])->toBe('pending')
    );
});
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `php artisan test --compact --filter=ListVendorsTest`
Expected: the 6 pre-existing tests still PASS (nothing broken yet); the 4 new tests FAIL — the pagination
ones because `page`/`per_page` aren't wired to anything yet (the endpoint still returns the full
unfiltered/unpaginated array, so `assertJsonCount(2, 'data')` sees 3 and `meta.total` doesn't exist), and
the two invalid-value tests because there's no validation rule yet to reject them (still 200, not 422).

- [ ] **Step 3: Add `page`/`per_page` validation to `ListVendorsRequest`**

Current content of `app/Modules/Vendor/Presentation/Http/Requests/ListVendorsRequest.php`:

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

Change the `rules()` method to:

```php
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string', Rule::in(['pending', 'approved', 'rejected'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
```

- [ ] **Step 4: Add the pagination branch to `ListVendorProfilesQuery`**

Replace the full content of `app/Modules/Vendor/Application/Queries/ListVendorProfilesQuery.php` with:

```php
<?php

namespace App\Modules\Vendor\Application\Queries;

use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListVendorProfilesQuery
{
    private const DEFAULT_PER_PAGE = 15;

    public function execute(?string $status, ?int $page = null, ?int $perPage = null): Collection|LengthAwarePaginator
    {
        $query = VendorProfiles::query()
            ->with(['VendorProfilesCompanyDetail', 'VendorProfilesIndividualDetail'])
            ->when($status !== null, fn ($query) => $query->where('verification_status', $status))
            ->latest();

        if ($page === null && $perPage === null) {
            return $query->get();
        }

        return $query->paginate(
            perPage: $perPage ?? self::DEFAULT_PER_PAGE,
            page: $page ?? 1,
        );
    }
}
```

- [ ] **Step 5: Branch on the return type in `VendorApprovalController`**

Replace the full content of `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php` with:

```php
<?php

namespace App\Modules\Vendor\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Vendor\Application\Queries\ListVendorProfilesQuery;
use App\Modules\Vendor\Presentation\Http\Requests\ListVendorsRequest;
use App\Modules\Vendor\Presentation\Http\Resources\VendorSummaryResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;

class VendorApprovalController extends Controller
{
    public function __construct(
        private readonly ListVendorProfilesQuery $listVendorProfiles,
    ) {}

    public function index(ListVendorsRequest $request): JsonResponse
    {
        $vendors = $this->listVendorProfiles->execute(
            status: $request->validated('status'),
            page: $request->validated('page'),
            perPage: $request->validated('per_page'),
        );

        if ($vendors instanceof LengthAwarePaginator) {
            return VendorSummaryResource::collection($vendors)->response();
        }

        return response()->json([
            'data' => VendorSummaryResource::collection($vendors),
        ]);
    }
}
```

- [ ] **Step 6: Run the tests to verify everything passes**

Run: `php artisan test --compact --filter=ListVendorsTest`
Expected: PASS — all 10 tests green (the 6 original plus the 4 new ones).

- [ ] **Step 7: Format with Pint**

Run: `vendor/bin/pint --dirty --format agent`
Expected: reports the modified files as formatted (or already clean).

- [ ] **Step 8: Run the full test suite to check for regressions**

Run: `php artisan test --compact`
Expected: same baseline as before this plan — 236 tests total (232 + 4 new), 235 passing, 1 pre-existing
unrelated failure (`Tests\Feature\ExampleTest`, a stub root-route test that has failed since before any of
this vendor work started — do not touch it).

- [ ] **Step 9: Commit**

```bash
git add app/Modules/Vendor/Presentation/Http/Requests/ListVendorsRequest.php \
        app/Modules/Vendor/Application/Queries/ListVendorProfilesQuery.php \
        app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php \
        tests/Feature/Modules/Vendor/ListVendorsTest.php
git commit -m "feat(vendor): add backward-compatible pagination to GET /api/v1/vendors"
```
