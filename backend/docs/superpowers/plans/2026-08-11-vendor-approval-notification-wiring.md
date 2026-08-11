# Vendor Approval Notification Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the 4 Vendor approve/reject use cases to send a notification (database always, mail optionally) to the vendor's owning user, with a per-request `send_email` toggle that flows from the HTTP request down to the notification's `via()` channel list.

**Architecture:** 4 new `Illuminate\Notifications\Notification` subclasses in `App\Modules\Vendor\Infrastructure\Notifications` (one per event), each constructed with a `bool $sendEmail` flag that controls whether `via()` includes `'mail'`. Each of the 4 Dashboard use cases gains a `App\Modules\Notification\Domain\Contracts\NotificationSenderInterface` dependency (already built and bound in a prior session) and a `bool $sendEmail = true` parameter, and calls `$notifications->send([$userId], new XxxNotification(...))` after a successful save. The 3 existing FormRequests plus one new FormRequest validate an optional `send_email` boolean; the controller reads it via `$request->boolean('send_email', true)` and passes it through.

**Tech Stack:** PHP 8.4, Laravel 13, Pest 4.

## Global Constraints

- Covers all 4 events: `ApproveVendorProfileUseCase`, `RejectVendorProfileUseCase`, `ApproveVendorDocumentUseCase`, `RejectVendorDocumentUseCase`.
- `send_email` is a **per-request** toggle (field in the HTTP request body), not a stored setting — no config file, no database setting.
- **Backend only.** No frontend UI toggle in this plan — that is separate future work. The API must work correctly whether or not `send_email` is present in the request.
- When `send_email` is absent from the request, it defaults to **`true`** (email sent) — this preserves current behavior for any caller that hasn't been updated to send the field yet.
- Notification classes live in `App\Modules\Vendor\Infrastructure\Notifications` (not in the generic `App\Modules\Notification` module) — the generic module owns only the send mechanism; domain-specific message content belongs to the consuming module.
- Thai copy for all 4 notifications and the document-type label list must match verbatim what's shown in this plan (sourced from the earlier-approved `2026-08-08-vendor-notification-system-design.md`, whose content is still valid even though its `VendorNotifierInterface` architecture was superseded by the generic `NotificationSenderInterface`).
- `VendorDocument` has no direct accessor to its owning user id — `ApproveVendorDocumentUseCase`/`RejectVendorDocumentUseCase` must do a second `findProfileById($vendorProfileId)` lookup to get `VendorProfile::userId()`, exactly like `VendorProfile`-owning use cases get it directly via `$profile->userId()`.
- After any PHP file changes, run `vendor/bin/pint --dirty --format agent`.
- After the full plan, `php artisan test --compact` must show **337 tests, 332 passed, 5 failed** — the same 5 pre-existing failures as the current baseline (`ExampleTest`, and the 4 vendor-authorization tripwires: `ApproveVendorDocumentTest`, `ApproveVendorTest`, `ListVendorsTest`, `ShowVendorTest`), plus exactly 14 new passing tests (2 from Task 1, 3 each from Tasks 2-5) and zero regressions elsewhere. Current baseline (recorded before Task 1): 323 tests, 318 passed, 5 failed.

Spec: `docs/superpowers/specs/2026-08-11-vendor-approval-notification-wiring-design.md`

---

### Task 1: `DocumentTypeLabels` support class

**Files:**
- Create: `app/Modules/Vendor/Infrastructure/Notifications/Support/DocumentTypeLabels.php`
- Test: `tests/Feature/Modules/Vendor/DocumentTypeLabelsTest.php`

**Interfaces:**
- Produces: `App\Modules\Vendor\Infrastructure\Notifications\Support\DocumentTypeLabels::label(string $documentType): string` — static method, no constructor, no dependencies. Tasks 4 and 5 call this from their Notification classes.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Modules/Vendor/DocumentTypeLabelsTest.php`:

```php
<?php

use App\Modules\Vendor\Infrastructure\Notifications\Support\DocumentTypeLabels;

test('label returns the Thai label for a known document type', function () {
    expect(DocumentTypeLabels::label('company_certificate'))->toBe('หนังสือรับรองบริษัท');
});

test('label falls back to the raw key for an unknown document type', function () {
    expect(DocumentTypeLabels::label('some_unknown_type'))->toBe('some_unknown_type');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact --filter=DocumentTypeLabelsTest`

Expected: FAIL — class `App\Modules\Vendor\Infrastructure\Notifications\Support\DocumentTypeLabels` not found.

- [ ] **Step 3: Implement**

Create `app/Modules/Vendor/Infrastructure/Notifications/Support/DocumentTypeLabels.php`:

```php
<?php

namespace App\Modules\Vendor\Infrastructure\Notifications\Support;

final class DocumentTypeLabels
{
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

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --compact --filter=DocumentTypeLabelsTest`

Expected: PASS — 2 passed.

- [ ] **Step 5: Format with Pint**

Run: `vendor/bin/pint --dirty --format agent`

- [ ] **Step 6: Commit**

```bash
git add app/Modules/Vendor/Infrastructure/Notifications/Support/DocumentTypeLabels.php tests/Feature/Modules/Vendor/DocumentTypeLabelsTest.php
git commit -m "feat(vendor): add Thai labels for document types"
```

---

### Task 2: Vendor profile approved — notification, use case, request, controller

**Files:**
- Create: `app/Modules/Vendor/Infrastructure/Notifications/VendorProfileApprovedNotification.php`
- Modify: `app/Modules/Vendor/Application/Dashboard/UseCases/ApproveVendorProfileUseCase.php`
- Modify: `app/Modules/Vendor/Presentation/Http/Requests/ApproveVendorRequest.php`
- Modify: `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`
- Modify: `tests/Feature/Modules/Vendor/ApproveVendorProfileUseCaseTest.php`
- Modify: `tests/Feature/Modules/Vendor/ApproveVendorTest.php`

**Interfaces:**
- Consumes: `App\Modules\Notification\Domain\Contracts\NotificationSenderInterface::send(array $userIds, Notification $notification): void` (already built, bound in `NotificationServiceProvider`); `App\Modules\Vendor\Domain\Entities\VendorProfile::userId(): int` (already exists).
- Produces: `App\Modules\Vendor\Infrastructure\Notifications\VendorProfileApprovedNotification` with constructor `__construct(bool $sendEmail = true)`.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `tests/Feature/Modules/Vendor/ApproveVendorProfileUseCaseTest.php` with:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\Dashboard\UseCases\ApproveVendorProfileUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Notifications\VendorProfileApprovedNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

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
});

test('execute throws when the vendor profile does not exist', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => approveVendorProfileUseCase()->execute(999999, $internalUser->id))
        ->toThrow(ModelNotFoundException::class);
});

test('execute notifies the profile owner with mail enabled by default', function () {
    Notification::fake();
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorProfileUseCase()->execute($profile->id, $internalUser->id);

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorProfileApprovedNotification::class,
        fn ($notification, $channels) => in_array('mail', $channels, true)
    );
});

test('execute notifies the profile owner without mail when sendEmail is false', function () {
    Notification::fake();
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorProfileUseCase()->execute($profile->id, $internalUser->id, null, false);

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorProfileApprovedNotification::class,
        fn ($notification, $channels) => $channels === ['database']
    );
});
```

Replace the full contents of `tests/Feature/Modules/Vendor/ApproveVendorTest.php` with:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Notifications\VendorProfileApprovedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

test('approving a vendor requires authentication', function () {
    $response = $this->postJson('/api/v1/vendors/1/approve');

    $response->assertStatus(401);
});

test('an internal user can approve a pending vendor', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/approve", ['remark' => 'Looks good']);

    $response->assertOk()
        ->assertJsonPath('data.verificationStatus', 'approved')
        ->assertJsonPath('data.remark', 'Looks good');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'approved',
        'verified_by' => $internalUser->id,
    ]);
});

test('approving a nonexistent vendor returns 404', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->postJson('/api/v1/vendors/99999/approve');

    $response->assertStatus(404);
});

test('a vendor user cannot approve a vendor', function () {
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($vendorUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/approve");

    $response->assertStatus(403);
});

test('approving a vendor without send_email skips the mail channel', function () {
    Notification::fake();
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $this->postJson("/api/v1/vendors/{$profile->id}/approve", ['send_email' => false]);

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorProfileApprovedNotification::class,
        fn ($notification, $channels) => $channels === ['database']
    );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=ApproveVendorProfileUseCaseTest`
Run: `php artisan test --compact --filter=ApproveVendorTest`

Expected: both FAIL — `App\Modules\Vendor\Infrastructure\Notifications\VendorProfileApprovedNotification` does not exist yet, so the `use` import fails class resolution.

- [ ] **Step 3: Create the Notification class**

Create `app/Modules/Vendor/Infrastructure/Notifications/VendorProfileApprovedNotification.php`:

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

    public function __construct(
        private readonly bool $sendEmail = true,
    ) {}

    public function via(object $notifiable): array
    {
        return $this->sendEmail ? ['database', 'mail'] : ['database'];
    }

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

- [ ] **Step 4: Wire the use case**

Replace the full contents of `app/Modules/Vendor/Application/Dashboard/UseCases/ApproveVendorProfileUseCase.php` with:

```php
<?php

namespace App\Modules\Vendor\Application\Dashboard\UseCases;

use App\Modules\Notification\Domain\Contracts\NotificationSenderInterface;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use App\Modules\Vendor\Infrastructure\Notifications\VendorProfileApprovedNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class ApproveVendorProfileUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly NotificationSenderInterface $notifications,
    ) {}

    public function execute(int $vendorProfileId, int $verifiedBy, ?string $remark = null, bool $sendEmail = true): void
    {
        $profile = $this->vendors->findProfileById($vendorProfileId);

        if ($profile === null) {
            throw new ModelNotFoundException("Vendor profile {$vendorProfileId} not found.");
        }

        $profile->approve($verifiedBy, $remark);
        $this->vendors->saveProfile($profile);

        $this->notifications->send([$profile->userId()], new VendorProfileApprovedNotification($sendEmail));

        app_log('Vendor profile approved', [
            'vendor_profile_id' => $vendorProfileId,
            'verified_by' => $verifiedBy,
        ], 'info', 'vendor');
    }
}
```

- [ ] **Step 5: Add `send_email` validation**

In `app/Modules/Vendor/Presentation/Http/Requests/ApproveVendorRequest.php`, change:
```php
    public function rules(): array
    {
        return [
            'remark' => ['nullable', 'string'],
        ];
    }
```
to:
```php
    public function rules(): array
    {
        return [
            'remark' => ['nullable', 'string'],
            'send_email' => ['sometimes', 'boolean'],
        ];
    }
```

- [ ] **Step 6: Pass the flag through in the controller**

In `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`, change:
```php
    public function approve(ApproveVendorRequest $request, int $id): JsonResponse
    {
        $this->approveVendorProfile->execute($id, $request->user()->id, $request->validated('remark'));

        return $this->vendorResponse($id);
    }
```
to:
```php
    public function approve(ApproveVendorRequest $request, int $id): JsonResponse
    {
        $this->approveVendorProfile->execute(
            $id,
            $request->user()->id,
            $request->validated('remark'),
            $request->boolean('send_email', true),
        );

        return $this->vendorResponse($id);
    }
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `php artisan test --compact --filter=ApproveVendorProfileUseCaseTest`
Run: `php artisan test --compact --filter=ApproveVendorTest`

Expected: both PASS — 5 passed and 5 passed respectively.

- [ ] **Step 8: Format with Pint**

Run: `vendor/bin/pint --dirty --format agent`

Then re-run Step 7's two commands to confirm still green.

- [ ] **Step 9: Commit**

```bash
git add app/Modules/Vendor/Infrastructure/Notifications/VendorProfileApprovedNotification.php app/Modules/Vendor/Application/Dashboard/UseCases/ApproveVendorProfileUseCase.php app/Modules/Vendor/Presentation/Http/Requests/ApproveVendorRequest.php app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php tests/Feature/Modules/Vendor/ApproveVendorProfileUseCaseTest.php tests/Feature/Modules/Vendor/ApproveVendorTest.php
git commit -m "feat(vendor): notify vendor by database+mail when profile is approved"
```

---

### Task 3: Vendor profile rejected — notification, use case, request, controller

**Files:**
- Create: `app/Modules/Vendor/Infrastructure/Notifications/VendorProfileRejectedNotification.php`
- Modify: `app/Modules/Vendor/Application/Dashboard/UseCases/RejectVendorProfileUseCase.php`
- Modify: `app/Modules/Vendor/Presentation/Http/Requests/RejectVendorRequest.php`
- Modify: `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`
- Modify: `tests/Feature/Modules/Vendor/RejectVendorProfileUseCaseTest.php`
- Modify: `tests/Feature/Modules/Vendor/RejectVendorTest.php`

**Interfaces:**
- Consumes: same `NotificationSenderInterface` and `VendorProfile::userId()` as Task 2. Independent of Task 2's specific files — only shares the controller file (a different method).
- Produces: `App\Modules\Vendor\Infrastructure\Notifications\VendorProfileRejectedNotification` with constructor `__construct(string $remark, bool $sendEmail = true)`.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `tests/Feature/Modules/Vendor/RejectVendorProfileUseCaseTest.php` with:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\Dashboard\UseCases\RejectVendorProfileUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Notifications\VendorProfileRejectedNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

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
});

test('execute throws when the vendor profile does not exist', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => rejectVendorProfileUseCase()->execute(999999, $internalUser->id, 'Missing documents'))
        ->toThrow(ModelNotFoundException::class);
});

test('execute notifies the profile owner with mail enabled by default', function () {
    Notification::fake();
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorProfileUseCase()->execute($profile->id, $internalUser->id, 'Missing documents');

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorProfileRejectedNotification::class,
        fn ($notification, $channels) => in_array('mail', $channels, true)
    );
});

test('execute notifies the profile owner without mail when sendEmail is false', function () {
    Notification::fake();
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorProfileUseCase()->execute($profile->id, $internalUser->id, 'Missing documents', false);

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorProfileRejectedNotification::class,
        fn ($notification, $channels) => $channels === ['database']
    );
});
```

Replace the full contents of `tests/Feature/Modules/Vendor/RejectVendorTest.php` with:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Notifications\VendorProfileRejectedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

test('rejecting a vendor requires authentication', function () {
    $response = $this->postJson('/api/v1/vendors/1/reject', ['remark' => 'Missing documents']);

    $response->assertStatus(401);
});

test('an internal user can reject a pending vendor', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/reject", ['remark' => 'Missing documents']);

    $response->assertOk()
        ->assertJsonPath('data.verificationStatus', 'rejected')
        ->assertJsonPath('data.remark', 'Missing documents');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'rejected',
        'verified_by' => $internalUser->id,
    ]);
});

test('rejecting a vendor requires a remark', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/reject", []);

    $response->assertStatus(422)->assertJsonValidationErrors('remark');
});

test('rejecting a nonexistent vendor returns 404', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->postJson('/api/v1/vendors/99999/reject', ['remark' => 'Missing documents']);

    $response->assertStatus(404);
});

test('rejecting a vendor without send_email skips the mail channel', function () {
    Notification::fake();
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $this->postJson("/api/v1/vendors/{$profile->id}/reject", [
        'remark' => 'Missing documents',
        'send_email' => false,
    ]);

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorProfileRejectedNotification::class,
        fn ($notification, $channels) => $channels === ['database']
    );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=RejectVendorProfileUseCaseTest`
Run: `php artisan test --compact --filter=RejectVendorTest`

Expected: both FAIL — `VendorProfileRejectedNotification` does not exist yet.

- [ ] **Step 3: Create the Notification class**

Create `app/Modules/Vendor/Infrastructure/Notifications/VendorProfileRejectedNotification.php`:

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
        private readonly bool $sendEmail = true,
    ) {}

    public function via(object $notifiable): array
    {
        return $this->sendEmail ? ['database', 'mail'] : ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'vendor_profile_rejected',
            'message' => "โปรไฟล์ผู้ค้าของคุณถูกปฏิเสธ: {$this->remark}",
            'remark' => $this->remark,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('โปรไฟล์ผู้ค้าของคุณถูกปฏิเสธ')
            ->greeting("เรียนคุณ {$notifiable->username}")
            ->line('โปรไฟล์ผู้ค้าของคุณถูกปฏิเสธ ด้วยเหตุผลดังนี้')
            ->line($this->remark);
    }
}
```

- [ ] **Step 4: Wire the use case**

Replace the full contents of `app/Modules/Vendor/Application/Dashboard/UseCases/RejectVendorProfileUseCase.php` with:

```php
<?php

namespace App\Modules\Vendor\Application\Dashboard\UseCases;

use App\Modules\Notification\Domain\Contracts\NotificationSenderInterface;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use App\Modules\Vendor\Infrastructure\Notifications\VendorProfileRejectedNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class RejectVendorProfileUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly NotificationSenderInterface $notifications,
    ) {}

    public function execute(int $vendorProfileId, int $verifiedBy, string $remark, bool $sendEmail = true): void
    {
        $profile = $this->vendors->findProfileById($vendorProfileId);

        if ($profile === null) {
            throw new ModelNotFoundException("Vendor profile {$vendorProfileId} not found.");
        }

        $profile->reject($verifiedBy, $remark);
        $this->vendors->saveProfile($profile);

        $this->notifications->send([$profile->userId()], new VendorProfileRejectedNotification($remark, $sendEmail));

        app_log('Vendor profile rejected', [
            'vendor_profile_id' => $vendorProfileId,
            'verified_by' => $verifiedBy,
        ], 'info', 'vendor');
    }
}
```

- [ ] **Step 5: Add `send_email` validation**

In `app/Modules/Vendor/Presentation/Http/Requests/RejectVendorRequest.php`, change:
```php
    public function rules(): array
    {
        return [
            'remark' => ['required', 'string'],
        ];
    }
```
to:
```php
    public function rules(): array
    {
        return [
            'remark' => ['required', 'string'],
            'send_email' => ['sometimes', 'boolean'],
        ];
    }
```

- [ ] **Step 6: Pass the flag through in the controller**

In `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`, change:
```php
    public function reject(RejectVendorRequest $request, int $id): JsonResponse
    {
        $this->rejectVendorProfile->execute($id, $request->user()->id, $request->validated('remark'));

        return $this->vendorResponse($id);
    }
```
to:
```php
    public function reject(RejectVendorRequest $request, int $id): JsonResponse
    {
        $this->rejectVendorProfile->execute(
            $id,
            $request->user()->id,
            $request->validated('remark'),
            $request->boolean('send_email', true),
        );

        return $this->vendorResponse($id);
    }
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `php artisan test --compact --filter=RejectVendorProfileUseCaseTest`
Run: `php artisan test --compact --filter=RejectVendorTest`

Expected: both PASS — 5 passed and 5 passed respectively.

- [ ] **Step 8: Format with Pint**

Run: `vendor/bin/pint --dirty --format agent`

Then re-run Step 7's two commands to confirm still green.

- [ ] **Step 9: Commit**

```bash
git add app/Modules/Vendor/Infrastructure/Notifications/VendorProfileRejectedNotification.php app/Modules/Vendor/Application/Dashboard/UseCases/RejectVendorProfileUseCase.php app/Modules/Vendor/Presentation/Http/Requests/RejectVendorRequest.php app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php tests/Feature/Modules/Vendor/RejectVendorProfileUseCaseTest.php tests/Feature/Modules/Vendor/RejectVendorTest.php
git commit -m "feat(vendor): notify vendor by database+mail when profile is rejected"
```

---

### Task 4: Vendor document approved — notification, use case, request, controller

**Files:**
- Create: `app/Modules/Vendor/Infrastructure/Notifications/VendorDocumentApprovedNotification.php`
- Modify: `app/Modules/Vendor/Application/Dashboard/UseCases/ApproveVendorDocumentUseCase.php`
- Create: `app/Modules/Vendor/Presentation/Http/Requests/ApproveVendorDocumentRequest.php`
- Modify: `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`
- Modify: `tests/Feature/Modules/Vendor/ApproveVendorDocumentUseCaseTest.php`
- Modify: `tests/Feature/Modules/Vendor/ApproveVendorDocumentTest.php`

**Interfaces:**
- Consumes: `App\Modules\Vendor\Infrastructure\Notifications\Support\DocumentTypeLabels::label(string): string` (Task 1); `NotificationSenderInterface`; `VendorDocument::documentType(): string` and `VendorDocument::vendorProfileId(): int` (already exist); `VendorRepositoryInterface::findProfileById(int): ?VendorProfile` (already exists, used here for the second lookup described in Global Constraints).
- Produces: `App\Modules\Vendor\Infrastructure\Notifications\VendorDocumentApprovedNotification` with constructor `__construct(string $documentType, bool $sendEmail = true)`.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `tests/Feature/Modules/Vendor/ApproveVendorDocumentUseCaseTest.php` with:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\Dashboard\UseCases\ApproveVendorDocumentUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Notifications\VendorDocumentApprovedNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

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
});

test('execute throws when the document does not belong to the vendor profile', function () {
    $ownerProfile = VendorProfiles::factory()->create();
    $otherProfile = VendorProfiles::factory()->create();
    $otherDocument = VendorDocuments::factory()->create(['vendor_profile_id' => $otherProfile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => approveVendorDocumentUseCase()->execute($ownerProfile->id, $otherDocument->id, $internalUser->id))
        ->toThrow(ModelNotFoundException::class);
});

test('execute throws when the document id does not exist', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => approveVendorDocumentUseCase()->execute($profile->id, 999999, $internalUser->id))
        ->toThrow(ModelNotFoundException::class);
});

test('execute notifies the profile owner with mail enabled by default', function () {
    Notification::fake();
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorDocumentUseCase()->execute($profile->id, $document->id, $internalUser->id);

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorDocumentApprovedNotification::class,
        fn ($notification, $channels) => in_array('mail', $channels, true)
    );
});

test('execute notifies the profile owner without mail when sendEmail is false', function () {
    Notification::fake();
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorDocumentUseCase()->execute($profile->id, $document->id, $internalUser->id, false);

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorDocumentApprovedNotification::class,
        fn ($notification, $channels) => $channels === ['database']
    );
});
```

Replace the full contents of `tests/Feature/Modules/Vendor/ApproveVendorDocumentTest.php` with:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Notifications\VendorDocumentApprovedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

test('approving a vendor document requires authentication', function () {
    $response = $this->postJson('/api/v1/vendors/1/documents/1/approve');

    $response->assertStatus(401);
});

test('an internal user can approve a pending vendor document', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/{$document->id}/approve");

    $response->assertOk()->assertJsonPath('data.document.0.status', 'approved');

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'approved',
        'verified_by' => $internalUser->id,
    ]);
});

test('approving a nonexistent vendor document returns 404', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/99999/approve");

    $response->assertStatus(404);
});

test('a vendor user cannot approve a vendor document', function () {
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);

    $this->actingAs($vendorUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/{$document->id}/approve");

    $response->assertStatus(403);
});

test('approving a vendor document without send_email skips the mail channel', function () {
    Notification::fake();
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);

    $this->actingAs($internalUser, 'web');

    $this->postJson("/api/v1/vendors/{$profile->id}/documents/{$document->id}/approve", ['send_email' => false]);

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorDocumentApprovedNotification::class,
        fn ($notification, $channels) => $channels === ['database']
    );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=ApproveVendorDocumentUseCaseTest`
Run: `php artisan test --compact --filter=ApproveVendorDocumentTest`

Expected: both FAIL — `VendorDocumentApprovedNotification` does not exist yet.

- [ ] **Step 3: Create the Notification class**

Create `app/Modules/Vendor/Infrastructure/Notifications/VendorDocumentApprovedNotification.php`:

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
        private readonly bool $sendEmail = true,
    ) {}

    public function via(object $notifiable): array
    {
        return $this->sendEmail ? ['database', 'mail'] : ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $label = DocumentTypeLabels::label($this->documentType);

        return [
            'type' => 'vendor_document_approved',
            'message' => "เอกสาร{$label}ของคุณได้รับการอนุมัติแล้ว",
            'document_type' => $this->documentType,
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

- [ ] **Step 4: Wire the use case**

Replace the full contents of `app/Modules/Vendor/Application/Dashboard/UseCases/ApproveVendorDocumentUseCase.php` with:

```php
<?php

namespace App\Modules\Vendor\Application\Dashboard\UseCases;

use App\Modules\Notification\Domain\Contracts\NotificationSenderInterface;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use App\Modules\Vendor\Infrastructure\Notifications\VendorDocumentApprovedNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class ApproveVendorDocumentUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly NotificationSenderInterface $notifications,
    ) {}

    public function execute(int $vendorProfileId, int $documentId, int $verifiedBy, bool $sendEmail = true): void
    {
        $document = $this->vendors->findDocumentByVendorProfileIdAndId($vendorProfileId, $documentId);

        if ($document === null) {
            throw new ModelNotFoundException(
                "Vendor document {$documentId} not found for vendor profile {$vendorProfileId}."
            );
        }

        $document->approve($verifiedBy);
        $this->vendors->saveDocument($document);

        $profile = $this->vendors->findProfileById($vendorProfileId);

        if ($profile === null) {
            throw new ModelNotFoundException("Vendor profile {$vendorProfileId} not found.");
        }

        $this->notifications->send(
            [$profile->userId()],
            new VendorDocumentApprovedNotification($document->documentType(), $sendEmail)
        );

        app_log('Vendor document approved', [
            'vendor_profile_id' => $vendorProfileId,
            'document_id' => $documentId,
            'verified_by' => $verifiedBy,
        ], 'info', 'vendor');
    }
}
```

- [ ] **Step 5: Create the FormRequest for this action**

This action currently type-hints plain `Illuminate\Http\Request` with no validation — create a dedicated FormRequest matching the pattern every other action in this module uses.

Create `app/Modules/Vendor/Presentation/Http/Requests/ApproveVendorDocumentRequest.php`:

```php
<?php

namespace App\Modules\Vendor\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ApproveVendorDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'send_email' => ['sometimes', 'boolean'],
        ];
    }
}
```

- [ ] **Step 6: Wire the new FormRequest into the controller**

In `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`, change the import block:
```php
use App\Modules\Vendor\Presentation\Http\Requests\ApproveVendorRequest;
use App\Modules\Vendor\Presentation\Http\Requests\ListVendorsRequest;
use App\Modules\Vendor\Presentation\Http\Requests\RejectVendorDocumentRequest;
use App\Modules\Vendor\Presentation\Http\Requests\RejectVendorRequest;
use App\Modules\Vendor\Presentation\Http\Resources\VendorProfileResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
```
to:
```php
use App\Modules\Vendor\Presentation\Http\Requests\ApproveVendorDocumentRequest;
use App\Modules\Vendor\Presentation\Http\Requests\ApproveVendorRequest;
use App\Modules\Vendor\Presentation\Http\Requests\ListVendorsRequest;
use App\Modules\Vendor\Presentation\Http\Requests\RejectVendorDocumentRequest;
use App\Modules\Vendor\Presentation\Http\Requests\RejectVendorRequest;
use App\Modules\Vendor\Presentation\Http\Resources\VendorProfileResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;
```
(`Illuminate\Http\Request` is removed — after this step nothing in the file uses the plain `Request` type anymore.)

Then change:
```php
    public function approveDocument(Request $request, int $vendorId, int $documentId): JsonResponse
    {
        $this->approveVendorDocument->execute($vendorId, $documentId, $request->user()->id);

        return $this->vendorResponse($vendorId);
    }
```
to:
```php
    public function approveDocument(ApproveVendorDocumentRequest $request, int $vendorId, int $documentId): JsonResponse
    {
        $this->approveVendorDocument->execute(
            $vendorId,
            $documentId,
            $request->user()->id,
            $request->boolean('send_email', true),
        );

        return $this->vendorResponse($vendorId);
    }
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `php artisan test --compact --filter=ApproveVendorDocumentUseCaseTest`
Run: `php artisan test --compact --filter=ApproveVendorDocumentTest`

Expected: both PASS — 6 passed and 5 passed respectively.

- [ ] **Step 8: Format with Pint**

Run: `vendor/bin/pint --dirty --format agent`

Then re-run Step 7's two commands to confirm still green.

- [ ] **Step 9: Commit**

```bash
git add app/Modules/Vendor/Infrastructure/Notifications/VendorDocumentApprovedNotification.php app/Modules/Vendor/Application/Dashboard/UseCases/ApproveVendorDocumentUseCase.php app/Modules/Vendor/Presentation/Http/Requests/ApproveVendorDocumentRequest.php app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php tests/Feature/Modules/Vendor/ApproveVendorDocumentUseCaseTest.php tests/Feature/Modules/Vendor/ApproveVendorDocumentTest.php
git commit -m "feat(vendor): notify vendor by database+mail when document is approved"
```

---

### Task 5: Vendor document rejected — notification, use case, request, controller

**Files:**
- Create: `app/Modules/Vendor/Infrastructure/Notifications/VendorDocumentRejectedNotification.php`
- Modify: `app/Modules/Vendor/Application/Dashboard/UseCases/RejectVendorDocumentUseCase.php`
- Modify: `app/Modules/Vendor/Presentation/Http/Requests/RejectVendorDocumentRequest.php`
- Modify: `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`
- Modify: `tests/Feature/Modules/Vendor/RejectVendorDocumentUseCaseTest.php`
- Modify: `tests/Feature/Modules/Vendor/RejectVendorDocumentTest.php`

**Interfaces:**
- Consumes: same as Task 4 (`DocumentTypeLabels`, `NotificationSenderInterface`, `VendorDocument::documentType()`, second `findProfileById` lookup pattern).
- Produces: `App\Modules\Vendor\Infrastructure\Notifications\VendorDocumentRejectedNotification` with constructor `__construct(string $documentType, string $remark, bool $sendEmail = true)`.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `tests/Feature/Modules/Vendor/RejectVendorDocumentUseCaseTest.php` with:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\Dashboard\UseCases\RejectVendorDocumentUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Notifications\VendorDocumentRejectedNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

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
});

test('execute throws when the document does not belong to the vendor profile', function () {
    $ownerProfile = VendorProfiles::factory()->create();
    $otherProfile = VendorProfiles::factory()->create();
    $otherDocument = VendorDocuments::factory()->create(['vendor_profile_id' => $otherProfile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => rejectVendorDocumentUseCase()->execute($ownerProfile->id, $otherDocument->id, $internalUser->id, 'Blurry image'))
        ->toThrow(ModelNotFoundException::class);
});

test('execute throws when the document id does not exist', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => rejectVendorDocumentUseCase()->execute($profile->id, 999999, $internalUser->id, 'Blurry image'))
        ->toThrow(ModelNotFoundException::class);
});

test('execute notifies the profile owner with mail enabled by default', function () {
    Notification::fake();
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorDocumentUseCase()->execute($profile->id, $document->id, $internalUser->id, 'Blurry image');

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorDocumentRejectedNotification::class,
        fn ($notification, $channels) => in_array('mail', $channels, true)
    );
});

test('execute notifies the profile owner without mail when sendEmail is false', function () {
    Notification::fake();
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorDocumentUseCase()->execute($profile->id, $document->id, $internalUser->id, 'Blurry image', false);

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorDocumentRejectedNotification::class,
        fn ($notification, $channels) => $channels === ['database']
    );
});
```

Replace the full contents of `tests/Feature/Modules/Vendor/RejectVendorDocumentTest.php` with:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Notifications\VendorDocumentRejectedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

test('rejecting a vendor document requires authentication', function () {
    $response = $this->postJson('/api/v1/vendors/1/documents/1/reject', ['remark' => 'Blurry image']);

    $response->assertStatus(401);
});

test('an internal user can reject a pending vendor document', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/{$document->id}/reject", ['remark' => 'Blurry image']);

    $response->assertOk()->assertJsonPath('data.document.0.status', 'rejected');

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'rejected',
        'verified_by' => $internalUser->id,
        'remark' => 'Blurry image',
    ]);
});

test('rejecting a vendor document requires a remark', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/{$document->id}/reject", []);

    $response->assertStatus(422)->assertJsonValidationErrors('remark');
});

test('rejecting a nonexistent vendor document returns 404', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/99999/reject", ['remark' => 'Blurry image']);

    $response->assertStatus(404);
});

test('rejecting a vendor document without send_email skips the mail channel', function () {
    Notification::fake();
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);

    $this->actingAs($internalUser, 'web');

    $this->postJson("/api/v1/vendors/{$profile->id}/documents/{$document->id}/reject", [
        'remark' => 'Blurry image',
        'send_email' => false,
    ]);

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorDocumentRejectedNotification::class,
        fn ($notification, $channels) => $channels === ['database']
    );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact --filter=RejectVendorDocumentUseCaseTest`
Run: `php artisan test --compact --filter=RejectVendorDocumentTest`

Expected: both FAIL — `VendorDocumentRejectedNotification` does not exist yet.

- [ ] **Step 3: Create the Notification class**

Create `app/Modules/Vendor/Infrastructure/Notifications/VendorDocumentRejectedNotification.php`:

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
        private readonly bool $sendEmail = true,
    ) {}

    public function via(object $notifiable): array
    {
        return $this->sendEmail ? ['database', 'mail'] : ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $label = DocumentTypeLabels::label($this->documentType);

        return [
            'type' => 'vendor_document_rejected',
            'message' => "เอกสาร{$label}ของคุณถูกปฏิเสธ: {$this->remark}",
            'document_type' => $this->documentType,
            'remark' => $this->remark,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $label = DocumentTypeLabels::label($this->documentType);

        return (new MailMessage)
            ->subject("เอกสาร{$label}ของคุณถูกปฏิเสธ")
            ->greeting("เรียนคุณ {$notifiable->username}")
            ->line("เอกสาร{$label}ของคุณถูกปฏิเสธ ด้วยเหตุผลดังนี้")
            ->line($this->remark);
    }
}
```

- [ ] **Step 4: Wire the use case**

Replace the full contents of `app/Modules/Vendor/Application/Dashboard/UseCases/RejectVendorDocumentUseCase.php` with:

```php
<?php

namespace App\Modules\Vendor\Application\Dashboard\UseCases;

use App\Modules\Notification\Domain\Contracts\NotificationSenderInterface;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use App\Modules\Vendor\Infrastructure\Notifications\VendorDocumentRejectedNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class RejectVendorDocumentUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly NotificationSenderInterface $notifications,
    ) {}

    public function execute(int $vendorProfileId, int $documentId, int $verifiedBy, string $remark, bool $sendEmail = true): void
    {
        $document = $this->vendors->findDocumentByVendorProfileIdAndId($vendorProfileId, $documentId);

        if ($document === null) {
            throw new ModelNotFoundException(
                "Vendor document {$documentId} not found for vendor profile {$vendorProfileId}."
            );
        }

        $document->reject($verifiedBy, $remark);
        $this->vendors->saveDocument($document);

        $profile = $this->vendors->findProfileById($vendorProfileId);

        if ($profile === null) {
            throw new ModelNotFoundException("Vendor profile {$vendorProfileId} not found.");
        }

        $this->notifications->send(
            [$profile->userId()],
            new VendorDocumentRejectedNotification($document->documentType(), $remark, $sendEmail)
        );

        app_log('Vendor document rejected', [
            'vendor_profile_id' => $vendorProfileId,
            'document_id' => $documentId,
            'verified_by' => $verifiedBy,
        ], 'info', 'vendor');
    }
}
```

- [ ] **Step 5: Add `send_email` validation**

In `app/Modules/Vendor/Presentation/Http/Requests/RejectVendorDocumentRequest.php`, change:
```php
    public function rules(): array
    {
        return [
            'remark' => ['required', 'string'],
        ];
    }
```
to:
```php
    public function rules(): array
    {
        return [
            'remark' => ['required', 'string'],
            'send_email' => ['sometimes', 'boolean'],
        ];
    }
```

- [ ] **Step 6: Pass the flag through in the controller**

In `app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php`, change:
```php
    public function rejectDocument(RejectVendorDocumentRequest $request, int $vendorId, int $documentId): JsonResponse
    {
        $this->rejectVendorDocument->execute($vendorId, $documentId, $request->user()->id, $request->validated('remark'));

        return $this->vendorResponse($vendorId);
    }
```
to:
```php
    public function rejectDocument(RejectVendorDocumentRequest $request, int $vendorId, int $documentId): JsonResponse
    {
        $this->rejectVendorDocument->execute(
            $vendorId,
            $documentId,
            $request->user()->id,
            $request->validated('remark'),
            $request->boolean('send_email', true),
        );

        return $this->vendorResponse($vendorId);
    }
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `php artisan test --compact --filter=RejectVendorDocumentUseCaseTest`
Run: `php artisan test --compact --filter=RejectVendorDocumentTest`

Expected: both PASS — 6 passed and 5 passed respectively.

- [ ] **Step 8: Format with Pint**

Run: `vendor/bin/pint --dirty --format agent`

Then re-run Step 7's two commands to confirm still green.

- [ ] **Step 9: Commit**

```bash
git add app/Modules/Vendor/Infrastructure/Notifications/VendorDocumentRejectedNotification.php app/Modules/Vendor/Application/Dashboard/UseCases/RejectVendorDocumentUseCase.php app/Modules/Vendor/Presentation/Http/Requests/RejectVendorDocumentRequest.php app/Modules/Vendor/Presentation/Http/Controllers/VendorApprovalController.php tests/Feature/Modules/Vendor/RejectVendorDocumentUseCaseTest.php tests/Feature/Modules/Vendor/RejectVendorDocumentTest.php
git commit -m "feat(vendor): notify vendor by database+mail when document is rejected"
```

---

### Task 6: Full regression verification

**Files:**
- None (verification only, no code changes, no commit unless a regression is found and fixed).

**Interfaces:**
- Consumes: the complete output of Tasks 1-5.
- Produces: nothing — this is the plan's final gate.

- [ ] **Step 1: Run the full test suite**

Run: `php artisan test --compact`

Expected: `"tests":337,"passed":332,"failed":5"` with the failures being exactly the same 5 pre-existing ones named in Global Constraints (`ExampleTest`, `ApproveVendorDocumentTest::a_vendor_user_cannot_approve_a_vendor_document`, `ApproveVendorTest::a_vendor_user_cannot_approve_a_vendor`, `ListVendorsTest::a_vendor_user_cannot_list_vendors`, `ShowVendorTest::a_vendor_user_cannot_fetch_a_vendor_by_id`). If the numbers differ or a different test fails, find and fix the cause before proceeding — do not treat any other failure as acceptable.

- [ ] **Step 2: Run Pint across the whole Vendor module (not just dirty files)**

Run: `vendor/bin/pint --test --format agent app/Modules/Vendor tests/Feature/Modules/Vendor`

Expected: clean, or only pre-existing drift unrelated to this plan's files (cross-check any reported file against the file list in Tasks 1-5 — if a reported file isn't one of them, it's pre-existing drift, leave it alone; if it is one of them, fix it).

- [ ] **Step 3: Confirm no leftover references to the old signatures**

Run (from `backend/`): search for any remaining caller of the 4 use cases that doesn't pass 4 (profile) or 5 (document) arguments — there should be none outside the controller and the test files already updated in Tasks 2-5. A quick check:

```bash
grep -rn "approveVendorProfile->execute\|rejectVendorProfile->execute\|approveVendorDocument->execute\|rejectVendorDocument->execute" app tests
```

Expected: every call site shown is inside `VendorApprovalController.php` (already updated in Tasks 2-5) or one of the 4 UseCase test files (already updated) — no stray 2-argument or 3-argument call left anywhere else.
