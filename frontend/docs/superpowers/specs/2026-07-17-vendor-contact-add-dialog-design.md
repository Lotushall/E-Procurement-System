# Add Contact Dialog (Vendor Contract Page)

## Context

`app/(public)/profiles/contract/page.tsx` renders the "ผู้ติดต่อ" tab via `SectionTitle`, whose `children` slot is reserved for a page-level action (`app/(public)/profiles/_components/section-title.tsx:2-13`, already rendered on the right side of the header row). Today that slot just holds the placeholder text `เพิ่มผู้ติดต่อ` — no dialog, no form.

The backend has no contact-creation endpoint yet (`routes/` has no `contact` route, confirmed by search), and `VendorContact` (`app/Modules/Vendor/Domain/Entities/VendorContact.php`, `.../Infrastructure/Models/VendorContact.php`) is a `hasOne` relation on the vendor profile — one contact per vendor, not a list. Per user decision, this task builds the **dialog + form UI only**, with client-side validation; wiring the real submit to a backend mutation is separate future work.

The frontend already has an established form convention using `react-hook-form` + `zod` + `@hookform/resolvers/zod`, seen in `app/(auth)/login/`: a route-scoped `_schemas/schema.ts` (zod object + inferred type), a `_hooks/use-<name>-form.ts` (wraps `useForm`, exposes `register`/`formState`/`onSubmit`), and a component that renders fields through the existing `InputField` (`app/(public)/profiles/_components/input-field.tsx`) using `register(...)` + `error={errors.field?.message}`. This dialog follows that same convention rather than introducing ad hoc `useState` form handling.

Dialog primitives already exist at `components/ui/dialog.tsx` (Base UI-backed) and are already used elsewhere in the app (`app/(auth)/register/page.tsx:350-368` for the terms/privacy dialogs), so no new dependency is needed.

## Part 1: `app/(public)/profiles/contract/_schemas/schema.ts` (new)

```ts
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

Field set mirrors the existing `VendorContact` type (`lib/vendor/types.ts:44-52`) minus `isMainContact` — that field only makes sense once a vendor can have more than one contact, which the current `hasOne` relation doesn't support, so it's left out of the form (YAGNI).

Required: `contactName`, `contactPhone`, `contactEmail` — matching the fields `sidebar.tsx`'s `hasIncompleteContact` check already treats as required. Optional: `contactPosition`, `lineId`, `otherContact`.

## Part 2: `app/(public)/profiles/contract/_hooks/use-add-contact-form.ts` (new)

```ts
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

No mutation, no network call — validated values are only logged for now (placeholder). `onSubmitted` lets the dialog component close itself after a valid submit. This is the one piece that changes shape once a real backend endpoint exists (swap the `console.log` for a `useMutation` call, same as `useLoginForm`).

## Part 3: `app/(public)/profiles/contract/_components/add-contact-dialog.tsx` (new)

Self-contained: renders its own `DialogTrigger` (the "เพิ่มผู้ติดต่อ" button) and `DialogContent` (the form). `contract/page.tsx` swaps the current plain-text child for `<AddContactDialog />`.

```tsx
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

`open` is lifted into local state (rather than left uncontrolled) so a successful submit can close the dialog programmatically; closing by any means (submit, cancel, backdrop, Esc) also resets the form so the next open starts blank.

## Part 4: `contract/page.tsx` change

```tsx
<SectionTitle title="ผู้ติดต่อ" desc="บุคคลที่ Lotushall Mining สามารถติดต่อได้เกี่ยวกับการจัดซื้อจัดจ้าง">
  <AddContactDialog />
</SectionTitle>
```

## Error Handling

Purely client-side, zod-driven field errors shown through `InputField`'s existing `error` slot — same mechanism the login/register forms already use. No network errors to handle since there is no request yet.

## Testing

No test runner is configured in this repo (consistent with prior frontend specs). Verification is manual: open the dialog, submit empty (see all three required errors), fill required fields only (submits, dialog closes, values logged), fill an invalid email (see the email-specific error), cancel/backdrop-close and reopen (form is blank again) — check both light and dark mode.
