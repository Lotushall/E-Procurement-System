# Backward-compatible pagination for GET /api/v1/vendors

Date: 2026-07-31
Status: Approved

## บริบท / ปัญหา

`GET /api/v1/vendors` (`backend/docs/superpowers/specs/2026-07-31-vendor-list-endpoint-design.md`) คืน
vendor ทุกแถวที่ตรงเงื่อนไข `status` แบบ array เดียวไม่มี pagination — ตอนนั้นระบุไว้ชัดว่าไม่ทำ
pagination เพราะ contract ฝั่ง frontend (`frontend/lib/vendor/approval/api.ts`) ไม่มี `page` param และ
หน้า `/dashboard/vendors` เรียก endpoint นี้ 3 ครั้ง (pending/approved/rejected) แล้วรวมผลฝั่ง client เอง

ตอนนี้ต้องการเพิ่มความสามารถ pagination ฝั่ง backend ไว้ก่อน แต่**ฝั่ง frontend ยังไม่มี UI/param สำหรับขอ
หน้าถัดไป** (เป็น non-goal ที่ระบุไว้ชัดในทั้ง `2026-07-30-vendor-approval-dashboard-design.md` และ
`2026-07-31-vendor-list-stats-filter-design.md` ฝั่ง frontend) ถ้าเปิด pagination แบบมาตรฐานของ Laravel
ทันที (ตัดเหลือหน้าละ 15 โดย default) จะทำให้ vendor ที่เกินหน้าแรกหายไปจากหน้า admin เงียบ ๆ ทันทีที่มี
vendor เกิน 15 ราย โดยไม่มีใครสังเกตเห็นจนกว่าจะมีคนมาถาม

ผู้ใช้เลือกแนวทาง **backward-compatible**: ไม่ส่ง `page`/`per_page` มา = พฤติกรรมเดิมเป๊ะ (คืน array เต็ม)
ส่ง `page` และ/หรือ `per_page` มา = สลับไปใช้ pagination จริง — เปิดทางให้ frontend ใช้ได้ภายหลังโดยไม่มี
breaking change ตอนนี้

## เป้าหมาย

1. ไม่ส่ง `page`/`per_page` → response เหมือนเดิมทุกประการ: `{ data: VendorSummary[] }` (ไม่มี
   `links`/`meta`) — พิสูจน์ด้วยการรัน test เดิมทั้ง 6 ตัวของ `ListVendorsTest.php` โดยไม่แก้ไข
2. ส่ง `page` และ/หรือ `per_page` → response เป็น shape มาตรฐานของ Laravel resource collection ตอน
   paginate: `{ data: VendorSummary[], links: {...}, meta: {...} }`
3. `page` ต้องเป็นจำนวนเต็ม ≥ 1, `per_page` ต้องเป็นจำนวนเต็ม 1-100 (จำกัดเพดานกันการขอทีละมาก ๆ) —
   ค่าที่ไม่ถูกต้อง = 422 เหมือน `status` เดิม

## Non-goals

- **ไม่แก้ frontend ใด ๆ** — `lib/vendor/approval/api.ts`/`useVendorList.ts` ไม่ถูกแตะ ยังคงเรียกโดยไม่ส่ง
  `page` เหมือนเดิม จึงไม่เห็นผลกระทบใด ๆ จนกว่าจะมี session แยกมาต่อยอด
- **ไม่เปลี่ยน default per-page ให้ต่างจาก Laravel มาตรฐาน** — ใช้ 15 ตามค่า default ของ
  `Paginator::paginate()`
- **ไม่ทำ cursor-based pagination** — ใช้ `LengthAwarePaginator` (offset-based) ตามมาตรฐาน Laravel
  เพราะข้อมูล vendor list ไม่มีเหตุผลต้องการ cursor pagination

## Design

### `ListVendorsRequest::rules()` (แก้)

```php
public function rules(): array
{
    return [
        'status' => ['nullable', 'string', Rule::in(['pending', 'approved', 'rejected'])],
        'page' => ['nullable', 'integer', 'min:1'],
        'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
    ];
}
```

### `ListVendorProfilesQuery::execute()` (แก้)

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

ส่ง `page`/`per_page` อย่างใดอย่างหนึ่งมาก็สลับโหมด — ไม่ต้องรอทั้งคู่ (เช่น client ที่อยากได้แค่ 5 รายการ
หน้าแรกส่ง `per_page=5` มาลำพังก็ควรได้ผล paginate เหมือนกัน)

### `VendorApprovalController::index()` (แก้)

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

`JsonResource::response()` คืน `Illuminate\Http\JsonResponse` เหมือนกับ `response()->json()` ในสาขาที่ไม่
paginate ดังนั้น return type ของ method ยังเป็น `JsonResponse` ทั้งสองทาง — ไม่ต้องเปลี่ยน signature

`VendorSummaryResource` เองไม่ต้องแก้ — `$wrap = false` มีผลเฉพาะตอน resource เดี่ยว/ไม่ paginate
(สาขาที่คุมเองด้วย `response()->json(['data' => ...])` อยู่แล้ว) ส่วนตอน paginate
`AnonymousResourceCollection` ที่ได้จาก `::collection($paginator)` จะเติม `links`/`meta` ให้เองโดยอัตโนมัติ
จาก object `LengthAwarePaginator` ที่ส่งเข้าไป ไม่เกี่ยวกับ `$wrap` ของ resource เดี่ยว

## Testing

`tests/Feature/Modules/Vendor/ListVendorsTest.php` (แก้ไฟล์เดิม เพิ่ม test ใหม่ ไม่ลบ/แก้ test เดิม):

- ทดสอบ regression หลัก: **test เดิมทั้ง 6 ตัวต้องผ่านโดยไม่แก้โค้ดในตัว test เอง** — พิสูจน์ backward
  compatibility จริง (ไม่ใช่แค่ "เขียนใหม่ให้ผ่าน")
- ส่ง `page=1&per_page=2` กับ vendor 3 ราย (สถานะผสมกัน ใช้ setup แบบเดียวกับ test "list ทุกสถานะ" เดิม)
  → `assertJsonCount(2, 'data')`, `assertJsonPath('meta.total', 3)`,
  `assertJsonPath('meta.current_page', 1)`, `links.next` ไม่เป็น null
- ส่ง `page=2` (per_page เดิม 2, vendor 3 ราย) → เหลือ 1 รายการ, `links.next` เป็น null,
  `links.prev` ไม่เป็น null
- ส่ง `page=0` → 422
- ส่ง `per_page=101` → 422
- ส่ง `status=pending&page=1&per_page=10` ร่วมกัน → filter + pagination ทำงานพร้อมกันถูกต้อง (นับเฉพาะ
  vendor ที่ตรง status ก่อนค่อย paginate)
