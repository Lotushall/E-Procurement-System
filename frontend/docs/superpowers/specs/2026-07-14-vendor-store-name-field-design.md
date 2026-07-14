# Vendor `store_name` Field (Individual Registration)

## Context

While adding a "ชื่อร้านค้า" (store name) field to the individual-vendor tab of the
register form, two problems surfaced:

1. The new frontend input was wired to the wrong form field (`register("fullName")`,
   copy-pasted from the field above it), so it silently overwrote the ชื่อ-นามสกุล value
   instead of capturing its own data.
2. A `store_name` column was added directly to `vendor_individual_details` in
   `0001_01_01_000000_create_users_table.php`, as `NOT NULL`. It is not wired to any
   domain entity, repository, DTO, or use case. As-is, submitting the individual
   registration form would fail on insert (`NOT NULL` constraint violation) because
   nothing ever populates it.

Investigation found the backend already has an equivalent concept, `shop_name`
(nullable), fully wired through the domain layer from a prior effort
(`2026-07-10-user-vendor-domain-entities`) — `VendorIndividualDetail` entity,
`VendorIndividualDetails` Eloquent model, `VendorRepository` — but it was never
actually populated by registration; `RegisterVendorUseCase` hardcodes `shopName: null`.

**Decision (confirmed with user):** `store_name` and `shop_name` refer to the same
concept. Rather than keep both, rename `shop_name` → `store_name` throughout the
backend, and make it a **required** field for individual-vendor registration (not
nullable, matching the column the user already added).

## Scope

End-to-end wiring of `store_name` as a required field on the individual-vendor
registration path, plus fixing the pre-existing broken frontend binding. Renames the
existing `shop_name` concept; does not introduce a second field.

Out of scope: exposing `store_name` on `AuthenticatedUserResource` / `CurrentUser`
(profile viewing) — it isn't exposed there today for the individual profile either
(only `companyName`/`firstname`/`lastname` are), so this is a pre-existing gap
unrelated to registration and can be a separate follow-up if needed.

## Backend Changes

1. **Migration** `database/migrations/0001_01_01_000000_create_users_table.php`
   - Remove the duplicate `store_name` column that was added directly.
   - Rename the existing `shop_name` column to `store_name` and drop `->nullable()`
     (required, `NOT NULL`).

2. **Domain entity** `app/Modules/Vendor/Domain/Entities/VendorIndividualDetail.php`
   - Rename `shopName` → `storeName` everywhere: constructor property, `create()`,
     `reconstitute()`, `update()` params, and the `shopName()` getter → `storeName()`.

3. **Eloquent model** `app/Modules/Vendor/Infrastructure/Models/VendorIndividualDetails.php`
   - Update `#[Fillable]`: `shop_name` → `store_name`.

4. **Repository** `app/Modules/Vendor/Infrastructure/Repositories/VendorRepository.php`
   - Update both mapping directions: `$model->shop_name = $detail->shopName();` and
     `shopName: $model->shop_name` → the `store_name`/`storeName` equivalents.

5. **DTO** `app/Modules/Auth/Application/DTOs/RegisterVendorData.php`
   - Add `public readonly ?string $storeName` (nullable at the DTO level like
     `fullName`/`idCard`, since it doesn't apply to company registrations —
     "required" is enforced by request validation, not the type).

6. **Request** `app/Modules/Auth/Presentation/Http/Requests/RegisterRequest.php`
   - Add rule: `'storeName' => ['required_if:vendorType,individual', 'nullable', 'string', 'max:255']`
     (same pattern as `fullName`).

7. **Use case** `app/Modules/Auth/Application/UseCases/RegisterVendorUseCase.php`
   - Replace the hardcoded `shopName: null` with `storeName: $data->storeName`.

8. **Tests / docs** — update references to `shopName`/`shop_name` to `storeName`/`store_name`:
   - `tests/Unit/Domain/Vendor/Entities/VendorIndividualDetailTest.php`
   - `tests/Feature/Modules/Vendor/VendorRepositoryTest.php`
   - `docs/superpowers/specs/2026-07-10-user-vendor-domain-entities-design.md` (line ~261)

## Frontend Changes

1. **Schema** `app/(auth)/register/_schemas/schema.ts`
   - Add `storeName: z.string().optional()` to the base object.
   - In `superRefine`, under the `individual` branch, require it:
     `if (!data.storeName?.trim()) ctx.addIssue(...)`.

2. **Hook** `app/(auth)/register/_hooks/use-register-form.ts`
   - Add `storeName: ""` to `defaultValues`.
   - Include `storeName: values.storeName` in the individual branch of
     `toRegisterPayload` (alongside `fullName`/`idCard`).
   - Fix the `RegisterVendorPayload` import: it currently points to
     `@/lib/vendor/types`, an empty file with no such export. Point it to
     `@/lib/auth/types`, where `RegisterVendorPayload` is actually defined
     (pre-existing bug, unrelated to `store_name`, but touched in this same file).

3. **Types** `lib/auth/types.ts`
   - Add `storeName?: string` to `RegisterVendorPayload`.

4. **Register page** `app/(auth)/register/page.tsx` (~line 234)
   - Change the "ชื่อร้านค้า" input from `register("fullName")` /
     `errors.fullName?.message` (duplicate of the field above it) to
     `register("storeName")` / `errors.storeName?.message`.
   - Update the placeholder to something store-name-appropriate (e.g.
     `"เช่น ร้านสมชายวัสดุก่อสร้าง"`).

## Testing

- Backend: update the two existing Pest tests that reference `shopName` to use
  `storeName`; run the Vendor and Auth test suites.
- Frontend: manually verify the individual-registration tab — submitting without a
  store name shows a validation error; submitting with one succeeds and the value is
  no longer clobbering ชื่อ-นามสกุล.
