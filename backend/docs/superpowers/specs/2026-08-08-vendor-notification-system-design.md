# Vendor approve/reject notifications (database + mail)

Date: 2026-08-08
Status: Approved

## บริบท / ปัญหา

ตอนนี้เมื่อ admin กด approve/reject โปรไฟล์หรือเอกสารของ vendor (4 use case ใน
`App\Modules\Vendor\Application\UseCases`: `ApproveVendorProfileUseCase`, `RejectVendorProfileUseCase`,
`ApproveVendorDocumentUseCase`, `RejectVendorDocumentUseCase`) vendor เจ้าของโปรไฟล์จะไม่ได้รับแจ้งอะไร
เลยนอกจากต้อง login เข้ามาดูเองในหน้า profile — `2026-08-07-vendor-approval-actions-design.md` ระบุ
"Any notification (email/in-app) to the vendor on status change" เป็น out-of-scope ไว้ตั้งแต่ตอนนั้น
โดยตั้งใจให้เป็นงานแยก และฝั่ง frontend เองก็มี
`frontend/docs/superpowers/specs/2026-07-25-navbar-notification-dropdown-design.md` ที่ระบุ
"เอกสารได้รับอนุมัติ/ถูกปฏิเสธ" เป็น out-of-scope ด้วยเหตุผลเดียวกัน (ยังไม่มี backend notification system)

งานนี้คือ backend notification system ที่ระบุถึงนั้น — ขอบเขตรอบนี้จำกัดเฉพาะ 4 event ข้างต้น (ยังไม่รวม
API endpoints สำหรับ list/mark-as-read และยังไม่แตะ frontend ใด ๆ ทั้งสิ้น เป็น session แยก)

## แนวทาง

ใช้ระบบ Notification ของ Laravel เอง (`Illuminate\Notifications\Notification` + `Notifiable` trait ที่
`User` model มีอยู่แล้ว, pattern เดียวกับ `QueuedVerifyEmail`/`QueuedResetPassword` ที่มีอยู่แล้วใน
`App\Modules\User\Infrastructure\Notifications`) แทนที่จะสร้างระบบแจ้งเตือนของตัวเอง — table
`notifications` ของ Laravel เป็น polymorphic (`notifiable_type`/`notifiable_id`) อยู่แล้วในตัว รองรับ
โมเดลใดก็ได้ที่ใช้ `Notifiable` โดยไม่ต้องดัดแปลงเพิ่ม

โครง Application → Infrastructure ตาม pattern ที่มีอยู่แล้วในโปรเจกต์
(`EmailVerificationSenderInterface` → `EmailVerificationSender`, bind ใน `UserServiceProvider`):
UseCase คุยกับ interface เท่านั้น ไม่ยุ่งกับ Eloquent โดยตรง

ไม่ได้ทำ interface กลางระดับ Shared module (เช่น `NotifierInterface` ที่ใช้ร่วมกันทุก module) — แต่ละ
module เป็นเจ้าของ contract ของตัวเอง (`VendorNotifierInterface` อยู่ใน Vendor module) ตรงกับที่ User
module ทำอยู่แล้วกับ `EmailVerificationSenderInterface`/`PasswordResetLinkSenderInterface` (คนละ concern
คนละ interface ไม่รวมเป็นอันเดียว) — module ถัดไปที่ต้องการแจ้งเตือน (เช่น Tender ในอนาคต) นิยาม
contract ของตัวเองตาม pattern เดียวกัน ไม่ต้องรอ shared abstraction

## Migration

รัน `php artisan make:notifications-table --no-interaction` สร้าง
`database/migrations/xxxx_xx_xx_create_notifications_table.php` (stub มาตรฐานของ Laravel ไม่ต้องแก้ไข)

## Domain layer — `App\Modules\Vendor\Domain\Contracts\VendorNotifierInterface`

```php
interface VendorNotifierInterface
{
    public function notifyProfileApproved(int $vendorProfileId): void;

    public function notifyProfileRejected(int $vendorProfileId, string $remark): void;

    public function notifyDocumentApproved(int $vendorProfileId, string $documentType): void;

    public function notifyDocumentRejected(int $vendorProfileId, string $documentType, string $remark): void;
}
```

ไม่มี `notifyProfileApproved`/`notifyDocumentApproved` รับ `remark` — approve ทั้งสอง use case มี `remark`
เป็น optional internal note อยู่แล้ว (document approve ไม่มี `remark` เลยด้วยซ้ำ) และ UI ปัจจุบันไม่เคย
โชว์ remark ตอน approve ให้ vendor เห็น (มีแค่ rejection remark ที่โชว์) — ไม่เพิ่ม field ที่ยังไม่มีใครใช้

## Infrastructure layer

### `App\Modules\Vendor\Infrastructure\Notifications\VendorNotifier`

Implement `VendorNotifierInterface` — resolve `User` (Eloquent) จาก `vendorProfileId` แล้วเรียก
`->notify()`:

```php
final class VendorNotifier implements VendorNotifierInterface
{
    public function notifyProfileApproved(int $vendorProfileId): void
    {
        $this->userFor($vendorProfileId)->notify(new VendorProfileApprovedNotification);
    }

    public function notifyProfileRejected(int $vendorProfileId, string $remark): void
    {
        $this->userFor($vendorProfileId)->notify(new VendorProfileRejectedNotification($remark));
    }

    public function notifyDocumentApproved(int $vendorProfileId, string $documentType): void
    {
        $this->userFor($vendorProfileId)->notify(new VendorDocumentApprovedNotification($documentType));
    }

    public function notifyDocumentRejected(int $vendorProfileId, string $documentType, string $remark): void
    {
        $this->userFor($vendorProfileId)->notify(new VendorDocumentRejectedNotification($documentType, $remark));
    }

    private function userFor(int $vendorProfileId): UserModel
    {
        return VendorProfiles::findOrFail($vendorProfileId)->VendorProfilesUser;
    }
}
```

`findOrFail` ปลอดภัย — ทุก caller (use case) เพิ่ง `findProfileById`/`findDocumentByVendorProfileIdAndId`
สำเร็จมาก่อนหน้านี้แล้วในธุรกรรมเดียวกัน แถวนี้มีอยู่แน่นอน

### 4 Notification classes (`App\Modules\Vendor\Infrastructure\Notifications`)

แยกคลาสตาม event (ไม่รวมเป็นคลาสเดียวรับ status parameter) ตรงกับ pattern เดิมของ `QueuedVerifyEmail`
vs `QueuedResetPassword`. ทั้ง 4 คลาส: `implements ShouldQueue`, `use Queueable`, `via()` คืน
`['database', 'mail']`:

```php
final class VendorProfileApprovedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
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

`VendorProfileRejectedNotification` รับ `string $remark` ใน constructor, `toDatabase()` เพิ่ม
`'remark' => $this->remark` และ `'message'` ที่ประกอบ remark เข้าไป, `toMail()` เพิ่ม
`->line($this->remark)` ต่อท้าย

`VendorDocumentApprovedNotification`/`VendorDocumentRejectedNotification` รับ `string $documentType`
(และ `$remark` สำหรับตัว rejected) เพิ่ม — ใช้ `DocumentTypeLabels::label($this->documentType)` แปลงเป็น
label ไทยก่อนใส่ในข้อความ ทั้ง `toDatabase()` (payload เพิ่ม `'document_type' => $this->documentType` ดิบ
ๆ ไว้ด้วยเผื่อ frontend ต้องใช้ทีหลัง) และ `toMail()`

### `App\Modules\Vendor\Infrastructure\Notifications\Support\DocumentTypeLabels`

Backend ไม่มี enum/label ของ `documentType` อยู่แล้ว (validate แค่ `string|max:255`) — ต้อง duplicate
label ไทยจาก `frontend/app/(public)/profiles/data/document-types.ts` มาไว้ฝั่ง backend เพื่อใช้ประกอบ
ข้อความแจ้งเตือน (mail/database) เก็บเป็น const array คงที่ ไม่ผูกกับ business_type (`vat_registration`
บน frontend มีคำต่อท้ายต่างกันระหว่าง company/individual — ฝั่งนี้ไม่รู้บริบทนั้น ใช้ label กลางคำเดียว):

```php
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

Fallback คืนค่า key ดิบเมื่อไม่รู้จัก (ไม่ throw) — สอง label list (frontend/backend) sync กันด้วยมือ ไม่ใช่
invariant ที่การันตีได้ จึง fallback แทนที่จะพังทั้ง request ถ้าใครเพิ่ม document type ใหม่ฝั่งเดียวแล้วลืม
อีกฝั่ง

### Bind ใน `VendorServiceProvider::register()`

```php
$this->app->bind(VendorNotifierInterface::class, VendorNotifier::class);
```

## Application layer — แก้ 4 use case เดิม

Inject `VendorNotifierInterface $notifier` เพิ่มใน constructor ของทั้ง 4 use case แล้วเรียก method
ที่ตรงกันหลัง `$this->vendors->save*()` สำเร็จ (ก่อน `app_log(...)`) เช่น `RejectVendorProfileUseCase`:

```php
$profile->reject($verifiedBy, $remark);
$this->vendors->saveProfile($profile);

$this->notifier->notifyProfileRejected($vendorProfileId, $remark);

app_log('Vendor profile rejected', [...], 'info', 'vendor');
```

ไม่มี `DB::transaction` ครอบอยู่แล้วในโค้ดเดิม (แต่ละ use case คือ `save()` แถวเดียว) จึงไม่ต้องใช้
`->afterCommit()` บน notification

## Error handling / edge case ที่ตั้งใจไม่จัดการ

- `VendorProfile::approve()`/`reject()` เป็น idempotent no-op ถ้า status ปลายทางตรงกับปัจจุบันอยู่แล้ว
  (เช่น approve ซ้ำ) แต่ use case ยังเรียก `saveProfile()` และ `notifier->notify*()` แบบไม่มีเงื่อนไข —
  หมายความว่า approve/reject ซ้ำ (ไม่เปลี่ยน state จริง) จะยังส่ง notification/email ซ้ำอีกรอบ ยอมรับ
  พฤติกรรมนี้โดยไม่เพิ่ม guard เพราะ frontend ซ่อนปุ่มตาม status อยู่แล้ว (ตาม
  `2026-08-07-vendor-approval-actions-design.md`) ทำให้ path นี้เกิดได้แค่ตอนเรียก API ตรง ๆ
- ไม่มี try/catch ครอบการ notify — ถ้า queue/DB มีปัญหาจริง ปล่อยให้ request fail ทั้งเส้นเหมือน pattern
  อื่นในระบบ ไม่ silent-swallow

## Out of scope

- API endpoints สำหรับ list/mark-as-read notification (session แยก พร้อม frontend integration)
- Notification ประเภทอื่นนอกเหนือ 4 event นี้ (เช่น ข้อความจาก admin, "pending" resubmit)
- Real-time push (WebSocket/broadcast) — database + mail เท่านั้นตอนนี้

## Testing

เพิ่ม `Notification::fake()` และ assertion (`Notification::assertSentTo($user, XxxNotification::class, fn ($n) => ...)`)
เข้าไปใน test ไฟล์เดิมทั้ง 4 ไฟล์ (`ApproveVendorProfileUseCaseTest`, `RejectVendorProfileUseCaseTest`,
`ApproveVendorDocumentUseCaseTest`, `RejectVendorDocumentUseCaseTest`) — ไม่แยกไฟล์ test ใหม่สำหรับ
`VendorNotifier` เองเพราะ 4 test ไฟล์นี้ exercise เส้นทางเต็ม (use case → notifier → notify) อยู่แล้ว
