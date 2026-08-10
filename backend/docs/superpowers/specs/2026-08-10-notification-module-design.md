# Generic Notification module (send mechanism only)

Date: 2026-08-10
Status: Approved

## บริบท / ปัญหา

`2026-08-08-vendor-notification-system-design.md` (ยังอยู่ใน history ปัจจุบัน) วางแผนให้
`VendorNotifierInterface`/`VendorNotifier` อยู่ใน Vendor module ล้วน ๆ เพราะตอนนั้นยังไม่มี module อื่น
ต้องการส่ง notification จริง — งาน implementation ตาม spec นั้น (4 use case + Notification class ของ
vendor + migration) รวมถึง draft ต่อยอดที่วางแผนแยกกลไกส่งออกมาเป็น module กลาง ถูก reset ทิ้งไปทั้งหมด
โดยตั้งใจก่อนจะ merge เข้า branch (ไม่มีทั้งสองอยู่ใน working tree ปัจจุบัน แม้ spec เอกสารต้นทาง
2026-08-08 จะยังอยู่ก็ตาม)

ตอนนี้เริ่มใหม่ทั้งหมด และตัดสินใจสร้าง "กลไกการส่ง" เป็น module กลางตั้งแต่แรก แทนที่จะสร้างแบบผูกกับ
Vendor ก่อนแล้วค่อย extract ทีหลัง เพราะรู้แน่ชัดแล้วว่าจะมี module อื่นในอนาคต (เช่น Tender) ต้องส่ง
notification เหมือนกันจริง ๆ

## ขอบเขต (ยืนยันกับ user แล้ว)

- รอบนี้สร้างเฉพาะ "กลไกการส่ง" (generic interface ที่รับ user id หลายคน + notification object แล้วยิง)
  เท่านั้น
- **ไม่ wire** เข้า Vendor use cases (`ApproveVendorProfileUseCase` ฯลฯ) ในรอบนี้ — เป็นงานแยกในอนาคต
- **ไม่ทำ** read-side API (list/mark-as-read) — เป็นงานแยกในอนาคตเหมือนเดิม
- **ไม่มี** Notification class เฉพาะ domain ใด ๆ ในงานนี้ — module ที่ใช้งานจริง (Vendor, Tender ในอนาคต)
  สร้าง Notification class ของตัวเอง แล้วเรียก `NotificationSenderInterface` ตัวนี้

## Module ใหม่: `App\Modules\Notification`

สร้างด้วยมือ (ไม่ใช้ `php artisan module:make`) ตาม pattern เดียวกับที่ `Shared` module ถูกสร้าง — module
นี้ไม่มี HTTP layer เลย มีแค่ Domain + Infrastructure + Providers เทียบเท่า `Shared` ที่มีแค่
`Domain/ValueObjects` + `Providers/SharedServiceProvider.php` ไม่มี `Presentation/`, ไม่มี route

### `app/Modules/Notification/module.json`

```json
{
    "name": "Notification",
    "alias": "notification",
    "description": "",
    "keywords": [],
    "priority": 0,
    "providers": [
        "App\\Modules\\Notification\\Providers\\NotificationServiceProvider"
    ],
    "files": []
}
```

ลงทะเบียนใน `modules_statuses.json` (เพิ่ม `"Notification": true` ต่อจาก key ที่มีอยู่) — pattern เดียว
กับ `User`/`Auth`/`Vendor`/`Shared` ที่มีอยู่แล้ว ไม่ต้องมี `composer.json` แยกต่อ module (ไม่มี module ไหน
ใน repo นี้มี composer.json ของตัวเอง — autoload ผ่าน `App\` PSR-4 มาตรฐานใน root `composer.json` อยู่แล้ว)

### `app/Modules/Notification/Domain/Contracts/NotificationSenderInterface.php`

```php
<?php

namespace App\Modules\Notification\Domain\Contracts;

use Illuminate\Notifications\Notification;

interface NotificationSenderInterface
{
    /**
     * @param  int[]  $userIds
     */
    public function send(array $userIds, Notification $notification): void;
}
```

รับ `array $userIds` เดียวเท่านั้น ไม่มี method แยกสำหรับ single-user — caller ที่ส่งหาคนเดียวส่ง
`[$userId]` เข้ามา รองรับทั้งกรณีส่งคนเดียว (เช่น vendor เจ้าของโปรไฟล์) และหลายคนพร้อมกัน (เช่น Tender
แจ้ง vendor ทุกรายในอนาคต) ด้วย contract เดียว

### `app/Modules/Notification/Infrastructure/NotificationSender.php`

```php
<?php

namespace App\Modules\Notification\Infrastructure;

use App\Modules\Notification\Domain\Contracts\NotificationSenderInterface;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Notification as NotificationFacade;

final class NotificationSender implements NotificationSenderInterface
{
    public function send(array $userIds, Notification $notification): void
    {
        $users = User::query()->whereIn('id', $userIds)->get();

        NotificationFacade::send($users, $notification);
    }
}
```

`Notification module` depend เข้า `User\Infrastructure\Models\User` ตรง ๆ — เป็น cross-module dependency
เดียวกับที่ Vendor module ทำอยู่แล้ว (เช่น `VendorProfiles` ผูกกับ `User::class` ตรง ๆ) เพราะ `User` เป็น
Notifiable model เดียวในระบบตอนนี้ ไม่ทำ morph map/abstraction เพิ่มเพราะยังไม่มี Notifiable model ตัวที่
สอง

ใช้ `Notification::send($users, $notification)` facade ของ Laravel (รับ collection ยิงทีเดียว) แทนการ
loop เรียก `->notify()` ทีละ user — query `whereIn` ครั้งเดียว ไม่ N+1

**พฤติกรรมเมื่อมี id ที่ไม่มีอยู่จริงปนมาใน `$userIds`:** ส่งเท่าที่หา user เจอ ข้าม id ที่หาไม่เจอแบบ
เงียบ ๆ ไม่ throw — เพราะ semantics ของการส่งหลายคนเป็น best-effort ไม่ใช่ all-or-nothing แบบ
`findOrFail` ของ single-lookup ปกติ ถ้า id ผิดพลาดจริงเป็นหน้าที่ของ caller ตรวจสอบก่อนเรียก ไม่ใช่ให้
module นี้ throw กลางทาง ($userIds ว่างเปล่าก็เป็น no-op เช่นกัน — `whereIn` คืน empty collection,
`Notification::send()` กับ empty collection ไม่ทำอะไร)

### `app/Modules/Notification/Providers/NotificationServiceProvider.php`

```php
<?php

namespace App\Modules\Notification\Providers;

use App\Modules\Notification\Domain\Contracts\NotificationSenderInterface;
use App\Modules\Notification\Infrastructure\NotificationSender;
use Nwidart\Modules\Support\ModuleServiceProvider;

class NotificationServiceProvider extends ModuleServiceProvider
{
    /**
     * The name of the module.
     */
    protected string $name = 'Notification';

    /**
     * The lowercase version of the module name.
     */
    protected string $nameLower = 'notification';

    /**
     * Provider classes to register.
     *
     * @var string[]
     */
    protected array $providers = [];

    public function register(): void
    {
        parent::register();

        $this->app->bind(NotificationSenderInterface::class, NotificationSender::class);
    }
}
```

## Migration

รัน `php artisan make:notifications-table --no-interaction` สร้าง
`database/migrations/xxxx_xx_xx_create_notifications_table.php` (stub มาตรฐานของ Laravel ไม่ต้องแก้ไข)
— ตาราง `notifications` เป็น polymorphic (`notifiable_type`/`notifiable_id`) อยู่แล้วในตัว ไม่มีตารางนี้
ในระบบเลยตอนนี้

## Testing

เพิ่มไฟล์ใหม่ `tests/Feature/Modules/Notification/NotificationSenderTest.php` ทดสอบกลไกส่งแบบ generic
ล้วน ๆ ไม่ผูกกับ vendor — ใช้ anonymous class `extends Notification` แทนการอ้างอิง vendor notification
class ใด ๆ เพื่อพิสูจน์ว่ากลไกนี้ไม่รู้จัก domain ไหนเลยจริง ๆ:

```php
<?php

use App\Modules\Notification\Domain\Contracts\NotificationSenderInterface;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Notification as NotificationFacade;

uses(RefreshDatabase::class);

function notificationSender(): NotificationSenderInterface
{
    return app(NotificationSenderInterface::class);
}

function fakeDatabaseNotification(): Notification
{
    return new class extends Notification
    {
        public function via(object $notifiable): array
        {
            return ['database'];
        }
    };
}

test('send delivers the notification to a single user', function () {
    NotificationFacade::fake();
    $user = User::factory()->create();
    $notification = fakeDatabaseNotification();

    notificationSender()->send([$user->id], $notification);

    NotificationFacade::assertSentTo($user, $notification::class);
});

test('send delivers the notification to multiple users at once', function () {
    NotificationFacade::fake();
    $users = User::factory()->count(3)->create();
    $notification = fakeDatabaseNotification();

    notificationSender()->send($users->pluck('id')->all(), $notification);

    $users->each(fn (User $user) => NotificationFacade::assertSentTo($user, $notification::class));
});

test('send skips ids that do not exist without throwing', function () {
    NotificationFacade::fake();
    $user = User::factory()->create();
    $notification = fakeDatabaseNotification();

    notificationSender()->send([$user->id, 999999], $notification);

    NotificationFacade::assertSentTo($user, $notification::class);
});
```

## Out of scope

- Wiring เข้า Vendor use cases (`ApproveVendorProfileUseCase`, `RejectVendorProfileUseCase`,
  `ApproveVendorDocumentUseCase`, `RejectVendorDocumentUseCase`) — งานแยกในอนาคต
- Read-side API (list/mark-as-read notifications) — งานแยกในอนาคต
- Notification class ของ module ใด ๆ (Vendor, Tender ฯลฯ) — สร้างตอนที่ module นั้นเรียกใช้จริง

## Testing (regression)

รัน `php artisan test --compact` เต็มชุดหลังแก้เสร็จ ต้องได้ผลเหมือนเดิมทุกตัว บวกกับ 3 test ใหม่ใน
`NotificationSenderTest.php` ที่ต้องผ่านเพิ่ม
