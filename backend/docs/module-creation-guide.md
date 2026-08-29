# คู่มือการสร้าง Module (nwidart/laravel-modules)

โปรเจกต์นี้ใช้ package `nwidart/laravel-modules` (v13) จัดโครงสร้างโค้ดแบบ DDD
ตั้งค่าให้สร้าง module ไว้ที่ `app/Modules/` (ดูได้ที่ `config/modules.php` →
`paths.modules`) เช่น `App\Modules\Vendor`, `App\Modules\User`

## 1. สร้าง Module ใหม่

```bash
php artisan module:make <ModuleName>
```

ตัวอย่าง:

```bash
php artisan module:make Tender
```

จะได้โครงสร้างที่ `app/Modules/Tender/` พร้อม folder ตาม layer ของ DDD
(กำหนดไว้ใน `config/modules.php` → `paths.generator`):

| Layer | Path |
|---|---|
| Domain — entities | `Domain/Entities` |
| Domain — repository interfaces | `Domain/Repositories` |
| Domain — value objects | `Domain/ValueObjects` |
| Domain — enums | `Domain/Enums` |
| Domain — states | `Domain/States` |
| Application — DTOs | `Application/DTOs` |
| Application — use cases | `Application/UseCases` |
| Infrastructure — Eloquent models | `Infrastructure/Models` |
| Infrastructure — repository implementations | `Infrastructure/Repositories` |
| Presentation — controllers | `Presentation/Http/Controllers` |
| Presentation — form requests | `Presentation/Http/Requests` |
| Service provider | `Providers` |

**หมายเหตุ:** generator ปิด migration/seeder/factory/routes ไว้
(`generate: false`) เพราะโปรเจกต์นี้เก็บ migration ไว้ที่ root
`database/migrations/` ไม่ใช่แยกตาม module — ไม่ต้องใช้
`module:make-migration` ตามปกติ

## 2. สร้างไฟล์ย่อยในโมดูลที่มีอยู่แล้ว

รูปแบบคำสั่งเหมือนกันหมด: `<name>` มาก่อน แล้วตามด้วย `<module>`

```bash
php artisan module:make-model <Name> <Module>
php artisan module:make-repository <Name>Repository <Module>
php artisan module:make-interface <Name>RepositoryInterface <Module>
php artisan module:make-controller <Name>Controller <Module>
php artisan module:make-request <Name>Request <Module>
php artisan module:make-resource <Name>Resource <Module>
php artisan module:make-policy <Name>Policy <Module>
php artisan module:make-enum <Name> <Module>
php artisan module:make-provider <Name>ServiceProvider <Module>
php artisan module:make-test <Name>Test <Module>
```

ตัวอย่างจริง (สมมติสร้างโมดูล `Tender`):

```bash
php artisan module:make-model TenderProject Tender
php artisan module:make-interface TenderProjectRepositoryInterface Tender
php artisan module:make-repository TenderProjectRepository Tender
php artisan module:make-policy TenderProjectPolicy Tender
```

ดูคำสั่งทั้งหมดที่มี: `php artisan list module` หรือ `php artisan module:make-model --help` (แต่ละคำสั่งมี `--help` ของตัวเอง)

## 3. แนวทางการแบ่ง Module ของโปรเจกต์นี้

**1 module ต่อ 1 bounded context/domain area ไม่ใช่ 1 module ต่อ 1 ตาราง**

ตัวอย่าง: `Vendor` module รวม vendor profile + documents + company/individual
details + approval workflow ไว้ในโมดูลเดียว เพราะทุกอย่างผูกกันแน่นและเป็น
domain เดียวกัน — แยกย่อยด้วย subdirectory ข้างในแทน เช่น
`Application/Dashboard/UseCases` (ฝั่ง admin) vs `Application/Profile/UseCases`
(ฝั่ง vendor เอง) ไม่ใช่แยกเป็นคนละ module

**Cross-module dependency:**
- Application layer ของ module A **อนุญาต** ให้เรียกใช้ **Domain repository
  interface** ของ module B ได้โดยตรง (เช่น `VendorRepositoryInterface` ถูกใช้
  จาก `User` module ใน `PurgeSoftDeletedUsersUseCase`)
- Application layer ของ module A **ไม่ควร** พึ่งพา **Application layer**
  ของ module B โดยตรง ยกเว้นกรณีที่มีบรรทัดฐานอยู่แล้วในโค้ด (เช่น
  `RevokeAllUserSessionsUseCase`)

ถ้าเจอว่า module ใหญ่ขึ้นเรื่อยๆ ให้จัดโครงสร้าง subdirectory ข้างในให้ดีขึ้น
ก่อน ไม่ใช่รีบแยกเป็น module ใหม่

## 4. คำสั่งอื่นๆ ที่มีประโยชน์

```bash
php artisan module:list              # ดูรายชื่อ module ทั้งหมด
php artisan module:list-commands Tender  # ดูคำสั่งทั้งหมดของ module นี้
```
