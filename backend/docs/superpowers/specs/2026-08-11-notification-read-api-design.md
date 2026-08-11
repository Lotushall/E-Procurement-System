# Notification read-side API (list / unread count / mark-as-read)

Date: 2026-08-11

Status: Approved

## บริบท / ปัญหา

`2026-08-10-notification-module-design.md` สร้าง `App\Modules\Notification` เป็น module กลางสำหรับ "ส่ง"
notification เท่านั้น (`NotificationSenderInterface::send()`) และระบุไว้ชัดเจนว่า read-side API
(list/mark-as-read) เป็นงานแยกในอนาคต ตอนนี้ `2026-08-11-vendor-approval-notification-wiring-design.md`
wire เข้ากับ 4 event ของ Vendor เสร็จแล้ว มี database notification จริงเกิดขึ้นในระบบ — frontend ต้องการ
API เพื่อดึงรายการ notification ของ user ที่ login อยู่มาแสดง

งานนี้คือการเติม Application + Presentation layer ให้ `App\Modules\Notification` สำหรับฝั่งอ่าน โดยใช้
Eloquent relation ที่ `Notifiable` trait (มีอยู่แล้วบน `User` model) ให้มาฟรี ๆ
(`notifications()`/`unreadNotifications()`) ไม่ต้องสร้าง repository abstraction ใหม่

## ขอบเขต (ยืนยันกับ user แล้ว)

- 4 endpoint: list (paginate), unread count, mark หนึ่งรายการว่าอ่านแล้ว, mark ทั้งหมดว่าอ่านแล้ว
- **ไม่ทำ** endpoint ลบ/ซ่อน notification — ไม่ได้ร้องขอ
- **ไม่ทำ** endpoint ดู notification เดียว (show) — ไม่ได้ร้องขอ
- list endpoint pagination แบบ page-based เหมือน `ListVendorProfilesQuery` (`?page=&per_page=`)
- list endpoint กรองอ่าน/ยังไม่อ่านได้ผ่าน `?status=unread|read`
- ทุก endpoint scope เฉพาะ notification ของ user ที่ login อยู่เท่านั้น (ทั้ง vendor และ internal user ใช้
  endpoint เดียวกันได้ — ไม่ผูกกับ user type ใด) — mark-as-read ต้อง 404 ถ้า id ไม่ใช่ของ user นั้น (กัน IDOR)
- ไม่ทำ frontend ใด ๆ ในงานนี้

## Application layer — `App\Modules\Notification\Application`

ทุกคลาสรับ `int $userId` (ไม่ใช่ `User` model) ตาม pattern เดียวกับ `GetVendorProfileQuery::execute(int
$userId)` แล้ว `User::query()->findOrFail($userId)` ข้างในเพื่อเข้าถึง relation ของ `Notifiable` trait

### `Queries/ListNotificationsQuery.php`

```php
<?php

namespace App\Modules\Notification\Application\Queries;

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListNotificationsQuery
{
    private const DEFAULT_PER_PAGE = 20;

    public function execute(
        int $userId,
        ?string $status = null,
        ?int $page = null,
        ?int $perPage = null,
    ): LengthAwarePaginator {
        $query = User::query()->findOrFail($userId)->notifications();

        if ($status === 'unread') {
            $query->whereNull('read_at');
        } elseif ($status === 'read') {
            $query->whereNotNull('read_at');
        }

        return $query
            ->latest('created_at')
            ->paginate(
                perPage: $perPage ?? self::DEFAULT_PER_PAGE,
                page: $page ?? 1,
            );
    }
}
```

### `Queries/CountUnreadNotificationsQuery.php`

```php
<?php

namespace App\Modules\Notification\Application\Queries;

use App\Modules\User\Infrastructure\Models\User;

final class CountUnreadNotificationsQuery
{
    public function execute(int $userId): int
    {
        return User::query()->findOrFail($userId)->unreadNotifications()->count();
    }
}
```

### `UseCases/MarkNotificationAsReadUseCase.php`

```php
<?php

namespace App\Modules\Notification\Application\UseCases;

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Notifications\DatabaseNotification;

final class MarkNotificationAsReadUseCase
{
    public function execute(int $userId, string $notificationId): DatabaseNotification
    {
        $notification = User::query()->findOrFail($userId)
            ->notifications()
            ->findOrFail($notificationId);

        $notification->markAsRead();

        return $notification;
    }
}
```

`notifications()->findOrFail($notificationId)` scope query ด้วย `notifiable_id`/`notifiable_type` ของ
user นั้นอยู่แล้ว (เป็น `MorphMany` relation) — id ของ notification ที่ไม่ใช่ของ user คนนี้จะไม่เจอ ได้
`ModelNotFoundException` → 404 อัตโนมัติ (global JSON exception handler ใน `bootstrap/app.php` มีอยู่แล้ว
ไม่ต้อง try/catch เพิ่ม)

### `UseCases/MarkAllNotificationsAsReadUseCase.php`

```php
<?php

namespace App\Modules\Notification\Application\UseCases;

use App\Modules\User\Infrastructure\Models\User;

final class MarkAllNotificationsAsReadUseCase
{
    public function execute(int $userId): void
    {
        User::query()->findOrFail($userId)
            ->unreadNotifications()
            ->update(['read_at' => now()]);
    }
}
```

ใช้ bulk `update()` บน relation query (1 คำสั่ง SQL) แทนการ loop เรียก `markAsRead()` ทีละรายการ

## Presentation layer — `App\Modules\Notification\Presentation`

### `Http\Requests\ListNotificationsRequest.php`

ไม่ต้องมี `authorize()` — ตาม pattern เดียวกับ `ListVendorsRequest` (ไม่ override, default ของ
`FormRequest` คือ authorized เมื่อไม่ override):

```php
<?php

namespace App\Modules\Notification\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListNotificationsRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string', Rule::in(['unread', 'read'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
```

### `Http\Resources\NotificationResource.php`

```php
<?php

namespace App\Modules\Notification\Presentation\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public static $wrap = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'data' => $this->data,
            'read_at' => $this->read_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
```

`read_at` **ไม่ใช้** `whenNotNull` (ต่างจาก `VendorProfileResource` บาง field) เพราะ key ต้องอยู่เสมอให้
frontend เช็ค `null` เพื่อรู้สถานะยังไม่อ่านได้ตรง ๆ — ถ้าใช้ `whenNotNull` key จะหายไปทั้ง key เวลายังไม่อ่าน

`data` ส่งค่าดิบจาก `toDatabase()` ของแต่ละ notification class ตรง ๆ (cast เป็น `array` อยู่แล้วโดย
`Illuminate\Notifications\DatabaseNotification`) มี `type`/`message` เสมอ บวก key เฉพาะ event
(`remark`, `document_type`) — ไม่ normalize เพิ่ม เพราะทุก notification class ของ Vendor ที่มีอยู่ตอนนี้
ส่ง `type`/`message` มาให้แล้วอย่างสม่ำเสมอ

### `Http\Controllers\NotificationController.php`

```php
<?php

namespace App\Modules\Notification\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Notification\Application\Queries\CountUnreadNotificationsQuery;
use App\Modules\Notification\Application\Queries\ListNotificationsQuery;
use App\Modules\Notification\Application\UseCases\MarkAllNotificationsAsReadUseCase;
use App\Modules\Notification\Application\UseCases\MarkNotificationAsReadUseCase;
use App\Modules\Notification\Presentation\Http\Requests\ListNotificationsRequest;
use App\Modules\Notification\Presentation\Http\Resources\NotificationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(
        private readonly ListNotificationsQuery $listNotifications,
        private readonly CountUnreadNotificationsQuery $countUnreadNotifications,
        private readonly MarkNotificationAsReadUseCase $markNotificationAsRead,
        private readonly MarkAllNotificationsAsReadUseCase $markAllNotificationsAsRead,
    ) {}

    public function index(ListNotificationsRequest $request): JsonResponse
    {
        $notifications = $this->listNotifications->execute(
            userId: $request->user()->id,
            status: $request->validated('status'),
            page: $request->validated('page'),
            perPage: $request->validated('per_page'),
        );

        return NotificationResource::collection($notifications->withQueryString())->response();
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'count' => $this->countUnreadNotifications->execute($request->user()->id),
        ]);
    }

    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $notification = $this->markNotificationAsRead->execute($request->user()->id, $id);

        return response()->json([
            'data' => new NotificationResource($notification),
        ]);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $this->markAllNotificationsAsRead->execute($request->user()->id);

        return response()->json(['message' => 'อ่านการแจ้งเตือนทั้งหมดแล้ว']);
    }
}
```

## Routes — `routes/api/v1/notification.php` (ไฟล์ใหม่)

```php
<?php

use App\Modules\Notification\Presentation\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

Route::prefix('notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
    Route::post('{id}/read', [NotificationController::class, 'markAsRead'])->whereUuid('id')->name('notifications.read');
    Route::post('read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
});
```

`{id}` เป็น UUID (primary key ของตาราง `notifications`) ต่างจาก vendor routes ที่ใช้ `whereNumber` —
`whereUuid()` เป็น route constraint helper ที่มีอยู่แล้วใน Laravel 13

`routes/api.php` (ไฟล์ที่ require route ย่อยทั้งหมด) เพิ่ม require ไฟล์นี้ในกลุ่ม `auth` middleware เดิม
(บรรทัดเดียวกับ `vendor.php`/`dashboard/vendors.php` เพราะ endpoint นี้ใช้ได้กับทุก user type ที่ login
แล้ว):

```php
Route::middleware('auth')->group(function () {
    require __DIR__.'/api/v1/vendor.php';
    require __DIR__.'/api/v1/dashboard/vendors.php';
    require __DIR__.'/api/v1/notification.php';
});
```

## Provider

`NotificationServiceProvider` ไม่ต้องแก้ — controller/request/resource ใหม่ resolve ผ่าน Laravel
container ตามปกติ ไม่ต้อง bind อะไรเพิ่ม (เหมือนที่ `VendorServiceProvider` ไม่ต้อง bind controller ของ
ตัวเองเช่นกัน)

## Out of scope

- ลบ/ซ่อน notification
- endpoint ดู notification เดียว (show)
- Frontend UI ใด ๆ (bell icon, dropdown, badge)
- Broadcast/real-time (websocket) — ตอนนี้เป็น polling-based ผ่าน REST ธรรมดา

## Testing

ไฟล์ใหม่ทั้งหมดใน `tests/Feature/Modules/Notification/`:

**Application layer** (`ListNotificationsQueryTest.php`, `CountUnreadNotificationsQueryTest.php`,
`MarkNotificationAsReadUseCaseTest.php`, `MarkAllNotificationsAsReadUseCaseTest.php`) — สร้าง
notification จริงในฐานข้อมูลผ่าน `$user->notify(...)` ด้วย anonymous class `extends Notification` (แบบ
เดียวกับ `NotificationSenderTest.php` เดิม ไม่ผูกกับ Vendor notification class ใด ๆ) แล้วยืนยัน:
- `ListNotificationsQuery`: คืนเฉพาะของ user ที่ระบุ (ไม่ปนของ user อื่น), กรอง `status=unread`/`read`
  ถูกต้อง, pagination `perPage`/`page` ทำงานถูก, เรียงล่าสุดก่อน
- `CountUnreadNotificationsQuery`: นับเฉพาะที่ `read_at` เป็น null ของ user นั้น
- `MarkNotificationAsReadUseCase`: set `read_at`, throw `ModelNotFoundException` เมื่อ notification
  เป็นของ user อื่น (กัน IDOR) หรือ id ไม่มีอยู่จริง
- `MarkAllNotificationsAsReadUseCase`: set `read_at` ให้ทุกรายการที่ยังไม่อ่านของ user นั้น ไม่แตะของ user
  อื่น

**HTTP layer** (`ListNotificationsTest.php`, `UnreadNotificationCountTest.php`,
`MarkNotificationAsReadTest.php`, `MarkAllNotificationsAsReadTest.php`) — ยิง request ผ่าน
`actingAs($user)`:
- ต้อง login ก่อนถึงเรียกได้ (401 ถ้าไม่ได้ login) — ตรวจผ่าน middleware `auth` เดิม ไม่ต้องเขียนโค้ดเพิ่ม
- response shape ตรงตาม `NotificationResource` (`id`, `data`, `read_at`, `created_at`)
- mark-as-read endpoint คืน 404 เมื่อพยายาม mark notification ของ user อื่น

รัน `php artisan test --compact` เต็มชุดหลังแก้เสร็จ เทียบ baseline ปัจจุบัน (341 tests, 336 passed, 5
pre-existing failure ที่ไม่เกี่ยวข้อง) ต้องได้ผลเท่าเดิมบวก test ใหม่ทั้งหมดผ่าน
