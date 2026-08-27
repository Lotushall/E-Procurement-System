# สร้าง/แก้ไข internal user: เปลี่ยนจากกรอกข้อมูลพนักงานเป็นเลือก Internal Profile ที่มีอยู่แล้ว (backend only)

Date: 2026-08-27

## บริบท

ปัจจุบัน `POST /api/v1/dashboard/users` (สร้าง internal user) และ `PATCH /api/v1/dashboard/users/{id}`
(กรณี target เป็น internal user) รับข้อมูลโปรไฟล์พนักงานตรงๆ ในฟอร์ม
(`prefix`, `firstname`, `lastname`, `employeeNo`, `departmentId`, `positionId`, `phone`)
แล้ว `CreateInternalUserUseCase` จะสร้าง `InternalProfile` ใหม่ผูกกับ user ที่สร้าง
(ดู `docs/superpowers/specs/2026-08-14-user-management-create-edit-design.md`)

ตั้งแต่มี migration `2026_08_25_134436_update_internal_profiles_make_user_id_nullable`
ทำให้ `internal_profiles.user_id` เป็น nullable ได้ และมีโมดูล internal-employees
แยกต่างหาก (`StoreInternalProfileRequest`/`CreateInternalProfileUseCase`) ที่สร้าง
"พนักงาน" โดยไม่ผูก user เลย (`userId: null` เสมอ) — พนักงานกับบัญชี login
จึงกลายเป็นคนละเรื่องกันแล้ว และการกรอกข้อมูลพนักงานซ้ำตอนสร้าง user
เป็นการกรอกข้อมูลซ้ำที่ไม่จำเป็น

**เป้าหมาย**: เปลี่ยนให้ตอนสร้าง user (internal) เลือก Internal Profile
ที่มีอยู่แล้วและยังไม่ผูก user (`user_id IS NULL`) แทนการกรอกข้อมูลพนักงานเอง
ส่วนตอนแก้ไข user เอาข้อมูลโปรไฟล์ออกจากฟอร์มไปเลย (แก้ข้อมูลพนักงานจริงๆ
ต้องไปที่หน้า internal-employees แทน)

## ขอบเขต

**Backend เท่านั้น** — frontend (เอาช่องกรอกข้อมูลพนักงานออก เปลี่ยนเป็น dropdown
เลือก) เป็นอีก spec/session แยกต่างหาก

## Design

### 1. Request validation

`StoreUserRequest::rules()`: แทนที่ฟิลด์โปรไฟล์ทั้ง 7 ตัวด้วยฟิลด์เดียว

```php
'internalProfileId' => ['required', 'integer', Rule::exists('internal_profiles', 'id')->whereNull('user_id')],
```

เงื่อนไข `whereNull('user_id')` ครอบคลุมทั้งกรณี id ไม่มีอยู่จริง และกรณี id
มีอยู่แต่ถูกผูกกับ user คนอื่นไปแล้ว ในกฎเดียว

`UpdateUserRequest::rules()`: เอาฟิลด์โปรไฟล์ทั้ง 7 ตัวออกจาก branch ของ
internal user ทั้งหมด (ย้อนกลับการแก้ไขที่เพิ่งเพิ่มเข้าไปก่อนหน้านี้ในเซสชันนี้)
เหลือแค่ `role` + `permissions` เพิ่มจาก rule ร่วม (`username`/`email`/`password`)
เหมือนก่อนที่ฟิลด์โปรไฟล์จะถูกเพิ่มเข้ามาครั้งแรก — การแก้ไขโปรไฟล์พนักงาน
ไม่ทำผ่าน endpoint นี้อีกต่อไป

### 2. DTOs

- `CreateInternalUserData`: เอาฟิลด์โปรไฟล์ 7 ตัวออก เพิ่ม
  `public readonly int $internalProfileId`
- `UpdateInternalUserData`: เอาฟิลด์โปรไฟล์ 7 ตัวออกทั้งหมด (ไม่มีตัวแทน)
  เหลือ `username`, `email`, `role`, `password`, `permissions`

### 3. Domain + Use Cases

`InternalProfile` entity เพิ่ม mutator สำหรับผูก user (ทำให้ `$userId` เลิก
เป็น `readonly`) เพื่อบังคับ invariant "ผูกซ้ำไม่ได้" ที่ระดับ domain ด้วย
(defense in depth เผื่อกรณี race condition เล็กน้อยระหว่าง validate กับ
execute ที่ rule ชั้น request คุมไม่ถึง):

```php
public function linkToUser(int $userId): void
{
    if ($this->userId !== null) {
        throw new \LogicException('Internal profile is already linked to a user.');
    }

    $this->userId = $userId;
}
```

`CreateInternalUserUseCase::execute()`: แทนที่การสร้าง `InternalProfile` ใหม่
ด้วยการดึงโปรไฟล์ที่เลือกมา แล้วผูกกับ user ที่เพิ่งสร้าง:

```php
$profile = $this->internalProfiles->findById($data->internalProfileId)
    ?? throw (new ModelNotFoundException)->setModel(InternalProfile::class, [$data->internalProfileId]);
$profile->linkToUser($user->id());
$this->internalProfiles->saveProfile($profile);
```

`UpdateInternalUserUseCase::execute()`: เอาโค้ดที่แตะ `internal_profiles`
ออกทั้งหมด (ไม่ต้อง inject `InternalProfilesRepositoryInterface` อีกต่อไป,
ไม่ import `InternalProfile`/`PhoneNumber`) เหลือแค่เปลี่ยน
username/email/password + sync role/permissions

### 4. Endpoint ใหม่สำหรับ picker

`GET /api/v1/dashboard/internal-profiles/select-available` — เพิ่มใน route
group เดิมของ `internal-profiles` (`routes/api/v1/dashboard/internal-profiles.php`)
คุมด้วย `role:admin` เหมือน route ข้างเคียง (สอดคล้องกับ pattern ของ
`departments/select`, `positions/select` ใน
`docs/superpowers/specs/2026-08-24-internal-profiles-select-cache-design.md`)

- `ListAvailableInternalProfilesQuery` (ใหม่ ใน `InternalProfiles/Application/Queries/`):
  query `InternalProfiles::whereNull('user_id')->orderBy('firstname')->get()`
  แล้ว map เป็น `array{id: int, name: string}[]` โดย `name` ประกอบจาก
  `prefix firstname lastname` (+ ` (employeeNo)` ถ้ามี)
- **ไม่ cache** — ต่างจาก `ListDepartmentOptionsQuery`/`ListPositionOptionsQuery`
  ที่ cache ถาวรเพราะข้อมูลเปลี่ยนน้อย รายการนี้เปลี่ยนทุกครั้งที่มีการสร้าง
  user ใหม่ (โปรไฟล์หลุดออกจาก pool) หรือลบ user (โปรไฟล์กลับเข้า pool ผ่าน
  `nullOnDelete`) การ cache จะต้องเพิ่ม cross-module invalidation จาก User
  module เข้าไปที่ InternalProfiles module ซึ่งไม่คุ้มกับ dataset ที่คาดว่า
  จะเล็ก (พนักงานที่ยังไม่มี login)
- เพิ่ม action `selectAvailable()` ใน `InternalProfilesController` เดิม
  (ไม่สร้าง controller ใหม่)

### 5. ผลกระทบต่อ test เดิม (แก้ ไม่ลบ)

- `StoreUserTest`: payload เปลี่ยนจาก `firstname`/`lastname`/... เป็น
  `internalProfileId`; เพิ่ม case โปรไฟล์ไม่มีอยู่จริง/ถูกผูกไปแล้ว
- `UpdateUserTest`: ตัด assertion เรื่อง `firstname`/`lastname` ออกจาก
  test "requires firstname, lastname, and role" (เหลือแค่ require role);
  test "updated with full profile, role, and permissions" ตัดส่วน assert
  `internal_profiles` ออก (endpoint นี้ไม่แตะตารางนั้นแล้ว)
- `CreateInternalUserUseCaseTest` / `UpdateInternalUserUseCaseTest`:
  ปรับให้ตรงกับ DTO ใหม่
- เพิ่ม test ใหม่: `select-available` endpoint (auth, role:admin, กรอง
  เฉพาะ `user_id IS NULL`), และ "สร้าง user ด้วย internalProfileId ที่ถูก
  ผูกไปแล้ว → 422"

## Out of scope

- Frontend: เอาช่องกรอกข้อมูลพนักงานออกจากฟอร์ม, เปลี่ยนเป็น dropdown/combobox
  เลือก `internalProfileId` (spec/session แยก)
- การแก้ไขข้อมูลพนักงาน (firstname/lastname/department/position/phone) หลัง
  ผูกกับ user แล้ว — ยังคงทำผ่านหน้า internal-employees เท่านั้น ไม่มีทางแก้
  จากหน้า user
- Bulk/relink: เปลี่ยน internal profile ที่ผูกกับ user ที่มีอยู่แล้วไปเป็นคนละ
  โปรไฟล์ (ไม่มี use case สำหรับ "ย้าย" การผูก)
