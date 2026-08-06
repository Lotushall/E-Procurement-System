# Vendor Detail Page — Profile/Contact Layout Rebalance

**Date:** 2026-08-06
**Status:** Approved

## Problem

In the vendor detail page (`app/dashboard/vendors/detail/page.tsx`), the "ข้อมูลผู้ค้า" (`VendorProfileInfo`) and "ผู้ติดต่อ" (contact list) sections sit side by side in a `flex gap-6` container with no width constraint on either child. Each column ends up sized by its own content instead of splitting the row evenly, so the layout looks unbalanced.

Additionally, `VendorProfileInfo`'s info grid is declared as `grid-cols-2 ... md:grid-cols-2` — the `md:` variant is redundant since the base class already forces 2 columns at every breakpoint, including narrow ones.

## Scope

- `app/dashboard/vendors/detail/page.tsx` (lines 98-145): the profile/contact two-column row only.
- `app/dashboard/vendors/detail/_components/vendor-profile-info.tsx`: the info grid.
- Out of scope: page header, action buttons, document section, field additions/removals/reordering (all fields stay as-is).

## Design

1. **Even 50/50 split.** Give both direct children of the `flex gap-6` row (`VendorProfileInfo` and the contact-list `div`) `flex-1 min-w-0` so they always share the row equally, regardless of content length.
2. **Responsive info grid.** Change `VendorProfileInfo`'s grid from the redundant `grid-cols-2 gap-4 rounded-md border p-4 md:grid-cols-2` to `grid-cols-1 sm:grid-cols-2 gap-4 rounded-md border p-4`. Now that the section only gets ~50% of the page width, forcing 2 columns at every viewport size would cramp label/value pairs on narrow screens; collapsing to 1 column below `sm` and expanding to 2 above it keeps rows readable.

## Explicitly not changing

- No new/removed/reordered fields in `VendorProfileInfo`.
- No changes to the page header, status badge, or approve/reject actions.
- No changes to the document section.
- Contact list items keep their existing per-contact bordered-row styling (no shared outer wrapper box added).

## Testing

No test runner configured in this repo. Verification is `npx tsc --noEmit` / `npm run lint`, plus disclosed manual QA (no browser automation available in this environment): at narrow and wide viewport widths, profile/contact columns stay visually even, and the info grid collapses to 1 column on narrow widths and 2 on wider ones.
