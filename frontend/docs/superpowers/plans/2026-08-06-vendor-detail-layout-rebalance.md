# Vendor Detail Profile/Contact Layout Rebalance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "ข้อมูลผู้ค้า" (`VendorProfileInfo`) and "ผู้ติดต่อ" columns on the vendor detail page split their row evenly (50/50) instead of sizing to content, and make `VendorProfileInfo`'s field grid responsive instead of forced-2-columns at every width.

**Architecture:** Two class-only edits, no new components, no logic changes. `page.tsx`'s two-column row gets `flex-1 min-w-0` on both children; `vendor-profile-info.tsx`'s grid drops its redundant `md:grid-cols-2` in favor of `grid-cols-1 sm:grid-cols-2`.

**Tech Stack:** Next.js 16 (App Router, `output: "export"`), React 19, TypeScript 5 (strict), Tailwind CSS. No test runner configured in this repo — verification is `tsc --noEmit`, `eslint`, and disclosed manual QA.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-06-vendor-detail-layout-design.md` — read it for full rationale.
- **No field additions/removals/reordering.** Every `InfoItem` in `VendorProfileInfo` stays exactly as-is, both company and individual branches.
- **No changes to the page header, status badge, approve/reject actions, or document section.** Only the profile/contact row (`page.tsx` lines 98-145) and the info grid class (`vendor-profile-info.tsx` line 16) are in scope.
- **Contact list items keep their existing per-contact bordered-row styling** — do not add a shared outer wrapper box around the contact list.
- File paths below are relative to `frontend/` (repo root `D:\E-Procurement-System`, `frontend`/`backend` are siblings). You are on git branch `Internal`.
- Verify TypeScript with `npx tsc --noEmit` from `frontend/`. Baseline confirmed 2026-08-06: **6** pre-existing, unrelated errors, all `TS2345` in `lib/auth/permissions.ts` (lines 30, 35, 40, 45, 50, 55 — `CurrentUser` not assignable to `User`). Confirm no *new* errors after the task.
- Verify lint with `npm run lint` from `frontend/`. Baseline confirmed 2026-08-06: **8** pre-existing `react/no-unescaped-entities` errors (`components/legal/privacy-content.tsx` x2, `components/legal/terms-content.tsx` x6) plus **1** pre-existing warning (`app/dashboard/vendors/_components/table/data-table.tsx`, `react-hooks/incompatible-library`). Confirm no *new* errors/warnings after the task.
- No browser automation is available in this environment. Any step that requires visually confirming rendered output must be explicitly disclosed as unverified rather than asserted.

---

### Task 1: Rebalance the profile/contact row and make the info grid responsive

**Files:**
- Modify: `app/dashboard/vendors/detail/page.tsx:98-145`
- Modify: `app/dashboard/vendors/detail/_components/vendor-profile-info.tsx:16`

**Interfaces:**
- Consumes: nothing new — no prop/type changes to either component.
- Produces: nothing new — purely presentational class changes, no new exports or signatures for other tasks to consume.

- [ ] **Step 1: Read both files to confirm their exact current contents before editing**

Run: view `app/dashboard/vendors/detail/page.tsx` and `app/dashboard/vendors/detail/_components/vendor-profile-info.tsx`. Confirm the two-column row still starts with:

```tsx
      <div className="flex gap-6">
        {/* Profile Information */}
        <VendorProfileInfo detail={vendor.detail} />

        {/* Contact Information */}
        <div className="flex flex-col gap-3">
```

and the info grid still reads:

```tsx
      <div className="grid grid-cols-2 gap-4 rounded-md border p-4 md:grid-cols-2">
```

If either differs, stop and re-read the file in full before proceeding — do not blindly apply the diffs below.

- [ ] **Step 2: Give both columns `flex-1 min-w-0` in `page.tsx`**

In `app/dashboard/vendors/detail/page.tsx`, change:

```tsx
      <div className="flex gap-6">
        {/* Profile Information */}
        <VendorProfileInfo detail={vendor.detail} />

        {/* Contact Information */}
        <div className="flex flex-col gap-3">
```

to:

```tsx
      <div className="flex gap-6">
        {/* Profile Information */}
        <div className="flex-1 min-w-0">
          <VendorProfileInfo detail={vendor.detail} />
        </div>

        {/* Contact Information */}
        <div className="flex flex-1 min-w-0 flex-col gap-3">
```

`VendorProfileInfo` itself takes no `className` prop, so it's wrapped in a `flex-1 min-w-0` div rather than modifying the component; the contact column already renders a `div` directly, so `flex-1 min-w-0` is added straight onto its existing `flex flex-col gap-3` classes.

- [ ] **Step 3: Make the info grid responsive in `vendor-profile-info.tsx`**

In `app/dashboard/vendors/detail/_components/vendor-profile-info.tsx`, change:

```tsx
      <div className="grid grid-cols-2 gap-4 rounded-md border p-4 md:grid-cols-2">
```

to:

```tsx
      <div className="grid grid-cols-1 gap-4 rounded-md border p-4 sm:grid-cols-2">
```

- [ ] **Step 4: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 6 pre-existing baseline errors (all in `lib/auth/permissions.ts`), nothing new.

- [ ] **Step 5: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing errors + 1 pre-existing warning, nothing new.

- [ ] **Step 6: Manual QA (disclosed as unverified — no browser automation in this environment)**

Note in the task result which of these were actually checked vs. left for the user:

1. On `/dashboard/vendors/detail?id={id}` at a wide viewport, "ข้อมูลผู้ค้า" and "ผู้ติดต่อ" columns are visually equal width.
2. Narrowing the viewport below `sm` collapses the info grid to 1 column; above `sm` it's 2 columns.
3. Long contact lists / long field values don't push one column wider than the other — both stay pinned to 50%, with `min-w-0` allowing text to wrap/truncate instead of overflowing.
4. Company vs. individual vendor both still render their correct field set (no fields dropped or reordered).

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/vendors/detail/page.tsx app/dashboard/vendors/detail/_components/vendor-profile-info.tsx
git commit -m "style(vendor-detail): rebalance profile/contact columns and responsive info grid"
```
