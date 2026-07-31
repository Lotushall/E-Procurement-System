# List vendors สำหรับ admin dashboard (backend only)

Date: 2026-07-31
Status: Approved

## บริบท / ปัญหา

`routes/api/v1/vendor.php` (เอกพจน์) มีแต่ route self-service ที่ scope ด้วย `$request->user()->id`
เท่านั้น ไม่มี route ไหนคืนรายการ vendor ทั้งหมดให้ internal user (แอดมิน) ดู — ตามที่ระบุไว้ใน
`GetVendorProfileQuery` ที่คุยกับ Eloquent model ตรง ๆ (ไม่ผ่าน repository) สำหรับงาน read-only

ฝั่ง frontend มี spec ที่ออกแบบ contract ของ endpoint นี้ไว้ล่วงหน้าแล้ว 2 ไฟล์
(`frontend/docs/superpowers/specs/2026-07-30-vendor-approval-dashboard-design.md` Part 4 และ
`2026-07-31-vendor-list-stats-filter-design.md`) พร้อม type/hook ที่ compile ผ่านแล้วแต่ยังเรียก API
404 อยู่ (`lib/vendor-approval/{types,api,useVendorList}.ts`) — งานนี้ทำให้ endpoint นั้นใช้งานได้จริง
ตาม contract ที่มีอยู่แล้วเป๊ะ ๆ ไม่ปรับ shape ใด ๆ

## เป้าหมาย

1. `GET /api/v1/vendors` (พหูพจน์ — คนละ namespace กับ `/api/v1/vendor` เดิม) คืนรายการ vendor
   ทั้งหมดในระบบ กรองด้วย query param `status` (`pending`/`approved`/`rejected`) ถ้ามีการส่งมา —
   ไม่ส่ง `status` มา = คืนทุกสถานะ
2. จำกัดสิทธิ์เฉพาะ internal user (`user_type === UserType::Internal`) เท่านั้น — vendor เรียกเอง
   ต้องไม่เห็นรายชื่อ vendor รายอื่น
3. Response shape ตรงกับ `VendorSummary` ฝั่ง frontend เป๊ะ:
   `{ data: { id, displayName, vendorType, verificationStatus, submittedAt }[] }`

## Non-goals

- **Endpoint อื่นในชุดเดียวกัน** (`GET /api/v1/vendors/{id}` detail, `POST .../approve`,
  `POST .../reject`, document approve/reject) — เป็นสโคปแยก ผู้ใช้ขอมาแค่ "get all vendor" งานนี้ทำ
  เฉพาะ list endpoint เท่านั้น
- **Pagination** — contract ฝั่ง frontend ไม่มี `page` param (ระบุไว้ชัดใน frontend spec ทั้งสองไฟล์)
- **Search ฝั่ง server** — frontend ทำ client-side filter เอง ไม่มี search param ใน contract
- **แก้ `VendorController` เดิม** — self-service controller ไม่แตะ สร้าง controller ใหม่แยกต่างหาก

## Design

### Route (`routes/api/v1/vendors.php`, ไฟล์ใหม่)

```php
<?php

use App\Modules\Vendor\Presentation\Http\Controllers\VendorApprovalController;
use Illuminate\Support\Facades\Route;

Route::get('vendors', [VendorApprovalController::class, 'index'])->name('vendors.index');
```

### `routes/api.php` (แก้)

เพิ่ม require ไฟล์ใหม่ในกลุ่ม middleware `auth` เดิม (endpoint นี้ต้องล็อกอินก่อน แล้วค่อยเช็คสิทธิ์
internal ต่อใน `ListVendorsRequest::authorize()`):

```php
Route::middleware('auth')->group(function () {
    require __DIR__.'/api/v1/vendor.php';
    require __DIR__.'/api/v1/vendors.php';
});
```

### `ListVendorsRequest` (ใหม่)

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

    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string', Rule::in(['pending', 'approved', 'rejected'])],
        ];
    }
}
```

ไม่ authorize → Laravel โยน `AuthorizationException` เองอัตโนมัติ ตอบ 403 JSON (ผ่าน
`shouldRenderJsonWhen` ที่ตั้งไว้ใน `bootstrap/app.php` แล้ว) ไม่ต้องเขียน check เองในตัว controller

### `ListVendorProfilesQuery` (ใหม่, mirror `GetVendorProfileQuery`)

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

คุยกับ `VendorProfiles` Eloquent model ตรง ๆ เหมือน `GetVendorProfileQuery` — งาน read-only แบบนี้ใน
โมดูลนี้ไม่ผ่าน repository/domain entity

### `VendorSummaryResource` (ใหม่)

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

`submittedAt` ใช้ `vendor_profiles.created_at` (เวลาที่สร้างโปรไฟล์ vendor = เวลาสมัคร) ตรงกับความหมาย
ของ field นี้ในหน้า list ฝั่ง frontend ("สมัครเมื่อ")

### `VendorApprovalController` (ใหม่, แยกจาก `VendorController` เดิม)

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

Controller ใหม่แยกจาก `VendorController` เดิม เพราะ `VendorController` เป็น self-service ที่ scope
ด้วย `$request->user()->id` ทุก action — งานนี้เป็น admin-facing/collection endpoint คนละความหมาย
(ตรงกับที่ frontend spec ตั้งใจแยก namespace `/vendor` vs `/vendors` ไว้ตั้งแต่แรก)

## Testing

`tests/Feature/Modules/Vendor/ListVendorsTest.php` (ใหม่, ใช้ pattern เดียวกับ
`ViewVendorDocumentTest.php`/`VendorProfileTest.php` — สร้าง user ด้วย `User::factory()`, สร้าง
profile/detail ตรง ๆ ผ่าน `VendorRepository` เพราะโมดูลนี้ไม่มี factory ให้ vendor models):

- internal user เรียกโดยไม่ส่ง `status` → คืน vendor ทุกสถานะ (pending/approved/rejected ปนกัน)
- internal user เรียกพร้อม `status=pending` → คืนเฉพาะ vendor ที่สถานะ pending
- response แต่ละรายการมี `displayName`/`vendorType` ตรงกับ company detail (ถ้าเป็น company) และ
  individual detail (ถ้าเป็น individual) ถูกต้อง
- vendor user (company/individual) เรียก endpoint นี้ → 403
- ไม่ได้ล็อกอิน → 401
- ส่ง `status` ที่ไม่อยู่ใน enum ที่กำหนด → 422
