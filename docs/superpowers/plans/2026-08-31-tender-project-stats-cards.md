# Tender Project Stat Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 4-card stat summary (total project count, total budget, in-progress count, completed count) to the `tender-projects` stub page, built as a presentational component ready to wire up to a real query hook later.

**Architecture:** Frontend-only, one new presentational component (`TenderProjectStatsCards`) plus one new currency-formatting helper (`formatCurrency` in `lib/utils.ts`). The component takes pre-computed numbers as props — it does not fetch anything — mirroring how `VendorStatsCards` receives its `counts` prop from its caller. It additionally accepts an `isPending` prop that swaps each card's value for a `Skeleton`, so it drops in unchanged behind a real `useQuery` later. Since `TenderProject.status` has no fixed enum yet, `page.tsx` is wired with a local placeholder-numbers constant, not real data.

**Tech Stack:** Next.js App Router + TypeScript + Tailwind v4 + existing `Card`/`CardContent`/`Skeleton` UI primitives.

## Global Constraints

- Full spec: `docs/superpowers/specs/2026-08-31-tender-project-stats-cards-design.md`.
- Monorepo root is `D:\E-Procurement-System`; this plan's file paths are given relative to that root (`frontend/...`).
- Branch `Internal`, working in place, no worktree — established repo convention.
- **Commit policy for this plan (explicit user instruction, overrides the executing-skill's normal per-task auto-commit default):** at the end of each task, `git add` the exact files touched by that task only. Do **not** run `git commit`. The user reviews and commits manually when ready.
- Before staging, run `git status --short` first. `frontend/app/dashboard/tender-projects/page.tsx` has known ongoing parallel-session WIP (established repo pattern — see project memory on parallel sessions) — Task 3 re-reads this specific file immediately before editing it, since its content may have drifted from what's quoted in this plan.
- No backend changes in this plan — `TenderProject.status` has no enum yet, so no real status-based counts are computed here; this is placeholder UI only.
- Frontend: no test runner exists in this repo (confirmed via `package.json` — no jest/vitest/@testing-library, no `*.test.*` files anywhere). Verify every task with `npx tsc --noEmit` and `npm run lint` (run from `frontend/`), not with new test files.
- No browser automation tool (chromium-cli/Playwright) is available in this dev environment. Manual browser QA must be disclosed as unperformed/pending to the user in the final task, not silently skipped.
- Follow existing patterns exactly: card grid layout matches `frontend/app/dashboard/vendors/_components/vendor-stats-cards.tsx` (`grid grid-cols-2 gap-3 md:grid-cols-4`, `Card`/`CardContent`), but **not clickable** — no `role="button"`, `onClick`, `tabIndex`, or hover/active ring styling (explicit user decision: display-only, not a filter selector).

---

### Task 1: `formatCurrency` helper

**Files:**
- Modify: `frontend/lib/utils.ts`

**Interfaces:**
- Consumes: nothing new (plain function, no imports needed).
- Produces: `formatCurrency(value: number): string` — e.g. `formatCurrency(45000000)` → `"45,000,000 บาท"`. Consumed by Task 2's `TenderProjectStatsCards`.

- [ ] **Step 1: Append `formatCurrency` to `frontend/lib/utils.ts`**

Append at the end of the file, after the existing `formatPhone` export:

```ts

// จำนวนเงิน: 45,000,000 บาท
export const formatCurrency = (value: number) => `${new Intl.NumberFormat("th-TH").format(value)} บาท`
```

- [ ] **Step 2: Type-check and lint**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no new errors

Run (from `frontend/`): `npm run lint`
Expected: no new errors

- [ ] **Step 3: Stage the changes**

```bash
git status --short
git add frontend/lib/utils.ts
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 2: `TenderProjectStatsCards` component

**Files:**
- Create: `frontend/app/dashboard/tender-projects/_components/tender-project-stats-cards.tsx`

**Interfaces:**
- Consumes: `formatCurrency` (Task 1, `frontend/lib/utils.ts`); `Card`/`CardContent` (existing, `frontend/components/ui/card.tsx`); `Skeleton` (existing, `frontend/components/ui/skeleton.tsx`).
- Produces: `TenderProjectStats = { totalCount: number; totalBudget: number; inProgressCount: number; completedCount: number }` (exported type); `TenderProjectStatsCards({ stats: TenderProjectStats; isPending?: boolean }): JSX.Element` (named export). Consumed by Task 3's `page.tsx`.

- [ ] **Step 1: Create `frontend/app/dashboard/tender-projects/_components/tender-project-stats-cards.tsx`**

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

export type TenderProjectStats = {
  totalCount: number;
  totalBudget: number;
  inProgressCount: number;
  completedCount: number;
};

const STAT_ITEMS: {
  key: keyof TenderProjectStats;
  label: string;
  format: (value: number) => string;
}[] = [
  { key: "totalCount", label: "จำนวนโครงการทั้งหมด", format: (value) => String(value) },
  { key: "totalBudget", label: "งบประมาณรวม", format: formatCurrency },
  { key: "inProgressCount", label: "กำลังดำเนินการ", format: (value) => String(value) },
  { key: "completedCount", label: "เสร็จสิ้นแล้ว", format: (value) => String(value) },
];

export function TenderProjectStatsCards({
  stats,
  isPending,
}: {
  stats: TenderProjectStats;
  isPending?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {STAT_ITEMS.map((item) => (
        <Card key={item.key} className="shadow-md border-0">
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            {isPending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold text-foreground">
                {item.format(stats[item.key])}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no new errors

Run (from `frontend/`): `npm run lint`
Expected: no new errors

- [ ] **Step 3: Stage the changes**

```bash
git status --short
git add frontend/app/dashboard/tender-projects/_components/tender-project-stats-cards.tsx
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 3: Wire placeholder stats into `tender-projects/page.tsx`, verification, manual QA

**Files:**
- Modify: `frontend/app/dashboard/tender-projects/page.tsx`

**Interfaces:**
- Consumes: `TenderProjectStatsCards`, `TenderProjectStats` (Task 2).
- Produces: nothing new — terminal task, wires the component into the page.

- [ ] **Step 1: Re-read the current file before editing**

Run: `git status --short frontend/app/dashboard/tender-projects/page.tsx`, then read the file's current contents. A parallel session may have changed it since this plan was written (known ongoing WIP on this exact file — see project memory on parallel sessions). Locate:
1. The closing `</div>` of the header block (the `<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">...</div>` wrapper containing the `<h1>`).
2. Whatever placeholder content currently follows it inside `TenderProjectsPageContent`'s returned JSX (at the time this plan was written, this was the literal text `asdw`).

If the file's structure no longer matches the shape described here (e.g. the header markup itself changed), adapt the insertion point to place the new component immediately after the header block and keep whatever placeholder content already follows it — do not remove unrelated WIP.

- [ ] **Step 2: Add the import and placeholder stats constant**

At the top of `frontend/app/dashboard/tender-projects/page.tsx`, add this import alongside the existing ones:

```tsx
import {
  TenderProjectStatsCards,
  type TenderProjectStats,
} from "./_components/tender-project-stats-cards";
```

Add this constant after the existing imports, before `function TenderProjectsPageContent()`:

```tsx
// ข้อมูลตัวอย่าง รอต่อ query hook จริงเมื่อ backend มี endpoint รายการโครงการ
const PLACEHOLDER_STATS: TenderProjectStats = {
  totalCount: 12,
  totalBudget: 45000000,
  inProgressCount: 5,
  completedCount: 4,
};
```

- [ ] **Step 3: Render the stat cards after the header**

Insert `<TenderProjectStatsCards stats={PLACEHOLDER_STATS} />` immediately after the header block's closing `</div>` identified in Step 1, before the existing placeholder content. Using the file's shape as of this plan's writing, the return block becomes:

```tsx
    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">จัดการโครงการจัดซื้อจัดจ้าง</h1>
                    <p className="text-sm text-gray-600 tracking-wide">
                        ภาพรวมโครงการทั้งหมดและ TOR ที่เกี่ยวข้อง
                    </p>
                </div>
            </div>

            <TenderProjectStatsCards stats={PLACEHOLDER_STATS} />

            asdw
        </div>
    );
```

If Step 1 found the file had drifted from this shape, apply the same relative change (new `<TenderProjectStatsCards ... />` line right after the header block, ahead of whatever else is already there) instead of overwriting unrelated content.

- [ ] **Step 4: Type-check, lint, and build**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no new errors

Run (from `frontend/`): `npm run lint`
Expected: no new errors

Run (from `frontend/`): `npm run build`
Expected: build succeeds

- [ ] **Step 5: Disclose manual QA (not automated — no browser tool available in this environment)**

List these steps for the user to verify by hand:
1. Open `dashboard/tender-projects` → below the page header, a row of 4 cards renders: "จำนวนโครงการทั้งหมด" (12), "งบประมาณรวม" (45,000,000 บาท), "กำลังดำเนินการ" (5), "เสร็จสิ้นแล้ว" (4).
2. Cards are laid out 2-per-row on narrow/mobile widths and 4-per-row from the `md` breakpoint up.
3. Cards are **not** clickable — no pointer cursor, no hover ring, clicking does nothing.
4. Check both light and dark mode for the card text/background contrast.

- [ ] **Step 6: Stage the changes**

```bash
git status --short
git add frontend/app/dashboard/tender-projects/page.tsx
```

Do not run `git commit` — stage only, per this plan's commit policy.
