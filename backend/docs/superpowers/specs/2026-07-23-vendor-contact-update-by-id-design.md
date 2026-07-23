# แก้ไข vendor contact แบบระบุ id (รองรับหลายผู้ติดต่อ)

Date: 2026-07-23
Status: Approved

## บริบท / ปัญหา

`POST /api/v1/vendor/contact` (`VendorController::updateVendorContact`) ใช้ endpoint เดียวกันทั้งตอน
"เพิ่มผู้ติดต่อ" และ "แก้ไขผู้ติดต่อ" (frontend มี `AddContactDialog` กับ `EditContactDialog` แยกกันแล้ว
ที่ `frontend/app/(public)/profiles/contract/_components/`) แต่ request ไม่เคยส่ง id ของ contact มาเลย

`UpdateVendorContactUseCase::execute()` ปัจจุบัน:

```php
$existing = $this->vendors->findContactsByVendorProfileId($vendorProfileId)[0] ?? null;
if ($existing === null) { /* create */ } else { /* update $existing */ }
```

หยิบ contact **ตัวแรก** ของ vendor มาแก้ทุกครั้งที่ไม่เจอค่า null ทำให้เกิด 2 บั๊ก เมื่อ vendor มีผู้ติดต่อ
มากกว่า 1 คน:

1. กด "แก้ไข" ที่ผู้ติดต่อคนที่ 2 ขึ้นไป → จริง ๆ ไปแก้คนแรกแทน
2. กด "เพิ่มผู้ติดต่อ" ทั้งที่มีอยู่แล้ว → จริง ๆ ไปทับ (update) contact ตัวแรก แทนที่จะสร้างแถวใหม่

`VendorContactResource` ก็ไม่ส่ง `id` กลับไปด้วย ฝั่ง frontend เลยไม่มีทางรู้ id ของแต่ละ contact
มาส่งกลับมาตอนแก้ไข

## เป้าหมาย

1. `POST /api/v1/vendor/contact` รับ `id` (optional, integer) เพิ่ม
   - ไม่ส่ง `id` มา → สร้าง contact ใหม่เสมอ (ไม่ fallback ไปแก้ตัวแรก)
   - ส่ง `id` มา และเป็น contact ของ vendor profile ตัวเอง → แก้ contact ตัวนั้น
   - ส่ง `id` มา แต่ไม่ใช่ของ vendor ตัวเอง (หรือไม่มีอยู่จริง) → ปฏิเสธ ไม่แก้/ไม่สร้างอะไร
2. `VendorContactResource` คืน `id` มาด้วย เพื่อให้ frontend เก็บไว้ส่งกลับตอนแก้ไข
3. Frontend: `EditContactDialog` ส่ง `id` ของ contact ที่กำลังแก้ไปด้วยทุกครั้ง

## Non-goals

- ไม่ทำ endpoint ลบ contact (`DeleteContactDialog` ฝั่ง frontend ยังเป็น placeholder อยู่ นอกขอบเขตนี้)
- ไม่เปลี่ยนวิธีจัดการ error ของ `VendorController` (ยัง catch(Throwable) แล้วตอบ 500 ข้อความไทยเหมือนเดิม
  ทุก endpoint ใน controller นี้ — id ไม่ตรง vendor ก็ตกไปทาง error path เดียวกัน ไม่ทำ 403/404 แยก)
- ไม่เพิ่ม endpoint/route ใหม่ ใช้ `POST /api/v1/vendor/contact` เดิม เพิ่มแค่ field ใน body

## Design

### `UpdateVendorContactRequest`

เพิ่ม rule:

```php
'id' => ['nullable', 'integer'],
```

### `UpdateVendorContactData`

เพิ่ม property พร้อม default `null` — field นี้เป็น field แรกที่ frontend อาจไม่ส่งมาเลย (ตอนเพิ่มผู้ติดต่อ
ใหม่ `id` จะไม่อยู่ใน payload เลย ไม่ใช่ `null`) ต่างจาก field อื่นในคลาสนี้ที่ frontend ส่งมาครบทุก field
เสมอ (แม้เป็นค่าว่าง) การไม่มี default จะทำให้ `Spatie\LaravelData\Data::from()` throw ตอน key หายไปจาก
array:

```php
public readonly ?int $id = null,
```

### `UpdateVendorContactUseCase::execute()`

```php
$existing = $data->id !== null
    ? $this->findOwnedContact($vendorProfileId, $data->id)
    : null;

if ($existing === null && $data->id !== null) {
    // ระบุ id มาแต่หาไม่เจอ/ไม่ใช่ของ vendor นี้ — ปฏิเสธ ไม่ใช่สร้างใหม่เงียบ ๆ
    throw new ModelNotFoundException("Vendor contact {$data->id} not found for vendor profile {$vendorProfileId}.");
}

if ($existing === null) {
    // ไม่มี id มา -> สร้างใหม่เสมอ (ไม่ fallback ไปแก้ตัวแรกอีกต่อไป)
    $this->vendors->saveContact(VendorContact::create(...));
    return;
}

// มี id และเจอ -> update ตามเดิม
```

`findOwnedContact()` เป็น private helper ใหม่ ใช้ `findContactsByVendorProfileId()` ที่มีอยู่แล้ว (ไม่เพิ่ม
method ใหม่ใน repository interface — จำนวน contact ต่อ vendor น้อย ไม่คุ้มเพิ่ม query เฉพาะ):

```php
private function findOwnedContact(int $vendorProfileId, int $contactId): ?VendorContact
{
    foreach ($this->vendors->findContactsByVendorProfileId($vendorProfileId) as $contact) {
        if ($contact->id() === $contactId) {
            return $contact;
        }
    }

    return null;
}
```

`ChangeLogger` context เพิ่ม `contact_id` ตอน log การ update (`context: ['vendor_profile_id' => ...,
'contact_id' => $existing->id()]`) เพื่อ debug ง่ายขึ้นเมื่อ vendor มีหลาย contact

### `VendorContactResource`

เพิ่ม `'id' => $this->id` เป็น key แรกของ array (ตาม pattern เดียวกับ `VendorProfileResource`)

### Frontend

- `lib/vendor/types.ts`: `VendorContact.id: number`, `UpdateVendorContactPayload.id?: number`
- `contract/_schemas/schema.ts`: `AddContactSchema` เพิ่ม `id: z.number().optional()`
- `contract/_components/edit-contact-dialog.tsx`: initialValues ที่ส่งให้ `useAddContactForm` เพิ่ม
  `id: contact.id`
- `add-contact-dialog.tsx`, `use-add-contact-form.ts`: ไม่แก้ (ไม่มี `id` ใน defaultValues ของฝั่ง add
  → ไม่ถูกส่งไปใน body เลย → backend สร้างใหม่ตามปกติ)

## Testing

`tests/Feature/Modules/Vendor/UpdateVendorContactUseCaseTest.php` (update test เดิม + เพิ่มใหม่):

- ส่ง `id` ของ contact ที่มีอยู่ → แก้เฉพาะ contact นั้น (ต้อง update test เดิม "execute updates the
  vendor existing contact" ให้ส่ง id ของ contact ที่สร้างไว้ก่อน)
- ไม่ส่ง `id` แม้ vendor มี contact อยู่แล้ว → สร้างแถวใหม่เพิ่ม ไม่ทับของเดิม (`assertDatabaseCount`
  เป็น 2)
- ส่ง `id` ที่เป็นของ vendor profile อื่น → `execute()` throw `ModelNotFoundException` ไม่มีการแก้ข้อมูล
  ของ contact เกิดขึ้น (contact ของเจ้าของเดิมค่าไม่เปลี่ยน)

`tests/Feature/Modules/Vendor/UpdateVendorContactTest.php`:

- request ที่มี `id` ที่ไม่ใช่ integer → 422
- (เคสอื่นตามเดิม)
