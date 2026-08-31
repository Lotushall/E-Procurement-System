# Tender Projects: Stat Cards

## Problem

`app/dashboard/tender-projects/page.tsx` is a stub (header + a literal
placeholder string) — the list, data hook, and backend list endpoint don't
exist yet. The user wants a summary stat-card row for this page (total
project count, total budget, in-progress count, completed count) built now,
ahead of the real data table, so it's ready to wire up once the list query
lands.

## Scope

Frontend only, in `frontend/`. One new presentational component plus a
currency formatting helper, inserted into the existing stub page with
placeholder numbers. No backend changes, no real data fetching — the
`TenderProject` domain entity's `status` field has no fixed enum yet, so
there's nothing to compute in-progress/completed counts from today.

## Design

### `TenderProjectStatsCards` component

New file: `app/dashboard/tender-projects/_components/tender-project-stats-cards.tsx`.
Purely presentational — no fetching, no click/filter behavior (unlike
`VendorStatsCards`, which doubles as a filter selector for the vendor list).
Props:

```ts
type TenderProjectStats = {
  totalCount: number;
  totalBudget: number; // baht
  inProgressCount: number;
  completedCount: number;
};

function TenderProjectStatsCards({
  stats,
  isPending,
}: {
  stats: TenderProjectStats;
  isPending?: boolean;
});
```

Renders 4 cards in `grid grid-cols-2 md:grid-cols-4 gap-3` (same grid as
`VendorStatsCards`), plain `Card`/`CardContent`, no `role="button"` /
`onClick` / hover ring. Fixed order: จำนวนโครงการทั้งหมด → งบประมาณรวม →
กำลังดำเนินการ → เสร็จสิ้นแล้ว. When `isPending` is true, each card renders a
`Skeleton` (`@/components/ui/skeleton`) in place of its value — sized to roughly
match the number/currency text — so the same component drops in later behind
a real `useQuery`'s `isPending` with no prop-shape changes.

### Currency formatting

Add to `lib/utils.ts` (next to `formatPhone`):

```ts
export const formatCurrency = (value: number) =>
  `${new Intl.NumberFormat("th-TH").format(value)} บาท`
```

### Wiring into the stub page

In `tender-projects/page.tsx`, add a local `PLACEHOLDER_STATS` constant with
illustrative numbers (not zeros, so the layout is checkable at a glance) and
render `<TenderProjectStatsCards stats={PLACEHOLDER_STATS} />` right after
the header, before the existing `asdw` placeholder. A one-line comment marks
it as placeholder data pending the real list query, so whoever wires up the
API next (this page has ongoing parallel-session WIP) knows to replace it.

### Testing

No browser automation available in this environment. Verification is
`tsc`/lint plus manually describing the rendered layout; visual correctness
claims are scoped to what static checks confirm.

## Out of scope

- Any backend change, or defining the `TenderProject.status` enum.
- Wiring real data (query hook, API call) — placeholder props only.
- Click-to-filter behavior on the cards.
- Touching any other part of the in-progress `tender-projects` page beyond
  inserting this component.
