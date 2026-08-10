# Vendor Application Profile/Dashboard Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the flat `app/Modules/Vendor/Application/{UseCases,Queries,DTOs,Services}/` layout into two feature-first groups — `Application/Profile/` (vendor self-service, called from `VendorController`) and `Application/Dashboard/` (admin list/approve/reject, called from `VendorApprovalController`) — with zero behavior change.

**Architecture:** Pure move + namespace rename. Every file keeps its class name, its body, and its dependencies unchanged except the `namespace` declaration and any `use` imports of sibling classes that also moved. No new code, no new tests — the existing test suite is the regression net.

**Tech Stack:** PHP 8.4, Laravel 13, nwidart/laravel-modules, Pest 4.

## Global Constraints

- Scope is limited to `app/Modules/Vendor/Application/` plus the import lines in its two consumer controllers and its consumer test files — do not touch `Domain/`, `Infrastructure/`, or any other module.
- No logic changes anywhere. Every edit in this plan is either a `git mv` or a namespace/import line change.
- Final namespaces: `App\Modules\Vendor\Application\Profile\{UseCases,Queries,DTOs,Services}` and `App\Modules\Vendor\Application\Dashboard\{UseCases,Queries}`.
- After each task, `php artisan test --compact tests/Feature/Modules/Vendor` must report the same totals as the recorded baseline: **175 tests, 171 passed, 4 failed** (the 4 failures are pre-existing vendor-authorization tripwires unrelated to this plan — `ApproveVendorDocumentTest`, `ApproveVendorTest`, `ListVendorsTest`, `ShowVendorTest`, all "a vendor user cannot ..." tests expecting 403). Any different failure, or a different total, is a regression — stop and investigate.
- After any PHP file changes, run `vendor/bin/pint --dirty --format agent`.
- Use `git mv` for every file relocation (not delete+recreate) so git tracks the rename.

Spec: `docs/superpowers/specs/2026-08-10-vendor-application-profile-dashboard-split-design.md`

---

### Task 1: Move the Profile group (UseCases, Queries, DTOs, Services)

**Files:**
- Move: `app/Modules/Vendor/Application/UseCases/{UpdateVendorInfoUseCase,SaveVendorContactUseCase,DeleteVendorContactUseCase,SaveVendorDocumentUseCase,DeleteVendorDocumentUseCase,ViewVendorDocumentUseCase}.php` → `app/Modules/Vendor/Application/Profile/UseCases/`
- Move: `app/Modules/Vendor/Application/Queries/GetVendorProfileQuery.php` → `app/Modules/Vendor/Application/Profile/Queries/`
- Move: `app/Modules/Vendor/Application/DTOs/{UpdateVendorContactData,UpdateVendorDocumentData,UpdateVendorInfoData}.php` → `app/Modules/Vendor/Application/Profile/DTOs/`
- Move: `app/Modules/Vendor/Application/Services/ResubmitVendorProfileOnChange.php` → `app/Modules/Vendor/Application/Profile/Services/`
- Delete: `app/Modules/Vendor/Application/DTOs/.gitkeep`, `app/Modules/Vendor/Application/DTOs/` (now empty), `app/Modules/Vendor/Application/Services/` (now empty)
- Modify: `app/Modules/Vendor/Presentation/Http/Controllers/VendorController.php`
- Modify: `tests/Feature/Modules/Vendor/DeleteVendorDocumentUseCaseTest.php`
- Modify: `tests/Feature/Modules/Vendor/DeleteVendorContactUseCaseTest.php`
- Modify: `tests/Feature/Modules/Vendor/ViewVendorDocumentUseCaseTest.php`
- Modify: `tests/Feature/Modules/Vendor/UpdateVendorInfoUseCaseTest.php`
- Modify: `tests/Feature/Modules/Vendor/SaveVendorDocumentUseCaseTest.php`
- Modify: `tests/Feature/Modules/Vendor/SaveVendorContactUseCaseTest.php`

**Interfaces:**
- Produces: `App\Modules\Vendor\Application\Profile\UseCases\{UpdateVendorInfoUseCase,SaveVendorContactUseCase,DeleteVendorContactUseCase,SaveVendorDocumentUseCase,DeleteVendorDocumentUseCase,ViewVendorDocumentUseCase}`, `App\Modules\Vendor\Application\Profile\Queries\GetVendorProfileQuery`, `App\Modules\Vendor\Application\Profile\DTOs\{UpdateVendorContactData,UpdateVendorDocumentData,UpdateVendorInfoData}`, `App\Modules\Vendor\Application\Profile\Services\ResubmitVendorProfileOnChange` — identical class names and public APIs, only the namespace prefix gains `Profile\`.
- Consumes: nothing new. `App\Modules\Vendor\Domain\*`, `App\Shared\Support\ChangeLogger`, `App\Modules\Shared\Domain\ValueObjects\PostalCode` stay as-is (not part of this move).

- [ ] **Step 1: Move the 6 UseCase files**

```bash
cd backend
git mv app/Modules/Vendor/Application/UseCases/UpdateVendorInfoUseCase.php app/Modules/Vendor/Application/Profile/UseCases/UpdateVendorInfoUseCase.php
git mv app/Modules/Vendor/Application/UseCases/SaveVendorContactUseCase.php app/Modules/Vendor/Application/Profile/UseCases/SaveVendorContactUseCase.php
git mv app/Modules/Vendor/Application/UseCases/DeleteVendorContactUseCase.php app/Modules/Vendor/Application/Profile/UseCases/DeleteVendorContactUseCase.php
git mv app/Modules/Vendor/Application/UseCases/SaveVendorDocumentUseCase.php app/Modules/Vendor/Application/Profile/UseCases/SaveVendorDocumentUseCase.php
git mv app/Modules/Vendor/Application/UseCases/DeleteVendorDocumentUseCase.php app/Modules/Vendor/Application/Profile/UseCases/DeleteVendorDocumentUseCase.php
git mv app/Modules/Vendor/Application/UseCases/ViewVendorDocumentUseCase.php app/Modules/Vendor/Application/Profile/UseCases/ViewVendorDocumentUseCase.php
```

- [ ] **Step 2: Move the Query, the 3 DTOs, and the Service**

```bash
git mv app/Modules/Vendor/Application/Queries/GetVendorProfileQuery.php app/Modules/Vendor/Application/Profile/Queries/GetVendorProfileQuery.php
git mv app/Modules/Vendor/Application/DTOs/UpdateVendorContactData.php app/Modules/Vendor/Application/Profile/DTOs/UpdateVendorContactData.php
git mv app/Modules/Vendor/Application/DTOs/UpdateVendorDocumentData.php app/Modules/Vendor/Application/Profile/DTOs/UpdateVendorDocumentData.php
git mv app/Modules/Vendor/Application/DTOs/UpdateVendorInfoData.php app/Modules/Vendor/Application/Profile/DTOs/UpdateVendorInfoData.php
git mv app/Modules/Vendor/Application/Services/ResubmitVendorProfileOnChange.php app/Modules/Vendor/Application/Profile/Services/ResubmitVendorProfileOnChange.php
```

- [ ] **Step 3: Remove the now-empty `DTOs/` and `Services/` top-level folders**

```bash
rm app/Modules/Vendor/Application/DTOs/.gitkeep
rmdir app/Modules/Vendor/Application/DTOs
rmdir app/Modules/Vendor/Application/Services
```

(Do not touch `Application/UseCases/` or `Application/Queries/` yet — the Dashboard group's files still live there until Task 2.)

- [ ] **Step 4: Fix the namespace declaration in each of the 11 moved files**

In `app/Modules/Vendor/Application/Profile/UseCases/UpdateVendorInfoUseCase.php`, `SaveVendorContactUseCase.php`, `DeleteVendorContactUseCase.php`, `SaveVendorDocumentUseCase.php`, `DeleteVendorDocumentUseCase.php`, `ViewVendorDocumentUseCase.php` — change:

```php
namespace App\Modules\Vendor\Application\UseCases;
```
to:
```php
namespace App\Modules\Vendor\Application\Profile\UseCases;
```

In `app/Modules/Vendor/Application/Profile/Queries/GetVendorProfileQuery.php` — change:
```php
namespace App\Modules\Vendor\Application\Queries;
```
to:
```php
namespace App\Modules\Vendor\Application\Profile\Queries;
```

In `app/Modules/Vendor/Application/Profile/DTOs/UpdateVendorContactData.php`, `UpdateVendorDocumentData.php`, `UpdateVendorInfoData.php` — change:
```php
namespace App\Modules\Vendor\Application\DTOs;
```
to:
```php
namespace App\Modules\Vendor\Application\Profile\DTOs;
```

In `app/Modules/Vendor/Application/Profile/Services/ResubmitVendorProfileOnChange.php` — change:
```php
namespace App\Modules\Vendor\Application\Services;
```
to:
```php
namespace App\Modules\Vendor\Application\Profile\Services;
```

- [ ] **Step 5: Fix cross-references between the moved files**

In `app/Modules/Vendor/Application/Profile/UseCases/DeleteVendorContactUseCase.php` and `DeleteVendorDocumentUseCase.php` — change:
```php
use App\Modules\Vendor\Application\Services\ResubmitVendorProfileOnChange;
```
to:
```php
use App\Modules\Vendor\Application\Profile\Services\ResubmitVendorProfileOnChange;
```

In `app/Modules/Vendor/Application/Profile/UseCases/SaveVendorDocumentUseCase.php` — change:
```php
use App\Modules\Vendor\Application\DTOs\UpdateVendorDocumentData;
use App\Modules\Vendor\Application\Services\ResubmitVendorProfileOnChange;
```
to:
```php
use App\Modules\Vendor\Application\Profile\DTOs\UpdateVendorDocumentData;
use App\Modules\Vendor\Application\Profile\Services\ResubmitVendorProfileOnChange;
```

In `app/Modules/Vendor/Application/Profile/UseCases/SaveVendorContactUseCase.php` — change:
```php
use App\Modules\Vendor\Application\DTOs\UpdateVendorContactData;
```
to:
```php
use App\Modules\Vendor\Application\Profile\DTOs\UpdateVendorContactData;
```

In `app/Modules/Vendor/Application/Profile/UseCases/UpdateVendorInfoUseCase.php` — change:
```php
use App\Modules\Vendor\Application\DTOs\UpdateVendorInfoData;
```
to:
```php
use App\Modules\Vendor\Application\Profile\DTOs\UpdateVendorInfoData;
```

(`ViewVendorDocumentUseCase.php` has no cross-references to update beyond Step 4's namespace line.)

- [ ] **Step 6: Fix imports in `VendorController.php`**

In `app/Modules/Vendor/Presentation/Http/Controllers/VendorController.php`, change these 7 lines:
```php
use App\Modules\Vendor\Application\DTOs\UpdateVendorContactData;
use App\Modules\Vendor\Application\DTOs\UpdateVendorDocumentData;
use App\Modules\Vendor\Application\DTOs\UpdateVendorInfoData;
use App\Modules\Vendor\Application\Queries\GetVendorProfileQuery;
use App\Modules\Vendor\Application\UseCases\DeleteVendorContactUseCase;
use App\Modules\Vendor\Application\UseCases\DeleteVendorDocumentUseCase;
use App\Modules\Vendor\Application\UseCases\SaveVendorContactUseCase;
use App\Modules\Vendor\Application\UseCases\SaveVendorDocumentUseCase;
use App\Modules\Vendor\Application\UseCases\UpdateVendorInfoUseCase;
use App\Modules\Vendor\Application\UseCases\ViewVendorDocumentUseCase;
```
to:
```php
use App\Modules\Vendor\Application\Profile\DTOs\UpdateVendorContactData;
use App\Modules\Vendor\Application\Profile\DTOs\UpdateVendorDocumentData;
use App\Modules\Vendor\Application\Profile\DTOs\UpdateVendorInfoData;
use App\Modules\Vendor\Application\Profile\Queries\GetVendorProfileQuery;
use App\Modules\Vendor\Application\Profile\UseCases\DeleteVendorContactUseCase;
use App\Modules\Vendor\Application\Profile\UseCases\DeleteVendorDocumentUseCase;
use App\Modules\Vendor\Application\Profile\UseCases\SaveVendorContactUseCase;
use App\Modules\Vendor\Application\Profile\UseCases\SaveVendorDocumentUseCase;
use App\Modules\Vendor\Application\Profile\UseCases\UpdateVendorInfoUseCase;
use App\Modules\Vendor\Application\Profile\UseCases\ViewVendorDocumentUseCase;
```
(Keep alphabetical order as shown — it matches Pint's existing ordering in the file.)

- [ ] **Step 7: Fix imports in the 6 Profile-group test files**

`tests/Feature/Modules/Vendor/DeleteVendorDocumentUseCaseTest.php` — change:
```php
use App\Modules\Vendor\Application\UseCases\DeleteVendorDocumentUseCase;
```
to:
```php
use App\Modules\Vendor\Application\Profile\UseCases\DeleteVendorDocumentUseCase;
```

`tests/Feature/Modules/Vendor/DeleteVendorContactUseCaseTest.php` — change:
```php
use App\Modules\Vendor\Application\UseCases\DeleteVendorContactUseCase;
```
to:
```php
use App\Modules\Vendor\Application\Profile\UseCases\DeleteVendorContactUseCase;
```

`tests/Feature/Modules/Vendor/ViewVendorDocumentUseCaseTest.php` — change:
```php
use App\Modules\Vendor\Application\UseCases\ViewVendorDocumentUseCase;
```
to:
```php
use App\Modules\Vendor\Application\Profile\UseCases\ViewVendorDocumentUseCase;
```

`tests/Feature/Modules/Vendor/UpdateVendorInfoUseCaseTest.php` — change:
```php
use App\Modules\Vendor\Application\DTOs\UpdateVendorInfoData;
use App\Modules\Vendor\Application\UseCases\UpdateVendorInfoUseCase;
```
to:
```php
use App\Modules\Vendor\Application\Profile\DTOs\UpdateVendorInfoData;
use App\Modules\Vendor\Application\Profile\UseCases\UpdateVendorInfoUseCase;
```

`tests/Feature/Modules/Vendor/SaveVendorDocumentUseCaseTest.php` — change:
```php
use App\Modules\Vendor\Application\DTOs\UpdateVendorDocumentData;
use App\Modules\Vendor\Application\UseCases\SaveVendorDocumentUseCase;
```
to:
```php
use App\Modules\Vendor\Application\Profile\DTOs\UpdateVendorDocumentData;
use App\Modules\Vendor\Application\Profile\UseCases\SaveVendorDocumentUseCase;
```

`tests/Feature/Modules/Vendor/SaveVendorContactUseCaseTest.php` — change:
```php
use App\Modules\Vendor\Application\DTOs\UpdateVendorContactData;
use App\Modules\Vendor\Application\UseCases\SaveVendorContactUseCase;
```
to:
```php
use App\Modules\Vendor\Application\Profile\DTOs\UpdateVendorContactData;
use App\Modules\Vendor\Application\Profile\UseCases\SaveVendorContactUseCase;
```

- [ ] **Step 8: Run the full Vendor test directory to verify no regressions**

Run: `php artisan test --compact tests/Feature/Modules/Vendor`

Expected: `"tests":175,"passed":171,"failed":4` — the same 4 pre-existing failures listed in Global Constraints, nothing new, nothing fixed, nothing else broken. If any *other* test fails, a namespace/import edit was missed — search for the old namespace strings (`Application\\UseCases\\`, `Application\\Queries\\`, `Application\\DTOs\\`, `Application\\Services\\` without a `Profile\` or `Dashboard\` segment) across `app/` and `tests/` and fix what Step 4-7 missed.

- [ ] **Step 9: Format with Pint**

Run: `vendor/bin/pint --dirty --format agent`

Fix anything it reports, then re-run Step 8's command to confirm still green.

- [ ] **Step 10: Commit**

```bash
git add -A app/Modules/Vendor/Application/Profile app/Modules/Vendor/Application/DTOs app/Modules/Vendor/Application/Services app/Modules/Vendor/Application/UseCases app/Modules/Vendor/Application/Queries app/Modules/Vendor/Presentation/Http/Controllers/VendorController.php tests/Feature/Modules/Vendor/DeleteVendorDocumentUseCaseTest.php tests/Feature/Modules/Vendor/DeleteVendorContactUseCaseTest.php tests/Feature/Modules/Vendor/ViewVendorDocumentUseCaseTest.php tests/Feature/Modules/Vendor/UpdateVendorInfoUseCaseTest.php tests/Feature/Modules/Vendor/SaveVendorDocumentUseCaseTest.php tests/Feature/Modules/Vendor/SaveVendorContactUseCaseTest.php
git commit -m "refactor(vendor): move self-service Application classes under Profile/"
```

---

### Task 2: Move the Dashboard group (UseCases, Queries) and remove the old top-level folders

**Files:**
- Move: `app/Modules/Vendor/Application/UseCases/{ApproveVendorDocumentUseCase,ApproveVendorProfileUseCase,RejectVendorDocumentUseCase,RejectVendorProfileUseCase,PendingVendorDocumentUseCase,PendingVendorProfileUseCase}.php` → `app/Modules/Vendor/Application/Dashboard/UseCases/`
- Move: `app/Modules/Vendor/Application/Queries/{ListVendorProfilesQuery,CountVendorProfilesByStatusQuery,GetVendorProfileByIdQuery}.php` → `app/Modules/Vendor/Application/Dashboard/Queries/`
- Delete: `app/Modules/Vendor/Application/UseCases/.gitkeep`, `app/Modules/Vendor/Application/UseCases/` (now empty), `app/Modules/Vendor/Application/Queries/` (now empty)
- Modify: `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`
- Modify: `tests/Feature/Modules/Vendor/ApproveVendorProfileUseCaseTest.php`
- Modify: `tests/Feature/Modules/Vendor/ApproveVendorDocumentUseCaseTest.php`
- Modify: `tests/Feature/Modules/Vendor/RejectVendorProfileUseCaseTest.php`
- Modify: `tests/Feature/Modules/Vendor/RejectVendorDocumentUseCaseTest.php`
- Modify: `tests/Feature/Modules/Vendor/PendingVendorProfileUseCaseTest.php`
- Modify: `tests/Feature/Modules/Vendor/PendingVendorDocumentUseCaseTest.php`

**Interfaces:**
- Consumes: nothing from Task 1 — the Dashboard group has zero cross-references to the Profile group (verified by grep in the design spec). This task is independent of Task 1 and could run first if ever needed.
- Produces: `App\Modules\Vendor\Application\Dashboard\UseCases\{ApproveVendorDocumentUseCase,ApproveVendorProfileUseCase,RejectVendorDocumentUseCase,RejectVendorProfileUseCase,PendingVendorDocumentUseCase,PendingVendorProfileUseCase}`, `App\Modules\Vendor\Application\Dashboard\Queries\{ListVendorProfilesQuery,CountVendorProfilesByStatusQuery,GetVendorProfileByIdQuery}` — identical class names and public APIs, only the namespace prefix gains `Dashboard\`.

- [ ] **Step 1: Move the 6 UseCase files**

```bash
cd backend
git mv app/Modules/Vendor/Application/UseCases/ApproveVendorDocumentUseCase.php app/Modules/Vendor/Application/Dashboard/UseCases/ApproveVendorDocumentUseCase.php
git mv app/Modules/Vendor/Application/UseCases/ApproveVendorProfileUseCase.php app/Modules/Vendor/Application/Dashboard/UseCases/ApproveVendorProfileUseCase.php
git mv app/Modules/Vendor/Application/UseCases/RejectVendorDocumentUseCase.php app/Modules/Vendor/Application/Dashboard/UseCases/RejectVendorDocumentUseCase.php
git mv app/Modules/Vendor/Application/UseCases/RejectVendorProfileUseCase.php app/Modules/Vendor/Application/Dashboard/UseCases/RejectVendorProfileUseCase.php
git mv app/Modules/Vendor/Application/UseCases/PendingVendorDocumentUseCase.php app/Modules/Vendor/Application/Dashboard/UseCases/PendingVendorDocumentUseCase.php
git mv app/Modules/Vendor/Application/UseCases/PendingVendorProfileUseCase.php app/Modules/Vendor/Application/Dashboard/UseCases/PendingVendorProfileUseCase.php
```

- [ ] **Step 2: Move the 3 Query files**

```bash
git mv app/Modules/Vendor/Application/Queries/ListVendorProfilesQuery.php app/Modules/Vendor/Application/Dashboard/Queries/ListVendorProfilesQuery.php
git mv app/Modules/Vendor/Application/Queries/CountVendorProfilesByStatusQuery.php app/Modules/Vendor/Application/Dashboard/Queries/CountVendorProfilesByStatusQuery.php
git mv app/Modules/Vendor/Application/Queries/GetVendorProfileByIdQuery.php app/Modules/Vendor/Application/Dashboard/Queries/GetVendorProfileByIdQuery.php
```

- [ ] **Step 3: Remove the now-empty top-level `UseCases/` and `Queries/` folders**

```bash
rm app/Modules/Vendor/Application/UseCases/.gitkeep
rmdir app/Modules/Vendor/Application/UseCases
rmdir app/Modules/Vendor/Application/Queries
```

After this step, `app/Modules/Vendor/Application/` should contain only `Profile/` and `Dashboard/` — verify with `ls app/Modules/Vendor/Application/`.

- [ ] **Step 4: Fix the namespace declaration in each of the 9 moved files**

In `app/Modules/Vendor/Application/Dashboard/UseCases/ApproveVendorDocumentUseCase.php`, `ApproveVendorProfileUseCase.php`, `RejectVendorDocumentUseCase.php`, `RejectVendorProfileUseCase.php`, `PendingVendorDocumentUseCase.php`, `PendingVendorProfileUseCase.php` — change:
```php
namespace App\Modules\Vendor\Application\UseCases;
```
to:
```php
namespace App\Modules\Vendor\Application\Dashboard\UseCases;
```

In `app/Modules/Vendor/Application/Dashboard/Queries/ListVendorProfilesQuery.php`, `CountVendorProfilesByStatusQuery.php`, `GetVendorProfileByIdQuery.php` — change:
```php
namespace App\Modules\Vendor\Application\Queries;
```
to:
```php
namespace App\Modules\Vendor\Application\Dashboard\Queries;
```

(None of these 9 files reference each other or any other moved class, so there are no cross-reference edits in this task — verified by grep in the design spec.)

- [ ] **Step 5: Fix imports in `VendorApprovalController.php`**

In `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`, change these 9 lines:
```php
use App\Modules\Vendor\Application\Queries\CountVendorProfilesByStatusQuery;
use App\Modules\Vendor\Application\Queries\GetVendorProfileByIdQuery;
use App\Modules\Vendor\Application\Queries\ListVendorProfilesQuery;
use App\Modules\Vendor\Application\UseCases\ApproveVendorDocumentUseCase;
use App\Modules\Vendor\Application\UseCases\ApproveVendorProfileUseCase;
use App\Modules\Vendor\Application\UseCases\PendingVendorDocumentUseCase;
use App\Modules\Vendor\Application\UseCases\PendingVendorProfileUseCase;
use App\Modules\Vendor\Application\UseCases\RejectVendorDocumentUseCase;
use App\Modules\Vendor\Application\UseCases\RejectVendorProfileUseCase;
```
to:
```php
use App\Modules\Vendor\Application\Dashboard\Queries\CountVendorProfilesByStatusQuery;
use App\Modules\Vendor\Application\Dashboard\Queries\GetVendorProfileByIdQuery;
use App\Modules\Vendor\Application\Dashboard\Queries\ListVendorProfilesQuery;
use App\Modules\Vendor\Application\Dashboard\UseCases\ApproveVendorDocumentUseCase;
use App\Modules\Vendor\Application\Dashboard\UseCases\ApproveVendorProfileUseCase;
use App\Modules\Vendor\Application\Dashboard\UseCases\PendingVendorDocumentUseCase;
use App\Modules\Vendor\Application\Dashboard\UseCases\PendingVendorProfileUseCase;
use App\Modules\Vendor\Application\Dashboard\UseCases\RejectVendorDocumentUseCase;
use App\Modules\Vendor\Application\Dashboard\UseCases\RejectVendorProfileUseCase;
```
(Keep alphabetical order as shown — it matches Pint's existing ordering in the file.)

- [ ] **Step 6: Fix imports in the 6 Dashboard-group test files**

`tests/Feature/Modules/Vendor/ApproveVendorProfileUseCaseTest.php` — change:
```php
use App\Modules\Vendor\Application\UseCases\ApproveVendorProfileUseCase;
```
to:
```php
use App\Modules\Vendor\Application\Dashboard\UseCases\ApproveVendorProfileUseCase;
```

`tests/Feature/Modules/Vendor/ApproveVendorDocumentUseCaseTest.php` — change:
```php
use App\Modules\Vendor\Application\UseCases\ApproveVendorDocumentUseCase;
```
to:
```php
use App\Modules\Vendor\Application\Dashboard\UseCases\ApproveVendorDocumentUseCase;
```

`tests/Feature/Modules/Vendor/RejectVendorProfileUseCaseTest.php` — change:
```php
use App\Modules\Vendor\Application\UseCases\RejectVendorProfileUseCase;
```
to:
```php
use App\Modules\Vendor\Application\Dashboard\UseCases\RejectVendorProfileUseCase;
```

`tests/Feature/Modules/Vendor/RejectVendorDocumentUseCaseTest.php` — change:
```php
use App\Modules\Vendor\Application\UseCases\RejectVendorDocumentUseCase;
```
to:
```php
use App\Modules\Vendor\Application\Dashboard\UseCases\RejectVendorDocumentUseCase;
```

`tests/Feature/Modules/Vendor/PendingVendorProfileUseCaseTest.php` — change:
```php
use App\Modules\Vendor\Application\UseCases\PendingVendorProfileUseCase;
```
to:
```php
use App\Modules\Vendor\Application\Dashboard\UseCases\PendingVendorProfileUseCase;
```

`tests/Feature/Modules/Vendor/PendingVendorDocumentUseCaseTest.php` — change:
```php
use App\Modules\Vendor\Application\UseCases\PendingVendorDocumentUseCase;
```
to:
```php
use App\Modules\Vendor\Application\Dashboard\UseCases\PendingVendorDocumentUseCase;
```

- [ ] **Step 7: Run the full Vendor test directory to verify no regressions**

Run: `php artisan test --compact tests/Feature/Modules/Vendor`

Expected: `"tests":175,"passed":171,"failed":4` — identical to Task 1's Step 8 result (same 4 pre-existing failures). If anything else fails, search for stray old-namespace strings the same way as Task 1 Step 8 describes.

- [ ] **Step 8: Confirm the old top-level folders are gone**

Run: `ls app/Modules/Vendor/Application/`

Expected output: only `Dashboard` and `Profile` (plus `.` / `..` if your `ls` shows them) — no `UseCases`, `Queries`, `DTOs`, or `Services` at this level.

- [ ] **Step 9: Format with Pint**

Run: `vendor/bin/pint --dirty --format agent`

Fix anything it reports, then re-run Step 7's command to confirm still green.

- [ ] **Step 10: Commit**

```bash
git add -A app/Modules/Vendor/Application app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php tests/Feature/Modules/Vendor/ApproveVendorProfileUseCaseTest.php tests/Feature/Modules/Vendor/ApproveVendorDocumentUseCaseTest.php tests/Feature/Modules/Vendor/RejectVendorProfileUseCaseTest.php tests/Feature/Modules/Vendor/RejectVendorDocumentUseCaseTest.php tests/Feature/Modules/Vendor/PendingVendorProfileUseCaseTest.php tests/Feature/Modules/Vendor/PendingVendorDocumentUseCaseTest.php
git commit -m "refactor(vendor): move admin dashboard Application classes under Dashboard/"
```

---

## Self-Review Notes

- **Spec coverage:** every file move and every import edit listed in the spec's two mapping sections is a step in Task 1 or Task 2 — cross-checked 1:1 against the spec's "การย้ายไฟล์" and "จุดที่ต้องแก้ namespace/import" lists, nothing omitted. `VendorServiceProvider.php` needs no change (spec confirms it, no step touches it).
- **Type consistency:** every namespace/import string used in a "to:" block matches exactly the namespace declared in that file's own Step 4 — e.g. `Profile\Services\ResubmitVendorProfileOnChange` in Task 1 Step 5 matches the `namespace App\Modules\Vendor\Application\Profile\Services;` set in Task 1 Step 4. No drift.
- **Placeholder scan:** no TBD/TODO; every "change X to Y" block shows the literal before/after text, not a description of the change.
- **Independence check:** confirmed via the design spec's grep that Dashboard files never reference Profile files or vice versa, so Task 2 has no dependency on Task 1 having run — each is independently gate-able.
