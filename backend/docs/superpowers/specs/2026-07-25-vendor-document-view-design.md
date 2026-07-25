# ดูไฟล์เอกสาร vendor (backend only)

Date: 2026-07-25
Status: Approved

## บริบท / ปัญหา

เอกสารที่ vendor อัปโหลด (`vendor_documents.file_path`) ถูกเก็บบน disk `local` ซึ่งเป็น private disk
(`SaveVendorDocumentUseCase::DISK`) — ไม่มี public URL ที่ frontend จะดึงมาแสดง/เปิดดูได้ตรง ๆ จาก
`filePath` เลย และตอนนี้ `VendorController`/`routes/api/v1/vendor.php` มีแค่ route อัปโหลด (`POST`) กับ
ลบ (`DELETE`) เอกสาร ไม่มี route ไหนคืนไฟล์กลับมาให้ดู

งานนี้เพิ่ม endpoint ให้ vendor ที่ล็อกอินอยู่ดูไฟล์เอกสารของตัวเองได้ (เปิดในแท็บใหม่ ให้เบราว์เซอร์ render
PDF/รูปภาพ inline) ฝั่ง frontend เป็นงานแยก (คนละ session/repo) จะอ้างอิง endpoint นี้

## เป้าหมาย

1. `GET /api/v1/vendor/document/{document}/view` (อยู่ใต้ `auth` middleware group เดิม) คืนไฟล์จริงของ
   เอกสารที่ id ตรงกัน **และ** เป็นของ vendor profile ของผู้เรียกเท่านั้น
2. Response เป็น inline (ไม่ force download) พร้อม content-type ที่ถูกต้องตามไฟล์จริง เพื่อให้เบราว์เซอร์
   render PDF/รูปภาพในแท็บได้เลย
3. เอกสารที่ id ไม่ใช่ของ vendor ตัวเอง (หรือไม่มีอยู่จริง) → ไม่คืนไฟล์ ปฏิเสธเหมือน endpoint อื่น ๆ

## Non-goals

- ไม่แตะ frontend ใด ๆ ในงานนี้
- ไม่เปลี่ยนวิธีจัดการ error ของ `VendorController` (ยัง catch(Throwable) แล้วตอบ 500 JSON ข้อความไทย
  เหมือนทุก action อื่นในไฟล์นี้ — id ไม่ตรง vendor ก็ตกไปทาง error path เดียวกัน ไม่ทำ 403/404 แยก
  เหมือนที่ตัดสินใจไว้กับ endpoint ลบเอกสาร/contact)
- ไม่เพิ่ม signed URL หรือ expiry — endpoint นี้พึ่ง session cookie (Sanctum SPA) ของ `auth` middleware
  เดิมเหมือน endpoint อื่นทั้งหมดในไฟล์นี้ ไม่ต้องมี token แยก

## Design

### Route (`routes/api/v1/vendor.php`)

```php
Route::get('document/{document}/view', [VendorController::class, 'viewVendorDocument'])
    ->whereNumber('document')
    ->name('vendor.document.view');
```

วางต่อจาก route `delete('document/{document}', ...)` เดิม `whereNumber('document')` ทำให้ id ที่ไม่ใช่
ตัวเลขได้ 404 ตั้งแต่ระดับ routing เหมือน pattern เดิมของ route ลบ

### `ViewVendorDocumentUseCase` (ใหม่)

```php
<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class ViewVendorDocumentUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
    ) {}

    public function execute(int $vendorProfileId, int $documentId): VendorDocument
    {
        $document = $this->vendors->findDocumentByVendorProfileIdAndId($vendorProfileId, $documentId);

        if ($document === null) {
            throw new ModelNotFoundException(
                "Vendor document {$documentId} not found for vendor profile {$vendorProfileId}."
            );
        }

        return $document;
    }
}
```

ใช้ `findDocumentByVendorProfileIdAndId()` ที่มีอยู่แล้วใน `VendorRepositoryInterface`/`VendorRepository`
(เพิ่มมาทีหลัง spec ลบเอกสาร ตอนนี้ `DeleteVendorDocumentUseCase` เองก็ใช้ method นี้แทน manual loop เดิม
แล้ว) ไม่ต้องเพิ่ม repository method ใหม่ ไม่มี state เปลี่ยนแปลง เลยไม่ต้องมี `DB::transaction`/resubmit
เหมือน use case save/delete

### `VendorController::viewVendorDocument()`

```php
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

public function viewVendorDocument(Request $request, int $document): StreamedResponse|JsonResponse
{
    $vendorProfile = $this->getVendorProfile->execute($request->user()->id);

    try {
        $document = $this->viewVendorDocument->execute($vendorProfile->id, $document);
    } catch (Throwable $th) {
        app_log('Vendor document view failed.', ['error' => $th], 'error', 'vendor');

        return response()->json(['message' => 'ไม่พบเอกสาร'], 500);
    }

    return Storage::disk('local')->response($document->filePath(), $document->fileName());
}
```

`Storage::disk('local')->response()` (ต่างจาก `->download()`) ใส่ header `Content-Disposition: inline`
เป็นค่า default และเดา `Content-Type` จากไฟล์จริงให้อัตโนมัติ — เบราว์เซอร์เลย render PDF/รูปภาพในแท็บที่
เปิดได้เลยแทนที่จะ force download

เพิ่ม `private readonly ViewVendorDocumentUseCase $viewVendorDocument` เป็น dependency ใหม่ใน
constructor ของ `VendorController`

## Testing

`tests/Feature/Modules/Vendor/ViewVendorDocumentUseCaseTest.php` (ใหม่, mirror
`DeleteVendorDocumentUseCaseTest.php`):
- เรียกด้วย vendor profile + document id ของตัวเอง → คืน `VendorDocument` entity ที่ตรงกัน
- เรียกด้วย document id ที่เป็นของ vendor อื่น → throw `ModelNotFoundException`
- เรียกด้วย document id ที่ไม่มีอยู่จริง → throw `ModelNotFoundException`

`tests/Feature/Modules/Vendor/ViewVendorDocumentTest.php` (ใหม่, mirror
`DeleteVendorDocumentTest.php`):
- `GET /api/v1/vendor/document/{id}/view` ที่ id เป็นของ vendor ตัวเอง → 200, header
  `Content-Type` ตรงกับไฟล์ที่อัปโหลด (เช่น `application/pdf`), body ตรงกับเนื้อไฟล์ที่ fake ไว้
- ไม่ได้ล็อกอิน → 401
- id เป็นของ vendor อื่น → 500 (ตาม convention เดิมของไฟล์นี้ ไม่ leak เนื้อไฟล์คนอื่น)
