# Tender Project Search Bar + Status Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a search bar and status filter dropdown to the `tender-projects` stub page, matching the layout/behavior already duplicated in `users/page.tsx`, `vendors/page.tsx`, and `internal-employees/page.tsx` — display-only for now, no filtering logic, since there is neither a real data table nor a backend status enum yet.

**Architecture:** Single-file, frontend-only change to `frontend/app/dashboard/tender-projects/page.tsx`. A local `TenderProjectStatusFilter` union type and `STATUS_OPTIONS` array (module scope, same convention as `users/page.tsx`'s `TYPE_OPTIONS`/`STATUS_OPTIONS`), plus two `useState` hooks inside `TenderProjectsPageContent` for `search` and `statusFilter`. The controls render but are not wired to any list, query, or filter function — they just hold state, ready to be wired once a real data table exists.

**Tech Stack:** Next.js App Router + TypeScript + Tailwind v4 + existing `SearchInput`/`Select` UI primitives.

## Global Constraints

- Full spec: `docs/superpowers/specs/2026-08-31-tender-project-search-filter-design.md`.
- Monorepo root is `D:\E-Procurement-System`; this plan's file paths are given relative to that root (`frontend/...`).
- Branch `Internal`, working in place, no worktree — established repo convention.
- **Commit policy for this plan (explicit user instruction, overrides the executing-skill's normal per-task auto-commit default):** at the end of the task, `git add` the exact file touched only. Do **not** run `git commit`. The user reviews and commits manually when ready.
- Before staging, run `git status --short` first. `frontend/app/dashboard/tender-projects/page.tsx` has known ongoing parallel-session WIP (established repo pattern, already true of this exact file in an earlier plan on the same page) — re-read this specific file immediately before editing it, since its content may have drifted from what's quoted in this plan.
- No backend changes — `TenderProject.status` has no enum yet; the 5 status filter options (`all`/`draft`/`in_progress`/`completed`/`cancelled`) are frontend-only placeholders with no backend counterpart to validate against.
- No filtering, search, or data-fetching logic — `search` and `statusFilter` are `useState` values with no consumer beyond the controls themselves. Do not add a `useMemo`/filter function — there is nothing to filter yet.
- Frontend: no test runner exists in this repo — verify with `npx tsc --noEmit` and `npm run lint` (run from `frontend/`), not new test files.
- No browser automation tool available in this dev environment. Manual browser QA must be disclosed as unperformed/pending to the user in the final task step, not silently skipped.
- Follow the existing pattern exactly: `frontend/app/dashboard/users/page.tsx`'s `TYPE_OPTIONS`/`STATUS_OPTIONS` declarations and its `SearchInput` + `Select` JSX block are the template to mirror (component names, prop names, `SelectTrigger` className, `SelectContent` props).

---

### Task 1: Search bar + status filter controls in `tender-projects/page.tsx`

**Files:**
- Modify: `frontend/app/dashboard/tender-projects/page.tsx`

**Interfaces:**
- Consumes: `SearchInput` (existing, `frontend/components/search-input.tsx` — props `value: string`, `onValueChange: (next: string) => void`, `placeholder?: string`); `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue` (existing, `frontend/components/ui/select.tsx`); `TenderProjectStatsCards` (existing, from the prior plan, already imported in this file).
- Produces: nothing consumed elsewhere — terminal, page-local addition only.

- [ ] **Step 1: Re-read the current file before editing**

Run: `git status --short frontend/app/dashboard/tender-projects/page.tsx`, then read the file's current contents. A parallel session may have changed it since this plan was written (known ongoing WIP on this exact file). Locate:
1. The existing imports and the `PLACEHOLDER_STATS` constant (from the prior stat-cards plan).
2. The `<TenderProjectStatsCards ... />` line and whatever placeholder content follows it (at the time this plan was written: the literal text `asdw`).

If the file's structure no longer matches the shape described here, adapt the insertion point to add the new controls immediately after `<TenderProjectStatsCards />` and keep whatever placeholder content already follows — do not remove unrelated WIP.

- [ ] **Step 2: Add imports and module-scope type/constant**

Add these imports alongside the existing ones at the top of `frontend/app/dashboard/tender-projects/page.tsx`:

```tsx
import { SearchInput } from "@/components/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
```

Add this type and constant after the existing `PLACEHOLDER_STATS` constant, before `function TenderProjectsPageContent()`:

```tsx
type TenderProjectStatusFilter = "all" | "draft" | "in_progress" | "completed" | "cancelled";

const STATUS_OPTIONS: { value: TenderProjectStatusFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "draft", label: "ร่าง" },
  { value: "in_progress", label: "กำลังดำเนินการ" },
  { value: "completed", label: "เสร็จสิ้น" },
  { value: "cancelled", label: "ยกเลิก" },
];
```

- [ ] **Step 3: Add local state inside `TenderProjectsPageContent`**

At the top of the `TenderProjectsPageContent` function body, right after the `useBreadcrumb(...)` call, add:

```tsx
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<TenderProjectStatusFilter>("all");
```

- [ ] **Step 4: Render the search bar + status filter**

Insert this block immediately after `<TenderProjectStatsCards stats={PLACEHOLDER_STATS} />` and before the existing placeholder content (`asdw` at the time of writing):

```tsx
            <div className="flex flex-col gap-3 lg:flex-row">
                <SearchInput
                    value={search}
                    onValueChange={setSearch}
                    placeholder="ค้นหาชื่อโครงการ | รหัสโครงการ"
                />

                <Select
                    items={STATUS_OPTIONS}
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as TenderProjectStatusFilter)}
                >
                    <SelectTrigger className="lg:w-44 h-10! bg-white rounded-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent side="bottom" alignItemWithTrigger={false}>
                        {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
```

Using the file's shape as of this plan's writing, the full return block becomes:

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

            <div className="flex flex-col gap-3 lg:flex-row">
                <SearchInput
                    value={search}
                    onValueChange={setSearch}
                    placeholder="ค้นหาชื่อโครงการ | รหัสโครงการ"
                />

                <Select
                    items={STATUS_OPTIONS}
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as TenderProjectStatusFilter)}
                >
                    <SelectTrigger className="lg:w-44 h-10! bg-white rounded-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent side="bottom" alignItemWithTrigger={false}>
                        {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            asdw
        </div>
    );
```

If Step 1 found the file had drifted from this shape, apply the same relative change (the new controls block right after `<TenderProjectStatsCards />`, ahead of whatever else is already there) instead of overwriting unrelated content.

- [ ] **Step 5: Type-check, lint, and build**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no new errors

Run (from `frontend/`): `npm run lint`
Expected: no new errors

Run (from `frontend/`): `npm run build`
Expected: build succeeds (note: 2 pre-existing, unrelated tsc errors in `register/page.tsx` and `departments-positions/page.tsx` are known to make `next build`'s type-check step fail repo-wide regardless of this task — confirm via `git log`/`git diff` that these two errors predate this plan and are outside this task's files; do not attempt to fix them as part of this task)

- [ ] **Step 6: Disclose manual QA (not automated — no browser tool available in this environment)**

List these steps for the user to verify by hand:
1. Open `dashboard/tender-projects` → below the stat cards, a search box and a status dropdown render side by side (stacked on narrow widths, side-by-side from `lg`).
2. Typing in the search box updates its value and shows the clear ("X") button; nothing else on the page reacts (expected — no filtering wired yet).
3. Opening the status dropdown shows: ทั้งหมด, ร่าง, กำลังดำเนินการ, เสร็จสิ้น, ยกเลิก; selecting one updates the shown value; nothing else on the page reacts (expected).
4. Check both light and dark mode for the search box and dropdown.

- [ ] **Step 7: Stage the changes**

```bash
git status --short
git add frontend/app/dashboard/tender-projects/page.tsx
```

Do not run `git commit` — stage only, per this plan's commit policy.
