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

## Amendments (post-implementation, commit `ed91adf`)

The initial implementation (commit `5626647`) locked both columns to `flex-1` at every viewport width, which the final review traced to two real problems and fixed:

1. **Row now stacks below `lg`.** The row's className is `flex flex-col gap-6 lg:flex-row`, not the bare `flex gap-6` described above — at every width below `lg` (1024px) both columns render full-width, stacked; the 50/50 `flex-1` split only takes effect at `lg` and above. Without this, the 50/50 lock made the contact column unusably narrow on mobile (sidebar becomes a sheet below 768px).
2. **`InfoItem` also has `min-w-0` (wrapper) and `break-words` (value `<p>`).** `min-w-0` alone (as originally described in this doc) does not prevent a long unbroken value (e.g. a long email in the individual branch) from overflowing its grid cell — CSS grid items default to `min-width: auto`/min-content regardless of the flex parent's `min-w-0`. `break-words` on the value text is what actually allows wrapping instead of overflow; `min-w-0` on `InfoItem`'s own wrapper is still needed so the grid item itself can shrink below its min-content width.

Also corrects the Problem section's stated starting point: it describes the pre-existing grid class as `md:grid-cols-2`, which was the state of the user's uncommitted WIP at the time this spec was written, not the last-committed state (`md:grid-cols-4` as of base commit `b184135`). Not a discrepancy in the implementation — just a note for anyone diffing this doc against git history.
