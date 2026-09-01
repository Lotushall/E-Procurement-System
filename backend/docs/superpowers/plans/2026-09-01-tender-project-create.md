# Tender Project Reorg + Create API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `App\Modules\Tender`'s existing files into per-aggregate subfolders (Project/Tor/Award), then add a full `POST /api/v1/dashboard/tender-projects` create endpoint on top of the reorganized structure.

**Architecture:** DDD module pattern already used by `Vendor`/`InternalProfiles`: Domain Entity + Value Objects (framework-free) → Repository interface/implementation mapping Entity ↔ Eloquent Model → Application UseCase orchestrating the Repository → Presentation FormRequest/Controller/Resource/Policy wired through a route file and the module's ServiceProvider.

**Tech Stack:** Laravel 13, `nwidart/laravel-modules`, `spatie/laravel-data` (DTOs), `spatie/laravel-permission` (authorization), Pest 4 (tests), SQLite in-memory for the test DB (real FK constraints enforced).

**Spec:** `docs/superpowers/specs/2026-09-01-tender-project-create-design.md`

## Global Constraints

- Client → server field names are **camelCase**, matching the Data/DTO class property names exactly (`config/data.php` has `name_mapping_strategy` set to `null` — no snake_case↔camelCase auto-mapping). Every new `FormRequest` in this plan uses camelCase rule keys.
- `project_code` format: `TP-{fiscalYear}-{4-digit sequence}` (e.g. `TP-2569-0001`). The sequence resets to `0001` for each new fiscal year and is computed server-side — never accepted from the client.
- Authorization uses the Policy + `Gate::define()` + `can:` middleware pattern from `VendorServiceProvider`/`VendorProfilePolicy` — not `role:admin` middleware.
- Part 1 (Tasks 1–4) is a pure file-move + namespace-rename of existing code — **no behavior changes**. Every existing test must still pass after each task.
- Backend-only scope. No frontend changes in this plan.
- **Do not run `git commit` after any task.** Per explicit user instruction, every task's final step only formats and `git add`s its files — leave everything staged. A single commit pass happens only after the user has reviewed the full diff and approved it (see "Final commit" after Task 8).

---

## Task 1: Reorganize the Project aggregate's Domain layer

**Files:**
- Move: `app/Modules/Tender/Domain/Entities/TenderProject.php` → `app/Modules/Tender/Domain/Entities/Project/TenderProject.php`
- Move: `app/Modules/Tender/Domain/ValueObjects/ProjectCode.php` → `app/Modules/Tender/Domain/ValueObjects/Project/ProjectCode.php`
- Move: `tests/Unit/Domain/Tender/Entities/TenderProjectTest.php` → `tests/Unit/Domain/Tender/Entities/Project/TenderProjectTest.php`
- Move: `tests/Unit/Domain/Tender/ValueObjects/ProjectCodeTest.php` → `tests/Unit/Domain/Tender/ValueObjects/Project/ProjectCodeTest.php`

**Interfaces:**
- Produces: `App\Modules\Tender\Domain\Entities\Project\TenderProject` (same public API as before — `create()`, `reconstitute()`, `update()`, `changeStatus()`, getters), `App\Modules\Tender\Domain\ValueObjects\Project\ProjectCode` (same API — `fromString()`, `->value`, `__toString()`)

- [ ] **Step 1: Move the two source files with git mv**

```bash
mkdir -p app/Modules/Tender/Domain/Entities/Project
mkdir -p app/Modules/Tender/Domain/ValueObjects/Project
git mv app/Modules/Tender/Domain/Entities/TenderProject.php app/Modules/Tender/Domain/Entities/Project/TenderProject.php
git mv app/Modules/Tender/Domain/ValueObjects/ProjectCode.php app/Modules/Tender/Domain/ValueObjects/Project/ProjectCode.php
```

- [ ] **Step 2: Fix the namespace in `app/Modules/Tender/Domain/ValueObjects/Project/ProjectCode.php`**

Change line 3 from `namespace App\Modules\Tender\Domain\ValueObjects;` to:

```php
namespace App\Modules\Tender\Domain\ValueObjects\Project;
```

Nothing else in this file changes.

- [ ] **Step 3: Fix the namespace and import in `app/Modules/Tender/Domain/Entities/Project/TenderProject.php`**

Change the top of the file from:

```php
namespace App\Modules\Tender\Domain\Entities;

use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\ValueObjects\ProjectCode;
use Carbon\CarbonImmutable;
```

to:

```php
namespace App\Modules\Tender\Domain\Entities\Project;

use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\ValueObjects\Project\ProjectCode;
use Carbon\CarbonImmutable;
```

Nothing else in this file changes (all method bodies stay identical).

- [ ] **Step 4: Move the two test files and fix their imports**

```bash
mkdir -p tests/Unit/Domain/Tender/Entities/Project
mkdir -p tests/Unit/Domain/Tender/ValueObjects/Project
git mv tests/Unit/Domain/Tender/Entities/TenderProjectTest.php tests/Unit/Domain/Tender/Entities/Project/TenderProjectTest.php
git mv tests/Unit/Domain/Tender/ValueObjects/ProjectCodeTest.php tests/Unit/Domain/Tender/ValueObjects/Project/ProjectCodeTest.php
```

In `tests/Unit/Domain/Tender/ValueObjects/Project/ProjectCodeTest.php`, change the only `use` line from:

```php
use App\Modules\Tender\Domain\ValueObjects\ProjectCode;
```

to:

```php
use App\Modules\Tender\Domain\ValueObjects\Project\ProjectCode;
```

In `tests/Unit/Domain/Tender/Entities/Project/TenderProjectTest.php`, change the top from:

```php
use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\Entities\TenderProject;
use App\Modules\Tender\Domain\ValueObjects\ProjectCode;
use Carbon\CarbonImmutable;
```

to:

```php
use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\Entities\Project\TenderProject;
use App\Modules\Tender\Domain\ValueObjects\Project\ProjectCode;
use Carbon\CarbonImmutable;
```

- [ ] **Step 5: Run the moved tests**

Run: `php artisan test --compact tests/Unit/Domain/Tender/Entities/Project/TenderProjectTest.php tests/Unit/Domain/Tender/ValueObjects/Project/ProjectCodeTest.php`
Expected: PASS (7 tests: 4 from `TenderProjectTest`, 4 from `ProjectCodeTest` — same count as before the move)

- [ ] **Step 6: Format and stage (do not commit)**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Tender/Domain/Entities/Project app/Modules/Tender/Domain/ValueObjects/Project tests/Unit/Domain/Tender/Entities/Project tests/Unit/Domain/Tender/ValueObjects/Project
git status
```

Confirm the old paths (`app/Modules/Tender/Domain/Entities/TenderProject.php`, etc.) show as deleted and the new paths show as added. Leave staged — do not commit (see Global Constraints). Suggested message for the final commit: `"refactor(tender): move TenderProject entity and ProjectCode into Project/ subfolder"`

---

## Task 2: Reorganize the Tor aggregate's Domain layer

**Files:**
- Move: `app/Modules/Tender/Domain/Entities/Tor.php` → `app/Modules/Tender/Domain/Entities/Tor/Tor.php`
- Move: `app/Modules/Tender/Domain/Entities/TorDocument.php` → `app/Modules/Tender/Domain/Entities/Tor/TorDocument.php`
- Move: `app/Modules/Tender/Domain/ValueObjects/TorCode.php` → `app/Modules/Tender/Domain/ValueObjects/Tor/TorCode.php`
- Move: `tests/Unit/Domain/Tender/Entities/TorTest.php` → `tests/Unit/Domain/Tender/Entities/Tor/TorTest.php`
- Move: `tests/Unit/Domain/Tender/Entities/TorDocumentTest.php` → `tests/Unit/Domain/Tender/Entities/Tor/TorDocumentTest.php`
- Move: `tests/Unit/Domain/Tender/ValueObjects/TorCodeTest.php` → `tests/Unit/Domain/Tender/ValueObjects/Tor/TorCodeTest.php`

**Interfaces:**
- Produces: `App\Modules\Tender\Domain\Entities\Tor\Tor`, `App\Modules\Tender\Domain\Entities\Tor\TorDocument`, `App\Modules\Tender\Domain\ValueObjects\Tor\TorCode` (same public API as before, no behavior change)

- [ ] **Step 1: Move the three source files with git mv**

```bash
mkdir -p app/Modules/Tender/Domain/Entities/Tor
mkdir -p app/Modules/Tender/Domain/ValueObjects/Tor
git mv app/Modules/Tender/Domain/Entities/Tor.php app/Modules/Tender/Domain/Entities/Tor/Tor.php
git mv app/Modules/Tender/Domain/Entities/TorDocument.php app/Modules/Tender/Domain/Entities/Tor/TorDocument.php
git mv app/Modules/Tender/Domain/ValueObjects/TorCode.php app/Modules/Tender/Domain/ValueObjects/Tor/TorCode.php
```

- [ ] **Step 2: Fix the namespace in `app/Modules/Tender/Domain/ValueObjects/Tor/TorCode.php`**

Change line 3 from `namespace App\Modules\Tender\Domain\ValueObjects;` to:

```php
namespace App\Modules\Tender\Domain\ValueObjects\Tor;
```

- [ ] **Step 3: Fix the namespace and import in `app/Modules/Tender/Domain/Entities/Tor/Tor.php`**

Change the top of the file from:

```php
namespace App\Modules\Tender\Domain\Entities;

use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\ValueObjects\TorCode;
use Carbon\CarbonImmutable;
```

to:

```php
namespace App\Modules\Tender\Domain\Entities\Tor;

use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\ValueObjects\Tor\TorCode;
use Carbon\CarbonImmutable;
```

- [ ] **Step 4: Fix the namespace in `app/Modules/Tender/Domain/Entities/Tor/TorDocument.php`**

Change line 3 from `namespace App\Modules\Tender\Domain\Entities;` to:

```php
namespace App\Modules\Tender\Domain\Entities\Tor;
```

(No `use` statements to change — this file has none referencing moved classes.)

- [ ] **Step 5: Move the three test files and fix their imports**

```bash
mkdir -p tests/Unit/Domain/Tender/Entities/Tor
mkdir -p tests/Unit/Domain/Tender/ValueObjects/Tor
git mv tests/Unit/Domain/Tender/Entities/TorTest.php tests/Unit/Domain/Tender/Entities/Tor/TorTest.php
git mv tests/Unit/Domain/Tender/Entities/TorDocumentTest.php tests/Unit/Domain/Tender/Entities/Tor/TorDocumentTest.php
git mv tests/Unit/Domain/Tender/ValueObjects/TorCodeTest.php tests/Unit/Domain/Tender/ValueObjects/Tor/TorCodeTest.php
```

In `tests/Unit/Domain/Tender/ValueObjects/Tor/TorCodeTest.php`, change the only `use` line from:

```php
use App\Modules\Tender\Domain\ValueObjects\TorCode;
```

to:

```php
use App\Modules\Tender\Domain\ValueObjects\Tor\TorCode;
```

In `tests/Unit/Domain/Tender/Entities/Tor/TorTest.php`, change the top from:

```php
use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\Entities\Tor;
use App\Modules\Tender\Domain\ValueObjects\TorCode;
use Carbon\CarbonImmutable;
```

to:

```php
use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\Entities\Tor\Tor;
use App\Modules\Tender\Domain\ValueObjects\Tor\TorCode;
use Carbon\CarbonImmutable;
```

In `tests/Unit/Domain/Tender/Entities/Tor/TorDocumentTest.php`, change the only `use` line from:

```php
use App\Modules\Tender\Domain\Entities\TorDocument;
```

to:

```php
use App\Modules\Tender\Domain\Entities\Tor\TorDocument;
```

- [ ] **Step 6: Run the moved tests**

Run: `php artisan test --compact tests/Unit/Domain/Tender/Entities/Tor tests/Unit/Domain/Tender/ValueObjects/Tor`
Expected: PASS (13 tests: 5 from `TorTest`, 3 from `TorDocumentTest`, 4 from `TorCodeTest`, plus `makeTor`/`makeTorDocument` helper functions still resolve — same total as before the move)

- [ ] **Step 7: Format and stage (do not commit)**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Tender/Domain/Entities/Tor app/Modules/Tender/Domain/ValueObjects/Tor tests/Unit/Domain/Tender/Entities/Tor tests/Unit/Domain/Tender/ValueObjects/Tor
git status
```

Leave staged — do not commit. Suggested message for the final commit: `"refactor(tender): move Tor and TorDocument entities and TorCode into Tor/ subfolder"`

---

## Task 3: Reorganize the Award value object

**Files:**
- Move: `app/Modules/Tender/Domain/ValueObjects/ContractNumber.php` → `app/Modules/Tender/Domain/ValueObjects/Award/ContractNumber.php`
- Move: `tests/Unit/Domain/Tender/ValueObjects/ContractNumberTest.php` → `tests/Unit/Domain/Tender/ValueObjects/Award/ContractNumberTest.php`

**Interfaces:**
- Produces: `App\Modules\Tender\Domain\ValueObjects\Award\ContractNumber` (same public API as before — `fromString()`, `->value`, `__toString()`). Not consumed by anything yet (reserved for the future `tor_awards.contract_number` field).

- [ ] **Step 1: Move both files with git mv**

```bash
mkdir -p app/Modules/Tender/Domain/ValueObjects/Award
mkdir -p tests/Unit/Domain/Tender/ValueObjects/Award
git mv app/Modules/Tender/Domain/ValueObjects/ContractNumber.php app/Modules/Tender/Domain/ValueObjects/Award/ContractNumber.php
git mv tests/Unit/Domain/Tender/ValueObjects/ContractNumberTest.php tests/Unit/Domain/Tender/ValueObjects/Award/ContractNumberTest.php
```

- [ ] **Step 2: Fix the namespace in `app/Modules/Tender/Domain/ValueObjects/Award/ContractNumber.php`**

Change line 3 from `namespace App\Modules\Tender\Domain\ValueObjects;` to:

```php
namespace App\Modules\Tender\Domain\ValueObjects\Award;
```

- [ ] **Step 3: Fix the import in `tests/Unit/Domain/Tender/ValueObjects/Award/ContractNumberTest.php`**

Change the only `use` line from:

```php
use App\Modules\Tender\Domain\ValueObjects\ContractNumber;
```

to:

```php
use App\Modules\Tender\Domain\ValueObjects\Award\ContractNumber;
```

- [ ] **Step 4: Run the moved test**

Run: `php artisan test --compact tests/Unit/Domain/Tender/ValueObjects/Award/ContractNumberTest.php`
Expected: PASS (4 tests)

- [ ] **Step 5: Format and stage (do not commit)**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Tender/Domain/ValueObjects/Award tests/Unit/Domain/Tender/ValueObjects/Award
git status
```

Leave staged — do not commit. Suggested message for the final commit: `"refactor(tender): move ContractNumber into Award/ subfolder"`

---

## Task 4: Reorganize the Infrastructure models, delete the unused controller scaffold, and add a relation regression test

`TenderProjects`, `Tors`, and `TorDocuments` reference each other's Eloquent relations, so they move together in one task (moving them separately would leave a real "class not found" risk mid-task, since a lazy `use` import to a not-yet-moved class only fails when the relation method actually runs).

**Files:**
- Move: `app/Modules/Tender/Infrastructure/Models/TenderProjects.php` → `app/Modules/Tender/Infrastructure/Models/Project/TenderProjects.php`
- Move: `app/Modules/Tender/Infrastructure/Models/Tors.php` → `app/Modules/Tender/Infrastructure/Models/Tor/Tors.php`
- Move: `app/Modules/Tender/Infrastructure/Models/TorDocuments.php` → `app/Modules/Tender/Infrastructure/Models/Tor/TorDocuments.php`
- Delete: `app/Modules/Tender/Presentation/Http/Controllers/TenderController.php` (unused scaffold — returns Blade views that don't exist)
- Create: `tests/Feature/Modules/Tender/TenderModelRelationsTest.php`

**Interfaces:**
- Produces: `App\Modules\Tender\Infrastructure\Models\Project\TenderProjects`, `App\Modules\Tender\Infrastructure\Models\Tor\Tors`, `App\Modules\Tender\Infrastructure\Models\Tor\TorDocuments` — same fillable attributes, casts, and relation method names as before (`TenderProjectsTors`, `TorsTenderProject`, `TorsDocuments`, `TorDocumentsTor`, plus `TenderProjectsDepartment`/`TenderProjectsPersonInCharge`/`TenderProjectsCreatedBy` on the Project model and `TorsDepartment`/`TorsCreatedBy`/`TorsApprovedBy` on the Tor model, unchanged)

- [ ] **Step 1: Move the three model files with git mv**

```bash
mkdir -p app/Modules/Tender/Infrastructure/Models/Project
mkdir -p app/Modules/Tender/Infrastructure/Models/Tor
git mv app/Modules/Tender/Infrastructure/Models/TenderProjects.php app/Modules/Tender/Infrastructure/Models/Project/TenderProjects.php
git mv app/Modules/Tender/Infrastructure/Models/Tors.php app/Modules/Tender/Infrastructure/Models/Tor/Tors.php
git mv app/Modules/Tender/Infrastructure/Models/TorDocuments.php app/Modules/Tender/Infrastructure/Models/Tor/TorDocuments.php
```

- [ ] **Step 2: Fix `app/Modules/Tender/Infrastructure/Models/Project/TenderProjects.php`**

Change the top of the file from:

```php
namespace App\Modules\Tender\Infrastructure\Models;

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
```

to:

```php
namespace App\Modules\Tender\Infrastructure\Models\Project;

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
```

(Added the `use App\Modules\Tender\Infrastructure\Models\Tor\Tors;` line — needed because `TenderProjectsTors()` references `Tors::class` and `Tors` no longer lives in the same namespace. Nothing else in the file changes — the `#[Table('tenders_projects')]` attribute, `#[Fillable([...])]` list, casts, and all relation method bodies stay identical.)

- [ ] **Step 3: Fix `app/Modules/Tender/Infrastructure/Models/Tor/Tors.php`**

Change the top of the file from:

```php
namespace App\Modules\Tender\Infrastructure\Models;

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
```

to:

```php
namespace App\Modules\Tender\Infrastructure\Models\Tor;

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
```

(Added the `use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;` line — needed because `TorsTenderProject()` references `TenderProjects::class`. `TorsDocuments()` references `TorDocuments::class`, which is moving into this same `Tor` namespace in the next step, so it needs no import. Nothing else changes.)

- [ ] **Step 4: Fix `app/Modules/Tender/Infrastructure/Models/Tor/TorDocuments.php`**

Change line 3 from `namespace App\Modules\Tender\Infrastructure\Models;` to:

```php
namespace App\Modules\Tender\Infrastructure\Models\Tor;
```

(`TorDocumentsTor()` references `Tors::class`, which is in this same `Tor` namespace, so no new import is needed. Nothing else changes.)

- [ ] **Step 5: Delete the unused controller scaffold**

```bash
git rm app/Modules/Tender/Presentation/Http/Controllers/TenderController.php
```

This file only contained default `module:make-controller` scaffold methods returning `view('tender::index')` etc. — no Blade views exist for this module (it's a JSON API), and nothing routes to it (confirmed via `php artisan route:list --path=tender` returning nothing before this change).

- [ ] **Step 6: Write the relation regression test**

Create `tests/Feature/Modules/Tender/TenderModelRelationsTest.php`:

```php
<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\Tender\Infrastructure\Models\Tor\TorDocuments;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('tender project, TOR, and TOR document relations resolve after the module reorg', function () {
    $department = Department::create(['name' => 'IT']);

    $project = TenderProjects::create([
        'project_code' => 'TP-2569-0001',
        'name' => 'จัดซื้อคอมพิวเตอร์',
        'budget' => '500000.00',
        'department_id' => $department->id,
        'procurement_method' => 'e-bidding',
        'fiscal_year' => 2569,
    ]);

    $tor = Tors::create([
        'tor_code' => 'TOR-2569-0001',
        'title' => 'จัดซื้อคอมพิวเตอร์ 50 เครื่อง',
        'scope_of_work' => 'ขอบเขตงาน',
        'department_id' => $department->id,
        'tender_project_id' => $project->id,
        'budget_estimate' => '500000.00',
    ]);

    $document = TorDocuments::create([
        'label' => 'ขอบเขตงานฉบับเต็ม',
        'tor_id' => $tor->id,
        'file_name' => 'scope.pdf',
        'file_path' => 'tor-documents/scope.pdf',
    ]);

    expect($project->TenderProjectsTors)->toHaveCount(1)
        ->and($project->TenderProjectsTors->first()->id)->toBe($tor->id)
        ->and($tor->TorsTenderProject->id)->toBe($project->id)
        ->and($tor->TorsDocuments)->toHaveCount(1)
        ->and($document->TorDocumentsTor->id)->toBe($tor->id);
});
```

- [ ] **Step 7: Run the new test and the full existing suite to check for regressions**

Run: `php artisan test --compact tests/Feature/Modules/Tender/TenderModelRelationsTest.php`
Expected: PASS (1 test)

Run: `php artisan test --compact`
Expected: PASS for every test that passed before Task 1 (there may be a handful of pre-existing unrelated failures already in the suite — compare against a baseline run before this plan if unsure; no *new* failures should appear)

- [ ] **Step 8: Format and stage (do not commit)**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Tender/Infrastructure/Models/Project app/Modules/Tender/Infrastructure/Models/Tor tests/Feature/Modules/Tender/TenderModelRelationsTest.php
git status
```

Confirm `app/Modules/Tender/Presentation/Http/Controllers/TenderController.php` shows as deleted (already staged by `git rm` in Step 5). Leave staged — do not commit. Suggested message for the final commit: `"refactor(tender): move Eloquent models into Project/Tor subfolders, drop unused controller scaffold"`

---

## Task 5: TenderProjectRepositoryInterface + TenderProjectRepository

**Files:**
- Create: `app/Modules/Tender/Domain/Repositories/Project/TenderProjectRepositoryInterface.php`
- Create: `app/Modules/Tender/Infrastructure/Repositories/Project/TenderProjectRepository.php`
- Modify: `app/Modules/Tender/Providers/TenderServiceProvider.php`
- Test: `tests/Feature/Modules/Tender/TenderProjectRepositoryTest.php`

**Interfaces:**
- Consumes: `App\Modules\Tender\Domain\Entities\Project\TenderProject` (from Task 1 — `create()`, `reconstitute()`, `id()`, `projectCode()`, `name()`, `description()`, `budget()`, `departmentId()`, `personInChargeId()`, `createdBy()`, `procurementMethod()`, `fiscalYear()`, `projectStartAt()`, `projectEndAt()`, `status()`), `App\Modules\Tender\Domain\ValueObjects\Project\ProjectCode` (from Task 1), `App\Modules\Tender\Infrastructure\Models\Project\TenderProjects` (from Task 4), `App\Modules\Shared\Domain\ValueObjects\Money`
- Produces: `App\Modules\Tender\Domain\Repositories\Project\TenderProjectRepositoryInterface` with `nextSequenceForFiscalYear(int $fiscalYear): int` and `save(TenderProject $project): TenderProject` — bound to `TenderProjectRepository` in the container, used by Task 6's UseCase

- [ ] **Step 1: Write the failing repository test**

Create `tests/Feature/Modules/Tender/TenderProjectRepositoryTest.php`:

```php
<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\Entities\Project\TenderProject;
use App\Modules\Tender\Domain\Repositories\Project\TenderProjectRepositoryInterface;
use App\Modules\Tender\Domain\ValueObjects\Project\ProjectCode;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('nextSequenceForFiscalYear starts at 1 when no project exists for that fiscal year', function () {
    $repository = app(TenderProjectRepositoryInterface::class);

    expect($repository->nextSequenceForFiscalYear(2569))->toBe(1);
});

test('nextSequenceForFiscalYear increments per existing project in that fiscal year', function () {
    $department = Department::create(['name' => 'IT']);
    $repository = app(TenderProjectRepositoryInterface::class);

    $repository->save(TenderProject::create(
        projectCode: ProjectCode::fromString('TP-2569-0001'),
        name: 'จัดซื้อคอมพิวเตอร์',
        description: null,
        budget: Money::fromString('500000'),
        departmentId: $department->id,
        personInChargeId: null,
        createdBy: null,
        procurementMethod: 'e-bidding',
        fiscalYear: 2569,
        projectStartAt: null,
        projectEndAt: null,
    ));

    expect($repository->nextSequenceForFiscalYear(2569))->toBe(2);
});

test('nextSequenceForFiscalYear resets to 1 for a different fiscal year', function () {
    $department = Department::create(['name' => 'IT']);
    $repository = app(TenderProjectRepositoryInterface::class);

    $repository->save(TenderProject::create(
        projectCode: ProjectCode::fromString('TP-2569-0001'),
        name: 'จัดซื้อคอมพิวเตอร์',
        description: null,
        budget: Money::fromString('500000'),
        departmentId: $department->id,
        personInChargeId: null,
        createdBy: null,
        procurementMethod: 'e-bidding',
        fiscalYear: 2569,
        projectStartAt: null,
        projectEndAt: null,
    ));

    expect($repository->nextSequenceForFiscalYear(2570))->toBe(1);
});

test('save persists a new tender project and returns it reconstituted with an id', function () {
    $department = Department::create(['name' => 'IT']);

    $project = TenderProject::create(
        projectCode: ProjectCode::fromString('TP-2569-0001'),
        name: 'จัดซื้อคอมพิวเตอร์',
        description: 'รายละเอียด',
        budget: Money::fromString('500000'),
        departmentId: $department->id,
        personInChargeId: null,
        createdBy: null,
        procurementMethod: 'e-bidding',
        fiscalYear: 2569,
        projectStartAt: null,
        projectEndAt: null,
    );

    $saved = app(TenderProjectRepositoryInterface::class)->save($project);

    expect($saved->id())->not->toBeNull()
        ->and($saved->projectCode()->value)->toBe('TP-2569-0001')
        ->and($saved->status())->toBe('draft')
        ->and($saved->budget()->amount)->toBe('500000.00');

    $this->assertDatabaseHas('tenders_projects', [
        'id' => $saved->id(),
        'project_code' => 'TP-2569-0001',
        'department_id' => $department->id,
        'status' => 'draft',
    ]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact tests/Feature/Modules/Tender/TenderProjectRepositoryTest.php`
Expected: FAIL — `Target class [App\Modules\Tender\Domain\Repositories\Project\TenderProjectRepositoryInterface] does not exist.` (interface and binding don't exist yet)

- [ ] **Step 3: Create the repository interface**

Create `app/Modules/Tender/Domain/Repositories/Project/TenderProjectRepositoryInterface.php`:

```php
<?php

namespace App\Modules\Tender\Domain\Repositories\Project;

use App\Modules\Tender\Domain\Entities\Project\TenderProject;

interface TenderProjectRepositoryInterface
{
    /**
     * The next 4-digit sequence number for the given fiscal year, starting
     * at 1 when no project exists yet for that year.
     */
    public function nextSequenceForFiscalYear(int $fiscalYear): int;

    public function save(TenderProject $project): TenderProject;
}
```

- [ ] **Step 4: Create the repository implementation**

Create `app/Modules/Tender/Infrastructure/Repositories/Project/TenderProjectRepository.php`:

```php
<?php

namespace App\Modules\Tender\Infrastructure\Repositories\Project;

use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\Entities\Project\TenderProject;
use App\Modules\Tender\Domain\Repositories\Project\TenderProjectRepositoryInterface;
use App\Modules\Tender\Domain\ValueObjects\Project\ProjectCode;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class TenderProjectRepository implements TenderProjectRepositoryInterface
{
    public function nextSequenceForFiscalYear(int $fiscalYear): int
    {
        return DB::transaction(function () use ($fiscalYear) {
            $prefix = "TP-{$fiscalYear}-";

            $lastCode = TenderProjects::where('project_code', 'like', "{$prefix}%")
                ->lockForUpdate()
                ->orderByDesc('project_code')
                ->value('project_code');

            if ($lastCode === null) {
                return 1;
            }

            return ((int) substr($lastCode, strlen($prefix))) + 1;
        });
    }

    public function save(TenderProject $project): TenderProject
    {
        $model = $project->id() !== null
            ? TenderProjects::findOrFail($project->id())
            : new TenderProjects;

        $model->project_code = (string) $project->projectCode();
        $model->name = $project->name();
        $model->description = $project->description();
        $model->budget = $project->budget()->amount;
        $model->department_id = $project->departmentId();
        $model->person_in_charge_id = $project->personInChargeId();
        $model->created_by = $project->createdBy();
        $model->procurement_method = $project->procurementMethod();
        $model->fiscal_year = $project->fiscalYear();
        $model->project_start_at = $project->projectStartAt();
        $model->project_end_at = $project->projectEndAt();
        $model->status = $project->status();
        $model->save();

        return $this->mapToEntity($model);
    }

    private function mapToEntity(TenderProjects $model): TenderProject
    {
        return TenderProject::reconstitute(
            id: $model->id,
            projectCode: ProjectCode::fromString($model->project_code),
            name: $model->name,
            description: $model->description,
            budget: Money::fromString($model->budget),
            departmentId: $model->department_id,
            personInChargeId: $model->person_in_charge_id,
            createdBy: $model->created_by,
            procurementMethod: $model->procurement_method,
            fiscalYear: $model->fiscal_year,
            projectStartAt: $model->project_start_at !== null ? CarbonImmutable::instance($model->project_start_at) : null,
            projectEndAt: $model->project_end_at !== null ? CarbonImmutable::instance($model->project_end_at) : null,
            status: $model->status,
        );
    }
}
```

**Known limitation (documented in the spec, not fixed here — corrected after the final whole-branch review found the original wording understated its scope):** `nextSequenceForFiscalYear()`'s row lock is released when its own `DB::transaction()` closure returns — which happens *before* `save()` is called (a separate method call, not wrapped in the same transaction). So the lock provides **no real protection against any concurrent create in the same fiscal year**, not just the brand-new-fiscal-year case: two simultaneous requests for the *same already-populated* fiscal year can both read the same "last" `project_code` and compute the same next sequence. In every case, the DB-level `unique` constraint on `project_code` is the actual safety net — the loser's `INSERT` throws a `QueryException` (surfacing as an unhandled 500), never silently duplicating data. No retry-on-conflict and no single-transaction fix is implemented in this task; the user reviewed this wider scope and chose to accept it as documented risk rather than fix it now (internal admin tool, low realistic concurrency).

- [ ] **Step 5: Bind the interface in the service provider**

Modify `app/Modules/Tender/Providers/TenderServiceProvider.php` — change:

```php
namespace App\Modules\Tender\Providers;

use Illuminate\Console\Scheduling\Schedule;
use Nwidart\Modules\Support\ModuleServiceProvider;

class TenderServiceProvider extends ModuleServiceProvider
{
    /**
     * The name of the module.
     */
    protected string $name = 'Tender';

    /**
     * The lowercase version of the module name.
     */
    protected string $nameLower = 'tender';

    /**
     * Command classes to register.
     *
     * @var string[]
     */
    // protected array $commands = [];

    /**
     * Provider classes to register.
     *
     * @var string[]
     */
    protected array $providers = [];

    /**
     * Define module schedules.
     *
     * @param  $schedule
     */
    // protected function configureSchedules(Schedule $schedule): void
    // {
    //     $schedule->command('inspire')->hourly();
    // }
}
```

to:

```php
namespace App\Modules\Tender\Providers;

use App\Modules\Tender\Domain\Repositories\Project\TenderProjectRepositoryInterface;
use App\Modules\Tender\Infrastructure\Repositories\Project\TenderProjectRepository;
use Illuminate\Console\Scheduling\Schedule;
use Nwidart\Modules\Support\ModuleServiceProvider;

class TenderServiceProvider extends ModuleServiceProvider
{
    /**
     * The name of the module.
     */
    protected string $name = 'Tender';

    /**
     * The lowercase version of the module name.
     */
    protected string $nameLower = 'tender';

    /**
     * Command classes to register.
     *
     * @var string[]
     */
    // protected array $commands = [];

    /**
     * Provider classes to register.
     *
     * @var string[]
     */
    protected array $providers = [];

    public function register(): void
    {
        parent::register();

        $this->app->bind(TenderProjectRepositoryInterface::class, TenderProjectRepository::class);
    }

    /**
     * Define module schedules.
     *
     * @param  $schedule
     */
    // protected function configureSchedules(Schedule $schedule): void
    // {
    //     $schedule->command('inspire')->hourly();
    // }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `php artisan test --compact tests/Feature/Modules/Tender/TenderProjectRepositoryTest.php`
Expected: PASS (4 tests)

- [ ] **Step 7: Format and stage (do not commit)**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Tender/Domain/Repositories/Project app/Modules/Tender/Infrastructure/Repositories/Project app/Modules/Tender/Providers/TenderServiceProvider.php tests/Feature/Modules/Tender/TenderProjectRepositoryTest.php
git status
```

Leave staged — do not commit. Suggested message for the final commit: `"feat(tender): add TenderProjectRepository with fiscal-year-scoped project code sequencing"`

---

## Task 6: CreateTenderProjectData + CreateTenderProjectUseCase

**Files:**
- Create: `app/Modules/Tender/Application/Project/DTOs/CreateTenderProjectData.php`
- Create: `app/Modules/Tender/Application/Project/UseCases/CreateTenderProjectUseCase.php`
- Test: `tests/Feature/Modules/Tender/CreateTenderProjectUseCaseTest.php`

**Interfaces:**
- Consumes: `TenderProjectRepositoryInterface::nextSequenceForFiscalYear()` / `::save()` (Task 5), `App\Modules\Tender\Domain\Entities\Project\TenderProject::create()` (Task 1), `App\Modules\Tender\Domain\ValueObjects\Project\ProjectCode::fromString()` (Task 1), `App\Modules\Shared\Domain\ValueObjects\Money::fromString()`
- Produces: `App\Modules\Tender\Application\Project\DTOs\CreateTenderProjectData` (constructor: `name, description, budget, departmentId, personInChargeId, procurementMethod, fiscalYear, projectStartAt, projectEndAt` — all primitive types, see code below), `App\Modules\Tender\Application\Project\UseCases\CreateTenderProjectUseCase::execute(CreateTenderProjectData $data, int $createdBy): TenderProject` — used by Task 8's controller

- [ ] **Step 1: Write the failing use case test**

Create `tests/Feature/Modules/Tender/CreateTenderProjectUseCaseTest.php`:

```php
<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Tender\Application\Project\DTOs\CreateTenderProjectData;
use App\Modules\Tender\Application\Project\UseCases\CreateTenderProjectUseCase;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('execute creates a draft tender project with an auto-generated project code', function () {
    $department = Department::create(['name' => 'IT']);
    $creator = User::factory()->create(['user_type' => 'internal']);

    $data = new CreateTenderProjectData(
        name: 'จัดซื้อคอมพิวเตอร์',
        description: 'รายละเอียด',
        budget: '500000',
        departmentId: $department->id,
        personInChargeId: null,
        procurementMethod: 'e-bidding',
        fiscalYear: 2569,
        projectStartAt: null,
        projectEndAt: null,
    );

    $project = app(CreateTenderProjectUseCase::class)->execute($data, $creator->id);

    expect($project->id())->not->toBeNull()
        ->and($project->projectCode()->value)->toBe('TP-2569-0001')
        ->and($project->status())->toBe('draft')
        ->and($project->budget()->amount)->toBe('500000.00')
        ->and($project->createdBy())->toBe($creator->id);
});

test('execute assigns the next sequence number for a second project in the same fiscal year', function () {
    $department = Department::create(['name' => 'IT']);
    $creator = User::factory()->create(['user_type' => 'internal']);
    $makeData = fn () => new CreateTenderProjectData(
        name: 'จัดซื้อคอมพิวเตอร์',
        description: null,
        budget: '100000',
        departmentId: $department->id,
        personInChargeId: null,
        procurementMethod: 'e-bidding',
        fiscalYear: 2569,
        projectStartAt: null,
        projectEndAt: null,
    );

    app(CreateTenderProjectUseCase::class)->execute($makeData(), $creator->id);
    $second = app(CreateTenderProjectUseCase::class)->execute($makeData(), $creator->id);

    expect($second->projectCode()->value)->toBe('TP-2569-0002');
});

test('execute parses nullable start and end dates', function () {
    $department = Department::create(['name' => 'IT']);
    $creator = User::factory()->create(['user_type' => 'internal']);

    $data = new CreateTenderProjectData(
        name: 'จัดซื้อคอมพิวเตอร์',
        description: null,
        budget: '100000',
        departmentId: $department->id,
        personInChargeId: null,
        procurementMethod: 'e-bidding',
        fiscalYear: 2569,
        projectStartAt: '2026-09-01',
        projectEndAt: '2026-12-31',
    );

    $project = app(CreateTenderProjectUseCase::class)->execute($data, $creator->id);

    expect($project->projectStartAt()->toDateString())->toBe('2026-09-01')
        ->and($project->projectEndAt()->toDateString())->toBe('2026-12-31');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact tests/Feature/Modules/Tender/CreateTenderProjectUseCaseTest.php`
Expected: FAIL — `Class "App\Modules\Tender\Application\Project\DTOs\CreateTenderProjectData" not found`

- [ ] **Step 3: Create the DTO**

Create `app/Modules/Tender/Application/Project/DTOs/CreateTenderProjectData.php`:

```php
<?php

namespace App\Modules\Tender\Application\Project\DTOs;

use Spatie\LaravelData\Data;

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

- [ ] **Step 4: Create the use case**

Create `app/Modules/Tender/Application/Project/UseCases/CreateTenderProjectUseCase.php`:

```php
<?php

namespace App\Modules\Tender\Application\Project\UseCases;

use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Application\Project\DTOs\CreateTenderProjectData;
use App\Modules\Tender\Domain\Entities\Project\TenderProject;
use App\Modules\Tender\Domain\Repositories\Project\TenderProjectRepositoryInterface;
use App\Modules\Tender\Domain\ValueObjects\Project\ProjectCode;
use Carbon\CarbonImmutable;

final class CreateTenderProjectUseCase
{
    public function __construct(
        private readonly TenderProjectRepositoryInterface $tenderProjects,
    ) {}

    public function execute(CreateTenderProjectData $data, int $createdBy): TenderProject
    {
        $sequence = $this->tenderProjects->nextSequenceForFiscalYear($data->fiscalYear);
        $projectCode = ProjectCode::fromString(sprintf('TP-%d-%04d', $data->fiscalYear, $sequence));

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

- [ ] **Step 5: Run the test to verify it passes**

Run: `php artisan test --compact tests/Feature/Modules/Tender/CreateTenderProjectUseCaseTest.php`
Expected: PASS (3 tests)

- [ ] **Step 6: Format and stage (do not commit)**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Tender/Application/Project tests/Feature/Modules/Tender/CreateTenderProjectUseCaseTest.php
git status
```

Leave staged — do not commit. Suggested message for the final commit: `"feat(tender): add CreateTenderProjectUseCase"`

---

## Task 7: TenderProjectPolicy + Gate wiring

**Files:**
- Create: `app/Modules/Tender/Presentation/Policies/TenderProjectPolicy.php`
- Modify: `app/Modules/Tender/Providers/TenderServiceProvider.php`
- Test: `tests/Feature/Modules/Tender/TenderProjectPolicyTest.php`

**Interfaces:**
- Consumes: `App\Modules\User\Domain\Enums\UserType::Internal`, `App\Modules\User\Infrastructure\Models\User::checkPermissionTo()` (Spatie)
- Produces: `App\Modules\Tender\Presentation\Policies\TenderProjectPolicy::create(User $user): bool`, Gate ability `tender-projects.store` — consumed by Task 8's route middleware (`can:tender-projects.store`)

**Naming note (corrected after Task 7's first implementation caught a real bug):** the Gate ability name and the permission the policy checks must be two different strings. Spatie registers a `Gate::before` hook that grants access immediately whenever the ability name being checked exactly matches a permission the user directly holds — bypassing the policy method (and its `user_type` guard) entirely. If the ability were named `tender-projects.create` (the same string as the permission), a non-internal user granted `tender-projects.create` would skip the `user_type === Internal` check. So: the **permission** stays `tender-projects.create` (this is the string an admin grants via the permission-management UI, unchanged from the rest of this plan/spec), and the **Gate ability** — which appears only in this task's `Gate::define()` call and in Task 8's route middleware, never typed by an admin — is `tender-projects.store` instead.

- [ ] **Step 1: Write the failing policy test**

Create `tests/Feature/Modules/Tender/TenderProjectPolicyTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

test('an internal user with the tender-projects.create permission is authorized', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender-projects.create', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.store'))->toBeTrue();
});

test('an internal user without the permission is not authorized', function () {
    $user = User::factory()->create(['user_type' => 'internal']);

    expect(Gate::forUser($user)->allows('tender-projects.store'))->toBeFalse();
});

test('a non-internal user is not authorized even when directly granted the permission', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender-projects.create', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.store'))->toBeFalse();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact tests/Feature/Modules/Tender/TenderProjectPolicyTest.php`
Expected: FAIL — the `tender-projects.store` ability isn't defined, so `Gate::forUser($user)->allows(...)` returns `false` for all three tests, including the first one that expects `true`

- [ ] **Step 3: Create the policy**

Create `app/Modules/Tender/Presentation/Policies/TenderProjectPolicy.php`:

```php
<?php

namespace App\Modules\Tender\Presentation\Policies;

use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User;

class TenderProjectPolicy
{
    public function create(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->checkPermissionTo('tender-projects.create');
    }
}
```

- [ ] **Step 4: Wire the Gate in the service provider**

Modify `app/Modules/Tender/Providers/TenderServiceProvider.php` (as produced by Task 5, Step 5) — add a `boot()` method and the two new `use` lines:

```php
namespace App\Modules\Tender\Providers;

use App\Modules\Tender\Domain\Repositories\Project\TenderProjectRepositoryInterface;
use App\Modules\Tender\Infrastructure\Repositories\Project\TenderProjectRepository;
use App\Modules\Tender\Presentation\Policies\TenderProjectPolicy;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Gate;
use Nwidart\Modules\Support\ModuleServiceProvider;

class TenderServiceProvider extends ModuleServiceProvider
{
    /**
     * The name of the module.
     */
    protected string $name = 'Tender';

    /**
     * The lowercase version of the module name.
     */
    protected string $nameLower = 'tender';

    /**
     * Command classes to register.
     *
     * @var string[]
     */
    // protected array $commands = [];

    /**
     * Provider classes to register.
     *
     * @var string[]
     */
    protected array $providers = [];

    public function register(): void
    {
        parent::register();

        $this->app->bind(TenderProjectRepositoryInterface::class, TenderProjectRepository::class);
    }

    public function boot(): void
    {
        parent::boot();

        Gate::define('tender-projects.store', [TenderProjectPolicy::class, 'create']);
    }

    /**
     * Define module schedules.
     *
     * @param  $schedule
     */
    // protected function configureSchedules(Schedule $schedule): void
    // {
    //     $schedule->command('inspire')->hourly();
    // }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `php artisan test --compact tests/Feature/Modules/Tender/TenderProjectPolicyTest.php`
Expected: PASS (3 tests)

- [ ] **Step 6: Format and stage (do not commit)**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Tender/Presentation/Policies app/Modules/Tender/Providers/TenderServiceProvider.php tests/Feature/Modules/Tender/TenderProjectPolicyTest.php
git status
```

Leave staged — do not commit. Suggested message for the final commit: `"feat(tender): add TenderProjectPolicy and tender-projects.store gate"`

---

## Task 8: StoreTenderProjectRequest + TenderProjectResource + TenderProjectController + route

**Files:**
- Create: `app/Modules/Tender/Presentation/Http/Requests/Project/StoreTenderProjectRequest.php`
- Create: `app/Modules/Tender/Presentation/Http/Resources/Project/TenderProjectResource.php`
- Create: `app/Modules/Tender/Presentation/Http/Controllers/TenderProjectController.php`
- Create: `routes/api/v1/dashboard/tender-projects.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Modules/Tender/StoreTenderProjectTest.php`

**Interfaces:**
- Consumes: `CreateTenderProjectUseCase::execute()` (Task 6), `CreateTenderProjectData` (Task 6), Gate ability `tender-projects.store` (Task 7 — note: the ability is named `tender-projects.store`, distinct from the `tender-projects.create` permission an admin actually grants; see Task 7's naming note)
- Produces: `POST /api/v1/dashboard/tender-projects` — the full public HTTP surface of this feature

- [ ] **Step 1: Write the failing HTTP feature test**

Create `tests/Feature/Modules/Tender/StoreTenderProjectTest.php`:

```php
<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function internalUserWithTenderProjectCreatePermission(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender-projects.create', 'guard_name' => 'web']));

    return $user;
}

function validTenderProjectPayload(array $overrides = []): array
{
    $department = Department::firstOrCreate(['name' => 'IT']);

    return array_merge([
        'name' => 'จัดซื้อคอมพิวเตอร์',
        'description' => 'รายละเอียดโครงการ',
        'budget' => 500000,
        'departmentId' => $department->id,
        'personInChargeId' => null,
        'procurementMethod' => 'e-bidding',
        'fiscalYear' => 2569,
        'projectStartAt' => '2026-09-01',
        'projectEndAt' => '2026-12-31',
    ], $overrides);
}

test('creating a tender project requires authentication', function () {
    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload());

    $response->assertStatus(401);
});

test('an internal user without the permission cannot create a tender project', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload());

    $response->assertStatus(403);
});

test('an internal user with the permission can create a tender project', function () {
    $user = internalUserWithTenderProjectCreatePermission();
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload());

    $response->assertStatus(201)
        ->assertJsonPath('data.projectCode', 'TP-2569-0001')
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.name', 'จัดซื้อคอมพิวเตอร์')
        ->assertJsonPath('data.createdBy', $user->id);

    $this->assertDatabaseHas('tenders_projects', [
        'project_code' => 'TP-2569-0001',
        'status' => 'draft',
        'created_by' => $user->id,
    ]);
});

test('the project code sequence increments for a second project in the same fiscal year', function () {
    $this->actingAs(internalUserWithTenderProjectCreatePermission(), 'web');

    $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload());
    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload());

    $response->assertJsonPath('data.projectCode', 'TP-2569-0002');
});

test('the project code sequence resets to 0001 for a new fiscal year', function () {
    $this->actingAs(internalUserWithTenderProjectCreatePermission(), 'web');

    $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload());
    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload(['fiscalYear' => 2570]));

    $response->assertJsonPath('data.projectCode', 'TP-2570-0001');
});

test('creating a tender project requires the required fields', function () {
    $this->actingAs(internalUserWithTenderProjectCreatePermission(), 'web');

    $response = $this->postJson('/api/v1/dashboard/tender-projects', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['name', 'budget', 'departmentId', 'procurementMethod', 'fiscalYear']);
});

test('creating a tender project rejects a nonexistent department', function () {
    $this->actingAs(internalUserWithTenderProjectCreatePermission(), 'web');

    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload(['departmentId' => 999999]));

    $response->assertStatus(422)->assertJsonValidationErrors(['departmentId']);
});

test('creating a tender project rejects a nonexistent person in charge', function () {
    $this->actingAs(internalUserWithTenderProjectCreatePermission(), 'web');

    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload(['personInChargeId' => 999999]));

    $response->assertStatus(422)->assertJsonValidationErrors(['personInChargeId']);
});

test('creating a tender project rejects an end date before the start date', function () {
    $this->actingAs(internalUserWithTenderProjectCreatePermission(), 'web');

    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload([
        'projectStartAt' => '2026-12-31',
        'projectEndAt' => '2026-01-01',
    ]));

    $response->assertStatus(422)->assertJsonValidationErrors(['projectEndAt']);
});

test('accepts a valid person in charge', function () {
    $this->actingAs(internalUserWithTenderProjectCreatePermission(), 'web');
    $department = Department::firstOrCreate(['name' => 'IT']);
    $profileUser = User::factory()->create(['user_type' => 'internal']);
    $profile = InternalProfiles::create([
        'user_id' => $profileUser->id,
        'firstname' => 'A',
        'lastname' => 'B',
        'department_id' => $department->id,
    ]);

    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload([
        'personInChargeId' => $profile->id,
    ]));

    $response->assertStatus(201)->assertJsonPath('data.personInChargeId', $profile->id);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact tests/Feature/Modules/Tender/StoreTenderProjectTest.php`
Expected: FAIL on every test with a 404 (route `POST /api/v1/dashboard/tender-projects` doesn't exist yet)

- [ ] **Step 3: Create the FormRequest**

Create `app/Modules/Tender/Presentation/Http/Requests/Project/StoreTenderProjectRequest.php`:

```php
<?php

namespace App\Modules\Tender\Presentation\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTenderProjectRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
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
}
```

- [ ] **Step 4: Create the Resource**

Create `app/Modules/Tender/Presentation/Http/Resources/Project/TenderProjectResource.php`:

```php
<?php

namespace App\Modules\Tender\Presentation\Http\Resources\Project;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TenderProjectResource extends JsonResource
{
    public static $wrap = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id(),
            'projectCode' => $this->projectCode()->value,
            'name' => $this->name(),
            'description' => $this->description(),
            'budget' => $this->budget()->amount,
            'departmentId' => $this->departmentId(),
            'personInChargeId' => $this->personInChargeId(),
            'createdBy' => $this->createdBy(),
            'procurementMethod' => $this->procurementMethod(),
            'fiscalYear' => $this->fiscalYear(),
            'projectStartAt' => $this->whenNotNull($this->projectStartAt()?->toIso8601String()),
            'projectEndAt' => $this->whenNotNull($this->projectEndAt()?->toIso8601String()),
            'status' => $this->status(),
        ];
    }
}
```

This wraps the `TenderProject` Domain Entity directly (not an Eloquent model) — `JsonResource` proxies missing method calls to the wrapped object via `Illuminate\Http\Resources\DelegatesToResource::__call()`, so `$this->id()`, `$this->projectCode()`, etc. call the entity's own getter methods.

- [ ] **Step 5: Create the Controller**

Create `app/Modules/Tender/Presentation/Http/Controllers/TenderProjectController.php`:

```php
<?php

namespace App\Modules\Tender\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Tender\Application\Project\DTOs\CreateTenderProjectData;
use App\Modules\Tender\Application\Project\UseCases\CreateTenderProjectUseCase;
use App\Modules\Tender\Presentation\Http\Requests\Project\StoreTenderProjectRequest;
use App\Modules\Tender\Presentation\Http\Resources\Project\TenderProjectResource;
use Illuminate\Http\JsonResponse;

class TenderProjectController extends Controller
{
    public function __construct(
        private readonly CreateTenderProjectUseCase $createTenderProject,
    ) {}

    public function store(StoreTenderProjectRequest $request): JsonResponse
    {
        $project = $this->createTenderProject->execute(
            CreateTenderProjectData::from($request->validated()),
            $request->user()->id,
        );

        return response()->json(['data' => new TenderProjectResource($project)], 201);
    }
}
```

- [ ] **Step 6: Create the route file**

Create `routes/api/v1/dashboard/tender-projects.php`:

```php
<?php

use App\Modules\Tender\Presentation\Http\Controllers\TenderProjectController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {
    Route::post('tender-projects', [TenderProjectController::class, 'store'])
        ->middleware('can:tender-projects.store')
        ->name('dashboard.tender-projects.store');
});
```

- [ ] **Step 7: Require the new route file in `routes/api.php`**

Change:

```php
Route::prefix('v1')->group(function () {

    Route::middleware('auth')->group(function () {
        require __DIR__.'/api/v1/vendor.php';
        require __DIR__.'/api/v1/dashboard/vendors.php';
        require __DIR__.'/api/v1/notification.php';
        require __DIR__.'/api/v1/dashboard/user-management/users.php';
        require __DIR__.'/api/v1/dashboard/internal-profiles.php';
    });

    require __DIR__.'/api/v1/auth.php';
});
```

to:

```php
Route::prefix('v1')->group(function () {

    Route::middleware('auth')->group(function () {
        require __DIR__.'/api/v1/vendor.php';
        require __DIR__.'/api/v1/dashboard/vendors.php';
        require __DIR__.'/api/v1/notification.php';
        require __DIR__.'/api/v1/dashboard/user-management/users.php';
        require __DIR__.'/api/v1/dashboard/internal-profiles.php';
        require __DIR__.'/api/v1/dashboard/tender-projects.php';
    });

    require __DIR__.'/api/v1/auth.php';
});
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `php artisan test --compact tests/Feature/Modules/Tender/StoreTenderProjectTest.php`
Expected: PASS (9 tests)

- [ ] **Step 9: Run the full test suite for a final regression check**

Run: `php artisan test --compact`
Expected: every test that passed at the start of this plan still passes, plus all new tests added across Tasks 4–8

- [ ] **Step 10: Format and stage (do not commit)**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Tender/Presentation/Http/Requests/Project app/Modules/Tender/Presentation/Http/Resources/Project app/Modules/Tender/Presentation/Http/Controllers/TenderProjectController.php routes/api/v1/dashboard/tender-projects.php routes/api.php tests/Feature/Modules/Tender/StoreTenderProjectTest.php
git status
```

Leave staged — do not commit. Suggested message for the final commit: `"feat(tender): add POST /api/v1/dashboard/tender-projects create endpoint"`

---

## Final commit (only after user approval)

All 8 tasks above stage their changes but never commit. Once every task is done, `php artisan test --compact` is green, and **the user has reviewed the full diff (`git diff --staged`) and explicitly approved it**, commit. Default to one commit per task using the suggested messages listed at the end of each task's last step (in order, Task 1 through Task 8) — ask the user if they'd prefer a single combined commit instead.

---

## Post-plan verification

- [ ] `php artisan route:list --path=tender-projects` shows `POST api/v1/dashboard/tender-projects` bound to `TenderProjectController@store`
- [ ] `php artisan test --compact` — full suite green (or only pre-existing unrelated failures, no new ones)
- [ ] Confirm no remaining references to the old flat namespaces: `grep -rn "Modules\\\\Tender\\\\Domain\\\\Entities\\\\TenderProject;" app tests` and equivalents for `Tor`, `TorDocument`, `ProjectCode`, `TorCode`, `ContractNumber`, and the old `Infrastructure\Models\TenderProjects`/`Tors`/`TorDocuments` should all return nothing
