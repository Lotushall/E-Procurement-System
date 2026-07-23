# Vendor Contact Update-By-Id Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `POST /api/v1/vendor/contact` target a specific contact by `id` so vendors with multiple contacts can edit the right one, and so "add" never silently overwrites an existing contact.

**Architecture:** Add an optional `id` field to the existing request/DTO/resource for vendor contacts (no new route). `UpdateVendorContactUseCase` branches on whether `id` is present: absent → always create a new `vendor_contact` row; present → look up that row scoped to the current vendor's contacts and update it, or throw if it doesn't belong to this vendor. `VendorContactResource` starts returning `id` so the frontend can round-trip it. The frontend's `EditContactDialog` starts sending the `id` of the contact it was opened for.

**Tech Stack:** PHP 8.4, Laravel 13, `spatie/laravel-data` (DTOs), Pest 4 (backend tests). Next.js (App Router), `react-hook-form` + `zod` (frontend forms, no test runner configured).

## Global Constraints

- Spec: `backend/docs/superpowers/specs/2026-07-23-vendor-contact-update-by-id-design.md`.
- No new routes — reuse `POST /api/v1/vendor/contact` (`routes/api/v1/vendor.php:11`) for both create and update, distinguished by whether `id` is present in the body.
- No `id` sent → always create a new contact row, even if the vendor already has one or more contacts (do not fall back to "update the first contact").
- `id` sent but it does not belong to the requesting vendor's profile (or doesn't exist) → `UpdateVendorContactUseCase::execute()` throws `Illuminate\Database\Eloquent\ModelNotFoundException`; no row is created or modified. Do not change `VendorController`'s existing `catch (Throwable $th)` → 500 Thai-message behavior — that's out of scope here.
- Every `UpdateVendorContactData` property except `id` must stay required-with-no-default (matches existing convention — the frontend always sends those keys). Only `id` gets a `= null` default, and it must be the **last** constructor parameter — PHP raises a deprecation warning if an optional parameter is declared before a required one.
- No delete-contact endpoint work (`DeleteContactDialog` frontend component stays a placeholder — out of scope).
- Backend: after editing any `.php` file, run `vendor/bin/pint --dirty --format agent` before committing.
- Backend tests: `php artisan test --compact <path>` or `--filter=<name>`, run from `backend/`.
- Frontend: no test runner configured (`package.json` has only `dev`/`build`/`start`/`lint`). Verify with `npx tsc --noEmit` and `npm run lint`, run from `frontend/`.
- File paths below are relative to the repo root (`d:\E-Procurement-System\`); backend commands run with cwd `backend/`, frontend commands with cwd `frontend/`.

---

### Task 1: Accept optional `id` on the vendor contact request

**Files:**
- Modify: `backend/app/Modules/Vendor/Presentation/Http/Requests/UpdateVendorContactRequest.php`
- Modify: `backend/app/Modules/Vendor/Application/DTOs/UpdateVendorContactData.php`
- Test: `backend/tests/Feature/Modules/Vendor/UpdateVendorContactTest.php`

**Interfaces:**
- Produces (used by Task 3): `UpdateVendorContactData::$id` — `?int`, defaults to `null` when absent from input.

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/Feature/Modules/Vendor/UpdateVendorContactTest.php` (after the existing `'contact name is required...'` test, still inside the same file — no new imports needed, `contactPayload()` already exists above):

```php
test('id must be an integer when updating vendor contact', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $repository->saveProfile(VendorProfile::create(userId: $user->id));
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/vendor/contact', contactPayload(['id' => 'not-a-number']));

    $response->assertStatus(422)->assertJsonValidationErrors('id');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `backend/`): `php artisan test --compact --filter="id must be an integer when updating vendor contact"`
Expected: FAIL — response status is 200, not 422 (there is no `id` validation rule yet, so the extra field is silently ignored).

- [ ] **Step 3: Add the validation rule and DTO field**

In `backend/app/Modules/Vendor/Presentation/Http/Requests/UpdateVendorContactRequest.php`, add `'id'` as the first rule:

```php
    public function rules(): array
    {
        return [
            'id' => ['nullable', 'integer'],
            'contactName' => ['required', 'string', 'max:255'],
            'contactPosition' => ['nullable', 'string', 'max:255'],
            'contactPhone' => ['nullable', 'digits_between:9,10'],
            'contactEmail' => ['nullable', 'email', 'max:255'],
            'lineId' => ['nullable', 'string', 'max:255'],
            'otherContact' => ['nullable', 'string', 'max:255'],
            'isMainContact' => ['required', 'boolean'],
        ];
    }
```

Replace the full contents of `backend/app/Modules/Vendor/Application/DTOs/UpdateVendorContactData.php`:

```php
<?php

namespace App\Modules\Vendor\Application\DTOs;

use Spatie\LaravelData\Data;

final class UpdateVendorContactData extends Data
{
    public function __construct(
        public readonly string $contactName,
        public readonly ?string $contactPosition,
        public readonly ?string $contactPhone,
        public readonly ?string $contactEmail,
        public readonly ?string $lineId,
        public readonly ?string $otherContact,
        public readonly bool $isMainContact,
        public readonly ?int $id = null,
    ) {}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `backend/`): `php artisan test --compact --filter="id must be an integer when updating vendor contact"`
Expected: PASS

- [ ] **Step 5: Run the full contact feature test file to check for regressions**

Run (from `backend/`): `php artisan test --compact tests/Feature/Modules/Vendor/UpdateVendorContactTest.php`
Expected: PASS (all tests, including the pre-existing ones)

- [ ] **Step 6: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Presentation/Http/Requests/UpdateVendorContactRequest.php app/Modules/Vendor/Application/DTOs/UpdateVendorContactData.php tests/Feature/Modules/Vendor/UpdateVendorContactTest.php
git commit -m "feat(vendor): accept optional contact id on contact update request"
```

---

### Task 2: Expose `id` in the vendor contact API response

**Files:**
- Modify: `backend/app/Modules/Vendor/Presentation/Http/Resources/VendorContactResource.php`
- Test: `backend/tests/Feature/Modules/Vendor/UpdateVendorContactTest.php`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces (used by Task 4): `data.contact[].id` (integer) in the JSON response of `POST /api/v1/vendor/contact` (and anywhere else `VendorContactResource`/`VendorProfileResource` is used).

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/Feature/Modules/Vendor/UpdateVendorContactTest.php`:

```php
test('vendor contact response includes the contact id', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $contact = $repository->saveContact(VendorContact::create(
        vendorProfileId: $profile->id(),
        contactName: 'Jane Doe',
        contactPosition: 'Manager',
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('contact@company.com'),
        lineId: 'acme-co',
        otherContact: null,
        isMainContact: true,
    ));

    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/vendor/contact', contactPayload(['id' => $contact->id()]));

    $response->assertOk()->assertJsonPath('data.contact.0.id', $contact->id());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `backend/`): `php artisan test --compact --filter="vendor contact response includes the contact id"`
Expected: FAIL — `data.contact.0.id` does not exist in the response yet.

- [ ] **Step 3: Add `id` to the resource**

Replace the `toArray()` method body in `backend/app/Modules/Vendor/Presentation/Http/Resources/VendorContactResource.php`:

```php
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'contactName' => $this->contact_name,
            'contactPosition' => $this->contact_position,
            'contactPhone' => $this->contact_phone,
            'contactEmail' => $this->contact_email,
            'lineId' => $this->line_id,
            'otherContact' => $this->other_contact,
            'isMainContact' => $this->is_main_contact,
        ];
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `backend/`): `php artisan test --compact --filter="vendor contact response includes the contact id"`
Expected: PASS

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Presentation/Http/Resources/VendorContactResource.php tests/Feature/Modules/Vendor/UpdateVendorContactTest.php
git commit -m "feat(vendor): include contact id in vendor contact resource"
```

---

### Task 3: Make the use case select a contact by id

**Files:**
- Modify: `backend/app/Modules/Vendor/Application/UseCases/UpdateVendorContactUseCase.php`
- Test: `backend/tests/Feature/Modules/Vendor/UpdateVendorContactUseCaseTest.php`

**Interfaces:**
- Consumes: `UpdateVendorContactData::$id` from Task 1.
- Produces: no public interface change — `execute(int $vendorProfileId, UpdateVendorContactData $data): void` keeps the same signature; behavior changes as described below.

- [ ] **Step 1: Replace the test file with the updated + new test cases**

Replace the full contents of `backend/tests/Feature/Modules/Vendor/UpdateVendorContactUseCaseTest.php`:

```php
<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\DTOs\UpdateVendorContactData;
use App\Modules\Vendor\Application\UseCases\UpdateVendorContactUseCase;
use App\Modules\Vendor\Domain\Entities\VendorContact;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function updateVendorContactUseCase(): UpdateVendorContactUseCase
{
    return app(UpdateVendorContactUseCase::class);
}

function contactData(array $overrides = []): UpdateVendorContactData
{
    return UpdateVendorContactData::from(array_merge([
        'id' => null,
        'contactName' => 'Jane Smith',
        'contactPosition' => 'Director',
        'contactPhone' => '0898765432',
        'contactEmail' => 'jane.smith@company.com',
        'lineId' => 'jane-smith',
        'otherContact' => null,
        'isMainContact' => true,
    ], $overrides));
}

test('execute updates the contact matching the given id', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $contact = $repository->saveContact(VendorContact::create(
        vendorProfileId: $profile->id(),
        contactName: 'Jane Doe',
        contactPosition: 'Manager',
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('contact@company.com'),
        lineId: 'acme-co',
        otherContact: null,
        isMainContact: true,
    ));

    updateVendorContactUseCase()->execute($profile->id(), contactData(['id' => $contact->id()]));

    $this->assertDatabaseHas('vendor_contact', [
        'id' => $contact->id(),
        'vendor_profile_id' => $profile->id(),
        'contact_name' => 'Jane Smith',
        'contact_position' => 'Director',
        'contact_phone' => '0898765432',
        'contact_email' => 'jane.smith@company.com',
    ]);

    $this->assertDatabaseCount('vendor_contact', 1);
});

test('execute updates only the contact matching the given id, not other contacts', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $first = $repository->saveContact(VendorContact::create(
        vendorProfileId: $profile->id(),
        contactName: 'First Contact',
        contactPosition: 'Manager',
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('first@company.com'),
        lineId: null,
        otherContact: null,
        isMainContact: true,
    ));

    $second = $repository->saveContact(VendorContact::create(
        vendorProfileId: $profile->id(),
        contactName: 'Second Contact',
        contactPosition: 'Staff',
        contactPhone: PhoneNumber::fromString('0898765432'),
        contactEmail: Email::fromString('second@company.com'),
        lineId: null,
        otherContact: null,
        isMainContact: false,
    ));

    updateVendorContactUseCase()->execute($profile->id(), contactData([
        'id' => $second->id(),
        'contactName' => 'Second Contact Updated',
    ]));

    $this->assertDatabaseHas('vendor_contact', [
        'id' => $first->id(),
        'contact_name' => 'First Contact',
    ]);

    $this->assertDatabaseHas('vendor_contact', [
        'id' => $second->id(),
        'contact_name' => 'Second Contact Updated',
    ]);

    $this->assertDatabaseCount('vendor_contact', 2);
});

test('execute creates a contact when no id is given', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    updateVendorContactUseCase()->execute($profile->id(), contactData());

    $this->assertDatabaseHas('vendor_contact', [
        'vendor_profile_id' => $profile->id(),
        'contact_name' => 'Jane Smith',
    ]);

    $this->assertDatabaseCount('vendor_contact', 1);
});

test('execute creates a new contact when id is omitted even if one already exists', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $repository->saveContact(VendorContact::create(
        vendorProfileId: $profile->id(),
        contactName: 'Existing Contact',
        contactPosition: 'Manager',
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('existing@company.com'),
        lineId: null,
        otherContact: null,
        isMainContact: true,
    ));

    updateVendorContactUseCase()->execute($profile->id(), contactData(['isMainContact' => false]));

    $this->assertDatabaseHas('vendor_contact', ['contact_name' => 'Existing Contact']);
    $this->assertDatabaseHas('vendor_contact', ['contact_name' => 'Jane Smith']);
    $this->assertDatabaseCount('vendor_contact', 2);
});

test('execute allows clearing the optional phone and email', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $contact = $repository->saveContact(VendorContact::create(
        vendorProfileId: $profile->id(),
        contactName: 'Jane Doe',
        contactPosition: 'Manager',
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('contact@company.com'),
        lineId: 'acme-co',
        otherContact: null,
        isMainContact: true,
    ));

    updateVendorContactUseCase()->execute($profile->id(), contactData([
        'id' => $contact->id(),
        'contactPhone' => null,
        'contactEmail' => null,
    ]));

    $this->assertDatabaseHas('vendor_contact', [
        'vendor_profile_id' => $profile->id(),
        'contact_phone' => null,
        'contact_email' => null,
    ]);
});

test('execute throws when the given id does not belong to the vendor profile', function () {
    $ownerUser = User::factory()->create(['user_type' => 'company']);
    $otherUser = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $ownerProfile = $repository->saveProfile(VendorProfile::create(userId: $ownerUser->id));
    $otherProfile = $repository->saveProfile(VendorProfile::create(userId: $otherUser->id));

    $otherContact = $repository->saveContact(VendorContact::create(
        vendorProfileId: $otherProfile->id(),
        contactName: 'Other Vendor Contact',
        contactPosition: 'Manager',
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('other@company.com'),
        lineId: null,
        otherContact: null,
        isMainContact: true,
    ));

    expect(fn () => updateVendorContactUseCase()->execute(
        $ownerProfile->id(),
        contactData(['id' => $otherContact->id()]),
    ))->toThrow(ModelNotFoundException::class);

    $this->assertDatabaseHas('vendor_contact', [
        'id' => $otherContact->id(),
        'contact_name' => 'Other Vendor Contact',
    ]);
});
```

- [ ] **Step 2: Run tests to verify the new/changed ones fail**

Run (from `backend/`): `php artisan test --compact tests/Feature/Modules/Vendor/UpdateVendorContactUseCaseTest.php`
Expected: FAIL on these 3 (the use case still ignores `$data->id` and always picks `findContactsByVendorProfileId(...)[0]`):
  - `execute updates only the contact matching the given id, not other contacts` (updates `$first` instead of `$second`)
  - `execute creates a new contact when id is omitted even if one already exists` (updates the existing row instead of creating a second one — count stays 1, not 2)
  - `execute throws when the given id does not belong to the vendor profile` (no exception is thrown — a brand new contact gets created for `$ownerProfile` instead)

- [ ] **Step 3: Implement the id-aware use case**

Replace the full contents of `backend/app/Modules/Vendor/Application/UseCases/UpdateVendorContactUseCase.php`:

```php
<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Vendor\Application\DTOs\UpdateVendorContactData;
use App\Modules\Vendor\Domain\Entities\VendorContact;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use App\Shared\Support\ChangeLogger;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

final class UpdateVendorContactUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly ChangeLogger $changeLogger,
    ) {}

    public function execute(int $vendorProfileId, UpdateVendorContactData $data): void
    {
        DB::transaction(function () use ($vendorProfileId, $data): void {
            $contactPhone = $data->contactPhone !== null ? PhoneNumber::fromString($data->contactPhone) : null;
            $contactEmail = $data->contactEmail !== null ? Email::fromString($data->contactEmail) : null;

            if ($data->id === null) {
                $this->vendors->saveContact(VendorContact::create(
                    vendorProfileId: $vendorProfileId,
                    contactName: $data->contactName,
                    contactPosition: $data->contactPosition,
                    contactPhone: $contactPhone,
                    contactEmail: $contactEmail,
                    lineId: $data->lineId,
                    otherContact: $data->otherContact,
                    isMainContact: $data->isMainContact,
                ));

                app_log('Vendor contact created via contact update', [
                    'vendor_profile_id' => $vendorProfileId,
                ], 'info', 'vendor');

                return;
            }

            $existing = $this->findOwnedContact($vendorProfileId, $data->id);

            if ($existing === null) {
                throw new ModelNotFoundException(
                    "Vendor contact {$data->id} not found for vendor profile {$vendorProfileId}."
                );
            }

            $before = [
                'contactName' => $existing->contactName(),
                'contactPosition' => $existing->contactPosition(),
                'contactPhone' => $existing->contactPhone()?->value,
                'contactEmail' => $existing->contactEmail()?->value,
                'lineId' => $existing->lineId(),
                'otherContact' => $existing->otherContact(),
                'isMainContact' => $existing->isMainContact(),
            ];

            $existing->update(
                contactName: $data->contactName,
                contactPosition: $data->contactPosition,
                contactPhone: $contactPhone,
                contactEmail: $contactEmail,
                lineId: $data->lineId,
                otherContact: $data->otherContact,
                isMainContact: $data->isMainContact,
            );

            $this->vendors->saveContact($existing);

            $this->changeLogger->log(
                message: 'Vendor contact updated',
                before: $before,
                after: [
                    'contactName' => $data->contactName,
                    'contactPosition' => $data->contactPosition,
                    'contactPhone' => $contactPhone?->value,
                    'contactEmail' => $contactEmail?->value,
                    'lineId' => $data->lineId,
                    'otherContact' => $data->otherContact,
                    'isMainContact' => $data->isMainContact,
                ],
                context: ['vendor_profile_id' => $vendorProfileId, 'contact_id' => $existing->id()],
                channel: 'vendor',
            );
        });
    }

    private function findOwnedContact(int $vendorProfileId, int $contactId): ?VendorContact
    {
        foreach ($this->vendors->findContactsByVendorProfileId($vendorProfileId) as $contact) {
            if ($contact->id() === $contactId) {
                return $contact;
            }
        }

        return null;
    }
}
```

- [ ] **Step 4: Run tests to verify they all pass**

Run (from `backend/`): `php artisan test --compact tests/Feature/Modules/Vendor/UpdateVendorContactUseCaseTest.php`
Expected: PASS (all 7 tests)

- [ ] **Step 5: Run the full vendor test suite to check for regressions**

Run (from `backend/`): `php artisan test --compact --filter=Vendor`
Expected: PASS (all vendor feature/unit tests, including `UpdateVendorContactTest.php` from Tasks 1–2)

- [ ] **Step 6: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Modules/Vendor/Application/UseCases/UpdateVendorContactUseCase.php tests/Feature/Modules/Vendor/UpdateVendorContactUseCaseTest.php
git commit -m "feat(vendor): update the contact matching the given id instead of the first one"
```

---

### Task 4: Send the contact id when editing on the frontend

**Files:**
- Modify: `frontend/lib/vendor/types.ts:42-50` (`VendorContact`) and `:66-74` (`UpdateVendorContactPayload`)
- Modify: `frontend/app/(public)/profiles/contract/_schemas/schema.ts`
- Modify: `frontend/app/(public)/profiles/contract/_components/edit-contact-dialog.tsx:16-25`

**Interfaces:**
- Consumes: `data.contact[].id` from Task 2, `id` field accepted by the update endpoint from Task 1/3.
- Produces: `EditContactDialog` submits use `id` in `UpdateVendorContactPayload`, so `useUpdateVendorContact` (`frontend/lib/vendor/mutations.ts:30-36`, unchanged) posts it through to the backend.

- [ ] **Step 1: Add `id` to the `VendorContact` and `UpdateVendorContactPayload` types**

In `frontend/lib/vendor/types.ts`, replace the `VendorContact` interface:

```ts
export interface VendorContact {
  id: number;
  contactName: string;
  contactPosition: string;
  contactPhone: string;
  contactEmail: string;
  lineId: string;
  otherContact: string;
  isMainContact: string;
}
```

And replace the `UpdateVendorContactPayload` interface:

```ts
export interface UpdateVendorContactPayload {
  id?: number;
  contactName: string;
  contactPosition?: string;
  contactPhone?: string;
  contactEmail?: string;
  lineId?: string;
  otherContact?: string;
  isMainContact: boolean;
}
```

- [ ] **Step 2: Add `id` to `AddContactSchema`**

In `frontend/app/(public)/profiles/contract/_schemas/schema.ts`, replace the schema:

```ts
export const AddContactSchema = z.object({
  id: z.number().optional(),
  contactName: z.string().min(1, "กรุณากรอกชื่อผู้ติดต่อ"),
  contactPosition: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.union([z.literal(""), z.email("อีเมลไม่ถูกต้อง")]).optional(),
  lineId: z.string().optional(),
  otherContact: z.string().optional(),
  isMainContact: z.boolean(),
});
```

- [ ] **Step 3: Pass the contact id as an initial value when editing**

In `frontend/app/(public)/profiles/contract/_components/edit-contact-dialog.tsx`, replace the `useAddContactForm(...)` call:

```tsx
  const { register, control, onSubmit, reset, isSubmitting, formState: { errors } } =
    useAddContactForm(() => setOpen(false), {
      id: contact.id,
      contactName: contact.contactName ?? "",
      contactPosition: contact.contactPosition ?? "",
      contactPhone: contact.contactPhone ?? "",
      contactEmail: contact.contactEmail ?? "",
      lineId: contact.lineId ?? "",
      otherContact: contact.otherContact ?? "",
      isMainContact: Boolean(contact.isMainContact),
    });
```

`AddContactDialog` and `useAddContactForm` need no changes: `AddContactDialog` never passes `initialValues`, so its `defaultValues` object still has no `id` key at all, which means nothing is sent for `id` on create — the backend creates a new contact as before.

- [ ] **Step 4: Typecheck**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: No errors referencing `lib/vendor/types.ts`, `app/(public)/profiles/contract/_schemas/schema.ts`, or `app/(public)/profiles/contract/_components/edit-contact-dialog.tsx`.

- [ ] **Step 5: Lint**

Run (from `frontend/`): `npm run lint`
Expected: No new lint errors/warnings for these files.

- [ ] **Step 6: Commit**

```bash
git add lib/vendor/types.ts "app/(public)/profiles/contract/_schemas/schema.ts" "app/(public)/profiles/contract/_components/edit-contact-dialog.tsx"
git commit -m "feat(vendor): send contact id when editing a vendor contact"
```

---

### Task 5: Manual end-to-end verification

No code changes — this confirms Tasks 1–4 work together in the running app (per project convention: UI changes must be exercised in a real browser, not just type-checked).

- [ ] **Step 1: Start both dev servers**

Run (from `backend/`): `php artisan serve` (or `composer run dev` if that's the existing convention for this repo)
Run (from `frontend/`): `npm run dev`

- [ ] **Step 2: Log in as a vendor user and open the "ผู้ติดต่อ" (contact) tab**

Navigate to the vendor profile contact page (`/profiles/contract` or equivalent per `frontend/app/(public)/profiles/contract/page.tsx`).

- [ ] **Step 3: Verify "add" always creates a new contact**

With at least one existing contact, click "เพิ่มผู้ติดต่อ" and submit a new contact. Confirm the existing contact's data is unchanged and a second contact now appears in the list.

- [ ] **Step 4: Verify "edit" only changes the targeted contact**

With two or more contacts, click edit (pencil icon) on the **second** contact, change its name, and submit. Confirm only that contact's name changed in the list — the first contact's data is untouched.

- [ ] **Step 5: Confirm no console/network errors**

Check the browser console and network tab during both actions above — the `POST /api/v1/vendor/contact` request should return 200 in both cases.
