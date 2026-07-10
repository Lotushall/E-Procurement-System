# Domain Entities, Value Objects, Enums, States สำหรับ User และ Vendor

Date: 2026-07-10
Status: Approved

## บริบท / ปัญหา

โปรเจกต์มี DDD module structure อยู่แล้ว (`Auth`, `User`, `Vendor`) และมี migration
(`0001_01_01_000000_create_users_table.php`) ที่รองรับตาราง `users`, `internal_profiles`,
`vendor_profiles`, `vendor_company_details`, `vendor_individual_details`, `vendor_documents`
ครบแล้ว แต่ยังไม่มีไฟล์ใน `Domain/Entities` และ `Domain/ValueObjects` เลยสักไฟล์ในทั้ง `User`
และ `Vendor` module (มีแค่โฟลเดอร์ + `.gitkeep`)

`config/modules.php` มี generator key `entities` และ `valueobjects` เตรียมไว้แล้ว
(ชี้ไป `Domain/Entities`, `Domain/ValueObjects`) แต่ยังไม่มีคำสั่ง artisan สร้างให้ — ต้องเขียน
ไฟล์เอง

flow "สมัคร Vendor" (`RegisterVendorUseCase`, `RegisterRequest`) อ้างอิงถึง
`VendorCompanyDetails`, `VendorIndividualDetails`, `VendorProfiles` (Eloquent Model
ฝั่ง Infrastructure) — ไฟล์เหล่านี้ (รวมถึง `VendorDocuments`) มีอยู่แล้วจริงตอนนี้ พร้อม
`'tax_id' => 'encrypted'` cast และ `hashTaxId()`/`hashCitizenId()` static method
(deterministic lookup hash) แต่ยังไม่มี `HasStates` cast ให้กับ `verification_status`
(`VendorProfiles`) และ `status` (`VendorDocuments`)

โปรเจกต์มี `spatie/laravel-model-states` (^2.14) ติดตั้งไว้แล้วใน `composer.json` และต้องการนำมา
ใช้กับ field สถานะที่มีลักษณะ workflow (มี transition ระหว่าง state)

## เป้าหมาย

1. สร้าง Domain Entity (plain PHP object, ไม่มี dependency กับ Eloquent) ให้ครบทุกตารางใน
   `User` และ `Vendor` module
2. สร้าง Value Object สำหรับ field ที่มี format/validation ชัดเจน: `Email`, `PhoneNumber`,
   `PostalCode` (ใช้ร่วมกันหลาย module → อยู่ใน module ใหม่ `Shared`), `TaxId`, `CitizenId`
   (เฉพาะ Vendor)
3. สร้าง PHP native backed enum สำหรับ field ที่เป็น category ไม่มี transition: `UserType`
4. สร้าง State class (`spatie/laravel-model-states`) สำหรับ field ที่เป็น workflow status:
   `UserStatus` (users.status), `VerificationStatus` (vendor_profiles.verification_status),
   `DocumentStatus` (vendor_documents.status)
5. เพิ่ม generator key `states` ใน `config/modules.php` (แพทเทิร์นเดียวกับ `entities`/
   `valueobjects`)
6. Wire `HasStates` เข้ากับ `Infrastructure/Models/User.php` ที่มีอยู่แล้ว (cast
   `status` เป็น `UserStatus::class`)
7. Wire `HasStates` เข้ากับ `Infrastructure/Models/VendorProfiles.php` (cast
   `verification_status` เป็น `VerificationStatus::class`) และ
   `Infrastructure/Models/VendorDocuments.php` (cast `status` เป็น `DocumentStatus::class`)
   ที่มีอยู่แล้วทั้งคู่

## Non-goals

- ไม่สร้าง Repository implementation หรือ mapping logic ระหว่าง Eloquent Model กับ
  Domain Entity (Repository ยังเป็น interface/class เปล่า เช่น
  `VendorRepository implements VendorRepositoryInterface {}`) — นับเป็นงานแยกในอนาคต
- ไม่แตะ `VendorCompanyDetails.php`/`VendorIndividualDetails.php` เพิ่มเติมนอกจากที่มีอยู่
  (ไม่มี status field ให้ wire state อยู่แล้ว)
- ไม่ทำ checksum validation ของเลขบัตรประชาชนไทย (`CitizenId`) — validate แค่ digits:13
- ไม่เข้ารหัส (encrypt) หรือสร้าง hash ของ `TaxId`/`CitizenId` ใน Domain VO — ของเดิม
  `VendorCompanyDetails`/`VendorIndividualDetails` จัดการ encrypt/hash ที่ Infrastructure
  layer อยู่แล้ว (`'tax_id' => 'encrypted'` cast, `hashTaxId()`/`hashCitizenId()`) ไม่ต้องแก้
- ไม่แก้ migration เดิม (native `enum` column ของ `status`/`verification_status` ยังใช้ค่า
  เดิม — แต่ละ State subclass จะประกาศ `protected static ?string $name` ให้ตรงกับค่าใน
  enum เดิมเป๊ะ)

## Design

### 1. Module ใหม่ `Shared`

สร้างผ่าน `php artisan module:make Shared` (ได้ skeleton ตาม `config/modules.php` เดิม)

```
app/Modules/Shared/Domain/ValueObjects/
  ├── Email.php
  ├── PhoneNumber.php
  └── PostalCode.php
```

แต่ละ VO เป็น `final class` มี:
- private constructor + named constructor `fromString(string $value): self` ที่ validate
  แล้ว throw `InvalidArgumentException` ถ้าไม่ผ่าน
- `public readonly string $value`
- `__toString(): string`

Validation:
| VO | กฎ |
|---|---|
| `Email` | ตรง format email (`filter_var(FILTER_VALIDATE_EMAIL)`), trim + lowercase ก่อนเก็บ |
| `PhoneNumber` | digits เท่านั้น, ความยาว 9–10 หลัก (ตรงกับ `RegisterRequest::rules()` เดิม: `digits_between:9,10`) |
| `PostalCode` | digits เท่านั้น, ความยาว 5 หลัก |

### 2. `config/modules.php`

เพิ่ม key ใหม่ในกลุ่ม Domain (ต่อจาก `valueobjects`):

```php
'states' => ['path' => 'Domain/States', 'generate' => true], // ยังไม่มีคำสั่ง ต้องเขียนเอง
```

### 3. Module `User`

```
app/Modules/User/Domain/
  ├── Enums/UserType.php
  ├── States/UserStatus.php (+ States/UserStatus/{Pending,Active,Suspended,Inactive}.php)
  └── Entities/
        ├── User.php
        └── InternalProfile.php
```

**`UserType`** — backed enum (`string`):
```php
enum UserType: string
{
    case Internal = 'internal';
    case Company = 'company';
    case Individual = 'individual';
}
```

**`UserStatus`** — abstract `Spatie\ModelStates\State`, concrete state ย่อยในโฟลเดอร์ย่อย
`States/UserStatus/`: `Pending`, `Active`, `Suspended`, `Inactive` แต่ละคลาสประกาศ
`protected static ?string $name = 'pending'` (ฯลฯ) ให้ตรงกับค่าใน migration enum เป๊ะ

Transition graph (default: `Pending`):
```
pending   -> active
active    -> suspended
suspended -> active
active    -> inactive
inactive  -> active
```

**`User` entity** (plain object, readonly properties):
```php
final class User
{
    public function __construct(
        public readonly ?int $id,
        public readonly string $username,
        public readonly Email $email,
        public readonly string $password,
        public readonly UserType $userType,
        public readonly UserStatus $status,
        public readonly ?CarbonImmutable $emailVerifiedAt,
    ) {}
}
```
(`$status` ถูกสร้างด้วย `new $stateClass($this)` — ส่ง entity เองเป็น `$model` เพื่อให้ตรง
constructor signature ของ `State` เท่านั้น จะไม่เรียก `transitionTo()` บน instance นี้
เพราะการ transition จริงต้องทำผ่าน Eloquent Model ใน Infrastructure/Repository layer)

**`InternalProfile` entity**:
```php
final class InternalProfile
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $userId,
        public readonly ?string $employeeNo,
        public readonly ?string $prefix,
        public readonly string $firstname,
        public readonly string $lastname,
        public readonly ?string $department,
        public readonly ?string $position,
        public readonly ?PhoneNumber $phone,
    ) {}
}
```

**แก้ `Infrastructure/Models/User.php`** (ไฟล์เดิม):
```php
use Spatie\ModelStates\HasStates;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, HasStates, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'status' => UserStatus::class,
        ];
    }
}
```

### 4. Module `Vendor`

```
app/Modules/Vendor/Domain/
  ├── ValueObjects/{TaxId,CitizenId}.php
  ├── States/
  │     ├── VerificationStatus.php (+ VerificationStatus/{Pending,Approved,Rejected}.php)
  │     └── DocumentStatus.php (+ DocumentStatus/{Pending,Approved,Rejected}.php)
  └── Entities/
        ├── VendorProfile.php
        ├── VendorCompanyDetail.php
        ├── VendorIndividualDetail.php
        └── VendorDocument.php
```

**`TaxId` / `CitizenId`** — เหมือน pattern เดียวกับ VO ใน Shared: `fromString()`,
validate `digits:13` เท่านั้น (ไม่ทำ checksum, ไม่เข้ารหัส)

**`VerificationStatus`** และ **`DocumentStatus`** — โครงเดียวกับ `UserStatus`
(concrete states `Pending`/`Approved`/`Rejected`, `$name` ตรงกับค่า enum เดิม)

Transition graph (ทั้งสอง state, default: `Pending`):
```
pending  -> approved
pending  -> rejected
rejected -> pending   (resubmit / re-upload)
```

**Entities:**
```php
final class VendorProfile
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $userId,
        public readonly VerificationStatus $status,
        public readonly ?CarbonImmutable $verifiedAt,
        public readonly ?int $verifiedBy,
        public readonly ?string $remark,
    ) {}
}

final class VendorCompanyDetail
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $vendorProfileId,
        public readonly string $companyName,
        public readonly ?string $businessRegistrationNo,
        public readonly TaxId $taxId,
        public readonly ?string $branchNo,
        public readonly ?string $businessType,
        public readonly ?string $address,
        public readonly ?string $country,
        public readonly ?string $province,
        public readonly ?PostalCode $postalCode,
        public readonly ?string $contactName,
        public readonly ?string $contactPosition,
        public readonly PhoneNumber $contactPhone,
        public readonly Email $contactEmail,
        public readonly ?string $lineId,
        public readonly ?string $otherContact,
    ) {}
}

final class VendorIndividualDetail
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $vendorProfileId,
        public readonly ?string $prefix,
        public readonly string $firstname,
        public readonly string $lastname,
        public readonly CitizenId $citizenId,
        public readonly ?string $shopName,
        public readonly ?string $businessType,
        public readonly ?TaxId $taxId,
        public readonly ?Email $email,
        public readonly PhoneNumber $phone,
        public readonly ?string $address,
        public readonly ?string $country,
        public readonly ?string $province,
        public readonly ?PostalCode $postalCode,
        public readonly ?string $contactName,
        public readonly ?string $lineId,
        public readonly ?string $otherContact,
    ) {}
}

final class VendorDocument
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $vendorProfileId,
        public readonly string $documentType,
        public readonly string $fileName,
        public readonly string $filePath,
        public readonly DocumentStatus $status,
        public readonly ?int $verifiedBy,
        public readonly ?CarbonImmutable $verifiedAt,
        public readonly ?string $remark,
    ) {}
}
```

### 5. Wire `HasStates` เข้ากับ Vendor Model ที่มีอยู่แล้ว

**แก้ `Infrastructure/Models/VendorProfiles.php`** (ไฟล์เดิม):
```php
use Spatie\ModelStates\HasStates;

class VendorProfiles extends Model
{
    use HasFactory, HasStates;

    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
            'verification_status' => VerificationStatus::class,
        ];
    }
}
```

**แก้ `Infrastructure/Models/VendorDocuments.php`** (ไฟล์เดิม):
```php
use Spatie\ModelStates\HasStates;

class VendorDocuments extends Model
{
    use HasFactory, HasStates;

    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
            'status' => DocumentStatus::class,
        ];
    }
}
```
(`VendorCompanyDetails`/`VendorIndividualDetails` ไม่มี status field จึงไม่แตะ)

## Testing

Pest unit test ใน `tests/Unit/Domain/{Module}/...` (ไม่ extend `TestCase`/ไม่ต้อง boot
Laravel app เพราะเป็น pure PHP — ตรงกับที่ `tests/Pest.php` ผูก `TestCase` ไว้แค่ `Feature`)

- `Shared/ValueObjects`: `EmailTest`, `PhoneNumberTest`, `PostalCodeTest` — 1 ไฟล์ต่อ VO,
  assert ทั้ง valid case และ invalid case (throw `InvalidArgumentException`)
- `Vendor/ValueObjects`: `TaxIdTest`, `CitizenIdTest` — เหมือนกัน (13 หลัก / ไม่ใช่ 13 หลัก /
  มีตัวอักษรปน)
- `User/States`: `UserStatusTest` — assert transition graph ที่อนุญาต/ไม่อนุญาตด้วย
  `canTransitionTo()`
- `Vendor/States`: `VerificationStatusTest`, `DocumentStatusTest` — เหมือนกัน
- Feature test (RefreshDatabase, sqlite in-memory ตาม `phpunit.xml`) ยืนยันว่า cast จริง
  ใช้งานได้กับ enum column เดิม: สร้าง `User`/`VendorProfiles`/`VendorDocuments` row แล้ว
  assert ว่า `$model->status` เป็น instance ของ default state class (`Pending`/`Active` ตาม
  default ของแต่ละ field) และ `$model->status->transitionTo(...)` เปลี่ยนค่าใน DB จริง
- รัน `vendor/bin/pint --dirty --format agent` หลังแก้ไฟล์ PHP ทั้งหมด

## Open questions ที่ปิดไปแล้วระหว่าง brainstorm

- ขอบเขต Entity → ครบทุกตาราง ไม่ใช่แค่ flow สมัคร Vendor
- Entity เป็น plain PHP object แยกจาก Eloquent Model (ไม่ผูก inheritance/dependency)
- ขอบเขต VO → เฉพาะ field ที่มี format/validation ชัดเจน (`Email`, `PhoneNumber`,
  `PostalCode`, `TaxId`, `CitizenId`) ไม่รวม field ทั่วไป
- TaxId/CitizenId → เก็บ plain value เท่านั้น ไม่ยุ่งเรื่องเข้ารหัส/hash (เป็นหน้าที่ของ
  Infrastructure/Repository ในอนาคต)
- Enum vs State → field ที่ไม่มี transition (`user_type`) ใช้ PHP native enum, field ที่มี
  workflow transition (`status`, `verification_status`, document `status`) ใช้
  `spatie/laravel-model-states`
- Shared VO (`Email`/`PhoneNumber`/`PostalCode`) → แยก module ใหม่ `Shared` แทนการ
  duplicate ต่อ module
- Transition rules → ใช้ตาม default ที่เสนอในระหว่าง brainstorm (ดูหัวข้อ Design)
- VO scope เพิ่มเติม (typed ID, wrap ทุก field) → คงตาม scope เดิม ไม่เพิ่ม typed ID/wrap
  field ทั่วไป
- ระหว่างเขียน plan พบว่า `VendorProfiles.php`/`VendorCompanyDetails.php`/
  `VendorIndividualDetails.php`/`VendorDocuments.php` มีอยู่แล้วจริง (ไม่ใช่แค่ referenced) →
  ขยาย scope ให้ wire `HasStates` เข้ากับ `VendorProfiles.php`/`VendorDocuments.php` ด้วย
  (ดูหัวข้อ Design ข้อ 5)
