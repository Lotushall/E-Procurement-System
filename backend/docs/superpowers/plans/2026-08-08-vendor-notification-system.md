# Vendor Approve/Reject Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an admin approves or rejects a vendor's profile or a vendor document, the vendor's `User` account receives a Laravel notification on two channels — `database` (for a future in-app notification list) and `mail` (real email via the already-configured SMTP).

**Architecture:** Follow the existing `App\Modules\User\Domain\Contracts\EmailVerificationSenderInterface` → `EmailVerificationSender` pattern already used in this codebase. A new `VendorNotifierInterface` (Domain/Contracts) is the only thing the 4 existing approve/reject use cases depend on; `VendorNotifier` (Infrastructure) implements it by resolving the vendor's Eloquent `User` and calling `->notify()` with one of 4 new `Illuminate\Notifications\Notification` subclasses. Laravel's built-in polymorphic `notifications` table (via `php artisan make:notifications-table`) is the storage — no custom table.

**Tech Stack:** Laravel 13 notifications (`database` + `mail` channels, `ShouldQueue`), Pest 4 (`Notification::fake()`), existing DDD module structure under `app/Modules/Vendor`.

## Global Constraints

- PHP 8.4, Laravel Framework 13 — use constructor property promotion and explicit return types on every new method (per `CLAUDE.md`).
- Run `vendor/bin/pint --dirty --format agent` before every commit that touches a `.php` file, and let it fix formatting (never run `--test`).
- Tests use Pest syntax (`test(...)`, `expect(...)`), run via `php artisan test --compact <path>`. Do not create tinker/verification scripts — the Pest tests are the proof.
- No new Composer dependencies — everything here is built-in Laravel notifications.
- Follow the existing module layout exactly: `Domain/Contracts` for interfaces, `Infrastructure/Notifications` for the concrete Notification classes and the sender/notifier implementation, bound in `VendorServiceProvider`.
- Do not touch anything outside `app/Modules/Vendor`, `database/migrations`, and `tests/Feature/Modules/Vendor` — no API endpoints, no frontend changes, no other event types. Those are separate, future sessions.

---

### Task 1: Notifications table migration

**Files:**
- Create: `database/migrations/xxxx_xx_xx_xxxxxx_create_notifications_table.php` (exact timestamp assigned by the command below — this is Laravel's standard stub, not hand-written)

**Interfaces:**
- Produces: a `notifications` table (columns: `id` uuid, `type`, `notifiable_type`, `notifiable_id`, `data`, `read_at`, timestamps) that every later task's `Notification::toDatabase()` writes to.

- [ ] **Step 1: Generate the migration**

Run: `php artisan make:notifications-table --no-interaction`

Expected output: `Migration [database/migrations/<timestamp>_create_notifications_table.php] created successfully.`

Do not edit the generated file — it's Laravel's standard stub and matches what every other Laravel app uses.

- [ ] **Step 2: Apply it and verify**

Run: `php artisan migrate --no-interaction`

Expected: output includes a line like `Migrating: xxxx_xx_xx_xxxxxx_create_notifications_table` followed by `Migrated:  xxxx_xx_xx_xxxxxx_create_notifications_table`.

Then run: `php artisan migrate:status`

Expected: the `create_notifications_table` migration row shows `Ran`.

- [ ] **Step 3: Commit**

```bash
git add database/migrations/*_create_notifications_table.php
git commit -m "feat(vendor): add notifications table migration"
```

---

### Task 2: Document type Thai labels

**Files:**
- Create: `app/Modules/Vendor/Infrastructure/Notifications/Support/DocumentTypeLabels.php`
- Test: `tests/Feature/Modules/Vendor/DocumentTypeLabelsTest.php`

**Interfaces:**
- Produces: `DocumentTypeLabels::label(string $documentType): string` — later Task 3's `VendorDocumentApprovedNotification`/`VendorDocumentRejectedNotification` call this to turn the raw `documentType` key (e.g. `citizen_id`) into a Thai label for email/database messages.

- [ ] **Step 1: Write the failing test**

```php
<?php

use App\Modules\Vendor\Infrastructure\Notifications\Support\DocumentTypeLabels;

test('returns the thai label for a known document type', function () {
    expect(DocumentTypeLabels::label('citizen_id'))->toBe('สำเนาบัตรประชาชน');
});

test('falls back to the raw key for an unknown document type', function () {
    expect(DocumentTypeLabels::label('some_future_type'))->toBe('some_future_type');
});
```

Save to `tests/Feature/Modules/Vendor/DocumentTypeLabelsTest.php`.

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/DocumentTypeLabelsTest.php`
Expected: FAIL — `Class "App\Modules\Vendor\Infrastructure\Notifications\Support\DocumentTypeLabels" not found`.

- [ ] **Step 3: Write the implementation**

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Notifications\Support;

final class DocumentTypeLabels
{
    /**
     * @var array<string, string>
     */
    private const LABELS = [
        'company_certificate' => 'หนังสือรับรองบริษัท',
        'authorized_person_id' => 'สำเนาบัตรประชาชนกรรมการผู้มีอำนาจ',
        'vat_registration' => 'ใบทะเบียนภาษีมูลค่าเพิ่ม',
        'shareholder_list' => 'บัญชีรายชื่อผู้ถือหุ้น (บอจ.5)',
        'financial_statement' => 'งบการเงิน / หนังสือรับรองฐานะการเงิน',
        'citizen_id' => 'สำเนาบัตรประชาชน',
        'house_registration' => 'สำเนาทะเบียนบ้าน',
        'commercial_registration' => 'ทะเบียนพาณิชย์',
    ];

    public static function label(string $documentType): string
    {
        return self::LABELS[$documentType] ?? $documentType;
    }
}
```

Save to `app/Modules/Vendor/Infrastructure/Notifications/Support/DocumentTypeLabels.php`.

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/DocumentTypeLabelsTest.php`
Expected: PASS (2 tests).

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Infrastructure/Notifications/Support/DocumentTypeLabels.php tests/Feature/Modules/Vendor/DocumentTypeLabelsTest.php
git commit -m "feat(vendor): add Thai labels for document types"
```

---

### Task 3: Notifier contract, 4 Notification classes, and wire `ApproveVendorProfileUseCase`

**Files:**
- Create: `app/Modules/Vendor/Domain/Contracts/VendorNotifierInterface.php`
- Create: `app/Modules/Vendor/Infrastructure/Notifications/VendorProfileApprovedNotification.php`
- Create: `app/Modules/Vendor/Infrastructure/Notifications/VendorProfileRejectedNotification.php`
- Create: `app/Modules/Vendor/Infrastructure/Notifications/VendorDocumentApprovedNotification.php`
- Create: `app/Modules/Vendor/Infrastructure/Notifications/VendorDocumentRejectedNotification.php`
- Create: `app/Modules/Vendor/Infrastructure/Notifications/VendorNotifier.php`
- Modify: `app/Modules/Vendor/Providers/VendorServiceProvider.php`
- Modify: `app/Modules/Vendor/Application/UseCases/ApproveVendorProfileUseCase.php`
- Test: `tests/Feature/Modules/Vendor/ApproveVendorProfileUseCaseTest.php`

**Interfaces:**
- Consumes: `DocumentTypeLabels::label(string): string` (Task 2).
- Produces: `VendorNotifierInterface` with methods `notifyProfileApproved(int $vendorProfileId): void`, `notifyProfileRejected(int $vendorProfileId, string $remark): void`, `notifyDocumentApproved(int $vendorProfileId, string $documentType): void`, `notifyDocumentRejected(int $vendorProfileId, string $documentType, string $remark): void`. Tasks 4–6 inject this same interface into the remaining 3 use cases and call the other 3 methods.

- [ ] **Step 1: Write the failing test**

Replace the full contents of `tests/Feature/Modules/Vendor/ApproveVendorProfileUseCaseTest.php` with:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\UseCases\ApproveVendorProfileUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Notifications\VendorProfileApprovedNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

beforeEach(fn () => Notification::fake());

function approveVendorProfileUseCase(): ApproveVendorProfileUseCase
{
    return app(ApproveVendorProfileUseCase::class);
}

test('execute approves a pending vendor profile', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorProfileUseCase()->execute($profile->id, $internalUser->id, 'Looks good');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'approved',
        'verified_by' => $internalUser->id,
        'remark' => 'Looks good',
    ]);

    Notification::assertSentTo($profile->VendorProfilesUser, VendorProfileApprovedNotification::class);
});

test('execute approves a rejected vendor profile', function () {
    $profile = VendorProfiles::factory()->rejected()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorProfileUseCase()->execute($profile->id, $internalUser->id);

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'approved',
        'verified_by' => $internalUser->id,
        'remark' => null,
    ]);

    Notification::assertSentTo($profile->VendorProfilesUser, VendorProfileApprovedNotification::class);
});

test('execute throws when the vendor profile does not exist', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => approveVendorProfileUseCase()->execute(999999, $internalUser->id))
        ->toThrow(ModelNotFoundException::class);

    Notification::assertNothingSent();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/ApproveVendorProfileUseCaseTest.php`
Expected: FAIL — `Class "App\Modules\Vendor\Infrastructure\Notifications\VendorProfileApprovedNotification" not found`.

- [ ] **Step 3: Create the notifier interface**

```php
<?php

namespace App\Modules\Vendor\Domain\Contracts;

interface VendorNotifierInterface
{
    public function notifyProfileApproved(int $vendorProfileId): void;

    public function notifyProfileRejected(int $vendorProfileId, string $remark): void;

    public function notifyDocumentApproved(int $vendorProfileId, string $documentType): void;

    public function notifyDocumentRejected(int $vendorProfileId, string $documentType, string $remark): void;
}
```

Save to `app/Modules/Vendor/Domain/Contracts/VendorNotifierInterface.php`.

- [ ] **Step 4: Create the 4 Notification classes**

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class VendorProfileApprovedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'vendor_profile_approved',
            'message' => 'โปรไฟล์ผู้ค้าของคุณได้รับการอนุมัติแล้ว',
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('โปรไฟล์ผู้ค้าของคุณได้รับการอนุมัติ')
            ->greeting("เรียนคุณ {$notifiable->username}")
            ->line('โปรไฟล์ผู้ค้าของคุณได้รับการอนุมัติแล้ว คุณสามารถเข้าใช้งานระบบจัดซื้อได้ตามปกติ');
    }
}
```

Save to `app/Modules/Vendor/Infrastructure/Notifications/VendorProfileApprovedNotification.php`.

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class VendorProfileRejectedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $remark,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'vendor_profile_rejected',
            'remark' => $this->remark,
            'message' => "โปรไฟล์ผู้ค้าของคุณถูกปฏิเสธ: {$this->remark}",
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('โปรไฟล์ผู้ค้าของคุณถูกปฏิเสธ')
            ->greeting("เรียนคุณ {$notifiable->username}")
            ->line('โปรไฟล์ผู้ค้าของคุณถูกปฏิเสธด้วยเหตุผลดังนี้:')
            ->line($this->remark);
    }
}
```

Save to `app/Modules/Vendor/Infrastructure/Notifications/VendorProfileRejectedNotification.php`.

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Notifications;

use App\Modules\Vendor\Infrastructure\Notifications\Support\DocumentTypeLabels;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class VendorDocumentApprovedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $documentType,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        $label = DocumentTypeLabels::label($this->documentType);

        return [
            'type' => 'vendor_document_approved',
            'document_type' => $this->documentType,
            'message' => "เอกสาร{$label}ของคุณได้รับการอนุมัติแล้ว",
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $label = DocumentTypeLabels::label($this->documentType);

        return (new MailMessage)
            ->subject("เอกสาร{$label}ของคุณได้รับการอนุมัติ")
            ->greeting("เรียนคุณ {$notifiable->username}")
            ->line("เอกสาร{$label}ของคุณได้รับการอนุมัติแล้ว");
    }
}
```

Save to `app/Modules/Vendor/Infrastructure/Notifications/VendorDocumentApprovedNotification.php`.

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Notifications;

use App\Modules\Vendor\Infrastructure\Notifications\Support\DocumentTypeLabels;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class VendorDocumentRejectedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $documentType,
        private readonly string $remark,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        $label = DocumentTypeLabels::label($this->documentType);

        return [
            'type' => 'vendor_document_rejected',
            'document_type' => $this->documentType,
            'remark' => $this->remark,
            'message' => "เอกสาร{$label}ของคุณถูกปฏิเสธ: {$this->remark}",
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $label = DocumentTypeLabels::label($this->documentType);

        return (new MailMessage)
            ->subject("เอกสาร{$label}ของคุณถูกปฏิเสธ")
            ->greeting("เรียนคุณ {$notifiable->username}")
            ->line("เอกสาร{$label}ของคุณถูกปฏิเสธด้วยเหตุผลดังนี้:")
            ->line($this->remark);
    }
}
```

Save to `app/Modules/Vendor/Infrastructure/Notifications/VendorDocumentRejectedNotification.php`.

- [ ] **Step 5: Create `VendorNotifier`**

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Notifications;

use App\Modules\User\Infrastructure\Models\User as UserModel;
use App\Modules\Vendor\Domain\Contracts\VendorNotifierInterface;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;

final class VendorNotifier implements VendorNotifierInterface
{
    public function notifyProfileApproved(int $vendorProfileId): void
    {
        $this->userFor($vendorProfileId)->notify(new VendorProfileApprovedNotification);
    }

    public function notifyProfileRejected(int $vendorProfileId, string $remark): void
    {
        $this->userFor($vendorProfileId)->notify(new VendorProfileRejectedNotification($remark));
    }

    public function notifyDocumentApproved(int $vendorProfileId, string $documentType): void
    {
        $this->userFor($vendorProfileId)->notify(new VendorDocumentApprovedNotification($documentType));
    }

    public function notifyDocumentRejected(int $vendorProfileId, string $documentType, string $remark): void
    {
        $this->userFor($vendorProfileId)->notify(new VendorDocumentRejectedNotification($documentType, $remark));
    }

    private function userFor(int $vendorProfileId): UserModel
    {
        return VendorProfiles::findOrFail($vendorProfileId)->VendorProfilesUser;
    }
}
```

Save to `app/Modules/Vendor/Infrastructure/Notifications/VendorNotifier.php`.

- [ ] **Step 6: Bind the interface in `VendorServiceProvider`**

Replace the full contents of `app/Modules/Vendor/Providers/VendorServiceProvider.php` with:

```php
<?php

namespace App\Modules\Vendor\Providers;

use App\Modules\Vendor\Domain\Contracts\VendorNotifierInterface;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use App\Modules\Vendor\Infrastructure\Notifications\VendorNotifier;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Console\Scheduling\Schedule;
use Nwidart\Modules\Support\ModuleServiceProvider;

class VendorServiceProvider extends ModuleServiceProvider
{
    /**
     * The name of the module.
     */
    protected string $name = 'Vendor';

    /**
     * The lowercase version of the module name.
     */
    protected string $nameLower = 'vendor';

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

        $this->app->bind(VendorRepositoryInterface::class, VendorRepository::class);
        $this->app->bind(VendorNotifierInterface::class, VendorNotifier::class);
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

- [ ] **Step 7: Wire the notifier into `ApproveVendorProfileUseCase`**

Replace the full contents of `app/Modules/Vendor/Application/UseCases/ApproveVendorProfileUseCase.php` with:

```php
<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Vendor\Domain\Contracts\VendorNotifierInterface;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class ApproveVendorProfileUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly VendorNotifierInterface $notifier,
    ) {}

    public function execute(int $vendorProfileId, int $verifiedBy, ?string $remark = null): void
    {
        $profile = $this->vendors->findProfileById($vendorProfileId);

        if ($profile === null) {
            throw new ModelNotFoundException("Vendor profile {$vendorProfileId} not found.");
        }

        $profile->approve($verifiedBy, $remark);
        $this->vendors->saveProfile($profile);

        $this->notifier->notifyProfileApproved($vendorProfileId);

        app_log('Vendor profile approved', [
            'vendor_profile_id' => $vendorProfileId,
            'verified_by' => $verifiedBy,
        ], 'info', 'vendor');
    }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/ApproveVendorProfileUseCaseTest.php`
Expected: PASS (3 tests).

- [ ] **Step 9: Run the full Vendor test suite to check nothing else broke**

Run: `php artisan test --compact tests/Feature/Modules/Vendor`
Expected: PASS — every other use case still resolves fine (`VendorNotifierInterface` is now bound, so `RejectVendorProfileUseCase` etc. still construct even though they don't use it yet).

- [ ] **Step 10: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Domain/Contracts/VendorNotifierInterface.php \
  app/Modules/Vendor/Infrastructure/Notifications/VendorProfileApprovedNotification.php \
  app/Modules/Vendor/Infrastructure/Notifications/VendorProfileRejectedNotification.php \
  app/Modules/Vendor/Infrastructure/Notifications/VendorDocumentApprovedNotification.php \
  app/Modules/Vendor/Infrastructure/Notifications/VendorDocumentRejectedNotification.php \
  app/Modules/Vendor/Infrastructure/Notifications/VendorNotifier.php \
  app/Modules/Vendor/Providers/VendorServiceProvider.php \
  app/Modules/Vendor/Application/UseCases/ApproveVendorProfileUseCase.php \
  tests/Feature/Modules/Vendor/ApproveVendorProfileUseCaseTest.php
git commit -m "feat(vendor): notify vendor by database+mail when profile is approved"
```

---

### Task 4: Wire `RejectVendorProfileUseCase`

**Files:**
- Modify: `app/Modules/Vendor/Application/UseCases/RejectVendorProfileUseCase.php`
- Test: `tests/Feature/Modules/Vendor/RejectVendorProfileUseCaseTest.php`

**Interfaces:**
- Consumes: `VendorNotifierInterface::notifyProfileRejected(int $vendorProfileId, string $remark): void` (Task 3), `VendorProfileRejectedNotification` (Task 3).

- [ ] **Step 1: Write the failing test**

Replace the full contents of `tests/Feature/Modules/Vendor/RejectVendorProfileUseCaseTest.php` with:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\UseCases\RejectVendorProfileUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Notifications\VendorProfileRejectedNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

beforeEach(fn () => Notification::fake());

function rejectVendorProfileUseCase(): RejectVendorProfileUseCase
{
    return app(RejectVendorProfileUseCase::class);
}

test('execute rejects a pending vendor profile', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorProfileUseCase()->execute($profile->id, $internalUser->id, 'Missing documents');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'rejected',
        'verified_by' => $internalUser->id,
        'remark' => 'Missing documents',
    ]);

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorProfileRejectedNotification::class,
        fn ($notification) => $notification->toDatabase($profile->VendorProfilesUser)['remark'] === 'Missing documents'
    );
});

test('execute rejects an approved vendor profile', function () {
    $profile = VendorProfiles::factory()->approved()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorProfileUseCase()->execute($profile->id, $internalUser->id, 'Revoked');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'rejected',
        'remark' => 'Revoked',
    ]);

    Notification::assertSentTo($profile->VendorProfilesUser, VendorProfileRejectedNotification::class);
});

test('execute throws when the vendor profile does not exist', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => rejectVendorProfileUseCase()->execute(999999, $internalUser->id, 'Missing documents'))
        ->toThrow(ModelNotFoundException::class);

    Notification::assertNothingSent();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/RejectVendorProfileUseCaseTest.php`
Expected: FAIL — `Notification::assertSentTo` fails because nothing was sent (the use case doesn't call the notifier yet).

- [ ] **Step 3: Wire the notifier**

Replace the full contents of `app/Modules/Vendor/Application/UseCases/RejectVendorProfileUseCase.php` with:

```php
<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Vendor\Domain\Contracts\VendorNotifierInterface;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class RejectVendorProfileUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly VendorNotifierInterface $notifier,
    ) {}

    public function execute(int $vendorProfileId, int $verifiedBy, string $remark): void
    {
        $profile = $this->vendors->findProfileById($vendorProfileId);

        if ($profile === null) {
            throw new ModelNotFoundException("Vendor profile {$vendorProfileId} not found.");
        }

        $profile->reject($verifiedBy, $remark);
        $this->vendors->saveProfile($profile);

        $this->notifier->notifyProfileRejected($vendorProfileId, $remark);

        app_log('Vendor profile rejected', [
            'vendor_profile_id' => $vendorProfileId,
            'verified_by' => $verifiedBy,
        ], 'info', 'vendor');
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/RejectVendorProfileUseCaseTest.php`
Expected: PASS (3 tests).

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Application/UseCases/RejectVendorProfileUseCase.php tests/Feature/Modules/Vendor/RejectVendorProfileUseCaseTest.php
git commit -m "feat(vendor): notify vendor by database+mail when profile is rejected"
```

---

### Task 5: Wire `ApproveVendorDocumentUseCase`

**Files:**
- Modify: `app/Modules/Vendor/Application/UseCases/ApproveVendorDocumentUseCase.php`
- Test: `tests/Feature/Modules/Vendor/ApproveVendorDocumentUseCaseTest.php`

**Interfaces:**
- Consumes: `VendorNotifierInterface::notifyDocumentApproved(int $vendorProfileId, string $documentType): void` (Task 3), `VendorDocumentApprovedNotification` (Task 3), `VendorDocument::documentType(): string` (existing, `app/Modules/Vendor/Domain/Entities/VendorDocument.php`).

- [ ] **Step 1: Write the failing test**

Replace the full contents of `tests/Feature/Modules/Vendor/ApproveVendorDocumentUseCaseTest.php` with:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\UseCases\ApproveVendorDocumentUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Notifications\VendorDocumentApprovedNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

beforeEach(fn () => Notification::fake());

function approveVendorDocumentUseCase(): ApproveVendorDocumentUseCase
{
    return app(ApproveVendorDocumentUseCase::class);
}

test('execute approves a pending vendor document', function () {
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorDocumentUseCase()->execute($profile->id, $document->id, $internalUser->id);

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'approved',
        'verified_by' => $internalUser->id,
    ]);

    Notification::assertSentTo($profile->VendorProfilesUser, VendorDocumentApprovedNotification::class);
});

test('execute approves a rejected vendor document', function () {
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->rejected()->create(['vendor_profile_id' => $profile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorDocumentUseCase()->execute($profile->id, $document->id, $internalUser->id);

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'approved',
        'verified_by' => $internalUser->id,
    ]);

    Notification::assertSentTo($profile->VendorProfilesUser, VendorDocumentApprovedNotification::class);
});

test('execute throws when the document does not belong to the vendor profile', function () {
    $ownerProfile = VendorProfiles::factory()->create();
    $otherProfile = VendorProfiles::factory()->create();
    $otherDocument = VendorDocuments::factory()->create(['vendor_profile_id' => $otherProfile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => approveVendorDocumentUseCase()->execute($ownerProfile->id, $otherDocument->id, $internalUser->id))
        ->toThrow(ModelNotFoundException::class);

    Notification::assertNothingSent();
});

test('execute throws when the document id does not exist', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => approveVendorDocumentUseCase()->execute($profile->id, 999999, $internalUser->id))
        ->toThrow(ModelNotFoundException::class);

    Notification::assertNothingSent();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/ApproveVendorDocumentUseCaseTest.php`
Expected: FAIL — `Notification::assertSentTo` fails because nothing was sent yet.

- [ ] **Step 3: Wire the notifier**

Replace the full contents of `app/Modules/Vendor/Application/UseCases/ApproveVendorDocumentUseCase.php` with:

```php
<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Vendor\Domain\Contracts\VendorNotifierInterface;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class ApproveVendorDocumentUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly VendorNotifierInterface $notifier,
    ) {}

    public function execute(int $vendorProfileId, int $documentId, int $verifiedBy): void
    {
        $document = $this->vendors->findDocumentByVendorProfileIdAndId($vendorProfileId, $documentId);

        if ($document === null) {
            throw new ModelNotFoundException(
                "Vendor document {$documentId} not found for vendor profile {$vendorProfileId}."
            );
        }

        $document->approve($verifiedBy);
        $this->vendors->saveDocument($document);

        $this->notifier->notifyDocumentApproved($vendorProfileId, $document->documentType());

        app_log('Vendor document approved', [
            'vendor_profile_id' => $vendorProfileId,
            'document_id' => $documentId,
            'verified_by' => $verifiedBy,
        ], 'info', 'vendor');
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/ApproveVendorDocumentUseCaseTest.php`
Expected: PASS (4 tests).

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Application/UseCases/ApproveVendorDocumentUseCase.php tests/Feature/Modules/Vendor/ApproveVendorDocumentUseCaseTest.php
git commit -m "feat(vendor): notify vendor by database+mail when document is approved"
```

---

### Task 6: Wire `RejectVendorDocumentUseCase`

**Files:**
- Modify: `app/Modules/Vendor/Application/UseCases/RejectVendorDocumentUseCase.php`
- Test: `tests/Feature/Modules/Vendor/RejectVendorDocumentUseCaseTest.php`

**Interfaces:**
- Consumes: `VendorNotifierInterface::notifyDocumentRejected(int $vendorProfileId, string $documentType, string $remark): void` (Task 3), `VendorDocumentRejectedNotification` (Task 3).

- [ ] **Step 1: Write the failing test**

Replace the full contents of `tests/Feature/Modules/Vendor/RejectVendorDocumentUseCaseTest.php` with:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\UseCases\RejectVendorDocumentUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Notifications\VendorDocumentRejectedNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

beforeEach(fn () => Notification::fake());

function rejectVendorDocumentUseCase(): RejectVendorDocumentUseCase
{
    return app(RejectVendorDocumentUseCase::class);
}

test('execute rejects a pending vendor document', function () {
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorDocumentUseCase()->execute($profile->id, $document->id, $internalUser->id, 'Blurry image');

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'rejected',
        'verified_by' => $internalUser->id,
        'remark' => 'Blurry image',
    ]);

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorDocumentRejectedNotification::class,
        fn ($notification) => $notification->toDatabase($profile->VendorProfilesUser)['remark'] === 'Blurry image'
    );
});

test('execute rejects an approved vendor document', function () {
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->approved()->create(['vendor_profile_id' => $profile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorDocumentUseCase()->execute($profile->id, $document->id, $internalUser->id, 'Revoked');

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'rejected',
        'remark' => 'Revoked',
    ]);

    Notification::assertSentTo($profile->VendorProfilesUser, VendorDocumentRejectedNotification::class);
});

test('execute throws when the document does not belong to the vendor profile', function () {
    $ownerProfile = VendorProfiles::factory()->create();
    $otherProfile = VendorProfiles::factory()->create();
    $otherDocument = VendorDocuments::factory()->create(['vendor_profile_id' => $otherProfile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => rejectVendorDocumentUseCase()->execute($ownerProfile->id, $otherDocument->id, $internalUser->id, 'Blurry image'))
        ->toThrow(ModelNotFoundException::class);

    Notification::assertNothingSent();
});

test('execute throws when the document id does not exist', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => rejectVendorDocumentUseCase()->execute($profile->id, 999999, $internalUser->id, 'Blurry image'))
        ->toThrow(ModelNotFoundException::class);

    Notification::assertNothingSent();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/RejectVendorDocumentUseCaseTest.php`
Expected: FAIL — `Notification::assertSentTo` fails because nothing was sent yet.

- [ ] **Step 3: Wire the notifier**

Replace the full contents of `app/Modules/Vendor/Application/UseCases/RejectVendorDocumentUseCase.php` with:

```php
<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Vendor\Domain\Contracts\VendorNotifierInterface;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class RejectVendorDocumentUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly VendorNotifierInterface $notifier,
    ) {}

    public function execute(int $vendorProfileId, int $documentId, int $verifiedBy, string $remark): void
    {
        $document = $this->vendors->findDocumentByVendorProfileIdAndId($vendorProfileId, $documentId);

        if ($document === null) {
            throw new ModelNotFoundException(
                "Vendor document {$documentId} not found for vendor profile {$vendorProfileId}."
            );
        }

        $document->reject($verifiedBy, $remark);
        $this->vendors->saveDocument($document);

        $this->notifier->notifyDocumentRejected($vendorProfileId, $document->documentType(), $remark);

        app_log('Vendor document rejected', [
            'vendor_profile_id' => $vendorProfileId,
            'document_id' => $documentId,
            'verified_by' => $verifiedBy,
        ], 'info', 'vendor');
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Modules/Vendor/RejectVendorDocumentUseCaseTest.php`
Expected: PASS (4 tests).

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Application/UseCases/RejectVendorDocumentUseCase.php tests/Feature/Modules/Vendor/RejectVendorDocumentUseCaseTest.php
git commit -m "feat(vendor): notify vendor by database+mail when document is rejected"
```

---

### Task 7: Full regression pass

**Files:** none (verification only)

**Interfaces:** none — this task only runs the existing suite to prove Tasks 1–6 didn't break anything elsewhere (e.g. `VendorApprovalController` still resolves all 4 use cases now that they take an extra constructor argument satisfied by the DI container).

- [ ] **Step 1: Run the full test suite**

Run: `php artisan test --compact`
Expected: PASS — all tests green, including `tests/Feature/Modules/Vendor/*`, `tests/Unit/Domain/Vendor/*`, and every other module's tests (unaffected by this change).

- [ ] **Step 2: Confirm formatting is clean**

Run: `vendor/bin/pint --test --format agent`
Expected: no files need formatting (each task already ran `pint --dirty` before committing).

- [ ] **Step 3: Nothing to commit**

This task is verification-only. If Step 1 or Step 2 finds a problem, fix it in the file it points to, re-run `vendor/bin/pint --dirty --format agent`, and commit the fix with `git commit -m "fix(vendor): <what was fixed>"` before moving on.
