# จัดระเบียบโฟลเดอร์ module Tender + สร้าง Create Tender Project API

Date: 2026-09-01
Status: Approved

## บริบท / ปัญหา

Module `App\Modules\Tender` มี Domain Entity (`TenderProject`, `Tor`, `TorDocument`), Value Object
(`ProjectCode`, `TorCode`, `ContractNumber`) และ Eloquent Model (`TenderProjects`, `Tors`,
`TorDocuments`) อยู่แล้วจาก schema design ก่อนหน้า
(`docs/superpowers/specs/2026-08-29-tenders-tors-schema-design.md`) แต่ทุกไฟล์อยู่แบบ flat ในแต่ละ
layer — เมื่อ module นี้จะขยายต่อไปอีกหลาย aggregate (Tor bidding, evaluation, award ตาม schema
design) จะยิ่งแบนราบและแยกขอบเขตยาก จึงจัดกลุ่มใหม่ตาม aggregate ก่อนเพิ่มฟีเจอร์ใหม่

Controller เดิม (`TenderController.php`) เป็น scaffold เปล่าจาก `module:make-controller`
คืน Blade view ที่ไม่มีจริง ไม่ได้ใช้งานจริง — ลบทิ้งแล้วสร้าง controller ใหม่แทน

ฟีเจอร์ที่ต้องเพิ่ม: **Create Tender Project** (`POST /api/v1/dashboard/tender-projects`) —
ยืนยัน scope กับ user แล้วว่าทำเฉพาะ backend API รอบนี้ ฝั่ง frontend (หน้า
`/dashboard/tender-projects`) ยังใช้ placeholder data รอต่อ endpoint ใน task ถัดไป

## ขอบเขต (ยืนยันกับ user แล้ว)

1. จัดกลุ่มไฟล์ที่มีอยู่ในโฟลเดอร์ Domain/Infrastructure ตาม aggregate: `Project` (TenderProject),
   `Tor` (Tor + TorDocument), `Award` (ContractNumber — ยังไม่มี entity ของ award เอง แต่ VO นี้เตรียมไว้
   สำหรับ `tor_awards.contract_number` ตาม schema design ที่วางแผนไว้แล้ว)
2. เป็นการย้ายไฟล์ + เปลี่ยน namespace ล้วน ๆ สำหรับไฟล์เดิม **ไม่มี logic เปลี่ยน**
3. สร้าง endpoint สร้าง Tender Project ใหม่ 1 ตัว ครบ stack: Repository, UseCase, DTO, FormRequest,
   Resource, Policy, permission, route
4. `project_code` gen อัตโนมัติฝั่ง backend รูปแบบ `TP-{ปีงบประมาณ}-{เลขเรียง 4 หลัก}` เช่น
   `TP-2569-0001` — เลขเรียงนับแยกตามปีงบประมาณ (ขึ้นปีใหม่เริ่ม `0001` ใหม่) ยืนยันกับ user แล้ว
5. Authorization ใช้ Policy + permission ใหม่ `tender-projects.create` ผูกผ่าน `Gate::define()` ใน
   `TenderServiceProvider` (pattern เดียวกับ `VendorServiceProvider`) ยืนยันกับ user แล้ว

## ส่วนที่ 1: ย้ายไฟล์ (ครบทุกไฟล์ ยืนยันด้วย grep แล้ว — ไม่มี consumer ภายนอก module)

### Domain/Entities/
- `TenderProject.php` → `Domain/Entities/Project/TenderProject.php`
  - namespace: `App\Modules\Tender\Domain\Entities` → `App\Modules\Tender\Domain\Entities\Project`
  - แก้ `use App\Modules\Tender\Domain\ValueObjects\ProjectCode;` →
    `use App\Modules\Tender\Domain\ValueObjects\Project\ProjectCode;`
- `Tor.php` → `Domain/Entities/Tor/Tor.php`
  - namespace → `App\Modules\Tender\Domain\Entities\Tor`
  - แก้ `use App\Modules\Tender\Domain\ValueObjects\TorCode;` →
    `use App\Modules\Tender\Domain\ValueObjects\Tor\TorCode;`
- `TorDocument.php` → `Domain/Entities/Tor/TorDocument.php`
  - namespace → `App\Modules\Tender\Domain\Entities\Tor` (ไม่มี use อื่นต้องแก้)

### Domain/ValueObjects/
- `ProjectCode.php` → `Domain/ValueObjects/Project/ProjectCode.php`, namespace →
  `App\Modules\Tender\Domain\ValueObjects\Project`
- `TorCode.php` → `Domain/ValueObjects/Tor/TorCode.php`, namespace →
  `App\Modules\Tender\Domain\ValueObjects\Tor`
- `ContractNumber.php` → `Domain/ValueObjects/Award/ContractNumber.php`, namespace →
  `App\Modules\Tender\Domain\ValueObjects\Award`

### Infrastructure/Models/
- `TenderProjects.php` → `Infrastructure/Models/Project/TenderProjects.php`
  - namespace → `App\Modules\Tender\Infrastructure\Models\Project`
  - เพิ่ม `use App\Modules\Tender\Infrastructure\Models\Tor\Tors;` (ใช้ใน
    `TenderProjectsTors(): HasMany`)
  - `use App\Modules\InternalProfiles\...`, `use App\Modules\User\...` ไม่เปลี่ยน (อยู่นอก module)
- `Tors.php` → `Infrastructure/Models/Tor/Tors.php`
  - namespace → `App\Modules\Tender\Infrastructure\Models\Tor`
  - เพิ่ม `use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;` (ใช้ใน
    `TorsTenderProject(): BelongsTo`)
  - `TorsDocuments(): HasMany(TorDocuments::class, ...)` อยู่ namespace เดียวกัน (`Tor`) ไม่ต้องเพิ่ม use
- `TorDocuments.php` → `Infrastructure/Models/Tor/TorDocuments.php`
  - namespace → `App\Modules\Tender\Infrastructure\Models\Tor`
  - `TorDocumentsTor(): BelongsTo(Tors::class, ...)` อยู่ namespace เดียวกัน ไม่ต้องเพิ่ม use

### Test ที่ต้องย้ายตาม + แก้ import (ไฟล์เหล่านี้ไม่มี `namespace` ของตัวเอง — Pest ไม่ได้ autoload ผ่าน
PSR-4 จึงย้าย path ได้อิสระ แต่ต้องแก้ `use` ให้ตรง namespace ใหม่ของ class ที่ import)

- `tests/Unit/Domain/Tender/Entities/TenderProjectTest.php` →
  `tests/Unit/Domain/Tender/Entities/Project/TenderProjectTest.php`
  (แก้ 2 `use`: `Entities\TenderProject` → `Entities\Project\TenderProject`,
  `ValueObjects\ProjectCode` → `ValueObjects\Project\ProjectCode`)
- `tests/Unit/Domain/Tender/Entities/TorTest.php` →
  `tests/Unit/Domain/Tender/Entities/Tor/TorTest.php`
  (แก้ 2 `use`: `Entities\Tor` → `Entities\Tor\Tor`, `ValueObjects\TorCode` →
  `ValueObjects\Tor\TorCode`)
- `tests/Unit/Domain/Tender/Entities/TorDocumentTest.php` →
  `tests/Unit/Domain/Tender/Entities/Tor/TorDocumentTest.php`
  (แก้ 1 `use`: `Entities\TorDocument` → `Entities\Tor\TorDocument`)
- `tests/Unit/Domain/Tender/ValueObjects/ProjectCodeTest.php` →
  `tests/Unit/Domain/Tender/ValueObjects/Project/ProjectCodeTest.php`
  (แก้ 1 `use`: `ValueObjects\ProjectCode` → `ValueObjects\Project\ProjectCode`)
- `tests/Unit/Domain/Tender/ValueObjects/TorCodeTest.php` →
  `tests/Unit/Domain/Tender/ValueObjects/Tor/TorCodeTest.php`
  (แก้ 1 `use`: `ValueObjects\TorCode` → `ValueObjects\Tor\TorCode`)
- `tests/Unit/Domain/Tender/ValueObjects/ContractNumberTest.php` →
  `tests/Unit/Domain/Tender/ValueObjects/Award/ContractNumberTest.php`
  (แก้ 1 `use`: `ValueObjects\ContractNumber` → `ValueObjects\Award\ContractNumber`)

`TenderController.php` (scaffold เดิม) ลบทิ้ง — แทนที่ด้วย `TenderProjectController.php` ในส่วนที่ 2

## ส่วนที่ 2: Create Tender Project API

### โครงสร้างไฟล์ใหม่

```
Domain/Repositories/Project/TenderProjectRepositoryInterface.php
Infrastructure/Repositories/Project/TenderProjectRepository.php
Application/Project/DTOs/CreateTenderProjectData.php
Application/Project/UseCases/CreateTenderProjectUseCase.php
Presentation/Http/Controllers/TenderProjectController.php
Presentation/Http/Requests/Project/StoreTenderProjectRequest.php
Presentation/Http/Resources/Project/TenderProjectResource.php
Presentation/Policies/TenderProjectPolicy.php
routes/api/v1/dashboard/tender-projects.php
tests/Feature/Modules/Tender/StoreTenderProjectTest.php
```

(Path ของ feature test ตาม convention ที่มีอยู่แล้ว — `tests/Feature/Modules/<Module>/...Test.php` แบบแบน
ไม่มี subfolder ย่อยตาม aggregate เช่น `StoreInternalProfileTest.php`, `DestroyDepartmentTest.php`)

### `TenderProjectRepositoryInterface`

```php
interface TenderProjectRepositoryInterface
{
    public function nextSequenceForFiscalYear(int $fiscalYear): int;

    public function save(TenderProject $project): TenderProject;
}
```

`TenderProjectRepository::save()` ตาม pattern เดียวกับ `VendorRepository`/`DepartmentRepository`:
ถ้า `$project->id() === null` สร้าง model ใหม่ ไม่งั้น `findOrFail()` แล้ว map field ทับ, `save()`,
แล้ว map Eloquent model กลับเป็น Domain Entity ผ่าน `TenderProject::reconstitute()`

`nextSequenceForFiscalYear()`: query `TenderProjects::where('project_code', 'like', "TP-{$fiscalYear}-%")
->lockForUpdate()->orderByDesc('project_code')->value('project_code')` แล้ว parse เลข 4 หลักท้าย +1
(ไม่มีแถวเดิม → เริ่มที่ 1) ครอบด้วย `DB::transaction()`

**ข้อจำกัดที่ทราบและยอมรับ (แก้คำอธิบายหลัง final whole-branch review ชี้ว่าขอบเขตเดิมเขียนแคบกว่าความจริง):**
lock ที่ได้จาก `lockForUpdate()` หลุดทันทีที่ `DB::transaction()` closure ของ `nextSequenceForFiscalYear()`
return — ซึ่งเกิด**ก่อน** `save()` จะถูกเรียก (คนละ method call กัน ไม่ได้ครอบ transaction เดียวกัน)
ดังนั้น lock นี้**ไม่ได้ป้องกัน race condition จริงในทุกกรณี** ไม่ใช่แค่กรณีปีงบประมาณใหม่ที่ยังไม่มีแถวเดิม —
แม้ปีงบประมาณที่มีโครงการอยู่แล้ว สอง request ที่เข้ามาพร้อมกันก็อ่านค่า "ล่าสุด" ตัวเดียวกันและคำนวณ
sequence ชนกันได้เช่นกัน ทุกกรณีพึ่งพา unique constraint ที่ระดับ DB บน `project_code` เป็น safety net
สุดท้าย — insert ที่แพ้จะ throw `QueryException` ออกไปเป็น 500 ที่ไม่ได้ catch (ไม่ silent insert ข้อมูลผิด)
ยอมรับความเสี่ยงนี้ไว้ตามเดิม ไม่ทำ retry-on-conflict หรือ sequence table แยก หรือครอบ transaction เดียวกัน
ในรอบนี้ — ยืนยันกับ user แล้วหลัง final review ว่าจะแก้แค่คำอธิบายให้ตรงความจริง ไม่แก้โค้ด
(ปริมาณการใช้งานจริงคือ staff ภายในไม่กี่คน ความเสี่ยง race condition จริงต่ำ)

### `CreateTenderProjectData` (Spatie Laravel Data, primitive types — ตาม pattern `DepartmentData`)

```php
final class CreateTenderProjectData extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly ?string $description,
        public readonly string $budget,
        public readonly int $departmentId,
        public readonly ?int $personInChargeId,
        public readonly string $procurementMethod,
        public readonly int $fiscalYear,
        public readonly ?string $projectStartAt,
        public readonly ?string $projectEndAt,
    ) {}
}
```

### `CreateTenderProjectUseCase`

```php
final class CreateTenderProjectUseCase
{
    public function __construct(
        private readonly TenderProjectRepositoryInterface $tenderProjects,
    ) {}

    public function execute(CreateTenderProjectData $data, int $createdBy): TenderProject
    {
        $sequence = $this->tenderProjects->nextSequenceForFiscalYear($data->fiscalYear);
        $projectCode = ProjectCode::fromString(
            sprintf('TP-%d-%04d', $data->fiscalYear, $sequence)
        );

        $project = TenderProject::create(
            projectCode: $projectCode,
            name: $data->name,
            description: $data->description,
            budget: Money::fromString($data->budget),
            departmentId: $data->departmentId,
            personInChargeId: $data->personInChargeId,
            createdBy: $createdBy,
            procurementMethod: $data->procurementMethod,
            fiscalYear: $data->fiscalYear,
            projectStartAt: $data->projectStartAt !== null ? CarbonImmutable::parse($data->projectStartAt) : null,
            projectEndAt: $data->projectEndAt !== null ? CarbonImmutable::parse($data->projectEndAt) : null,
        );

        $saved = $this->tenderProjects->save($project);

        app_log('Tender project created', [
            'tender_project_id' => $saved->id(),
            'project_code' => (string) $saved->projectCode(),
        ], 'info', 'tender');

        return $saved;
    }
}
```

### `StoreTenderProjectRequest`

ยืนยันจากโค้ดที่มีอยู่ (`StoreInternalProfileRequest`, `UpdateVendorInfoRequest`) ว่า convention ของ
โปรเจกต์นี้คือ field name จาก client เป็น **camelCase ตรงกับชื่อ property ของ Data class เป๊ะ**
(ไม่มี snake_case↔camelCase mapping ใน `config/data.php` — `name_mapping_strategy` เป็น `null`)
จึงใช้ camelCase ทั้งหมด ไม่ใช่ snake_case:

```php
public function rules(): array
{
    return [
        'name' => ['required', 'string', 'max:255'],
        'description' => ['nullable', 'string'],
        'budget' => ['required', 'numeric', 'min:0'],
        'departmentId' => ['required', 'integer', Rule::exists('departments', 'id')],
        'personInChargeId' => ['nullable', 'integer', Rule::exists('internal_profiles', 'id')],
        'procurementMethod' => ['required', 'string', 'max:255'],
        'fiscalYear' => ['required', 'integer'],
        'projectStartAt' => ['nullable', 'date'],
        'projectEndAt' => ['nullable', 'date', 'after_or_equal:projectStartAt'],
    ];
}
```

`createdBy` ไม่รับจาก client — ดึงจาก `$request->user()->id` ใน controller

### `TenderProjectController`

```php
public function store(StoreTenderProjectRequest $request): JsonResponse
{
    $project = $this->createTenderProject->execute(
        CreateTenderProjectData::from($request->validated()),
        $request->user()->id,
    );

    return response()->json(['data' => new TenderProjectResource($project)], 201);
}
```

`TenderProjectResource` ห่อ Domain Entity ตรงๆ (ไม่ query ซ้ำ) — เรียก method ของ entity ผ่าน
`JsonResource`'s `__call` proxy (`$this->id()`, `$this->projectCode()->value`, ฯลฯ) คืน field:
`id`, `projectCode`, `name`, `description`, `budget`, `departmentId`, `personInChargeId`,
`createdBy`, `procurementMethod`, `fiscalYear`, `projectStartAt`, `projectEndAt`, `status`

### Authorization

`TenderProjectPolicy::create(User $user): bool` — เช็ค
`$user->user_type === UserType::Internal && $user->checkPermissionTo('tender-projects.create')`
(pattern เดียวกับ `VendorProfilePolicy`)

`TenderServiceProvider::boot()`:
```php
Gate::define('tender-projects.store', [TenderProjectPolicy::class, 'create']);
$this->app->bind(TenderProjectRepositoryInterface::class, TenderProjectRepository::class);
```

**Gate ability ชื่อไม่เหมือน permission ที่เช็ค (แก้ไขหลัง Task 7 เจอบั๊กจริงระหว่าง implement):**
Spatie ผูก `Gate::before` hook ที่จะอนุญาตทันทีถ้า user ถือ permission ที่ชื่อ**ตรงกับ ability ที่กำลังเช็ค
พอดี** — ข้าม policy method (และการเช็ค `user_type`) ไปเลย ถ้า ability ชื่อ `tender-projects.create`
เหมือน permission เป๊ะ user ที่ไม่ใช่ internal แต่ถูกมอบ permission นี้จะผ่านการเช็คไปได้ทันที จึงต้องแยก:
permission ที่ admin มอบผ่าน UI ยังคงเป็น `tender-projects.create` เหมือนเดิม (ตรงกับที่ยืนยันกับ user แล้ว)
ส่วน Gate ability (ปรากฏเฉพาะใน `Gate::define()` กับ route middleware เท่านั้น ไม่มี admin คนไหนพิมพ์ชื่อนี้)
เปลี่ยนเป็น `tender-projects.store` แทน

permission `tender-projects.create` เป็น string ธรรมดาใน Spatie permission (ไม่ต้อง migration seed
ข้อมูล — ระบบจัดการ role/permission ผ่าน UI ที่มีอยู่แล้วให้ admin สร้าง/ผูก permission นี้เข้ากับ role เอง
ตาม pattern เดียวกับ permission อื่นที่ผ่านมา)

### Route

`routes/api/v1/dashboard/tender-projects.php` (ไฟล์ใหม่):
```php
Route::prefix('dashboard')->group(function () {
    Route::post('tender-projects', [TenderProjectController::class, 'store'])
        ->middleware('can:tender-projects.store')
        ->name('dashboard.tender-projects.store');
});
```

เพิ่ม `require __DIR__.'/api/v1/dashboard/tender-projects.php';` ใน `routes/api.php` ในกลุ่ม
`Route::middleware('auth')` เหมือนไฟล์ dashboard route อื่น

## Out of scope

- Frontend form/หน้า create — รอ task ถัดไป
- List/Show/Update/Delete tender project — เฉพาะ Create รอบนี้
- Tor, bid, evaluation, award — schema มีแล้วแต่ยังไม่มี model/repository/use case (นอกจากการย้ายไฟล์
  ที่มีอยู่ในส่วนที่ 1)
- Sequence table แยกสำหรับ `project_code` หรือ retry-on-conflict — ดูข้อจำกัดที่ยอมรับไว้ข้างบน
- State machine ของ `status` (draft → published → ...) — เกิดใหม่เป็น `draft` เสมอตาม `TenderProject::create()`
  ที่มีอยู่แล้ว ไม่มี action เปลี่ยน status ใน endpoint นี้
- Seed permission `tender-projects.create` ผ่าน migration/seeder — ใช้ระบบจัดการ permission ที่มีอยู่แล้ว

## Testing

- ย้าย test เดิม 6 ไฟล์ตามส่วนที่ 1 — คาดว่าผ่านเหมือนเดิมทุกตัว (ไม่มี logic เปลี่ยน)
- Feature test ใหม่ `tests/Feature/Modules/Tender/StoreTenderProjectTest.php` ครอบคลุม:
  - สร้างสำเร็จ (201, ตรวจ `project_code` รูปแบบ `TP-{ปี}-0001`, สถานะ `draft`, `created_by` มาจาก
    user ที่ login)
  - สร้างโครงการที่สองในปีงบประมาณเดียวกัน → sequence เป็น `0002`
  - โครงการปีงบประมาณใหม่ → sequence เริ่ม `0001` ใหม่
  - validation error: ขาด field required, `department_id`/`person_in_charge_id` ไม่มีอยู่จริง,
    `project_end_at` ก่อน `project_start_at`
  - ไม่มี permission `tender-projects.create` → 403
  - ไม่ login → 401
- รัน `php artisan test --compact --filter=Tender` และ `vendor/bin/pint --dirty --format agent`
  หลังแก้เสร็จ
