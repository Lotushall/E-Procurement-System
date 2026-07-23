# ลบเอกสาร vendor + เพิ่ม id ใน document resource (backend only)

Date: 2026-07-23
Status: Approved

## บริบท / ปัญหา

เอกสารของ vendor (`vendor_documents` table) ถูก key ด้วย `(vendor_profile_id, document_type)` อยู่แล้ว —
`VendorRepository::findDocumentByVendorProfileIdAndType()` ใช้คู่นี้หาเอกสารตอนอัปโหลด/reupload ผ่าน
`UpdateVendorDocumentUseCase` ไม่ได้มีบั๊กแบบเดียวกับ vendor contact (ที่เคยหยิบตัวแรกแบบสุ่ม ๆ)

แต่ยังไม่มีทางลบเอกสารเลย — `VendorController` ไม่มี action ลบ, `routes/api/v1/vendor.php` ไม่มี route
ลบ, `VendorRepositoryInterface` ไม่มี method ลบ และฝั่ง frontend (`DocumentRow`'s `handleDelete`) ก็เป็นแค่
`console.log` placeholder ยังไม่ได้ยิง API ไปไหน (นอกขอบเขตงานนี้ — งานนี้ทำแค่ backend)

`VendorDocumentResource` ก็ยังไม่คืน `id` ของ document กลับไปด้วย ซึ่งจำเป็นสำหรับ endpoint ลบที่จะสร้าง
ในงานนี้ (ต้องรู้ id ของแถวที่จะลบ)

`UpdateVendorDocumentUseCase` มี private method `resubmitProfileIfNeeded()` ที่ resubmit vendor profile
กลับเป็น pending อัตโนมัติถ้า profile ไม่ pending อยู่แล้วและมีการแก้เอกสาร — use case ลบเอกสารใหม่ที่จะสร้าง
ในงานนี้ต้องมี behavior เดียวกันเป๊ะ ๆ

## เป้าหมาย

1. `VendorDocumentResource` คืน `id` มาด้วย
2. `DELETE /api/v1/vendor/document/{id}` (route ใหม่, `whereNumber('id')`) ลบเอกสารที่ id ตรงกัน **และ**
   เป็นของ vendor profile ของผู้เรียกเท่านั้น — ลบทั้งแถวใน DB และไฟล์จริงใน storage
3. ลบเอกสารสำเร็จแล้ว trigger resubmit profile แบบเดียวกับตอนอัปโหลด/reupload (ถ้า profile ไม่ pending
   อยู่แล้ว)
4. `id` ที่ส่งมาไม่ใช่ของ vendor ตัวเอง (หรือไม่มีอยู่จริง) → ปฏิเสธ ไม่มีอะไรถูกลบ (ทั้ง DB row และไฟล์)
5. ไม่ duplicate logic "resubmit ถ้าไม่ pending" — ดึงออกมาเป็นคลาสใช้ร่วมกันระหว่าง update กับ delete

## Non-goals

- ไม่แตะ frontend ใด ๆ ในงานนี้ (types.ts, api.ts, mutations.ts, DocumentRow, delete dialog) — ผู้ใช้ระบุ
  ให้ทำแค่ backend ก่อน ฝั่ง UI จะยิง API นี้ทีหลังในงานแยก
- ไม่รองรับหลายไฟล์ต่อ document type เดียวกัน — ยังคง 1 ไฟล์ต่อ 1 type ต่อ 1 vendor เหมือนเดิม
  (`findDocumentByVendorProfileIdAndType` ไม่เปลี่ยน)
- ไม่เปลี่ยนวิธีจัดการ error ของ `VendorController` (ยัง catch(Throwable) แล้วตอบ 500 ข้อความไทยเหมือนเดิม
  ทุก action ในไฟล์นี้ — id ไม่ตรง vendor ก็ตกไปทาง error path เดียวกัน ไม่ทำ 403/404 แยก เหมือนที่ตัดสินใจ
  ไว้กับ endpoint แก้ contact)
- ไม่เพิ่ม soft-delete หรือ audit trail ของไฟล์ที่ถูกลบ — ลบจริงทั้ง DB row และไฟล์ใน storage

## Design

### `VendorDocumentResource`

เพิ่ม `'id' => $this->id` เป็น key แรก (ตาม pattern เดียวกับ `VendorContactResource`)

### Route (`routes/api/v1/vendor.php`)

```php
Route::delete('document/{id}', [VendorController::class, 'deleteVendorDocument'])
    ->whereNumber('id')
    ->name('vendor.document.delete');
```

`whereNumber('id')` ทำให้ id ที่ไม่ใช่ตัวเลขได้ 404 ตั้งแต่ระดับ routing เลย ไม่ต้องเช็คซ้ำใน request/controller

### `VendorController::deleteVendorDocument()`

ตาม pattern เดียวกับ action อื่นทุกอันในไฟล์นี้ (resolve vendor profile จาก `$request->user()->id`,
เรียก use case, catch(Throwable) → 500):

```php
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
```

`int $id` รับค่าจาก route param — PHP coerce string ตัวเลขเป็น int อัตโนมัติ (non-strict mode ของไฟล์นี้
ตาม convention เดิมของ codebase ที่ไม่ประกาศ `declare(strict_types=1)`)

### `VendorRepositoryInterface` / `VendorRepository`

เพิ่ม method ใหม่ (method ใหม่จริง ๆ ต่างจาก contact ที่ reuse ของเดิมได้ เพราะยังไม่เคยมี delete มาก่อน):

```php
public function deleteDocument(VendorDocument $document): void;
```

Implementation:

```php
public function deleteDocument(VendorDocument $document): void
{
    VendorDocuments::findOrFail($document->id())->delete();
}
```

รับ domain entity เข้ามา (ไม่ใช่แค่ int id) ให้สอดคล้องกับ pattern เดิมของ repository นี้ที่ทุก
save method รับ entity (`saveContact`, `saveDocument`, `saveProfile`)

### `App\Modules\Vendor\Application\Services\ResubmitVendorProfileOnChange` (ใหม่)

ดึง logic ที่ตอนนี้เป็น private method ใน `UpdateVendorDocumentUseCase::resubmitProfileIfNeeded()` ออกมา
เป็นคลาสเดียวใช้ร่วมกัน:

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

`UpdateVendorDocumentUseCase` แก้เป็น: ลบ private method `resubmitProfileIfNeeded()` เดิมออก, inject
`ResubmitVendorProfileOnChange $resubmitter` เข้า constructor แทน, เปลี่ยนบรรทัดเรียกจาก
`$this->resubmitProfileIfNeeded($vendorProfileId)` เป็น `($this->resubmitter)($vendorProfileId)`
พฤติกรรมเดิมไม่เปลี่ยน — เทสต์เดิมของไฟล์นี้ (`UpdateVendorDocumentUseCaseTest.php`) ต้องผ่านเหมือนเดิมทุกตัว

### `DeleteVendorDocumentUseCase` (ใหม่)

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

`findOwnedDocument()` ใช้ `findDocumentsByVendorProfileId()` ที่มีอยู่แล้ว (ไม่เพิ่ม method หาเฉพาะใน
interface) — เหมือน `findOwnedContact()` ที่ทำไว้กับ contact, เหตุผลเดียวกัน (จำนวน document ต่อ vendor
น้อย ไม่คุ้มเพิ่ม query เฉพาะ) `DB::transaction` + throw-before-delete รับประกันว่า id ไม่ตรง vendor แล้ว
ไม่มีอะไรถูกลบทั้ง DB และไฟล์

### `VendorController` constructor

เพิ่ม `private readonly DeleteVendorDocumentUseCase $deleteVendorDocument` เป็น dependency ใหม่

## Testing

`tests/Feature/Modules/Vendor/DeleteVendorDocumentUseCaseTest.php` (ใหม่, mirror pattern ของ
`UpdateVendorDocumentUseCaseTest.php` — ใช้ `Storage::fake('local')`, `assertDatabaseHas/Missing`,
`Storage::disk('local')->assertMissing(...)`):

- ลบ document ที่เป็นของ vendor ตัวเอง → แถว DB หายไป, ไฟล์ใน storage หายไปด้วย
- ลบ document ที่ id ไม่ใช่ของ vendor ตัวเอง (เป็นของ vendor อื่น) → throw `ModelNotFoundException`,
  แถว DB และไฟล์ของ vendor อื่นยังอยู่ครบ
- ลบ document id ที่ไม่มีอยู่จริงเลย → throw `ModelNotFoundException`
- ลบ document แล้ว profile ที่เคย approve ไปแล้ว resubmit กลับเป็น pending อัตโนมัติ (mirror เทสต์
  resubmit เดิมของ update)
- ลบ document แล้ว profile ที่ยัง pending อยู่แล้ว ไม่ error อะไร (mirror เทสต์เดิมของ update)

`tests/Feature/Modules/Vendor/UpdateVendorDocumentUseCaseTest.php` (เดิม, ไม่แก้เนื้อหา — แค่ต้องผ่านเหมือน
เดิมหลัง refactor `ResubmitVendorProfileOnChange`):
- รันซ้ำเพื่อ confirm ว่า refactor ไม่ทำให้ behavior เปลี่ยน

`tests/Feature/Modules/Vendor/UpdateVendorDocumentTest.php` (feature test เดิม ผ่าน HTTP) — เพิ่ม 1 เทสต์
ใหม่ต่อท้าย:
- `DELETE /api/v1/vendor/document/{id}` ที่ id เป็นของ vendor ตัวเอง → 200, แถว DB หายไป
