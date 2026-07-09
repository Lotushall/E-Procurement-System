# DDD Module Generator สำหรับ nwidart/laravel-modules

Date: 2026-07-09
Status: Approved

## บริบท / ปัญหา

โปรเจกต์ใช้ `nwidart/laravel-modules` v13 และมี custom generator layout แบบ DDD อยู่แล้วใน
`config/modules.php` (Domain / Application / Infrastructure / Interfaces / Presentation) แต่ตอนนี้:

- มีแค่ 2 module: `Auth`, `User` (ทั้งคู่ยังไม่ commit ครบ — `Auth` ทั้งโฟลเดอร์ยัง untracked)
- `UserController` อยู่จริงที่ `Presentation/Http/Controllers/UserController.php` แต่ประกาศ
  `namespace App\Modules\User\Interfaces\Http\Controllers;` — ไม่ตรงกับ path จริง เพราะ
  `config/modules.php` (`generator.controller`) ยังชี้ไป `Interfaces/Http/Controllers`
- layer `Interfaces` กับ `Presentation` ทับซ้อนกันโดยไม่มีเส้นแบ่งที่ชัดเจน
- generator ส่วนใหญ่ตั้ง `generate => false` ทำให้ `php artisan module:make {Name}` เพียว ๆ
  ไม่สร้าง folder skeleton ของ layer พวกนี้ให้อัตโนมัติ
- ไม่มีคำสั่งเดียวที่ scaffold Model + Repository + Interface + Request ให้ entity หนึ่ง ๆ
  ต้องรันคำสั่งของ nwidart แยกทีละตัว

กำลังจะเพิ่ม module `Vendor` ที่มีหลาย entity (VendorProfile, VendorCompanyDetail,
VendorIndividualDetail, VendorDocument) จึงอยากให้ scaffold ของ module ใหม่และ entity ใหม่
สม่ำเสมอและใช้คำสั่งเดียวจบ

## เป้าหมาย

1. ยุบ layer `Interfaces` เข้ากับ `Presentation` ให้เหลือ 4 layer: Domain, Application,
   Infrastructure, Presentation (+ Providers/config/database/resources/routes/tests ระดับ module)
2. `php artisan module:make {Name}` เปล่า ๆ ต้องสร้าง folder skeleton ครบทุก layer หลัก
   (มี `.gitkeep`) โดยไม่ต้องพึ่ง custom code เพิ่ม — ใช้กลไก `generate` flag ของ nwidart เอง
3. มีคำสั่งใหม่ `module:make-ddd {module} {entity?}` ที่ scaffold Model + Controller +
   Repository + RepositoryInterface + Store/Update Request ให้ entity หนึ่ง ๆ ในคำสั่งเดียว
   ใช้ได้ทั้งตอนสร้าง module ใหม่ และตอนเพิ่ม entity ใหม่ใน module ที่มีอยู่แล้ว
4. แก้ inconsistency ที่มีอยู่ (namespace mismatch ของ `UserController`, folder `Interfaces`
   ที่ค้างอยู่ใน `Auth`/`User`)

## Non-goals

- ไม่ auto-generate migration (มี migration รวมอยู่แล้วใน
  `database/migrations/0001_01_01_000000_create_users_table.php`)
- ไม่ auto-wire `RepositoryInterface` เข้ากับ service container binding (ทำมือทีหลัง)
- ไม่ทำ automation สำหรับ entity ที่ 2 เป็นต้นไปให้มากกว่าคำสั่งเดียวที่มีอยู่ (ครอบคลุมด้วย
  `module:make-ddd {module} {entity}` ตัวเดิมอยู่แล้ว ไม่ต้องมีคำสั่งแยกอีกตัว)

## Design

### 1. `config/modules.php` — generator paths

ย้าย/เปิด `generate` ของ key ที่เกี่ยวข้อง (key อื่นที่ไม่ระบุคงค่าเดิม `generate => false`):

| key | path เดิม | path ใหม่ | generate |
|---|---|---|---|
| `controller` | `Interfaces/Http/Controllers` | `Presentation/Http/Controllers` | true (เดิม true) |
| `request` | `Interfaces/Http/Requests` | `Presentation/Http/Requests` | **true** |
| `resource` | `Interfaces/Http/Resources` | `Presentation/Http/Resources` | **true** |
| `filter` | `Interfaces/Http/Middleware` | `Presentation/Http/Middleware` | **true** |
| `rules` | `Interfaces/Rules` | `Presentation/Rules` | **true** |
| `policies` | `Interfaces/Policies` | **`Domain/Policies`** | **true** |
| `model` | `Infrastructure/Models` | (ไม่เปลี่ยน) | **true** |
| `repository` | `Infrastructure/Repositories` | (ไม่เปลี่ยน) | **true** |
| `interfaces` | `Domain/Contracts` | (ไม่เปลี่ยน) | **true** |
| `event` | `Domain/Events` | (ไม่เปลี่ยน) | **true** |
| `enums` | `Domain/Enums` | (ไม่เปลี่ยน) | **true** |
| `exceptions` | `Domain/Exceptions` | (ไม่เปลี่ยน) | **true** |
| `actions` | `Application/Actions` | (ไม่เปลี่ยน) | **true** |
| `services` | `Application/Services` | (ไม่เปลี่ยน) | **true** |
| `jobs` | `Application/Jobs` | (ไม่เปลี่ยน) | **true** |
| `listener` | `Application/Listeners` | (ไม่เปลี่ยน) | **true** |

key อื่น ๆ ที่ไม่ค่อยได้ใช้ต่อ module (casts, channels, class, command,
command_replacements, component-class, emails, helpers, notifications, observer, scopes,
traits) คง `generate => false` ไว้เหมือนเดิม เพื่อไม่ให้ scaffold folder ที่ไม่ได้ใช้จริง

หมายเหตุ: comment หัวกลุ่ม "Interfaces layer: controllers, requests, resources, policies,
rules" ต้องแก้ข้อความให้ตรงกับ layout ใหม่ด้วย (controller/request/resource/rules ไปอยู่กับ
Presentation, policies ไปอยู่กับ Domain)

ผลลัพธ์: `php artisan module:make Vendor` เพียวคำสั่งเดียว จะสร้าง folder skeleton ทั้งหมด
พร้อม `.gitkeep`, `module.json`, `Providers/VendorServiceProvider.php`, และ default
`Presentation/Http/Controllers/VendorController.php`

### 2. คำสั่งใหม่ `module:make-ddd {module} {entity?}`

ไฟล์: `app/Console/Commands/ModuleMakeDddCommand.php` (plain Laravel command, auto-discover,
ไม่ผูกกับ business module ไหนเพราะเป็น dev tooling) register ผ่าน slot ที่มีอยู่แล้วใน
`config/modules.php`:

```php
'commands' => ConsoleServiceProvider::defaultCommands()
    ->merge([
        \App\Console\Commands\ModuleMakeDddCommand::class,
    ])->toArray(),
```

Signature: `module:make-ddd {module} {entity?} {--force}`

Logic:

1. `$module = Str::studly($this->argument('module'))`
2. `$entity = Str::studly($this->argument('entity') ?? $module)`
3. ถ้า module ยังไม่มี (`Nwidart\Modules\Facades\Module::has($module)` คืน false) → เรียก
   `$this->call('module:make', ['name' => [$module]])`
   (ได้ skeleton + ServiceProvider + default `{Module}Controller` มาจากข้อ 1 โดยอัตโนมัติ)
4. ถ้า `$entity !== $module` → เรียก
   `$this->call('module:make-controller', ['controller' => "{$entity}Controller", 'module' => $module])`
   (เคส entity==module ไม่ต้องเรียกซ้ำ เพราะ `module:make` ในข้อ 3 สร้าง controller
   ชื่อ `{Module}Controller` ให้แล้ว)
5. เรียกตามลำดับเสมอ (scope ที่ `$entity`, module คือ `$module`):
   - `module:make-model {entity} {module}`
   - `module:make-repository {entity}Repository {module}`
   - `module:make-interface {entity}RepositoryInterface {module}`
   - `module:make-request Store{entity}Request {module}`
   - `module:make-request Update{entity}Request {module}`
6. ส่งต่อ `--force` ไปยังทุกคำสั่งย่อยถ้ามีการส่ง flag มา

Error handling: ถ้า sub-command ใดคืนค่า error ให้หยุดและ return exit code นั้นทันที (ไม่ไล่ต่อ)

### 3. เก็บกวาดของเดิม (Auth, User)

- แก้ `app/Modules/User/Presentation/Http/Controllers/UserController.php` บรรทัด namespace
  จาก `App\Modules\User\Interfaces\Http\Controllers` เป็น
  `App\Modules\User\Presentation\Http\Controllers`
- ลบโฟลเดอร์ `Interfaces` ที่ว่างเปล่าและไม่ได้ใช้แล้วใน `app/Modules/Auth/Interfaces` และ
  `app/Modules/User/Interfaces`
- เพิ่ม `.gitkeep` ให้ folder skeleton ของ `Auth` และ `User` ให้ตรงกับ layout ใหม่ (Domain/*,
  Application/*, Infrastructure/{Models,Repositories}, Presentation/Http/{Controllers,
  Requests,Resources,Middleware}, Presentation/Rules, Domain/Policies) — ทำมือ ไม่ต้องรัน
  `module:make --force` ซ้ำ (จะเสี่ยง overwrite ServiceProvider/module.json ที่มีอยู่)

## Testing

- Pest feature test เรียก `php artisan module:make-ddd TestFeature` (module ใหม่) แล้ว assert
  ว่ามีไฟล์ Model/Controller/Repository/Interface/Request ครบตามชื่อที่คาด, ลบ module ทิ้งหลัง
  test (cleanup ใน `afterEach`/`tearDown`)
- Pest feature test เรียก `module:make-ddd TestFeature SecondEntity` แบบ module มีอยู่แล้ว
  (สร้างไว้ก่อนใน setup) แล้ว assert ว่าไม่มีการเรียก `module:make` ซ้ำ (module.json ไม่ถูก
  overwrite) และไฟล์ของ `SecondEntity` ถูกสร้างครบ
- รัน `vendor/bin/pint --dirty --format agent` หลังแก้ไฟล์ PHP ทั้งหมด

## Open questions ที่ปิดไปแล้วระหว่าง brainstorm

- Interfaces vs Presentation → เลือก Presentation เป็นหลัก, ยุบ Interfaces ทิ้งทั้งหมด
- Policies → ย้ายไปอยู่ Domain (ไม่ใช่ Presentation)
- Base artifacts ที่ auto-generate → Model, Controller, Repository+Interface, Store/Update
  Request (ไม่รวม Migration)
- แนวทาง override `module:make` เดิม vs สร้างคำสั่งใหม่ → เลือกสร้างคำสั่งใหม่
  `module:make-ddd` เพราะรองรับ "เพิ่ม entity ในโมดูลที่มีอยู่" ได้ในตัว ซึ่ง override ของเดิม
  ทำไม่ได้ (argument `name` ของ `module:make` เป็น array ของชื่อ module เท่านั้น)
