# Searchable Business Type Field (Vendor Profile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain text "ประเภทธุรกิจ" (business type) input on the vendor profile page with a combobox that lets the user either type a free-form value or pick from a searchable, hardcoded list of general business categories.

**Architecture:** A new generic `components/ui/combobox.tsx` primitive wraps this repo's existing `@base-ui/react/combobox` dependency (already installed, no new package needed), styled to match `components/ui/select.tsx`'s existing conventions. A small constants file supplies the hardcoded option list. `app/(public)/profiles/page.tsx` swaps both occurrences of the business-type field (company section and individual section) to use the new combobox.

**Tech Stack:** Next.js (App Router, client component), `@base-ui/react/combobox` (already in `node_modules`, confirmed present — no install step needed), Tailwind v4, `lucide-react` icons, `cn` from `@/lib/utils`.

## Global Constraints

- This project's shadcn flavor is Base UI, not Radix (`components.json` `"style": "base-nova"`) — every existing `components/ui/*.tsx` file wraps `@base-ui/react/*`, not `@radix-ui/*`. The new combobox must follow this same pattern.
- No test runner is configured in this repo (`package.json` has no vitest/jest/playwright, no `*.test.ts` files exist). Do not add a test framework. Verification is `tsc --noEmit`, `npm run lint`, and manual browser checks via the dev server.
- No `name` attributes or lifted form state exist anywhere in `page.tsx` today (every field is `defaultValue`-only, uncontrolled). Do not introduce controlled state or `name` props — stay consistent with the rest of the page.
- Business type options are hardcoded on the frontend (confirmed with user — no backend enum exists for this field).

---

### Task 1: `Combobox` UI primitive

**Files:**
- Create: `components/ui/combobox.tsx`

**Interfaces:**
- Consumes: `@base-ui/react/combobox` (`Combobox` namespace export — `Root`, `Input`, `InputGroup`, `Icon`, `Portal`, `Positioner`, `Popup`, `List`, `Item`, `ItemIndicator`, `Empty`), `cn` from `@/lib/utils`, `ChevronDownIcon`/`CheckIcon` from `lucide-react`.
- Produces (used by Task 2):
  - `Combobox` — the root component. Generic over item value type. Key props used downstream: `items: readonly Value[]`, `defaultInputValue?: string`.
  - `ComboboxInput` — `React.ComponentProps` matching `Combobox.Input.Props` (accepts `className`, standard input props). Renders the visible text field with a trailing chevron icon; opens the popup on click/typing (Base UI default `openOnInputClick: true`).
  - `ComboboxContent` — `Combobox.Popup.Props & Pick<Combobox.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">`. Wraps `Portal > Positioner > Popup`; renders `children` inside the popup.
  - `ComboboxList` — accepts either plain `ReactNode` children or a `(item, index) => ReactNode` render-prop child (per Base UI's `Combobox.List` — the function form implicitly filters/iterates the root's `items` against the current input query).
  - `ComboboxItem` — `Combobox.Item.Props` (`value`, `children`, etc.). Renders the item row plus a check indicator shown when `data-selected`.
  - `ComboboxEmpty` — `Combobox.Empty.Props`. Renders its `children` only when the filtered list is empty (Base UI handles this internally — always keep it mounted, never conditionally render `ComboboxEmpty` itself).

- [ ] **Step 1: Write the component file**

```tsx
"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"

import { cn } from "@/lib/utils"
import { ChevronDownIcon, CheckIcon } from "lucide-react"

const Combobox = ComboboxPrimitive.Root

function ComboboxInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.InputGroup
      data-slot="combobox-input-group"
      className="relative flex items-center"
    >
      <ComboboxPrimitive.Input
        data-slot="combobox-input"
        className={cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 pr-8 text-base transition-colors outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className
        )}
        {...props}
      />
      <ComboboxPrimitive.Icon
        data-slot="combobox-icon"
        className="pointer-events-none absolute right-2.5"
        render={<ChevronDownIcon className="size-4 text-muted-foreground" />}
      />
    </ComboboxPrimitive.InputGroup>
  )
}

function ComboboxContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxList({
  className,
  children,
  ...props
}: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    >
      {children}
    </ComboboxPrimitive.List>
  )
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
        <CheckIcon className="size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

function ComboboxEmpty({
  className,
  ...props
}: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "px-2.5 py-6 text-center text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `components/ui/combobox.tsx`. (Pre-existing unrelated errors, if any, are out of scope — only confirm this new file introduces none.)

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings for `components/ui/combobox.tsx`.

- [ ] **Step 4: Commit**

```bash
git add components/ui/combobox.tsx
git commit -m "feat(ui): add Base UI combobox primitive"
```

---

### Task 2: Wire the searchable business-type field into the vendor profile page

**Files:**
- Create: `app/(public)/profiles/_components/business-types.ts`
- Modify: `app/(public)/profiles/page.tsx:1-7` (imports), `app/(public)/profiles/page.tsx:37-39` (company section field), `app/(public)/profiles/page.tsx:63-65` (individual section field)

**Interfaces:**
- Consumes: `Combobox`, `ComboboxInput`, `ComboboxContent`, `ComboboxList`, `ComboboxItem`, `ComboboxEmpty` from `@/components/ui/combobox` (Task 1); `InputField` from `./_components/input-field` (existing, unchanged); `vendor.detail.businessType: string` from `useVendorProfile()` (existing, unchanged).
- Produces: `BUSINESS_TYPES: string[]`, exported from `app/(public)/profiles/_components/business-types.ts`.

- [ ] **Step 1: Create the options constant**

```ts
// app/(public)/profiles/_components/business-types.ts
export const BUSINESS_TYPES: string[] = [
  "ผลิต / อุตสาหกรรม",
  "ค้าปลีก",
  "ค้าส่ง",
  "บริการ",
  "ก่อสร้าง",
  "เกษตรกรรม",
  "ขนส่งและโลจิสติกส์",
  "เทคโนโลยีและไอที",
  "การเงินและประกันภัย",
  "อสังหาริมทรัพย์",
  "การศึกษา",
  "สุขภาพและการแพทย์",
  "อาหารและเครื่องดื่ม",
  "อื่นๆ",
];
```

- [ ] **Step 2: Update imports in `page.tsx`**

Replace lines 1-7 of `app/(public)/profiles/page.tsx`:

```tsx
"use client";

import { useVendorProfile } from "@/lib/vendor/useVendorProfile";
import { InputField } from "./_components/input-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
```

with:

```tsx
"use client";

import { useVendorProfile } from "@/lib/vendor/useVendorProfile";
import { InputField } from "./_components/input-field";
import { BUSINESS_TYPES } from "./_components/business-types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
```

- [ ] **Step 3: Replace the company-section business-type field**

Replace (current lines 37-39):

```tsx
                <InputField label="ประเภทธุรกิจ">
                  <Input defaultValue={vendor.detail.businessType} className="h-11 rounded-sm" />
                </InputField>
```

with:

```tsx
                <InputField label="ประเภทธุรกิจ">
                  <Combobox items={BUSINESS_TYPES} defaultInputValue={vendor.detail.businessType}>
                    <ComboboxInput className="h-11 rounded-sm" />
                    <ComboboxContent>
                      <ComboboxEmpty>ไม่พบตัวเลือกที่ตรงกัน</ComboboxEmpty>
                      <ComboboxList>
                        {(item: string) => (
                          <ComboboxItem key={item} value={item}>
                            {item}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </InputField>
```

- [ ] **Step 4: Replace the individual-section business-type field**

Replace (current lines 63-65):

```tsx
                <InputField label="ประเภทธุรกิจ">
                  <Input defaultValue={vendor.detail.businessType} className="h-11 rounded-sm" />
                </InputField>
```

with the identical block from Step 3 (same JSX, same props — this section of the page already duplicates every other field verbatim between the company and individual branches, e.g. "ที่อยู่"/"ประเทศ"/"จังหวัด"/"รหัสไปรษณีย์", so this follows the file's existing convention):

```tsx
                <InputField label="ประเภทธุรกิจ">
                  <Combobox items={BUSINESS_TYPES} defaultInputValue={vendor.detail.businessType}>
                    <ComboboxInput className="h-11 rounded-sm" />
                    <ComboboxContent>
                      <ComboboxEmpty>ไม่พบตัวเลือกที่ตรงกัน</ComboboxEmpty>
                      <ComboboxList>
                        {(item: string) => (
                          <ComboboxItem key={item} value={item}>
                            {item}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </InputField>
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `page.tsx` or `business-types.ts`.

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings.

- [ ] **Step 7: Manual browser verification**

Run: `npm run dev`, open the vendor profile page while logged in as a vendor (both a `company`-type and an `individual`-type vendor account, to exercise both branches).

Verify for each of the two business-type fields:
1. The field shows the vendor's existing `businessType` value pre-filled.
2. Clicking the field (or its chevron icon) opens a dropdown listing the 14 `BUSINESS_TYPES` options.
3. Typing filters the list live (e.g. typing "ค้า" narrows to "ค้าปลีก" / "ค้าส่ง").
4. Clicking a filtered option fills the input with that option's text and closes the dropdown.
5. Typing a value that matches no option (e.g. "xyz123") shows the "ไม่พบตัวเลือกที่ตรงกัน" empty state, and the typed text remains in the input after closing the dropdown (clicking elsewhere) — confirming free text is preserved even with no match.
6. Toggle the OS/browser color scheme (or however this repo's dark mode is triggered — check `next-themes` usage) and repeat a quick visual check that the popup/border colors look correct in dark mode too.

Expected: All six checks pass with no console errors.

- [ ] **Step 8: Commit**

```bash
git add app/\(public\)/profiles/_components/business-types.ts app/\(public\)/profiles/page.tsx
git commit -m "feat(vendor): make business type field searchable with free text entry"
```

---

## Self-Review Notes

- **Spec coverage:** Part 1 (primitive) → Task 1. Part 2 (options file) → Task 2 Step 1. Part 3 (page.tsx wiring) → Task 2 Steps 2-4. Interaction behavior → verified in Task 2 Step 7. Error handling (N/A per spec) → nothing to implement. Testing (manual only, no runner) → Task 2 Step 7, consistent throughout.
- **Placeholder scan:** No TBD/TODO; all code blocks are complete and copy-pasteable.
- **Type consistency:** `BUSINESS_TYPES: string[]` (Task 2 Step 1) matches the `items={BUSINESS_TYPES}` usage (Steps 3-4) and the `(item: string) => ...` render-prop signature. Component names (`Combobox`, `ComboboxInput`, `ComboboxContent`, `ComboboxList`, `ComboboxItem`, `ComboboxEmpty`) are identical between Task 1's exports and Task 2's imports/usage.
