# Searchable Business Type Field (Vendor Profile)

## Context

`app/(public)/profiles/page.tsx` renders the "ประเภทธุรกิจ" (business type) field twice — once in the company section (line 37-39), once in the individual section (line 63-65) — as a plain `Input` bound to `vendor.detail.businessType`. The backend stores this as a free-form nullable string (`VendorCompanyDetail::businessType()`, `VendorIndividualDetail::businessType()` — no enum, no fixed list; test fixtures use values like `'Trading'`, `'Retail'`, `'Manufacturing'`).

The user wants this field to support both typing a custom value and picking from a searchable list of suggestions, built with this project's shadcn setup. This project's shadcn flavor is **Base UI**, not Radix (`components.json` `"style": "base-nova"`; `components/ui/select.tsx` wraps `@base-ui/react/select`), and Base UI already ships a `combobox` primitive (`@base-ui/react/combobox`, present in `node_modules`) with native support for free-typed input alongside a filterable item list — no new dependency needed.

The options list has no backend source (confirmed with the user) — it will be a small hardcoded array of general business categories on the frontend.

## Part 1: `components/ui/combobox.tsx` (new)

A generic primitive wrapping `@base-ui/react/combobox`, styled to match the conventions already established in `components/ui/select.tsx` (same border/radius/`bg-popover`/`ring-foreground/10`/open-close animation classes), exporting a Select-like surface:

```ts
export {
  Combobox,        // Combobox.Root
  ComboboxInput,    // Combobox.Input, styled like Input (h-11 handled by caller via className, like other fields)
  ComboboxContent,  // Combobox.Portal > Positioner > Popup > List, mirrors SelectContent
  ComboboxItem,     // Combobox.Item + ItemIndicator (check icon), mirrors SelectItem
  ComboboxEmpty,    // Combobox.Empty, shown when the filtered list has no matches
}
```

Key props threaded through from Base UI:
- `items: string[]` on `Combobox` (root) — the full option list; Base UI filters it against the input text automatically (default substring filter).
- `defaultInputValue: string` on `Combobox` (root) — seeds the field with the vendor's current `businessType`, uncontrolled (matching every other field on this page, which use `defaultValue` with no lifted state or `name` attribute).
- No `value`/`onValueChange` wiring — the combobox's *selected item* concept is unused. What matters is the input text itself, which the user can freely overwrite even after picking a suggestion.

## Part 2: `app/(public)/profiles/_components/business-types.ts` (new)

```ts
export const BUSINESS_TYPES = [
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
] as const;
```

Placed alongside the page's other scoped helpers (`input-field.tsx`, `navbar.tsx`, `sidebar.tsx`).

## Part 3: `page.tsx` changes

Both `businessType` fields (company section, individual section) swap from:

```tsx
<InputField label="ประเภทธุรกิจ">
  <Input defaultValue={vendor.detail.businessType} className="h-11 rounded-sm" />
</InputField>
```

to:

```tsx
<InputField label="ประเภทธุรกิจ">
  <Combobox items={BUSINESS_TYPES} defaultInputValue={vendor.detail.businessType}>
    <ComboboxInput className="h-11 rounded-sm" />
    <ComboboxContent>
      {BUSINESS_TYPES.map((type) => (
        <ComboboxItem key={type} value={type}>{type}</ComboboxItem>
      ))}
      <ComboboxEmpty>ไม่พบตัวเลือกที่ตรงกัน</ComboboxEmpty>
    </ComboboxContent>
  </Combobox>
</InputField>
```

(Exact child-rendering mechanics — e.g. whether items are mapped manually or passed via `Combobox.Collection` — are an implementation detail to finalize while building `combobox.tsx`; both are supported by Base UI.)

## Interaction Behavior

- Renders as a text input (not a button-triggered popup like `Select`), with a small trailing icon.
- Typing filters the dropdown live (substring match) among the 14 `BUSINESS_TYPES` entries.
- Clicking the input or its icon opens the dropdown.
- Selecting an item fills the input with that item's text and closes the dropdown.
- The user may ignore the dropdown and type anything else — the typed text is the field's value regardless of whether it matches a list entry, identical to the plain `Input` it replaces.
- No matches → dropdown shows "ไม่พบตัวเลือกที่ตรงกัน" instead of forcing a match; the typed text is kept either way.
- No validation, no `name` attribute, no controlled state — consistent with the rest of this still-static form.

## Error Handling

Not applicable — purely a presentational input swap. `InputField`'s existing `error` slot is untouched and continues to work if a caller passes it in the future.

## Testing

The frontend has no test runner configured (no vitest/jest/playwright in `package.json`). No automated tests are added, consistent with the rest of `page.tsx` and prior frontend work in this repo (see `2026-07-15-vendor-profile-api-and-proxy-design.md`). Verification is manual: run the dev server and exercise both the company and individual sections in-browser — typing a custom value, filtering and selecting a suggestion, and confirming the empty state — in both light and dark mode.
