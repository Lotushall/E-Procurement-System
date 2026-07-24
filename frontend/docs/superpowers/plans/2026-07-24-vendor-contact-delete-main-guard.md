# Prevent Deleting the Main Vendor Contact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Disable the delete button for a vendor contact flagged `isMainContact`, and add a tooltip to the delete button (both for the main-contact case and the existing "last remaining contact" case) explaining why it's disabled.

**Architecture:** A new `components/ui/tooltip.tsx` wraps `@base-ui/react/tooltip`, following this codebase's existing pattern of one wrapped-and-restyled file per Base UI primitive (see `components/ui/dropdown-menu.tsx`). `delete-contact-dialog.tsx`'s `disabled: boolean` prop becomes `disabledReason?: string`; when set, the trigger is wrapped in `Tooltip` (inside an extra `<span>`, since a native `disabled` button never dispatches the hover events the tooltip needs) showing the reason. `contract/page.tsx` computes that reason per contact: `isMainContact` wins over the existing last-contact rule.

**Tech Stack:** Next.js (App Router, client components), `@base-ui/react/tooltip` (already a dependency, not yet wrapped as a UI component), Tailwind v4.

## Global Constraints

- No test runner is configured in this repo (`package.json` has no vitest/jest/playwright, no `*.test.ts` files exist). Do not add a test framework. Verification is `npx tsc --noEmit`, `npm run lint`, and manual browser checks via the dev server — disclose the manual browser checks explicitly rather than claiming they were run automatically.
- Follow `components/ui/dropdown-menu.tsx`'s styling conventions for the new `Tooltip` popup surface: `bg-popover`, `text-popover-foreground`, `ring-1 ring-foreground/10`, `shadow-md`, `data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95`.
- `isMainContact` on `VendorContact` (`lib/vendor/types.ts:51`) is typed `string` but used with plain truthiness checks elsewhere in `contract/page.tsx` (e.g. `contact.isMainContact ? "bg-red-700" : ...`). Match that existing convention — do not "fix" the type or add `Boolean(...)` wrapping that isn't already there.
- This is frontend-only. No backend endpoint or validation changes.
- Full design context: `docs/superpowers/specs/2026-07-24-vendor-contact-delete-main-guard-design.md`.

---

### Task 1: `Tooltip` UI primitive

**Files:**
- Create: `components/ui/tooltip.tsx`

**Interfaces:**
- Consumes: `Tooltip as TooltipPrimitive` from `@base-ui/react/tooltip`; `cn` from `@/lib/utils`.
- Produces (used by Task 2):
  - `Tooltip` — wraps `TooltipPrimitive.Root` in its own `TooltipProvider` (400ms open delay). Props: same as `TooltipPrimitive.Root.Props` (notably `children`).
  - `TooltipTrigger` — thin wrapper around `TooltipPrimitive.Trigger`. Props: same as `TooltipPrimitive.Trigger.Props` (notably `render`, used to swap in a custom trigger element).
  - `TooltipContent` — renders the portaled, positioned, styled popup + arrow. Props: `TooltipPrimitive.Popup.Props & { sideOffset?: number; side?: Side; align?: Align }` (notably `children`, the tooltip text).

- [ ] **Step 1: Write the component file**

```tsx
// components/ui/tooltip.tsx
"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delay = 400,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />
  )
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 8,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "sideOffset" | "side" | "align">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner sideOffset={sideOffset} className="z-50">
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-50 w-fit max-w-64 rounded-md bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="data-[side=bottom]:top-[-8px] data-[side=left]:right-[-13px] data-[side=left]:rotate-90 data-[side=right]:left-[-13px] data-[side=right]:-rotate-90 data-[side=top]:bottom-[-8px]">
            <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
              <path d="M0 0L8 8L16 0" className="fill-popover" />
            </svg>
          </TooltipPrimitive.Arrow>
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `components/ui/tooltip.tsx`.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings for this file.

- [ ] **Step 4: Commit**

```bash
git add "components/ui/tooltip.tsx"
git commit -m "feat(ui): add Tooltip component"
```

---

### Task 2: Wire the main-contact delete guard

**Files:**
- Modify: `app/(public)/profiles/contract/_components/delete-contact-dialog.tsx`
- Modify: `app/(public)/profiles/contract/page.tsx`

**Interfaces:**
- Consumes: `Tooltip`, `TooltipTrigger`, `TooltipContent` from `@/components/ui/tooltip` (Task 1).
- Produces: `DeleteContactDialog`'s prop changes from `{ contact: VendorContact; disabled: boolean }` to `{ contact: VendorContact; disabledReason?: string }` — this is a breaking change to its only call site, updated in the same task.

- [ ] **Step 1: Update `delete-contact-dialog.tsx`'s props and trigger**

Current relevant code (`app/(public)/profiles/contract/_components/delete-contact-dialog.tsx`):

```tsx
import type { VendorContact } from "@/lib/vendor/types";
import { useDeleteVendorContact } from "@/lib/vendor/mutations";
import { Trash2 } from "lucide-react";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ลบข้อมูลผู้ติดต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export default function DeleteContactDialog({
  contact,
  disabled,
}: {
  contact: VendorContact;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const deleteVendorContactMutation = useDeleteVendorContact();

  const handleDelete = () => {
    toast.promise(deleteVendorContactMutation.mutateAsync(contact.id), {
      loading: "กำลังลบผู้ติดต่อ...",
      success: () => {
        setOpen(false);
        return "ลบข้อมูลผู้ติดต่อสำเร็จ";
      },
      error: getErrorMessage,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="ลบผู้ติดต่อ"
            disabled={disabled}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed"
          />
        }
      >
        <Trash2 />
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบผู้ติดต่อ</AlertDialogTitle>
          <AlertDialogDescription>
            ต้องการลบผู้ติดต่อ &quot;{contact.contactName}&quot; ใช่หรือไม่?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteVendorContactMutation.isPending}
            className="bg-red-700 text-white hover:bg-red-600"
            onClick={handleDelete}
          >
            ลบผู้ติดต่อ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

Replace the whole file with:

```tsx
"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { VendorContact } from "@/lib/vendor/types";
import { useDeleteVendorContact } from "@/lib/vendor/mutations";
import { Trash2 } from "lucide-react";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ลบข้อมูลผู้ติดต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export default function DeleteContactDialog({
  contact,
  disabledReason,
}: {
  contact: VendorContact;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const deleteVendorContactMutation = useDeleteVendorContact();

  const handleDelete = () => {
    toast.promise(deleteVendorContactMutation.mutateAsync(contact.id), {
      loading: "กำลังลบผู้ติดต่อ...",
      success: () => {
        setOpen(false);
        return "ลบข้อมูลผู้ติดต่อสำเร็จ";
      },
      error: getErrorMessage,
    });
  };

  const trigger = (
    <AlertDialogTrigger
      render={
        <Button
          variant="ghost"
          size="icon"
          aria-label="ลบผู้ติดต่อ"
          disabled={!!disabledReason}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed"
        />
      }
    >
      <Trash2 />
    </AlertDialogTrigger>
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {disabledReason ? (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            {trigger}
          </TooltipTrigger>
          <TooltipContent>{disabledReason}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบผู้ติดต่อ</AlertDialogTitle>
          <AlertDialogDescription>
            ต้องการลบผู้ติดต่อ &quot;{contact.contactName}&quot; ใช่หรือไม่?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteVendorContactMutation.isPending}
            className="bg-red-700 text-white hover:bg-red-600"
            onClick={handleDelete}
          >
            ลบผู้ติดต่อ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: Update `contract/page.tsx`'s call site**

Current relevant code (`app/(public)/profiles/contract/page.tsx`):

```tsx
            {!isLoading ? (
                <>
                    {[...(vendor?.contact ?? [])]
                        .sort((a, b) => (b.isMainContact ? 1 : 0) - (a.isMainContact ? 1 : 0))
                        .map((contact, index) => (
                            <div key={index} className="flex justify-between gap-3 p-4 border rounded-md">
                                <div className="flex md:items-center gap-2 md:gap-3.5 min-w-0">
                                    {/* ...avatar/name/details, unchanged... */}
                                </div>

                                <div className="flex items-center justify-end md:gap-1">
                                    <ViewContactDialog contact={contact} />
                                    <EditContactDialog contact={contact} />
                                    <DeleteContactDialog contact={contact} disabled={(vendor?.contact?.length ?? 0) <= 1} />
                                </div>
                            </div>
                        ))}
                </>
            ) : (
```

Replace the `.map(...)` callback and the `DeleteContactDialog` call with:

```tsx
            {!isLoading ? (
                <>
                    {[...(vendor?.contact ?? [])]
                        .sort((a, b) => (b.isMainContact ? 1 : 0) - (a.isMainContact ? 1 : 0))
                        .map((contact, index) => {
                            const isLastContact = (vendor?.contact?.length ?? 0) <= 1;
                            const deleteDisabledReason = contact.isMainContact
                                ? "ไม่สามารถลบผู้ติดต่อหลักได้"
                                : isLastContact
                                ? "ต้องมีผู้ติดต่ออย่างน้อย 1 คน"
                                : undefined;

                            return (
                                <div key={index} className="flex justify-between gap-3 p-4 border rounded-md">
                                    <div className="flex md:items-center gap-2 md:gap-3.5 min-w-0">
                                        {/* ...avatar/name/details, unchanged... */}
                                    </div>

                                    <div className="flex items-center justify-end md:gap-1">
                                        <ViewContactDialog contact={contact} />
                                        <EditContactDialog contact={contact} />
                                        <DeleteContactDialog contact={contact} disabledReason={deleteDisabledReason} />
                                    </div>
                                </div>
                            );
                        })}
                </>
            ) : (
```

Only the `.map(...)` callback body and the `DeleteContactDialog` line change — the avatar/name/details JSX inside stays exactly as it is today (lines 28-66 of the current file), just re-indented one level deeper if your editor auto-indents on the `return` wrap. Content is unchanged either way.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `app/(public)/profiles/contract/_components/delete-contact-dialog.tsx` or `app/(public)/profiles/contract/page.tsx`.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings for either file.

- [ ] **Step 5: Manual browser verification**

Run: `npm run dev`, log in as a vendor with 2+ contacts (one flagged main — use `EditContactDialog`'s "เป็นผู้ติดต่อหลัก" checkbox to set one if needed), navigate to the "ผู้ติดต่อ" tab.

This step is manual browser verification — disclose it as such rather than claiming automated confirmation, since no browser automation is available in this environment.

Verify:
1. The contact flagged "ผู้ติดต่อหลัก" (badge visible, red icon background) has a disabled (dimmed, not-allowed cursor) delete button.
2. Hovering over that disabled delete button shows a tooltip reading "ไม่สามารถลบผู้ติดต่อหลักได้".
3. Tabbing to that disabled delete button with the keyboard also shows the tooltip (focus, not just hover).
4. A non-main contact's delete button (with 2+ contacts total) is enabled, has no tooltip on hover, and clicking it still opens the confirm dialog and deletes successfully as before.
5. Reduce to exactly 1 remaining contact (delete down to one, or test on a vendor that only has one): its delete button is disabled and hovering shows "ต้องมีผู้ติดต่ออย่างน้อย 1 คน" (or, if that one contact is also flagged main, "ไม่สามารถลบผู้ติดต่อหลักได้" instead — main-contact reason wins).
6. Uncheck "เป็นผู้ติดต่อหลัก" on the main contact via `EditContactDialog`, save. Confirm its delete button becomes enabled (assuming 2+ contacts still exist) with no page reload needed.
7. Toggle light/dark mode and confirm the tooltip is legible (readable text/background contrast) in both.

Expected: All seven checks pass with no console errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(public)/profiles/contract/_components/delete-contact-dialog.tsx" "app/(public)/profiles/contract/page.tsx"
git commit -m "feat(vendor): prevent deleting the main contact"
```

---

## Self-Review Notes

- **Spec coverage:** Spec Part 1 (`Tooltip` component) → Task 1. Spec Part 2 (`page.tsx` reason computation) → Task 2 Step 2. Spec Part 3 (`delete-contact-dialog.tsx` reason + tooltip wiring) → Task 2 Step 1. Spec's edge cases (main+last precedence, no-main-flagged data, uncheck-main-live-update) → Task 2 Step 5 checks 5 and 6. Spec's "Testing" section (no runner, manual verification, light/dark check) → Task 2 Step 5.
- **Placeholder scan:** No TBD/TODO; every code block is complete. The `{/* ...avatar/name/details, unchanged... */}` comments in Task 2 Step 2's snippets are explicitly called out in the prose immediately below as unchanged existing JSX (lines 28-66 of the current file), not omitted new logic — the only functional changes are the `isLastContact`/`deleteDisabledReason` computation and the `DeleteContactDialog` prop.
- **Type consistency:** `Tooltip`/`TooltipTrigger`/`TooltipContent` (Task 1's exports) are imported and used with matching names in Task 2 Step 1. `DeleteContactDialog`'s new prop `disabledReason?: string` (Task 2 Step 1) matches the `disabledReason={deleteDisabledReason}` call site in Task 2 Step 2, where `deleteDisabledReason` is typed `string | undefined` — matching exactly.
