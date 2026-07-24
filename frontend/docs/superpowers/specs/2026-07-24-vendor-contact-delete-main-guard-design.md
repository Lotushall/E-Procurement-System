# Prevent deleting the main vendor contact

## Context

`app/(public)/profiles/contract/page.tsx` renders each vendor contact with a
`DeleteContactDialog` (`app/(public)/profiles/contract/_components/delete-contact-dialog.tsx`).
The delete button is currently disabled only when it's the vendor's last
remaining contact (`disabled={(vendor?.contact?.length ?? 0) <= 1}`), with no
visual explanation for why it's disabled. There is no guard against deleting
a contact flagged `isMainContact`, even when other contacts exist — a vendor
can delete their designated main contact today.

This is frontend-only, matching this codebase's existing pattern of
frontend-side guards on this dialog (the last-contact check above has no
backend equivalent either). No backend change is in scope.

The codebase has no `Tooltip` UI component yet, but `@base-ui/react` (already
a dependency, used for `Dialog`, `AlertDialog`, `Menu`, `Checkbox`, etc.)
ships `@base-ui/react/tooltip`. This task adds `components/ui/tooltip.tsx`
following the same wrap-and-restyle pattern as `components/ui/dropdown-menu.tsx`.

## Part 1: `components/ui/tooltip.tsx` (new)

Wrap Base UI's tooltip parts, styled to match this project's existing popup
surfaces (`dropdown-menu.tsx`'s `DropdownMenuContent`: `bg-popover`,
`ring-1 ring-foreground/10`, `shadow-md`, same open/closed animation classes).
Includes an arrow, since none of this project's other floating surfaces are
borderless without one and a tooltip pointing at a small icon button benefits
from it.

```tsx
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

(Exact arrow markup/positioning gets adjusted during implementation if Base
UI's `Arrow` primitive needs different offsets than guessed here — the
important contract is the exported names and props above.)

## Part 2: `contract/page.tsx` — compute a disable reason per contact

Replace the boolean-only disabled check with a Thai reason string, so the
caller no longer needs to know *why* a delete is blocked:

```ts
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
        {/* ...unchanged... */}
        <DeleteContactDialog contact={contact} disabledReason={deleteDisabledReason} />
      </div>
    );
  })}
```

`isMainContact` is checked first: a main contact that's also the last
remaining contact should show the main-contact reason, since unflagging it as
main (via `EditContactDialog`) is the more relevant next step for the user
than "add another contact."

## Part 3: `delete-contact-dialog.tsx` — accept a reason, not a bool

```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function DeleteContactDialog({
  contact,
  disabledReason,
}: {
  contact: VendorContact;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const deleteVendorContactMutation = useDeleteVendorContact();

  const handleDelete = () => { /* unchanged */ };

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

      <AlertDialogContent>{/* unchanged */}</AlertDialogContent>
    </AlertDialog>
  );
}
```

The `<span>` wrapper is required, not cosmetic: the button's own
`disabled:pointer-events-none` class means a disabled `<button>` never
dispatches the hover events `TooltipTrigger` listens for. Wrapping it in a
plain `<span>` (which stays interactive) lets the tooltip fire on hover over
the visually-disabled button. When there's no `disabledReason`, the trigger
renders directly with no wrapper or `Tooltip`, so enabled buttons get no
tooltip overhead.

## Edge cases

- **Main contact + last contact**: shows "ไม่สามารถลบผู้ติดต่อหลักได้" (main-contact
  reason wins — see Part 2 rationale).
- **No contacts flagged main** (existing data predating this feature, or a
  vendor that unset it): only the last-contact rule applies, same behavior as
  today just with a tooltip added.
- **Vendor unchecks "เป็นผู้ติดต่อหลัก" in `EditContactDialog`**: on save, the
  query invalidates and `page.tsx` recomputes `deleteDisabledReason` next
  render — the delete button un-disables immediately with no extra wiring
  needed, since the reason is derived from fresh query data on every render.

## Out of scope

- Backend enforcement of "can't delete main contact" — mirrors the existing
  last-contact rule, which is also frontend-only today.
- Guaranteeing exactly one `isMainContact` contact exists, or auto-promoting
  another contact to main when the main one's flag is unchecked — that's
  `EditContactDialog`'s existing checkbox behavior, unchanged by this task.
- Reusing the new `Tooltip` elsewhere in the app — added because this task
  needs it and the codebase's convention is one wrapped component per Base UI
  primitive, but no other call site is being touched.

## Testing

No test runner is configured in this repo (consistent with prior frontend
specs). Verification is manual:
1. Vendor with 2+ contacts, one flagged main: main contact's delete button is
   disabled; hovering shows "ไม่สามารถลบผู้ติดต่อหลักได้"; the non-main contact's
   delete button stays enabled and works.
2. Vendor with exactly 1 contact (not main, or main): delete button disabled;
   hovering shows the appropriate reason for whichever rule applies.
3. Uncheck "เป็นผู้ติดต่อหลัก" on the main contact via `EditContactDialog`, save,
   confirm its delete button becomes enabled (assuming 2+ contacts exist).
4. Check both light and dark mode for the tooltip.
5. Keyboard: tab to the disabled delete button, confirm the tooltip also
   appears on focus (Base UI's default trigger behavior), not just hover.
