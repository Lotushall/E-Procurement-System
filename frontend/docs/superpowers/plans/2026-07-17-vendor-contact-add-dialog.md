# Add Contact Dialog (Vendor Contract Page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain-text `เพิ่มผู้ติดต่อ` placeholder in the vendor "ผู้ติดต่อ" (contract) tab with a working dialog containing a validated add-contact form. Submit is UI-only for now (no backend endpoint exists yet) — a valid submit closes the dialog and resets it.

**Architecture:** A route-scoped zod schema (`_schemas/schema.ts`) defines the contact fields and Thai validation messages. A route-scoped hook (`_hooks/use-add-contact-form.ts`) wraps `react-hook-form` + `zodResolver` around that schema, exposing `register`/`formState`/`reset`/`onSubmit`. A self-contained dialog component (`_components/add-contact-dialog.tsx`) renders the trigger button and the form using the existing `Dialog` primitives and `InputField`, and lifts `open` state so it can close itself after a valid submit. `contract/page.tsx` swaps its placeholder text for this component. This mirrors the existing `app/(auth)/login/` form convention exactly (same three-file split, same libraries).

**Tech Stack:** Next.js (App Router, client components), `react-hook-form` + `@hookform/resolvers/zod` + `zod` (all already in `package.json`, no install needed), `components/ui/dialog.tsx` (Base UI-backed, already exists and already used in `app/(auth)/register/page.tsx`), Tailwind v4.

## Global Constraints

- No test runner is configured in this repo (`package.json` has no vitest/jest/playwright, no `*.test.ts` files exist). Do not add a test framework. Verification is `tsc --noEmit`, `npm run lint`, and manual browser checks via the dev server.
- Follow the existing form convention verbatim: route-scoped `_schemas/schema.ts` (zod object + inferred `z.infer` type) + route-scoped `_hooks/use-<name>-form.ts` (wraps `useForm` with `zodResolver`, returns `{ ...form, onSubmit }`) + component using `register(...)` and `error={errors.field?.message}` through the existing `InputField`. Reference: `app/(auth)/login/_schemas/schema.ts`, `app/(auth)/login/_hooks/use-login-form.ts`, `app/(auth)/login/page.tsx`.
- `VendorContact`'s `isMainContact` field is intentionally excluded from the form — the relation is `hasOne` (one contact per vendor), so "main contact" has no meaning yet. Do not add it.
- No backend endpoint exists for creating a contact. Do not add an API call or `useMutation` — a valid submit only calls `form.reset()` and closes the dialog (via the `onSubmitted` callback). `console.log(values)` stands in as the only side effect.
- Required fields: `contactName`, `contactPhone`, `contactEmail` (matches `sidebar.tsx`'s existing `hasIncompleteContact` check). Optional: `contactPosition`, `lineId`, `otherContact`.

---

### Task 1: Contact form schema

**Files:**
- Create: `app/(public)/profiles/contract/_schemas/schema.ts`

**Interfaces:**
- Consumes: `zod` (`z`), already a dependency.
- Produces (used by Task 2):
  - `AddContactSchema` — a `z.object(...)` with keys `contactName: string`, `contactPosition: string`, `contactPhone: string`, `contactEmail: string`, `lineId: string`, `otherContact: string`.
  - `AddContactValues` — `z.infer<typeof AddContactSchema>`.

- [ ] **Step 1: Write the schema file**

```ts
// app/(public)/profiles/contract/_schemas/schema.ts
import { z } from "zod";

export const AddContactSchema = z.object({
  contactName: z.string().min(1, "กรุณากรอกชื่อผู้ติดต่อ"),
  contactPosition: z.string().optional(),
  contactPhone: z.string().min(1, "กรุณากรอกเบอร์โทร"),
  contactEmail: z.email("อีเมลไม่ถูกต้อง").min(1, "กรุณากรอกอีเมล"),
  lineId: z.string().optional(),
  otherContact: z.string().optional(),
});

export type AddContactValues = z.infer<typeof AddContactSchema>;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `app/(public)/profiles/contract/_schemas/schema.ts`.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings for this file.

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/profiles/contract/_schemas/schema.ts"
git commit -m "feat(vendor): add contact form schema"
```

---

### Task 2: Contact form hook

**Files:**
- Create: `app/(public)/profiles/contract/_hooks/use-add-contact-form.ts`

**Interfaces:**
- Consumes: `AddContactSchema`, `AddContactValues` from `../_schemas/schema` (Task 1); `useForm` from `react-hook-form`; `zodResolver` from `@hookform/resolvers/zod`.
- Produces (used by Task 3):
  - `useAddContactForm(onSubmitted: () => void)` — returns `UseFormReturn<AddContactValues> & { onSubmit: () => void }`. Callers use `.register`, `.formState.errors`, `.reset`, and `.onSubmit` (an already-`handleSubmit`-wrapped submit handler suitable for `<form onSubmit={onSubmit}>`).

- [ ] **Step 1: Write the hook file**

```ts
// app/(public)/profiles/contract/_hooks/use-add-contact-form.ts
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AddContactSchema, AddContactValues } from "../_schemas/schema";

export function useAddContactForm(onSubmitted: () => void) {
  const form = useForm<AddContactValues>({
    resolver: zodResolver(AddContactSchema),
    defaultValues: {
      contactName: "",
      contactPosition: "",
      contactPhone: "",
      contactEmail: "",
      lineId: "",
      otherContact: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    console.log(values);
    form.reset();
    onSubmitted();
  });

  return { ...form, onSubmit };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `app/(public)/profiles/contract/_hooks/use-add-contact-form.ts`.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings for this file.

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/profiles/contract/_hooks/use-add-contact-form.ts"
git commit -m "feat(vendor): add useAddContactForm hook"
```

---

### Task 3: Add-contact dialog component

**Files:**
- Create: `app/(public)/profiles/contract/_components/add-contact-dialog.tsx`

**Interfaces:**
- Consumes: `useAddContactForm` from `../_hooks/use-add-contact-form` (Task 2); `InputField` from `../../_components/input-field` (existing, unchanged — props `label: string`, `error?: string`, `children: ReactNode`); `Button` from `@/components/ui/button`; `Input` from `@/components/ui/input`; `Dialog`, `DialogClose`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `DialogTrigger` from `@/components/ui/dialog` (existing, unchanged).
- Produces (used by Task 4): default export `AddContactDialog` — a zero-props component that renders its own trigger button and dialog.

- [ ] **Step 1: Write the component file**

```tsx
// app/(public)/profiles/contract/_components/add-contact-dialog.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputField } from "../../_components/input-field";
import { useAddContactForm } from "../_hooks/use-add-contact-form";

export default function AddContactDialog() {
  const [open, setOpen] = useState(false);
  const { register, onSubmit, reset, formState: { errors } } =
    useAddContactForm(() => setOpen(false));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button className="bg-red-700 text-white hover:bg-red-600" />}>
        เพิ่มผู้ติดต่อ
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>เพิ่มผู้ติดต่อ</DialogTitle>
          <DialogDescription>กรอกข้อมูลผู้ติดต่อสำหรับการจัดซื้อจัดจ้าง</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <InputField label="ชื่อผู้ติดต่อ" error={errors.contactName?.message}>
            <Input {...register("contactName")} aria-invalid={!!errors.contactName} className="h-11 rounded-sm" />
          </InputField>

          <InputField label="ตำแหน่ง" error={errors.contactPosition?.message}>
            <Input {...register("contactPosition")} className="h-11 rounded-sm" />
          </InputField>

          <div className="grid grid-cols-2 gap-4">
            <InputField label="เบอร์โทร" error={errors.contactPhone?.message}>
              <Input {...register("contactPhone")} inputMode="numeric" aria-invalid={!!errors.contactPhone} className="h-11 rounded-sm" />
            </InputField>
            <InputField label="อีเมล" error={errors.contactEmail?.message}>
              <Input {...register("contactEmail")} type="email" aria-invalid={!!errors.contactEmail} className="h-11 rounded-sm" />
            </InputField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField label="LINE ID" error={errors.lineId?.message}>
              <Input {...register("lineId")} className="h-11 rounded-sm" />
            </InputField>
            <InputField label="ช่องทางติดต่ออื่น ๆ" error={errors.otherContact?.message}>
              <Input {...register("otherContact")} className="h-11 rounded-sm" />
            </InputField>
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>ยกเลิก</DialogClose>
            <Button type="submit" className="bg-red-700 text-white hover:bg-red-600">บันทึก</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `app/(public)/profiles/contract/_components/add-contact-dialog.tsx`. If `DialogTrigger`'s `render` prop reports a type mismatch, check how `components/ui/dialog.tsx`'s own `DialogFooter` passes `render={<Button variant="outline" />}` to `DialogPrimitive.Close` (same pattern, already type-checks in this repo) and match it exactly.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings for this file.

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/profiles/contract/_components/add-contact-dialog.tsx"
git commit -m "feat(vendor): add AddContactDialog component"
```

---

### Task 4: Wire the dialog into the contract page

**Files:**
- Modify: `app/(public)/profiles/contract/page.tsx`

**Interfaces:**
- Consumes: `AddContactDialog` default export from `./_components/add-contact-dialog` (Task 3).

- [ ] **Step 1: Replace the placeholder trigger text**

Current file:

```tsx
"use client";

import { useVendorProfile } from "@/lib/vendor/useVendorProfile";
import SectionTitle from "../_components/section-title";

export default function Contract() {
    const { data: vendor, isLoading } = useVendorProfile();

    return (
        <div className="flex flex-col">
            <SectionTitle title="ผู้ติดต่อ" desc="บุคคลที่ Lotushall Mining สามารถติดต่อได้เกี่ยวกับการจัดซื้อจัดจ้าง" >
                เพิ่มผู้ติดต่อ
            </SectionTitle>
        </div>
    )
}
```

Replace with:

```tsx
"use client";

import { useVendorProfile } from "@/lib/vendor/useVendorProfile";
import SectionTitle from "../_components/section-title";
import AddContactDialog from "./_components/add-contact-dialog";

export default function Contract() {
    const { data: vendor, isLoading } = useVendorProfile();

    return (
        <div className="flex flex-col">
            <SectionTitle title="ผู้ติดต่อ" desc="บุคคลที่ Lotushall Mining สามารถติดต่อได้เกี่ยวกับการจัดซื้อจัดจ้าง" >
                <AddContactDialog />
            </SectionTitle>
        </div>
    )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `app/(public)/profiles/contract/page.tsx`.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings.

- [ ] **Step 4: Manual browser verification**

Run: `npm run dev`, navigate to the "ผู้ติดต่อ" tab of the vendor profile section while logged in as a vendor.

Verify:
1. A red "เพิ่มผู้ติดต่อ" button renders on the right side of the section header.
2. Clicking it opens the dialog with 6 empty fields (ชื่อผู้ติดต่อ, ตำแหน่ง, เบอร์โทร, อีเมล, LINE ID, ช่องทางติดต่ออื่น ๆ) and a ยกเลิก/บันทึก footer.
3. Clicking "บันทึก" with everything empty shows three errors: "กรุณากรอกชื่อผู้ติดต่อ", "กรุณากรอกเบอร์โทร", "กรุณากรอกอีเมล" — dialog stays open.
4. Filling only the three required fields with valid values and clicking "บันทึก" closes the dialog (check the browser console — the submitted values were logged).
5. Reopening the dialog after a successful submit shows all fields blank again (confirms `reset()` ran).
6. Typing an invalid email (e.g. `abc`) in the อีเมล field and submitting shows "อีเมลไม่ถูกต้อง" under that field only.
7. Clicking "ยกเลิก", or clicking the backdrop, or pressing Esc all close the dialog; reopening shows blank fields again.
8. Toggle light/dark mode (however this repo triggers it) and confirm the dialog, inputs, and buttons render legibly in both.

Expected: All eight checks pass with no console errors (other than the intentional `console.log(values)` from step 4).

- [ ] **Step 5: Commit**

```bash
git add "app/(public)/profiles/contract/page.tsx"
git commit -m "feat(vendor): wire AddContactDialog into contract page"
```

---

## Self-Review Notes

- **Spec coverage:** Spec Part 1 (schema) → Task 1. Part 2 (hook) → Task 2. Part 3 (dialog component) → Task 3. Part 4 (page wiring) → Task 4 Step 1. Spec's "Error Handling" section (client-side zod errors via `InputField`) → verified in Task 4 Step 4 checks 3 and 6. Spec's "Testing" section (no runner, manual verification) → Task 4 Step 4, consistent with Tasks 1-3's typecheck/lint-only verification.
- **Placeholder scan:** No TBD/TODO; every code block is complete and copy-pasteable; the `console.log(values)` is an explicit, spec-documented placeholder for the future backend call, not an unfinished step.
- **Type consistency:** `AddContactSchema`/`AddContactValues` (Task 1) field names (`contactName`, `contactPosition`, `contactPhone`, `contactEmail`, `lineId`, `otherContact`) match `useAddContactForm`'s `defaultValues` keys (Task 2) and match every `register("...")` call and `errors.____?.message` access in the dialog component (Task 3). `useAddContactForm(onSubmitted: () => void)`'s call site in Task 3 (`useAddContactForm(() => setOpen(false))`) matches the hook's declared signature. `AddContactDialog` (Task 3's default export, zero props) matches its usage as `<AddContactDialog />` in Task 4.
