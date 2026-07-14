# Vendor `store_name` Field (Individual Registration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the "ชื่อร้านค้า" (store name) field on the individual-vendor register form to its own `storeName` value end-to-end, instead of silently overwriting the ชื่อ–นามสกุล (`fullName`) field.

**Architecture:** `react-hook-form` + Zod on the frontend collect `storeName` as a required field when `vendorType === "individual"`, and send it to the backend as part of the existing `POST /api/v1/auth/register` payload. No new components; this extends the existing register form (schema → hook → page) and the existing `RegisterVendorPayload` type.

**Tech Stack:** Next.js (App Router), react-hook-form, `@hookform/resolvers/zod`, Zod v4, TypeScript.

## Global Constraints

- Spec doc: `docs/superpowers/specs/2026-07-14-vendor-store-name-field-design.md`.
- `storeName` is **required** when `vendorType === "individual"`; not applicable/not sent for `company`. This mirrors the existing `fullName`/`idCard` pattern in this form.
- The frontend has **no automated test runner** (`package.json` has no `test` script, no Jest/Vitest/RTL installed). Verification for this plan is: `npx tsc --noEmit` after each code task (catches type errors immediately), plus a full manual walkthrough in the dev server as the final task. Do not introduce a new test framework as part of this plan — out of scope.
- **Backend is already fully implemented** (verified via `git diff` before writing this plan): migration, domain entity, Eloquent model, repository, DTO, `RegisterRequest` validation, `RegisterVendorUseCase`, and both unit/feature Pest tests already use `storeName`/`store_name` end-to-end, matching the spec exactly. **Do not re-implement or modify backend files** — Task 4's verification step confirms the backend side with `php artisan test`, nothing more.

---

### Task 1: Add `storeName` to `RegisterVendorPayload`

**Files:**
- Modify: `lib/auth/types.ts:16-31`

**Interfaces:**
- Produces: `RegisterVendorPayload.storeName?: string` — consumed by Task 3 (`toRegisterPayload`) and by `lib/auth/api.ts#register` (already typed as `RegisterVendorPayload`, needs no change).

- [ ] **Step 1: Add the field**

In `lib/auth/types.ts`, add `storeName?: string;` to the `RegisterVendorPayload` interface, right after `idCard?: string;`:

```ts
export interface RegisterVendorPayload {
  vendorType: "company" | "individual";
  companyName?: string;
  taxId?: string;
  fullName?: string;
  idCard?: string;
  storeName?: string;
  phone: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  // Duplicated from confirmPassword: Laravel's `confirmed` rule on the
  // backend looks for `password_confirmation` specifically.
  password_confirmation: string;
  terms: boolean;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (this is an additive optional field; any pre-existing unrelated errors are not in scope).

- [ ] **Step 3: Commit**

```bash
git add lib/auth/types.ts
git commit -m "feat(auth): add storeName to RegisterVendorPayload"
```

---

### Task 2: Add `storeName` to the register Zod schema

**Files:**
- Modify: `app/(auth)/register/_schemas/schema.ts:25-68`

**Interfaces:**
- Consumes: nothing new.
- Produces: `RegisterValues.storeName?: string` (via `z.infer<typeof RegisterSchema>`) — consumed by Task 3 (defaultValues, `toRegisterPayload`) and Task 4 (`register("storeName")`, `errors.storeName`).

- [ ] **Step 1: Add the field to the base object**

In `app/(auth)/register/_schemas/schema.ts`, add `storeName: z.string().optional(),` to the `z.object({...})` block, right after `idCard: z.string().optional(),`:

```ts
export const RegisterSchema = z
    .object({
        vendorType: z.enum(["company", "individual"]),
        companyName: z.string().optional(),
        taxId: z.string().optional(),
        fullName: z.string().optional(),
        idCard: z.string().optional(),
        storeName: z.string().optional(),
        phone: z.string().min(1, "กรุณากรอกเบอร์ติดต่อ"),
        username: z.string().min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"),
        email: z.email("อีเมลไม่ถูกต้อง").min(1, "กรุณากรอกอีเมล"),
        password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
        confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
        terms: z.boolean(),
    })
```

- [ ] **Step 2: Require it in the individual branch of `superRefine`**

In the same file, add a check inside the `else` branch (the `individual` branch) of `superRefine`, alongside the existing `fullName` check:

```ts
        } else {
            if (!data.fullName?.trim()) {
                ctx.addIssue({ code: "custom", message: "กรุณากรอกชื่อ – นามสกุล", path: ["fullName"] });
            }
            if (!data.storeName?.trim()) {
                ctx.addIssue({ code: "custom", message: "กรุณากรอกชื่อร้านค้า", path: ["storeName"] });
            }
            if (digitsOnly(data.idCard ?? "").length !== 13) {
                ctx.addIssue({ code: "custom", message: "เลขบัตรประชาชนต้องมี 13 หลัก", path: ["idCard"] });
            }
        }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add "app/(auth)/register/_schemas/schema.ts"
git commit -m "feat(auth): require storeName for individual vendor registration"
```

---

### Task 3: Wire `storeName` through the register form hook

**Files:**
- Modify: `app/(auth)/register/_hooks/use-register-form.ts`

**Interfaces:**
- Consumes: `RegisterVendorPayload` from `@/lib/auth/types` (Task 1), `RegisterValues`/`RegisterSchema` from `../_schemas/schema` (Task 2).
- Produces: `useRegisterForm()` return value unchanged in shape; `toRegisterPayload` now includes `storeName` for individual submissions.

- [ ] **Step 1: Fix the broken payload-type import**

`use-register-form.ts` currently imports `RegisterVendorPayload` from `@/lib/vendor/types`, an empty file with no such export (pre-existing bug, unrelated to `store_name`, but this file needs editing anyway). Change line 7:

```ts
import type { RegisterVendorPayload } from "@/lib/vendor/types";
```

to:

```ts
import type { RegisterVendorPayload } from "@/lib/auth/types";
```

- [ ] **Step 2: Include `storeName` in the submitted payload**

In `toRegisterPayload`, add `storeName: values.storeName` to the individual branch:

```ts
function toRegisterPayload(values: RegisterValues): RegisterVendorPayload {
  return {
    vendorType: values.vendorType,
    ...(values.vendorType === "company"
      ? { companyName: values.companyName, taxId: values.taxId }
      : { fullName: values.fullName, idCard: values.idCard, storeName: values.storeName }),
    phone: values.phone,
    username: values.username,
    email: values.email,
    password: values.password,
    confirmPassword: values.confirmPassword,
    password_confirmation: values.confirmPassword,
    terms: values.terms,
  };
}
```

- [ ] **Step 3: Add `storeName` to the form's `defaultValues`**

In the `useForm<RegisterValues>({...})` call, add `storeName: ""` after `idCard: ""`:

```ts
  const form = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      vendorType: "company",
      companyName: "",
      taxId: "",
      fullName: "",
      idCard: "",
      storeName: "",
      phone: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. This also confirms the `@/lib/vendor/types` import-fix compiles cleanly.

- [ ] **Step 5: Commit**

```bash
git add "app/(auth)/register/_hooks/use-register-form.ts"
git commit -m "fix(auth): wire storeName into register payload, fix payload type import"
```

---

### Task 4: Fix the store-name input binding on the register page, and verify end-to-end

**Files:**
- Modify: `app/(auth)/register/page.tsx:234-241`

**Interfaces:**
- Consumes: `register`, `errors` from `useRegisterForm()` (unchanged shape, now typed with `storeName` per Task 2/3).

- [ ] **Step 1: Fix the duplicated field binding**

The "ชื่อร้านค้า" input currently binds to `register("fullName")` / `errors.fullName?.message` — a copy-paste of the ชื่อ–นามสกุล field above it, which clobbers `fullName` instead of capturing its own value. Replace it:

```tsx
                            <InputField label="ชื่อร้านค้า" labelClassName="font-semibold tracking-wider" error={errors.storeName?.message}>
                                <Input
                                    {...register("storeName")}
                                    aria-invalid={!!errors.storeName}
                                    placeholder="เช่น ร้านสมชายวัสดุก่อสร้าง"
                                    className="h-10.5 rounded-md"
                                />
                            </InputField>
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no new errors.

Run: `npm run lint`
Expected: no new errors on the touched files.

- [ ] **Step 3: Manual verification in the dev server**

Run: `npm run dev`, open the register page (`/register` or wherever `routes.login`'s sibling register route resolves — check `lib/routes.ts` if unsure), select the "บุคคลธรรมดา" (individual) tab, and check:

1. Fill in ชื่อ–นามสกุล with one value (e.g. "สมชาย ใจดี") and leave ชื่อร้านค้า empty, fill the rest of the required fields, accept terms, submit. Expect a validation error under ชื่อร้านค้า reading "กรุณากรอกชื่อร้านค้า", and the ชื่อ–นามสกุล value must still show "สมชาย ใจดี" (not blank, not overwritten).
2. Fill in ชื่อร้านค้า with a different value (e.g. "ร้านสมชายวัสดุก่อสร้าง") and submit with all required fields valid. Expect the request to succeed (redirect to the "กรุณายืนยันอีเมลของคุณ" screen) — open the Network tab and confirm the `POST /api/v1/auth/register` request body includes both `"fullName": "สมชาย ใจดี"` and `"storeName": "ร้านสมชายวัสดุก่อสร้าง"` as distinct values.
3. Switch to the "นิติบุคคล" (company) tab and submit a valid company registration. Expect it to succeed with no `storeName` validation error (confirms the individual-only `superRefine` branch doesn't leak into the company path).

- [ ] **Step 4: Confirm the backend side (already implemented) still passes**

Run (from `backend/`): `php artisan test --filter=Register`
Expected: PASS — this exercises `RegisterTest.php` and `RegisterVendorUseCaseTest.php`, which already assert `storeName` is persisted and required for individual vendors, and not required for company vendors.

- [ ] **Step 5: Commit**

```bash
git add "app/(auth)/register/page.tsx"
git commit -m "fix(auth): bind store-name input to its own field instead of fullName"
```
