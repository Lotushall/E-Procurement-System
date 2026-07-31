# Vendor List Page — Stats Cards, Status Dropdown, Search

## Context

`app/dashboard/vendors/page.tsx` (currently: `app/dashboard/vendors/page.tsx:1-13`) is still a stub — just a breadcrumb and an `<h1>`. The Tabs-based list design in `docs/superpowers/specs/2026-07-30-vendor-approval-dashboard-design.md` (Part 6) was never implemented; only the pieces it depended on exist today:

- `lib/vendor-approval/{types,api,useVendorList,useVendorDetail,mutations}.ts` — unchanged, reused as-is.
- `app/dashboard/vendors/_components/vendor-row.tsx` — unchanged, reused as-is.
- `app/dashboard/vendors/_components/reject-reason-dialog.tsx`, `components/vendor-status-badge.tsx` — used by the (already-built) detail page, not touched here.
- `app/dashboard/vendors/[id]/` (detail page) — already built per the 2026-07-30 spec, out of scope for this change.

**This spec supersedes Part 6 of the 2026-07-30 spec only.** Talking with the user this session, the list page's filter UI and default view changed from what that spec originally proposed:

| | 2026-07-30 spec (Part 6, unbuilt) | This spec |
|---|---|---|
| Filter control | `Tabs` (3 tabs) | `Select` dropdown |
| Default view | "รออนุมัติ" (pending only) | "ทั้งหมด" (all statuses combined) |
| Overview | none | 4 stat cards (total/pending/approved/rejected), clickable to filter |
| Search | none | client-side search box, filters by `displayName` |

The backend still has no route for `/api/v1/vendors` (confirmed: no `routes/api/v1/vendors.php`, only the self-service `routes/api/v1/vendor.php`). Same disclosed caveat as the original spec — this page will compile and render but its API calls 404 until a separate backend session implements the contract already defined in `lib/vendor-approval/api.ts`.

## Scope decisions (confirmed with user)

- **Filter control: `Select` dropdown**, not tabs — user's explicit choice when asked.
- **Default view: "all"**, combined across every status, not pending-only.
- **Stats cards: 4 cards** (ทั้งหมด / รอตรวจสอบ / อนุมัติแล้ว / ถูกปฏิเสธ). Clicking a card sets the same filter state as the dropdown (they stay in sync — either control can drive the filter).
- **Stats cards always show totals**, regardless of the search box — search only narrows the list below, not the counts.
- **Search: client-side only**, matches `displayName` case-insensitively. No API param exists for this (contract in `lib/vendor-approval/api.ts` takes only `status`), so this is local `Array.filter`, not a new query.
- **List sort: `submittedAt` descending** (newest application first) — reasonable default for a review queue, wasn't specified by an existing convention since no list page renders more than one status today.

## Data layer (no changes)

Reuses `useVendorList(status)` three times — once each for `"pending"`, `"approved"`, `"rejected"` — called in parallel from the same component. React Query dedupes/parallelizes by `queryKey` (`["vendors", status]`) automatically; no new hook is needed to fetch "all" since the three arrays are simply concatenated client-side.

- `isPending` = true while any of the three queries hasn't resolved yet (stat cards need all three counts before they mean anything).
- `isError` = true if any of the three queries failed.

## New: `app/dashboard/vendors/_components/vendor-stats-cards.tsx`

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { VendorVerificationStatus } from "@/lib/vendor-approval/types";

export type VendorListFilter = "all" | VendorVerificationStatus;

const STAT_STYLE: Record<VendorListFilter, { label: string; ring: string; text: string }> = {
  all: { label: "ทั้งหมด", ring: "ring-foreground/30", text: "text-foreground" },
  pending: { label: "รอตรวจสอบ", ring: "ring-yellow-600/40", text: "text-yellow-600" },
  approved: { label: "อนุมัติแล้ว", ring: "ring-green-800/40", text: "text-green-800" },
  rejected: { label: "ถูกปฏิเสธ", ring: "ring-red-600/40", text: "text-red-600" },
};

const STATS_ORDER: VendorListFilter[] = ["all", "pending", "approved", "rejected"];

export function VendorStatsCards({
  counts,
  active,
  onSelect,
}: {
  counts: Record<VendorListFilter, number>;
  active: VendorListFilter;
  onSelect: (filter: VendorListFilter) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {STATS_ORDER.map((key) => {
        const style = STAT_STYLE[key];
        return (
          <Card
            key={key}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(key);
            }}
            className={cn(
              "cursor-pointer transition-shadow",
              active === key ? cn("ring-2", style.ring) : "hover:ring-foreground/20",
            )}
          >
            <CardContent className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">{style.label}</p>
              <p className={cn("text-2xl font-bold", style.text)}>{counts[key]}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

## New: `app/dashboard/vendors/_components/vendor-list-view.tsx`

Follows the same `page.tsx` → `_components/*-view.tsx` split already used by the detail page (`app/dashboard/vendors/[id]/page.tsx` → `vendor-detail-view.tsx`), so `page.tsx` stays trivial:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { useVendorList } from "@/lib/vendor-approval/useVendorList";
import type { VendorSummary } from "@/lib/vendor-approval/types";
import { VendorRow } from "./vendor-row";
import { VendorStatsCards, type VendorListFilter } from "./vendor-stats-cards";

const STATUS_OPTIONS: { value: VendorListFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "pending", label: "รอตรวจสอบ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "rejected", label: "ถูกปฏิเสธ" },
];

const EMPTY_MESSAGE: Record<VendorListFilter, string> = {
  all: "ยังไม่มีผู้ค้าลงทะเบียนในระบบ",
  pending: "ไม่มีผู้ค้าที่รอตรวจสอบ",
  approved: "ไม่มีผู้ค้าที่อนุมัติแล้ว",
  rejected: "ไม่มีผู้ค้าที่ถูกปฏิเสธ",
};

export function VendorListView() {
  useBreadcrumb([{ label: "ผู้ค้าที่ลงทะเบียน" }]);

  const [filter, setFilter] = useState<VendorListFilter>("all");
  const [search, setSearch] = useState("");

  const pending = useVendorList("pending");
  const approved = useVendorList("approved");
  const rejected = useVendorList("rejected");

  const isPending = pending.isPending || approved.isPending || rejected.isPending;
  const isError = pending.isError || approved.isError || rejected.isError;

  const counts: Record<VendorListFilter, number> = {
    all: (pending.data?.length ?? 0) + (approved.data?.length ?? 0) + (rejected.data?.length ?? 0),
    pending: pending.data?.length ?? 0,
    approved: approved.data?.length ?? 0,
    rejected: rejected.data?.length ?? 0,
  };

  const merged: VendorSummary[] = useMemo(() => {
    const byFilter: Record<VendorListFilter, VendorSummary[]> = {
      all: [...(pending.data ?? []), ...(approved.data ?? []), ...(rejected.data ?? [])],
      pending: pending.data ?? [],
      approved: approved.data ?? [],
      rejected: rejected.data ?? [],
    };
    return [...byFilter[filter]].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
  }, [filter, pending.data, approved.data, rejected.data]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return merged;
    return merged.filter((vendor) => vendor.displayName.toLowerCase().includes(term));
  }, [merged, search]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">ผู้ค้าที่ลงทะเบียน</h1>

      <VendorStatsCards counts={counts} active={filter} onSelect={setFilter} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อผู้ค้า"
          className="sm:max-w-xs"
        />
        <Select value={filter} onValueChange={(value) => setFilter(value as VendorListFilter)}>
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-6" />
        </div>
      ) : isError ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          ไม่สามารถโหลดข้อมูลผู้ค้าได้ กรุณาลองใหม่อีกครั้ง
        </p>
      ) : visible.length > 0 ? (
        <div className="flex flex-col gap-2">
          {visible.map((vendor) => (
            <VendorRow key={vendor.id} vendor={vendor} />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {search.trim() ? "ไม่พบผู้ค้าที่ตรงกับคำค้นหา" : EMPTY_MESSAGE[filter]}
        </p>
      )}
    </div>
  );
}
```

## Modify: `app/dashboard/vendors/page.tsx`

Becomes a thin wrapper, matching the detail page's convention:

```tsx
"use client";

import { VendorListView } from "./_components/vendor-list-view";

export default function VendorListPage() {
  return <VendorListView />;
}
```

The `useBreadcrumb` call moves into `vendor-list-view.tsx` (see above) — same behavior, just relocated with the rest of the page's logic.

## Error handling

- Loading: `Spinner`, shown until all three status queries resolve (stat cards need every count before they're meaningful — a partial render would show wrong totals).
- Fetch error (any of the three queries): static message "ไม่สามารถโหลดข้อมูลผู้ค้าได้ กรุณาลองใหม่อีกครั้ง" — no retry button, matching the depth of error handling elsewhere in this app (e.g. the detail page's `isError` branch has no retry either).
- Empty states are context-aware: search-with-no-match gets its own message ("ไม่พบผู้ค้าที่ตรงกับคำค้นหา") distinct from a genuinely empty status bucket (`EMPTY_MESSAGE[filter]`), so a user searching doesn't mistake "no results for this search" for "there are no vendors in this status at all."
- No new guard needed — `/dashboard/vendors` is already covered by `InternalGuard` in `app/dashboard/layout.tsx`.

## Out of scope

- **Backend implementation** of `/api/v1/vendors` — unchanged from the 2026-07-30 spec's "Out of scope"; still a separate session.
- **Pagination** — the API contract has no `page` param; not addressed here.
- **Server-side search** — search stays client-side against whatever the three status queries already returned; there's no API search param to call instead.
- **Bulk approve/reject** from the list page — still detail-page-only, per the original spec.
- **Sort control** — fixed to `submittedAt` descending; no UI to change sort order.
- Any change to the detail page (`app/dashboard/vendors/[id]/`) or to `lib/vendor-approval/*` — both are reused unchanged.

## Testing

No test runner is configured in this repo (same as the 2026-07-30 spec). Verification is `npx tsc --noEmit` / `npm run lint` / `npm run build`, plus disclosed manual QA — no browser automation available in this environment, so runtime/visual claims will be stated as unverified rather than asserted.

Once the backend contract exists, manual QA should cover:

1. `/dashboard/vendors` loads with "ทั้งหมด" selected by default, stat cards show correct totals per status.
2. Clicking each stat card updates both the dropdown's selected value and the list below; selecting a different value in the dropdown updates the active stat card the same way (both controls stay in sync).
3. Typing in the search box narrows the current filter's list by `displayName`, without changing the stat card counts.
4. Empty combinations: a status with zero vendors shows `EMPTY_MESSAGE[filter]`; a search with no matches shows "ไม่พบผู้ค้าที่ตรงกับคำค้นหา" instead.
5. "ดูรายละเอียด" on any row still navigates to `/dashboard/vendors/[id]` as before (unchanged `VendorRow`).
6. Sidebar's "อนุมัติผู้ขาย" item stays highlighted on `/dashboard/vendors` (unchanged, no sidebar changes in this spec).
