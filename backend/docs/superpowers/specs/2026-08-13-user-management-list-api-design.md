# User management list/detail API (backend)

Date: 2026-08-13

Status: Approved

## บริบท / ปัญหา

`frontend/docs/superpowers/specs/2026-08-13-user-management-list-design.md` ออกแบบและ implement หน้า
"จัดการผู้ใช้" (`/dashboard/users`) เสร็จแล้วจริงในอีก session — ตาราง user ทุกประเภท (internal/company/
individual) พร้อม filter/search/sort/pagination, หน้ารายละเอียด read-only, และลิงก์ข้ามไปมาระหว่าง User
detail ↔ Vendor detail ทั้งหมดนี้เรียก API ที่**ยังไม่มีอยู่จริง** — `App\Modules\User` มีแค่
`UserController.php` เป็น scaffold ที่ `nwidart/laravel-modules` gen ให้ตอนสร้าง module (คืน
`view('user::index')` ที่ไม่มีอยู่จริง) ไม่ได้ผูก route ใดๆ

**สำคัญ — API contract นี้ต้องตรงกับที่ frontend implement ไปแล้ว:** `frontend/lib/user/management/api.ts`
เรียก `GET /api/v1/dashboard/users` และ `GET /api/v1/dashboard/users/{id}` ตรงๆ (hardcode ไว้แล้ว),
`frontend/lib/user/management/types.ts` กำหนด shape ของ response ไว้แล้ว งานนี้คือ implement backend ให้
ตรงกับ contract ที่ frontend ใช้งานอยู่แล้วเป๊ะๆ ไม่ใช่ออกแบบ endpoint shape ใหม่เอง

## ขอบเขต (อ้างอิงจาก frontend spec ข้อ "API contract ที่ต้องการจาก backend")

- 2 endpoint อ่านอย่างเดียว: list (paginate + filter type/status + search + sort) และ detail
- แก้ `VendorProfileResource` เพิ่ม `user.id` (ใช้ทำลิงก์ Vendor detail → User detail ฝั่ง frontend ที่ทำไว้
  รอแล้ว)
- Gate เฉพาะ `user_type === internal` เหมือน vendor dashboard — **ไม่เพิ่ม permission ใหม่** (เช่น
  `users.view`) เพราะ frontend spec ระบุชัดว่าเรื่อง permission ละเอียดกว่านี้รอ sub-project ข้อ 4
  (role/permission management) ที่ยังไม่ถูกออกแบบ
- ไม่ทำ endpoint สร้าง/แก้ไข/เปลี่ยนสถานะ user ใดๆ — เป็น sub-project แยกในอนาคตตามที่ frontend spec ระบุ
- ไม่ทำ frontend ใดๆ ในงานนี้ (ทำไปแล้วในอีก session)

## Decision points (จุดที่ frontend spec ไม่ได้ระบุละเอียดพอ ตัดสินใจจาก convention ที่มีอยู่ในโค้ดนี้)

1. **URL path มี `/dashboard/` literal** — vendor dashboard endpoint จริงๆ อยู่ที่ `/api/v1/vendors` (ไม่มี
   `/dashboard/` ใน URL แม้ route file จะอยู่ใน `routes/api/v1/dashboard/vendors.php` ก็ตาม — เป็นแค่ชื่อ
   โฟลเดอร์จัดกลุ่ม) แต่ frontend ของ feature นี้ hardcode `/api/v1/dashboard/users` ไว้แล้วจริง เพราะ
   frontend ship ไปแล้ว จึงยึด path ที่ frontend เรียกจริงเป็นหลัก (`routes/api/v1/dashboard/users.php` มี
   `Route::prefix('dashboard')` ครอบจริงๆ ต่างจากไฟล์ vendor พี่น้องมัน) — ไม่แตะ URL เดิมของ vendor
   endpoint ใดๆ
2. **Pagination envelope เป็น camelCase ไม่มี `links`** (`currentPage`/`lastPage`/`perPage`/`total`) —
   ตรงกับ `UserListPagination` type ฝั่ง frontend เป๊ะ ใช้ pattern เดียวกับ
   `NotificationController@index` (build response array เองในคอนโทรลเลอร์) **ไม่ใช่**
   `VendorApprovalController@index`'s `->response()` ซึ่งได้ envelope แบบ Laravel default
   (snake_case + `links`) ที่ไม่ตรง contract
3. **ชื่อ Gate ใช้ `users.viewAny` (namespaced) ไม่ใช่ `viewAny` เฉยๆ** — `VendorServiceProvider::boot()`
   ปัจจุบัน (WIP ที่ยังไม่ commit) ทำ `Gate::define('viewAny', [VendorProfilePolicy::class, 'viewAny'])`
   ด้วยชื่อ ability แบบสั้นไม่มี namespace `Gate::define()` ไม่มีการป้องกัน "ชื่อซ้ำ" ใดๆ — module ที่
   boot หลังสุดจะ overwrite gate ของ module ก่อนหน้าเงียบๆ เพื่อไม่ผูกพฤติกรรมของ feature นี้กับลำดับ boot
   ของ module อื่น (และไม่ต้องแก้ไฟล์ Vendor เลย) ตั้งชื่อ gate ของ feature นี้ให้ไม่ชนกันตั้งแต่แรก:
   `users.viewAny`
4. **`Presentation/Http/Controllers/UserController.php`** (scaffold ที่ตายอยู่แล้ว ไม่มี route ไหนอ้างถึง)
   **ถูกเขียนทับทั้งไฟล์** ให้เป็น controller จริงของ feature นี้ (`index()`/`show()`) แทนที่จะสร้างคลาสใหม่
   ชื่ออื่น — ลบ method `create/store/edit/update/destroy` ที่เป็น dead code (คืน view ที่ไม่มีอยู่จริง)
   ออกไปด้วย เพราะไม่มี route ไหนเรียกและไม่ได้อยู่ในขอบเขตงานนี้
5. **โครงสร้างโมดูลแบบ flat** (`Application/Queries/`, ไม่มี `Application/Dashboard/` vs
   `Application/Profile/` split แบบ Vendor) — เพราะ User module ยังไม่มี endpoint แบบ self-service ที่ต้อง
   แยก namespace ให้ชนกัน เหมือน `App\Modules\Notification` ที่เพิ่งทำไปก่อนหน้านี้

## API contract (คัดลอกจาก frontend spec + `frontend/lib/user/management/types.ts` ตรงๆ)

Auth เดิม (Sanctum cookie, `auth` middleware) + gate `users.viewAny` (ดู decision point 3) — เทียบเท่า
`user_type === internal` เท่านั้น ไม่มี permission check เพิ่ม

**`GET /api/v1/dashboard/users?type=&status=&search=&page=1&per_page=20&sort_by=&sort_direction=`** → 200
```jsonc
{
  "data": [
    {
      "id": 1,
      "username": "somchai",
      "email": "somchai@example.com",
      "name": "สมชาย ใจดี",
      "userType": "internal",
      "status": "active",
      "createdAt": "2026-08-01T09:00:00+07:00"
    }
  ],
  "meta": { "currentPage": 1, "lastPage": 5, "perPage": 20, "total": 92 }
}
```
- `type`/`status` optional filter (ไม่ส่ง = ทั้งหมด); ค่าที่ยอมรับ: `type` ∈ `internal|company|individual`,
  `status` ∈ `pending|active|suspended|inactive`
- `search` ค้นจาก `username`/`email` (ตรงบน `users`) + ชื่อที่ resolve ตาม type (`internal_profiles.
  firstname`/`lastname`, `vendor_company_details.company_name`, `vendor_individual_details.store_name`)
- `sort_by` ∈ `created_at|username|email` เท่านั้น (ไม่รองรับ `name` เพราะมาจากคนละตารางตาม type,
  cross-table sort ยาก — เหตุผลเดียวกับที่ vendor list ตัด `name` ออกจาก sort ไม่ได้ ต้องใช้ correlated
  subquery); ไม่ส่ง `sort_by` = เรียงตาม `created_at` ล่าสุดก่อน (default)
- `meta` เป็น camelCase ล้วน ไม่มี `links` (ดู decision point 2)

**`GET /api/v1/dashboard/users/{id}`** → 200
```jsonc
{
  "data": {
    "id": 1,
    "username": "somchai",
    "email": "somchai@example.com",
    "name": "สมชาย ใจดี",
    "userType": "internal",
    "status": "active",
    "createdAt": "2026-08-01T09:00:00+07:00",
    "vendorProfileId": null
  }
}
```
`vendorProfileId` เป็น number เมื่อ `userType` เป็น `company`/`individual` (มาจาก `VendorProfile.id` ของ
user คนนั้น), `null` เมื่อเป็น `internal` — id ไม่มีอยู่จริง → 404

**แก้ `VendorProfileResource` — เพิ่ม `id` เข้าไปใน block `user`**
(`app/Modules/Vendor/Presentation/Http/Resources/VendorProfileResource.php:40-43`, ปัจจุบัน):
```php
'user' => $this->whenLoaded('VendorProfilesUser', fn () => [
    'username' => $this->VendorProfilesUser->username,
    'email' => $this->VendorProfilesUser->email,
]),
```
เพิ่ม `'id' => $this->VendorProfilesUser->id,` เป็น key แรกในนั้น

## Domain reference — ตารางที่เกี่ยวข้อง (มีอยู่แล้ว ไม่ต้อง migration ใหม่)

- `users`: `id`, `username`, `email`, `password`, `user_type` (enum, cast เป็น
  `App\Modules\User\Domain\Enums\UserType` — cases `Internal`/`Company`/`Individual`, ค่า string
  `internal`/`company`/`individual`), `status` (enum, cast เป็น spatie/laravel-model-states
  `App\Modules\User\Domain\States\UserStatus` — `Pending`/`Active`/`Suspended`/`Inactive`, อ่านค่า string
  ด้วย `->getValue()`), `created_at`
- `internal_profiles`: `user_id` (unique FK), `firstname` (not null), `lastname` (not null) — ใช้ต่อกันเป็น
  `name` ของ internal user
- `vendor_profiles`: `user_id` (unique FK) → 1:1 กับ `users`; relation `User::UserVendorProfile()`
  (`hasOne`), ฝั่งกลับ `VendorProfiles::VendorProfilesUser()` (`belongsTo`)
- `vendor_company_details`/`vendor_individual_details`: keyed by unique `vendor_profile_id` — เก็บ
  `company_name` / `store_name` ตามลำดับ ใช้เป็น `name` ของ company/individual user

## Application layer — `App\Modules\User\Application\Queries`

### `ListUsersQuery.php`

```php
<?php

namespace App\Modules\User\Application\Queries;

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListUsersQuery
{
    private const DEFAULT_PER_PAGE = 20;

    public function execute(
        ?string $type = null,
        ?string $status = null,
        ?string $search = null,
        ?string $sortBy = null,
        ?string $sortDirection = null,
        ?int $page = null,
        ?int $perPage = null,
    ): LengthAwarePaginator {
        return User::query()
            ->with([
                'UserInternalProfile',
                'UserVendorProfile.VendorProfilesCompanyDetail',
                'UserVendorProfile.VendorProfilesIndividualDetail',
            ])
            ->type($type)
            ->status($status)
            ->search($search)
            ->sort($sortBy, $sortDirection)
            ->orderByDesc('id')
            ->paginate(perPage: $perPage ?? self::DEFAULT_PER_PAGE, page: $page ?? 1);
    }
}
```

`orderByDesc('id')` เป็น tiebreaker หลัง sort หลัก (สอง user สร้างวินาทีเดียวกันไม่ยุบ/สลับหน้ากันตอน
paginate) — pattern เดียวกับ `ListVendorProfilesQuery`

### `GetUserByIdQuery.php`

```php
<?php

namespace App\Modules\User\Application\Queries;

use App\Modules\User\Infrastructure\Models\User;

final class GetUserByIdQuery
{
    public function execute(int $id): User
    {
        return User::query()
            ->with([
                'UserInternalProfile',
                'UserVendorProfile.VendorProfilesCompanyDetail',
                'UserVendorProfile.VendorProfilesIndividualDetail',
            ])
            ->findOrFail($id);
    }
}
```

`findOrFail` throw `ModelNotFoundException` → global JSON exception handler แปลงเป็น 404 อัตโนมัติ (pattern
เดียวกับ `GetVendorProfileByIdQuery`/Notification's mark-as-read) ไม่ต้อง try/catch เพิ่ม

ทั้งสอง query query `User::query()` ตรงๆ ไม่ผ่าน `UserRepositoryInterface` — pattern เดียวกับ
`ListVendorProfilesQuery`/`GetVendorProfileByIdQuery` ("Dashboard"/read-side query ทุกตัวในโค้ดนี้ query
Eloquent model ตรงๆ ไม่ผ่าน repository abstraction)

## Filter/search/sort — Eloquent local scopes บน `User` model (`#[Scope]` attribute)

เพิ่มใน `app/Modules/User/Infrastructure/Models/User.php` (pattern เดียวกับ scope 3 ตัวบน
`VendorProfiles`):

```php
use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;

// ...

#[Scope]
protected function type(Builder $query, ?string $type): void
{
    $query->when($type !== null, fn (Builder $query) => $query->where('user_type', $type));
}

#[Scope]
protected function status(Builder $query, ?string $status): void
{
    $query->when($status !== null, fn (Builder $query) => $query->where('status', $status));
}

#[Scope]
protected function search(Builder $query, ?string $search): void
{
    if ($search === null || trim($search) === '') {
        return;
    }

    $term = '%'.$search.'%';

    $query->where(function (Builder $query) use ($term) {
        $query->where('username', 'like', $term)
            ->orWhere('email', 'like', $term)
            ->orWhereIn('id', InternalProfiles::query()
                ->where(function (Builder $query) use ($term) {
                    $query->where('firstname', 'like', $term)
                        ->orWhere('lastname', 'like', $term);
                })
                ->select('user_id'))
            ->orWhereIn('id', VendorProfiles::query()
                ->whereIn('id', VendorCompanyDetails::query()
                    ->where('company_name', 'like', $term)
                    ->select('vendor_profile_id'))
                ->select('user_id'))
            ->orWhereIn('id', VendorProfiles::query()
                ->whereIn('id', VendorIndividualDetails::query()
                    ->where('store_name', 'like', $term)
                    ->select('vendor_profile_id'))
                ->select('user_id'));
    });
}

#[Scope]
protected function sort(Builder $query, ?string $sortBy, ?string $sortDirection = null): void
{
    $direction = $sortDirection === 'asc' ? 'asc' : 'desc';

    $query->orderBy(
        in_array($sortBy, ['username', 'email'], true) ? $sortBy : 'created_at',
        $direction,
    );
}
```

`InternalProfiles` อยู่ namespace เดียวกับ `User` (ไม่ต้อง `use`) — `VendorProfiles` ถูก import อยู่แล้วใน
ไฟล์นี้ (relation `UserVendorProfile`) เพิ่มแค่ `VendorCompanyDetails`/`VendorIndividualDetails`

## Presentation layer — `App\Modules\User\Presentation`

### `Http\Requests\ListUsersRequest.php`

```php
<?php

namespace App\Modules\User\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListUsersRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['nullable', 'string', Rule::in(['internal', 'company', 'individual'])],
            'status' => ['nullable', 'string', Rule::in(['pending', 'active', 'suspended', 'inactive'])],
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'string', Rule::in(['created_at', 'username', 'email'])],
            'sort_direction' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
```

ไม่ override `authorize()` — pattern เดียวกับ `ListVendorsRequest`/`ListNotificationsRequest` (default คือ
authorized เมื่อไม่ override; authorization จริงทำที่ route middleware `can:users.viewAny`)

### `Http\Resources\UserResource.php` (list item)

```php
<?php

namespace App\Modules\User\Presentation\Http\Resources;

use App\Modules\User\Domain\Enums\UserType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public static $wrap = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'username' => $this->username,
            'email' => $this->email,
            'name' => $this->resolveName(),
            'userType' => $this->user_type->value,
            'status' => $this->status->getValue(),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }

    private function resolveName(): ?string
    {
        return match ($this->user_type) {
            UserType::Internal => $this->UserInternalProfile !== null
                ? trim($this->UserInternalProfile->firstname.' '.$this->UserInternalProfile->lastname)
                : null,
            UserType::Company => $this->UserVendorProfile?->VendorProfilesCompanyDetail?->company_name,
            UserType::Individual => $this->UserVendorProfile?->VendorProfilesIndividualDetail?->store_name,
        };
    }
}
```

`resolveName()` เป็น private method บน Resource เอง (ไม่ใช่ scope/query) — ต้องพึ่ง eager-loaded relations
ที่ `ListUsersQuery`/`GetUserByIdQuery` โหลดมาให้แล้ว ไม่ query เพิ่มต่อแถว (กัน N+1) pattern การ match ตาม
`user_type` นี้ก็อปมาจาก `AuthenticatedUserResource::profileData()` ที่มีอยู่แล้วในโค้ดนี้

### `Http\Resources\UserDetailResource.php` (detail — extends list resource, เพิ่ม `vendorProfileId`)

```php
<?php

namespace App\Modules\User\Presentation\Http\Resources;

use Illuminate\Http\Request;

class UserDetailResource extends UserResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'vendorProfileId' => $this->UserVendorProfile?->id,
        ];
    }
}
```

### `Presentation\Policies\UserPolicy.php`

```php
<?php

namespace App\Modules\User\Presentation\Policies;

use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->user_type === UserType::Internal;
    }
}
```

ไม่มี `->can('permission.name')` เพิ่ม ต่างจาก `VendorProfilePolicy::viewAny()` ที่เช็ค
`->can('vendors.view')` ด้วย — ตาม decision point ในหัวข้อบน (frontend spec ระบุชัดว่า permission ละเอียด
กว่านี้รอ sub-project หน้า)

### `Http\Controllers\UserController.php` (เขียนทับ scaffold เดิมทั้งไฟล์)

```php
<?php

namespace App\Modules\User\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\User\Application\Queries\GetUserByIdQuery;
use App\Modules\User\Application\Queries\ListUsersQuery;
use App\Modules\User\Presentation\Http\Requests\ListUsersRequest;
use App\Modules\User\Presentation\Http\Resources\UserDetailResource;
use App\Modules\User\Presentation\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function __construct(
        private readonly ListUsersQuery $listUsers,
        private readonly GetUserByIdQuery $getUserById,
    ) {}

    public function index(ListUsersRequest $request): JsonResponse
    {
        $users = $this->listUsers->execute(
            type: $request->validated('type'),
            status: $request->validated('status'),
            search: $request->validated('search'),
            sortBy: $request->validated('sort_by'),
            sortDirection: $request->validated('sort_direction'),
            page: $request->validated('page'),
            perPage: $request->validated('per_page'),
        );

        return response()->json([
            'data' => UserResource::collection($users->getCollection()),
            'meta' => [
                'currentPage' => $users->currentPage(),
                'lastPage' => $users->lastPage(),
                'perPage' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'data' => new UserDetailResource($this->getUserById->execute($id)),
        ]);
    }
}
```

## Routes — `routes/api/v1/dashboard/users.php` (ไฟล์ใหม่)

```php
<?php

use App\Modules\User\Presentation\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {
    Route::get('users', [UserController::class, 'index'])
        ->middleware('can:users.viewAny')
        ->name('dashboard.users.index');
    Route::get('users/{id}', [UserController::class, 'show'])
        ->middleware('can:users.viewAny')
        ->whereNumber('id')
        ->name('dashboard.users.show');
});
```

`routes/api.php` เพิ่ม require ไฟล์นี้ในกลุ่ม `auth` เดิม (บรรทัดเดียวกับไฟล์อื่น):

```php
Route::middleware('auth')->group(function () {
    require __DIR__.'/api/v1/vendor.php';
    require __DIR__.'/api/v1/dashboard/vendors.php';
    require __DIR__.'/api/v1/notification.php';
    require __DIR__.'/api/v1/dashboard/users.php';
});
```

## Provider — `App\Modules\User\Providers\UserServiceProvider`

เพิ่ม `boot()` (ปัจจุบันไม่มี — มีแค่ `register()`):

```php
use App\Modules\User\Presentation\Policies\UserPolicy;
use Illuminate\Support\Facades\Gate;

public function boot(): void
{
    parent::boot();

    Gate::define('users.viewAny', [UserPolicy::class, 'viewAny']);
}
```

## Out of scope

- สร้าง/แก้ไข/เปลี่ยนสถานะ user, role/permission management — sub-project แยกในอนาคต
- Permission แบบละเอียด (`users.view` เป็นต้น) — รอ sub-project role/permission
- แก้ URL/response shape ของ vendor endpoint เดิม (`/api/v1/vendors`) ใดๆ
- Frontend ใดๆ (ทำไปแล้วในอีก session)

## Testing

**Application layer** (`tests/Feature/Modules/User/ListUsersQueryTest.php`,
`GetUserByIdQueryTest.php`) — สร้าง user จริงในฐานข้อมูล (ผ่าน `User::factory()` +
`InternalProfiles::create()`/`VendorRepository` ตาม type) ยืนยัน:
- `ListUsersQuery`: กรอง `type`/`status` ถูกต้อง, ค้นด้วย username/email/internal firstname-lastname/
  company name/store name ถูกต้อง, sort ตามคอลัมน์ที่ระบุ + default `created_at` desc, paginate ถูกต้อง
- `GetUserByIdQuery`: คืน user พร้อม relation ที่ eager-load ไว้, throw `ModelNotFoundException` เมื่อ id
  ไม่มีอยู่จริง

**HTTP layer** (`tests/Feature/Modules/User/ListUsersTest.php`, `ShowUserTest.php`) — ยิง request ผ่าน
`actingAs($user, 'web')`:
- ต้อง login ก่อน (401), ต้องเป็น `user_type === internal` เท่านั้น (403 สำหรับ vendor user)
- list response shape ตรง contract (camelCase meta ไม่มี `links`, item fields แบนราบ), `name` resolve ถูก
  ต้องตาม type จริง (internal/company/individual), filter/search/sort ทำงานตาม query param, ค่า enum ที่
  ไม่ถูกต้อง (`type`/`status`/`sort_by`/`sort_direction`) และ `search` ยาวเกิน 255 ตัวอักษร → 422
- detail response มี `vendorProfileId` ถูกต้อง (number สำหรับ company/individual, null สำหรับ internal),
  id ไม่มีอยู่จริง → 404

**Vendor regression** — เพิ่ม assertion หนึ่งบรรทัดใน `tests/Feature/Modules/Vendor/ShowVendorTest.php` ที่
มีอยู่แล้ว ยืนยัน `data.user.id` ตรงกับ `$companyUser->id` (ปิด decision point "แก้
`VendorProfileResource`")

รัน `php artisan test --compact` เต็มชุดหลังแก้เสร็จ เทียบ baseline ปัจจุบัน (372 tests, 371 passed, 1
pre-existing failure ที่ไม่เกี่ยวข้อง — `ExampleTest` root `/` route 404) ต้องได้ผลเท่าเดิมบวก test ใหม่
ทั้งหมดผ่าน
