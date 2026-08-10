# Split Vendor's Application layer into Profile/ and Dashboard/

Date: 2026-08-10
Status: Approved

## บริบท / ปัญหา

`app/Modules/Vendor/Application/` เก็บ `UseCases/`, `Queries/`, `DTOs/`, `Services/` แบบ flat ทั้งหมดในที่
เดียว แต่เนื้อหาจริง ๆ แบ่งเป็น 2 กลุ่มที่ไม่เกี่ยวข้องกันตาม caller: กลุ่มที่ vendor ใช้จัดการโปรไฟล์ตัวเอง
(เรียกผ่าน `VendorController`) กับกลุ่มที่ admin ใช้ list/approve/reject/count (เรียกผ่าน
`VendorApprovalController`) — เมื่อไฟล์เยอะขึ้นเรื่อย ๆ การแยกตาม caller/feature จะช่วยให้เห็นขอบเขตของ
แต่ละกลุ่มชัดเจนกว่าเดิม

## ขอบเขต (ยืนยันกับ user แล้ว)

- ขอบเขตจำกัดเฉพาะ `app/Modules/Vendor/Application/` — ไม่แตะ `Domain/`, `Infrastructure/`,
  `Presentation/` (นอกจาก import statement ที่ต้องแก้ตาม)
- เป็นการย้ายไฟล์ + เปลี่ยน namespace ล้วน ๆ **ไม่มี logic เปลี่ยน** — พฤติกรรมเดิมทุกอย่างต้องเหมือนเดิม
  100%
- Mapping ยืนยันกับ user แล้ว (ตรงกับ caller: `VendorController` = Profile, `VendorApprovalController` =
  Dashboard)
- โครงสร้างแบบ feature-first: `Application/Profile/{UseCases,Queries,DTOs,Services}` และ
  `Application/Dashboard/{UseCases,Queries}` (Dashboard ไม่มี DTOs/Services เพราะไม่มีไฟล์กลุ่มนี้ที่เป็น
  ของ Dashboard)

## การย้ายไฟล์ (ครบทุกไฟล์ ยืนยันด้วย grep แล้ว)

### ไป `App\Modules\Vendor\Application\Profile\UseCases`
- `UpdateVendorInfoUseCase.php`
- `SaveVendorContactUseCase.php`
- `DeleteVendorContactUseCase.php`
- `SaveVendorDocumentUseCase.php`
- `DeleteVendorDocumentUseCase.php`
- `ViewVendorDocumentUseCase.php`

### ไป `App\Modules\Vendor\Application\Profile\Queries`
- `GetVendorProfileQuery.php`

### ไป `App\Modules\Vendor\Application\Profile\DTOs`
- `UpdateVendorContactData.php`
- `UpdateVendorDocumentData.php`
- `UpdateVendorInfoData.php`

### ไป `App\Modules\Vendor\Application\Profile\Services`
- `ResubmitVendorProfileOnChange.php`

### ไป `App\Modules\Vendor\Application\Dashboard\UseCases`
- `ApproveVendorDocumentUseCase.php`
- `ApproveVendorProfileUseCase.php`
- `RejectVendorDocumentUseCase.php`
- `RejectVendorProfileUseCase.php`
- `PendingVendorDocumentUseCase.php`
- `PendingVendorProfileUseCase.php`

### ไป `App\Modules\Vendor\Application\Dashboard\Queries`
- `ListVendorProfilesQuery.php`
- `CountVendorProfilesByStatusQuery.php`
- `GetVendorProfileByIdQuery.php`

โฟลเดอร์เดิม `Application/UseCases/`, `Application/Queries/`, `Application/DTOs/`, `Application/Services/`
(รวม `.gitkeep` 2 ไฟล์ใน `UseCases/`/`DTOs/`) ถูกลบทิ้งทั้งหมดหลังย้าย เพราะไม่มีอะไรเหลืออยู่ระดับบนสุด

## จุดที่ต้องแก้ namespace/import (ยืนยันด้วย grep ครบทุกจุดแล้ว)

**ภายในไฟล์ที่ย้ายเอง** (namespace declaration + self-reference ระหว่างกัน):
- `DeleteVendorContactUseCase.php`, `DeleteVendorDocumentUseCase.php`: namespace → `...Profile\UseCases`;
  `use ...Services\ResubmitVendorProfileOnChange` → `...Profile\Services\ResubmitVendorProfileOnChange`
- `SaveVendorDocumentUseCase.php`: namespace → `...Profile\UseCases`; `use ...DTOs\UpdateVendorDocumentData`
  → `...Profile\DTOs\...`; `use ...Services\ResubmitVendorProfileOnChange` → `...Profile\Services\...`
- `SaveVendorContactUseCase.php`: namespace → `...Profile\UseCases`; `use ...DTOs\UpdateVendorContactData`
  → `...Profile\DTOs\...`
- `UpdateVendorInfoUseCase.php`: namespace → `...Profile\UseCases`; `use ...DTOs\UpdateVendorInfoData` →
  `...Profile\DTOs\...`
- `ViewVendorDocumentUseCase.php`: namespace → `...Profile\UseCases` (ไม่มี cross-reference อื่น)
- `GetVendorProfileQuery.php`: namespace → `...Profile\Queries`
- `UpdateVendorContactData.php`, `UpdateVendorDocumentData.php`, `UpdateVendorInfoData.php`: namespace →
  `...Profile\DTOs`
- `ResubmitVendorProfileOnChange.php`: namespace → `...Profile\Services`
- `ApproveVendorDocumentUseCase.php`, `ApproveVendorProfileUseCase.php`, `RejectVendorDocumentUseCase.php`,
  `RejectVendorProfileUseCase.php`, `PendingVendorDocumentUseCase.php`, `PendingVendorProfileUseCase.php`:
  namespace → `...Dashboard\UseCases` (ไม่มี cross-reference อื่นในกลุ่มนี้)
- `ListVendorProfilesQuery.php`, `CountVendorProfilesByStatusQuery.php`, `GetVendorProfileByIdQuery.php`:
  namespace → `...Dashboard\Queries`

**Consumer ภายนอก:**
- `app/Modules/Vendor/Presentation/Http/Controllers/VendorController.php` — แก้ import 7 บรรทัด (3 DTOs +
  `GetVendorProfileQuery` + 6 UseCases) ทั้งหมดเป็นกลุ่ม Profile
- `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php` — แก้ import 9 บรรทัด
  (3 Queries + 6 UseCases) ทั้งหมดเป็นกลุ่ม Dashboard
- `tests/Feature/Modules/Vendor/DeleteVendorDocumentUseCaseTest.php` — 1 import → Profile
- `tests/Feature/Modules/Vendor/DeleteVendorContactUseCaseTest.php` — 1 import → Profile
- `tests/Feature/Modules/Vendor/ViewVendorDocumentUseCaseTest.php` — 1 import → Profile
- `tests/Feature/Modules/Vendor/UpdateVendorInfoUseCaseTest.php` — 2 import (DTO + UseCase) → Profile
- `tests/Feature/Modules/Vendor/SaveVendorDocumentUseCaseTest.php` — 2 import (DTO + UseCase) → Profile
- `tests/Feature/Modules/Vendor/SaveVendorContactUseCaseTest.php` — 2 import (DTO + UseCase) → Profile
- `tests/Feature/Modules/Vendor/ApproveVendorProfileUseCaseTest.php` — 1 import → Dashboard
- `tests/Feature/Modules/Vendor/ApproveVendorDocumentUseCaseTest.php` — 1 import → Dashboard
- `tests/Feature/Modules/Vendor/RejectVendorProfileUseCaseTest.php` — 1 import → Dashboard
- `tests/Feature/Modules/Vendor/RejectVendorDocumentUseCaseTest.php` — 1 import → Dashboard
- `tests/Feature/Modules/Vendor/PendingVendorProfileUseCaseTest.php` — 1 import → Dashboard
- `tests/Feature/Modules/Vendor/PendingVendorDocumentUseCaseTest.php` — 1 import → Dashboard

`app/Modules/Vendor/Providers/VendorServiceProvider.php` ตรวจสอบแล้วไม่ได้อ้างอิงคลาสใน `Application/`
เลย (bind แค่ `VendorRepositoryInterface`) — ไม่ต้องแก้

## Out of scope

- ไม่แตะ `Domain/`, `Infrastructure/`, `Presentation/` (ยกเว้น import statement ตามรายการข้างต้น)
- ไม่เปลี่ยน logic/behavior ใด ๆ — เป็นการย้าย+เปลี่ยน namespace ล้วน ๆ

## Testing

ไม่มี logic เปลี่ยน จึงไม่ต้องเขียน test ใหม่ — test suite เดิมทั้งหมด (test file ที่ import ตรง ๆ 12 ไฟล์
ข้างบน บวก HTTP-level test อื่น ๆ ที่เรียกผ่าน route โดยไม่ได้ import class ตรง ๆ) ต้องผ่านเท่าเดิมทุกตัวหลัง
ย้ายเสร็จ — รัน `php artisan test --compact` เทียบ baseline ก่อน/หลัง (คาดว่าเหมือนเดิมทุกตัว รวม 5
pre-existing failure ที่ไม่เกี่ยวข้อง) และ `vendor/bin/pint --dirty --format agent`
