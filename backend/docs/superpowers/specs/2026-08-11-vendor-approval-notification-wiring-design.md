# Wire vendor approve/reject to send notifications (with per-action email toggle)

Date: 2026-08-11
Status: Approved

## บริบท / ปัญหา

`2026-08-08-vendor-notification-system-design.md` วางแผน backend notification system สำหรับ 4 event
(approve/reject profile, approve/reject document) ไว้แล้วและ implement ไปครั้งหนึ่ง แต่ implementation
นั้นถูก reset ทิ้งไปทั้งหมดโดยตั้งใจ (ดู `2026-08-10-notification-module-design.md`) ก่อนจะแยกกลไกส่งออกมา
เป็น module กลาง `App\Modules\Notification` (`NotificationSenderInterface::send(array $userIds,
Notification $notification): void`) ซึ่ง implement เสร็จแล้วในรอบล่าสุด แต่ยังไม่ได้ wire เข้ากับ use case
ใด ๆ จริง

งานนี้คือการ wire 4 use case ของ Vendor เข้ากับกลไกส่งที่มีอยู่แล้ว พร้อมเพิ่มความสามารถใหม่ที่ design เดิม
ไม่มี: **admin เลือกได้ต่อครั้งที่กด approve/reject ว่าจะส่งอีเมลด้วยหรือไม่** (database notification ส่ง
เสมอ ไม่มีทางปิด)

## ขอบเขต (ยืนยันกับ user แล้ว)

- ครอบทั้ง 4 event: `ApproveVendorProfileUseCase`, `RejectVendorProfileUseCase`,
  `ApproveVendorDocumentUseCase`, `RejectVendorDocumentUseCase`
- Toggle อีเมลเป็น **checkbox ต่อครั้งที่ action** (ไม่ใช่ setting กลางที่ตั้งครั้งเดียว) — ส่งมาเป็น field
  `send_email` ใน request body ของแต่ละ action
- **ขอบเขต session นี้จำกัดเฉพาะ backend** — รับ `send_email` จาก request, validate, ส่งต่อเข้า use case,
  ควบคุม channel ของ notification ตามค่านั้น **ไม่ทำ UI toggle ฝั่ง frontend ในงานนี้** (เป็นงานแยกอีก
  session)
- ถ้า frontend ไม่ส่ง `send_email` มาเลย (เช่นก่อน frontend ทำ UI toggle เสร็จ) **default เป็น `true`**
  (ส่งอีเมลเป็นค่าเริ่มต้น เหมือน design เดิมที่ยังไม่มี toggle)
- Notification class อยู่ใน `App\Modules\Vendor\Infrastructure\Notifications` (ไม่ใช่ใน Notification
  module กลาง) — ตรงตามที่ตกลงไว้ตอนออกแบบ Notification module ว่า module กลางมีแค่กลไกส่ง เนื้อหา/ข้อความ
  เฉพาะ domain เป็นของแต่ละ module ที่ใช้งาน
- เนื้อหาข้อความไทยใช้ตามที่เคยออกแบบไว้ใน `2026-08-08-vendor-notification-system-design.md` (spec นั้นยัง
  valid ในแง่เนื้อหา แค่ architecture การส่งเปลี่ยนไปใช้ `NotificationSenderInterface` กลางแทน
  `VendorNotifierInterface` เฉพาะ module)

## Notification classes — `App\Modules\Vendor\Infrastructure\Notifications`

4 คลาสแยกตาม event (ตรงกับ pattern เดิม ไม่รวมเป็นคลาสเดียวรับ status parameter):

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class VendorProfileApprovedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly bool $sendEmail = true,
    ) {}

    public function via(object $notifiable): array
    {
        return $this->sendEmail ? ['database', 'mail'] : ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'vendor_profile_approved',
            'message' => 'โปรไฟล์ผู้ค้าของคุณได้รับการอนุมัติแล้ว',
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('โปรไฟล์ผู้ค้าของคุณได้รับการอนุมัติ')
            ->greeting("เรียนคุณ {$notifiable->username}")
            ->line('โปรไฟล์ผู้ค้าของคุณได้รับการอนุมัติแล้ว คุณสามารถเข้าใช้งานระบบจัดซื้อได้ตามปกติ');
    }
}
```

`VendorProfileRejectedNotification`:
```php
<?php

namespace App\Modules\Vendor\Infrastructure\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class VendorProfileRejectedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $remark,
        private readonly bool $sendEmail = true,
    ) {}

    public function via(object $notifiable): array
    {
        return $this->sendEmail ? ['database', 'mail'] : ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'vendor_profile_rejected',
            'message' => "โปรไฟล์ผู้ค้าของคุณถูกปฏิเสธ: {$this->remark}",
            'remark' => $this->remark,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('โปรไฟล์ผู้ค้าของคุณถูกปฏิเสธ')
            ->greeting("เรียนคุณ {$notifiable->username}")
            ->line('โปรไฟล์ผู้ค้าของคุณถูกปฏิเสธ ด้วยเหตุผลดังนี้')
            ->line($this->remark);
    }
}
```

`VendorDocumentApprovedNotification`:
```php
<?php

namespace App\Modules\Vendor\Infrastructure\Notifications;

use App\Modules\Vendor\Infrastructure\Notifications\Support\DocumentTypeLabels;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class VendorDocumentApprovedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $documentType,
        private readonly bool $sendEmail = true,
    ) {}

    public function via(object $notifiable): array
    {
        return $this->sendEmail ? ['database', 'mail'] : ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $label = DocumentTypeLabels::label($this->documentType);

        return [
            'type' => 'vendor_document_approved',
            'message' => "เอกสาร{$label}ของคุณได้รับการอนุมัติแล้ว",
            'document_type' => $this->documentType,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $label = DocumentTypeLabels::label($this->documentType);

        return (new MailMessage)
            ->subject("เอกสาร{$label}ของคุณได้รับการอนุมัติ")
            ->greeting("เรียนคุณ {$notifiable->username}")
            ->line("เอกสาร{$label}ของคุณได้รับการอนุมัติแล้ว");
    }
}
```

`VendorDocumentRejectedNotification`:
```php
<?php

namespace App\Modules\Vendor\Infrastructure\Notifications;

use App\Modules\Vendor\Infrastructure\Notifications\Support\DocumentTypeLabels;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class VendorDocumentRejectedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $documentType,
        private readonly string $remark,
        private readonly bool $sendEmail = true,
    ) {}

    public function via(object $notifiable): array
    {
        return $this->sendEmail ? ['database', 'mail'] : ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $label = DocumentTypeLabels::label($this->documentType);

        return [
            'type' => 'vendor_document_rejected',
            'message' => "เอกสาร{$label}ของคุณถูกปฏิเสธ: {$this->remark}",
            'document_type' => $this->documentType,
            'remark' => $this->remark,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $label = DocumentTypeLabels::label($this->documentType);

        return (new MailMessage)
            ->subject("เอกสาร{$label}ของคุณถูกปฏิเสธ")
            ->greeting("เรียนคุณ {$notifiable->username}")
            ->line("เอกสาร{$label}ของคุณถูกปฏิเสธ ด้วยเหตุผลดังนี้")
            ->line($this->remark);
    }
}
```

### `App\Modules\Vendor\Infrastructure\Notifications\Support\DocumentTypeLabels`

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Notifications\Support;

final class DocumentTypeLabels
{
    private const LABELS = [
        'company_certificate' => 'หนังสือรับรองบริษัท',
        'authorized_person_id' => 'สำเนาบัตรประชาชนกรรมการผู้มีอำนาจ',
        'vat_registration' => 'ใบทะเบียนภาษีมูลค่าเพิ่ม',
        'shareholder_list' => 'บัญชีรายชื่อผู้ถือหุ้น (บอจ.5)',
        'financial_statement' => 'งบการเงิน / หนังสือรับรองฐานะการเงิน',
        'citizen_id' => 'สำเนาบัตรประชาชน',
        'house_registration' => 'สำเนาทะเบียนบ้าน',
        'commercial_registration' => 'ทะเบียนพาณิชย์',
    ];

    public static function label(string $documentType): string
    {
        return self::LABELS[$documentType] ?? $documentType;
    }
}
```

Fallback คืนค่า key ดิบเมื่อไม่รู้จัก (ไม่ throw) — เหตุผลเดียวกับ design เดิม: label list sync กับ
frontend ด้วยมือ ไม่ใช่ invariant ที่การันตีได้

## Application layer — แก้ 4 use case (`App\Modules\Vendor\Application\Dashboard\UseCases`)

Inject `NotificationSenderInterface $notifications` เพิ่มในทุก constructor, `execute()` เพิ่ม
`bool $sendEmail = true` เป็น parameter สุดท้าย, เรียก `notifications->send()` หลัง save สำเร็จ (ก่อน
`app_log(...)`):

**`ApproveVendorProfileUseCase`**:
```php
public function execute(int $vendorProfileId, int $verifiedBy, ?string $remark = null, bool $sendEmail = true): void
{
    $profile = $this->vendors->findProfileById($vendorProfileId);

    if ($profile === null) {
        throw new ModelNotFoundException("Vendor profile {$vendorProfileId} not found.");
    }

    $profile->approve($verifiedBy, $remark);
    $this->vendors->saveProfile($profile);

    $this->notifications->send([$profile->userId()], new VendorProfileApprovedNotification($sendEmail));

    app_log('Vendor profile approved', [...], 'info', 'vendor');
}
```

**`RejectVendorProfileUseCase`**: เหมือนกัน แต่เรียก
`new VendorProfileRejectedNotification($remark, $sendEmail)`

**`ApproveVendorDocumentUseCase`**: `VendorDocument` entity ไม่มี `userId()` ตรง ๆ (รู้แค่
`vendorProfileId()`) จึงต้อง `findProfileById($vendorProfileId)` เพิ่มอีกครั้งเพื่อได้ `userId()` — เพิ่ม
null-check throw `ModelNotFoundException` ตาม pattern เดียวกับ null-check อื่นในไฟล์เดียวกัน (ก่อนเรียก
`notifications->send()`):
```php
public function execute(int $vendorProfileId, int $documentId, int $verifiedBy, bool $sendEmail = true): void
{
    $document = $this->vendors->findDocumentByVendorProfileIdAndId($vendorProfileId, $documentId);

    if ($document === null) {
        throw new ModelNotFoundException(
            "Vendor document {$documentId} not found for vendor profile {$vendorProfileId}."
        );
    }

    $document->approve($verifiedBy);
    $this->vendors->saveDocument($document);

    $profile = $this->vendors->findProfileById($vendorProfileId);

    if ($profile === null) {
        throw new ModelNotFoundException("Vendor profile {$vendorProfileId} not found.");
    }

    $this->notifications->send(
        [$profile->userId()],
        new VendorDocumentApprovedNotification($document->documentType(), $sendEmail)
    );

    app_log('Vendor document approved', [...], 'info', 'vendor');
}
```

**`RejectVendorDocumentUseCase`**: เหมือนกัน แต่เรียก
`new VendorDocumentRejectedNotification($document->documentType(), $remark, $sendEmail)`

## Presentation layer

**`ApproveVendorRequest`**, **`RejectVendorRequest`**, **`RejectVendorDocumentRequest`** — เพิ่ม field:
```php
'send_email' => ['sometimes', 'boolean'],
```

**`ApproveVendorDocumentRequest`** (ไฟล์ใหม่ — action นี้ไม่มี FormRequest มาก่อน ใช้ `Request` เปล่า ๆ):
```php
<?php

namespace App\Modules\Vendor\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ApproveVendorDocumentRequest extends FormRequest
{
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
            'send_email' => ['sometimes', 'boolean'],
        ];
    }
}
```

**`VendorApprovalController`** — แก้ 4 action ให้อ่าน `$request->boolean('send_email', true)` แล้วส่งต่อ
เข้า use case, `approveDocument` เปลี่ยน type-hint จาก `Request` เป็น `ApproveVendorDocumentRequest` ใหม่:
```php
public function approve(ApproveVendorRequest $request, int $id): JsonResponse
{
    $this->approveVendorProfile->execute(
        $id,
        $request->user()->id,
        $request->validated('remark'),
        $request->boolean('send_email', true),
    );

    return $this->vendorResponse($id);
}
```
(`reject`, `approveDocument`, `rejectDocument` ปรับรูปแบบเดียวกัน)

## Provider

`VendorServiceProvider` ไม่ต้องแก้ — `NotificationSenderInterface` ถูก bind ไว้แล้วใน
`NotificationServiceProvider` ที่ auto-register ผ่าน `modules_statuses.json`, use case แค่ inject ผ่าน
constructor แล้ว container resolve ให้เอง

## Error handling / edge case ที่ตั้งใจไม่จัดการ

- Idempotent no-op re-action (approve/reject ซ้ำที่ไม่เปลี่ยน state จริง) ยังส่ง notification/email ซ้ำอีก
  รอบเหมือน design เดิม — ยอมรับพฤติกรรมนี้ด้วยเหตุผลเดียวกัน (frontend ซ่อนปุ่มตาม status)
- ไม่มี try/catch ครอบการ notify — ปล่อยให้ request fail ทั้งเส้นถ้า queue/DB มีปัญหา ไม่ silent-swallow

## Out of scope

- UI toggle ฝั่ง frontend (checkbox "ส่งอีเมลด้วย" ในหน้า approve/reject) — session แยก
- API endpoints สำหรับ list/mark-as-read notification — งานแยกในอนาคตเหมือนเดิม
- Setting กลางที่ตั้งครั้งเดียวสำหรับเปิด/ปิดอีเมล — ยืนยันแล้วว่าต้องการ toggle ต่อ action เท่านั้น

## Testing

เพิ่ม `Notification::fake()` และ assertion เข้าไปในไฟล์ test เดิมทั้ง 4 ไฟล์
(`tests/Feature/Modules/Vendor/ApproveVendorProfileUseCaseTest.php`,
`RejectVendorProfileUseCaseTest.php`, `ApproveVendorDocumentUseCaseTest.php`,
`RejectVendorDocumentUseCaseTest.php`):
- `assertSentTo` ยืนยันว่า notification ส่งถึง user ที่เป็นเจ้าของ profile/document (ไม่ใช่ admin ที่กด
  action)
- เทสต์ `sendEmail=true` (หรือไม่ระบุ ใช้ default) → `via()` มี `'mail'`
- เทสต์ `sendEmail=false` → `via()` ไม่มี `'mail'` (มีแค่ `'database'`)
- `toDatabase()` payload ถูกต้องตาม event (รวม `document_type`/`remark` ตามแต่ละ event)

รัน `php artisan test --compact` เต็มชุดหลังแก้เสร็จ เทียบ baseline ปัจจุบัน (318/323, 5 pre-existing
failure ที่ไม่เกี่ยวข้อง) ต้องได้ผลเท่าเดิมบวก assertion ใหม่ที่เพิ่ม
