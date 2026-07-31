# Vendor model factories

Date: 2026-07-31
Status: Approved

## บริบท / ปัญหา

โมเดล Eloquent ทั้ง 5 ตัวใน `app/Modules/Vendor/Infrastructure/Models/` (`VendorProfiles`,
`VendorCompanyDetails`, `VendorIndividualDetails`, `VendorContact`, `VendorDocuments`) ใช้ trait
`HasFactory` แต่ `newFactory()` ถูกคอมเมนต์ทิ้งไว้ทุกตัว ไม่มีไฟล์ factory จริงอยู่เลยใน
`database/factories/` (มีแค่ `UserFactory.php`) — ทุก feature test ของ Vendor module ที่ผ่านมาต้องสร้าง
ข้อมูลผ่าน `new VendorRepository` + domain entity `::create()` โดยตรงแทน ซึ่งยืดยาวเมื่อ test ต้องการ
แค่ข้อมูลตัวอย่างทั่วไปไม่สนใจ domain logic

โค้ดคอมเมนต์เดิมชี้ไปที่ namespace `App\Modules\Vendor\Database\Factories\{Model}Factory` ซึ่งเป็น
pattern เดียวกับที่เคยทำให้เกิดบั๊กมาแล้วกับ `User` model ในโปรเจกต์นี้ (Laravel's
`HasFactory::newFactory()` เดา factory class จาก `App\Models\` → `Database\Factories\` ตามธรรมเนียม
แต่โปรเจกต์นี้ใช้โครงสร้าง DDD module ที่ namespace ไม่ตรงกับธรรมเนียมนั้น ทำให้เดาผิดเป็น
`Database\Factories\Modules\Vendor\Infrastructure\Models\{Model}Factory` ซึ่งไม่มีอยู่จริง) —
`User` แก้ไปแล้วด้วยการวางไฟล์ factory แบนราบที่ `database/factories/UserFactory.php` พร้อมประกาศ
`protected $model = User::class;` ชัดเจน และเพิ่ม `User::newFactory()` override คืน `UserFactory::new()`
โดยตรง งานนี้ใช้ pattern เดียวกันกับทั้ง 5 โมเดล Vendor เพื่อไม่ให้เจอบั๊กเดิมซ้ำ

## เป้าหมาย

1. ทั้ง 5 โมเดลมี factory ใช้งานได้จริงผ่าน `{Model}::factory()->create()`/`->make()` มาตรฐานของ Laravel
2. `VendorCompanyDetails`/`VendorIndividualDetails` factory สร้าง `tax_id`/`citizen_id` และ
   `tax_id_hash`/`citizen_id_hash` ที่ตรงกัน (ใช้ static helper ที่มีอยู่แล้วบนโมเดล) — ไม่ทำให้ unique
   constraint ของคอลัมน์ hash ชนกันเมื่อสร้างหลายแถว
3. `VendorProfiles` มี state `approved()`/`rejected()` เพิ่มจาก default `pending()`
   `VendorDocuments` มี state `approved()`/`rejected()` เพิ่มจาก default `pending()` เช่นกัน — ตรงกับ
   domain state (`VerificationStatus`/`DocumentStatus`) ของแต่ละโมเดล
4. ทุก foreign key ที่จำเป็น (`vendor_profile_id`, `verified_by`) มีค่า default ที่สมเหตุสมผลผ่าน
   nested factory (`VendorProfiles::factory()`, `User::factory()`) เพื่อให้เรียก
   `VendorCompanyDetails::factory()->create()` เดี่ยว ๆ ได้โดยไม่ error จาก NOT NULL constraint
5. ค่าที่ generate ต้องผ่าน validation ของ value object ที่มีอยู่แล้วในระบบ ถ้ามีโค้ดอื่นอ่านค่ากลับ
   (`PhoneNumber::fromString()` ต้องการเลข 9-10 หลัก, `PostalCode::fromString()` ต้องการเลข 5 หลักเป๊ะ)

## Non-goals

- **ไม่แก้ test ที่มีอยู่แล้ว** — test ทั้งหมดที่ใช้ `VendorRepository` + domain entity โดยตรงยังคงเดิม
  ไม่มีเหตุผลต้องเปลี่ยนไปใช้ factory เพราะยังทำงานถูกต้องอยู่แล้ว
- **ไม่ปรับ domain entity/repository ใด ๆ** — factory ทำงานที่ระดับ Eloquent model เท่านั้น ไม่ผ่าน
  domain entity/value object เลย (เขียนแถวลง DB ตรง ๆ) เหมือน pattern ปกติของ Laravel factory
- **ไม่ผูก `user_type` ของ `User` ให้ตรงกับชนิด detail (company/individual) โดยอัตโนมัติ** — ไม่มี DB
  constraint บังคับความสัมพันธ์นี้อยู่แล้ว (คุมด้วย use case ฝั่ง domain ตอน register) ปล่อยให้ผู้เรียก
  factory กำหนดเองถ้าต้องการความสอดคล้องนี้ในเทสต์ที่สนใจจุดนั้น

## Design

### Pattern ที่ใช้ซ้ำทั้ง 5 โมเดล

ไฟล์ factory วางที่ `database/factories/{Model}Factory.php` (แบนราบ, namespace `Database\Factories`
มาตรฐาน — ไม่ตาม path ที่คอมเมนต์เดิมแนะนำ) พร้อม `protected $model = {Model}::class;` และแก้โมเดลแต่ละตัว
ให้ uncomment + implement `newFactory()` คืนค่า `{Model}Factory::new()` ตรง ๆ (import จริง แทนที่
comment เดิม)

### `database/factories/VendorProfilesFactory.php`

```php
<?php

namespace Database\Factories;

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VendorProfiles>
 */
class VendorProfilesFactory extends Factory
{
    protected $model = VendorProfiles::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'verification_status' => 'pending',
            'verified_at' => null,
            'verified_by' => null,
            'remark' => null,
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'verification_status' => 'approved',
            'verified_at' => now(),
            'verified_by' => User::factory()->state(['user_type' => 'internal']),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'verification_status' => 'rejected',
            'verified_at' => now(),
            'verified_by' => User::factory()->state(['user_type' => 'internal']),
            'remark' => 'Rejected during testing.',
        ]);
    }
}
```

`app/Modules/Vendor/Infrastructure/Models/VendorProfiles.php` — แทนที่บล็อกคอมเมนต์เดิมด้วย:

```php
use Database\Factories\VendorProfilesFactory;
// ...
protected static function newFactory(): VendorProfilesFactory
{
    return VendorProfilesFactory::new();
}
```

### `database/factories/VendorCompanyDetailsFactory.php`

```php
<?php

namespace Database\Factories;

use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VendorCompanyDetails>
 */
class VendorCompanyDetailsFactory extends Factory
{
    protected $model = VendorCompanyDetails::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $taxId = fake()->unique()->numerify('#############');

        return [
            'vendor_profile_id' => VendorProfiles::factory(),
            'company_name' => fake()->company(),
            'business_registration_no' => fake()->unique()->numerify('#############'),
            'tax_id' => $taxId,
            'tax_id_hash' => VendorCompanyDetails::hashTaxId($taxId),
            'branch_no' => '00000',
            'business_type' => fake()->word(),
            'address' => fake()->address(),
            'province' => fake()->city(),
            'postal_code' => fake()->numerify('#####'),
        ];
    }
}
```

โมเดล — แทนที่บล็อกคอมเมนต์เดิมด้วย `use Database\Factories\VendorCompanyDetailsFactory;` +
`newFactory(): VendorCompanyDetailsFactory { return VendorCompanyDetailsFactory::new(); }`

### `database/factories/VendorIndividualDetailsFactory.php`

```php
<?php

namespace Database\Factories;

use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VendorIndividualDetails>
 */
class VendorIndividualDetailsFactory extends Factory
{
    protected $model = VendorIndividualDetails::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $citizenId = fake()->unique()->numerify('#############');
        $taxId = fake()->unique()->numerify('#############');

        return [
            'vendor_profile_id' => VendorProfiles::factory(),
            'store_name' => fake()->company(),
            'prefix' => fake()->randomElement(['นาย', 'นาง', 'นางสาว']),
            'firstname' => fake()->firstName(),
            'lastname' => fake()->lastName(),
            'citizen_id' => $citizenId,
            'citizen_id_hash' => VendorIndividualDetails::hashCitizenId($citizenId),
            'business_type' => fake()->word(),
            'tax_id' => $taxId,
            'tax_id_hash' => VendorIndividualDetails::hashTaxId($taxId),
            'address' => fake()->address(),
            'province' => fake()->city(),
            'postal_code' => fake()->numerify('#####'),
        ];
    }
}
```

โมเดล — แทนที่บล็อกคอมเมนต์เดิมด้วย `use Database\Factories\VendorIndividualDetailsFactory;` +
`newFactory(): VendorIndividualDetailsFactory { return VendorIndividualDetailsFactory::new(); }`

### `database/factories/VendorContactFactory.php`

```php
<?php

namespace Database\Factories;

use App\Modules\Vendor\Infrastructure\Models\VendorContact;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VendorContact>
 */
class VendorContactFactory extends Factory
{
    protected $model = VendorContact::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'vendor_profile_id' => VendorProfiles::factory(),
            'contact_name' => fake()->name(),
            'contact_position' => fake()->jobTitle(),
            'contact_phone' => fake()->numerify('0#########'),
            'contact_email' => fake()->safeEmail(),
            'line_id' => fake()->userName(),
            'other_contact' => null,
            'is_main_contact' => false,
        ];
    }
}
```

`contact_phone` ใช้ `0#########` (รวม 10 หลัก) ให้ผ่าน `PhoneNumber::fromString()`
(`^\d{9,10}$` หลัง strip อักขระที่ไม่ใช่ตัวเลข)

โมเดล — แทนที่บล็อกคอมเมนต์เดิมด้วย `use Database\Factories\VendorContactFactory;` +
`newFactory(): VendorContactFactory { return VendorContactFactory::new(); }`

### `database/factories/VendorDocumentsFactory.php`

```php
<?php

namespace Database\Factories;

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VendorDocuments>
 */
class VendorDocumentsFactory extends Factory
{
    protected $model = VendorDocuments::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'vendor_profile_id' => VendorProfiles::factory(),
            'document_type' => fake()->randomElement(['company_registration', 'id_card', 'vat_registration']),
            'file_name' => fake()->word().'.pdf',
            'file_path' => 'vendor-documents/'.fake()->uuid().'.pdf',
            'status' => 'pending',
            'verified_by' => null,
            'verified_at' => null,
            'remark' => null,
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'approved',
            'verified_by' => User::factory()->state(['user_type' => 'internal']),
            'verified_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'rejected',
            'verified_by' => User::factory()->state(['user_type' => 'internal']),
            'verified_at' => now(),
            'remark' => 'Rejected during testing.',
        ]);
    }
}
```

โมเดล — แทนที่บล็อกคอมเมนต์เดิมด้วย `use Database\Factories\VendorDocumentsFactory;` +
`newFactory(): VendorDocumentsFactory { return VendorDocumentsFactory::new(); }`

## Testing

- Feature test ใหม่ `tests/Feature/Modules/Vendor/VendorFactoriesTest.php`:
  1. `VendorProfiles::factory()->create()` สำเร็จ ได้ `verification_status` เป็น `pending` และมี `user`
     relation ที่สร้างมาให้อัตโนมัติ
  2. `VendorProfiles::factory()->approved()->create()` ได้ status `approved` พร้อม `verified_at`/
     `verified_by` ที่ไม่ null
  3. `VendorCompanyDetails::factory()->create()` สำเร็จ (ไม่ error NOT NULL/unique) และสร้าง
     `VendorProfiles` แม่ให้อัตโนมัติ
  4. `VendorCompanyDetails::factory()->count(3)->create()` สำเร็จทั้ง 3 แถว (พิสูจน์ว่า
     `tax_id_hash`/`business_registration_no` ไม่ชน unique constraint กันเอง)
  5. `VendorIndividualDetails::factory()->create()` สำเร็จเช่นเดียวกัน + `count(3)` ไม่ชน unique
  6. `VendorContact::factory()->create()` สำเร็จ และค่า `contact_phone` ที่ได้ผ่าน
     `PhoneNumber::fromString()` ได้จริงเมื่ออ่านกลับผ่าน `VendorRepository::findContactsByVendorProfileId()`
  7. `VendorDocuments::factory()->rejected()->create()` ได้ status `rejected` พร้อม `remark`/
     `verified_by`/`verified_at` ที่ไม่ null
- ไม่ลบ/แก้ test เดิมที่ใช้ `VendorRepository` + domain entity ตรง ๆ — รันเต็ม suite เดิมด้วยเพื่อยืนยัน
  ไม่มี regression
