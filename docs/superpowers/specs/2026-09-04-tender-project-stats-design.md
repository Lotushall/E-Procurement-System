# Tender Projects: Stats (count/sum)

## Problem

The frontend's `TenderProjectStatsCards` component
(`2026-08-31-tender-project-stats-cards-design.md`) renders 4 summary
numbers (total count, total budget, in-progress count, completed count) on
placeholder data. The list endpoint added in
`2026-09-02-tender-project-list-query-design.md` explicitly left
"any stats/aggregation endpoint (total budget, counts by status, etc.)" out
of scope. That data doesn't exist yet.

## Scope

Backend only. Add a global (not filtered by the list's search/status/
department/fiscal-year params) stats aggregate, exposed through the
existing `GET /tender-projects` list endpoint's response `meta`. No new
route, no frontend wiring.

## Design

### Status → stat bucket mapping

DB `status` enum: `draft/published/closed/completed/cancelled/archived`.
The stat cards need 4 numbers:

- `totalCount` / `totalBudget`: every project, every status (draft, closed,
  cancelled, archived included) — a literal grand total, not filtered to
  "active" projects.
- `inProgressCount`: `status = 'published'` only.
- `completedCount`: `status = 'completed'` only.

`closed`, `cancelled`, `draft`, `archived` don't map to any of the 4 cards
individually — they're only reflected in `totalCount`/`totalBudget`.

### Query: `GetTenderProjectStatsQuery`

New file, `App\Modules\Tender\Application\Project\Queries`, naming
mirrors this module's existing single-result `Get*Query` classes
(`GetUserByIdQuery`, `GetVendorProfileQuery`):

```php
final class GetTenderProjectStatsQuery
{
    public function execute(): array
    {
        $stats = TenderProjects::query()
            ->selectRaw(
                'COUNT(*) as total_count, '.
                'SUM(budget) as total_budget, '.
                'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as in_progress_count, '.
                'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed_count',
                ['published', 'completed'],
            )
            ->first();

        return [
            'totalCount' => (int) $stats->total_count,
            'totalBudget' => (float) $stats->total_budget,
            'inProgressCount' => (int) $stats->in_progress_count,
            'completedCount' => (int) $stats->completed_count,
        ];
    }
}
```

One aggregate query (not 4 separate `count()`/`sum()` calls). No scopes
applied — deliberately independent of whatever filters the list request
carries. `(float)`/`(int)` casts handle the zero-rows case (`SUM(...)` over
no rows is `NULL`; `(float) null === 0.0`, `(int) null === 0`), so no
`COALESCE` is needed.

### Controller wiring

`TenderProjectController` gets a new constructor-injected
`GetTenderProjectStatsQuery $getTenderProjectStats`. In `index()`, `meta`
gains a `stats` key:

```php
return response()->json([
    'data' => TenderProjectResource::collection($projects->getCollection()),
    'meta' => [
        'currentPage' => $projects->currentPage(),
        'lastPage' => $projects->lastPage(),
        'perPage' => $projects->perPage(),
        'total' => $projects->total(),
        'stats' => $this->getTenderProjectStats->execute(),
    ],
]);
```

`stats`'s shape (`totalCount`, `totalBudget`, `inProgressCount`,
`completedCount`) matches the frontend's existing `TenderProjectStats` type
in `tender-project-stats-cards.tsx` exactly — no frontend type change
needed when this gets wired up later.

No new authorization: `stats` piggybacks on the same
`can:tender-projects.index` gate already guarding the list endpoint.

### Testing

- New `tests/Feature/Modules/Tender/GetTenderProjectStatsQueryTest.php`
  (mirrors `ListTenderProjectsQueryTest.php`): counts and sums correctly
  across mixed statuses, `inProgressCount` only counts `published`,
  `completedCount` only counts `completed`, `totalCount`/`totalBudget`
  include every status, and the zero-projects case returns `0`/`0.0` (not
  null / an error).
- `ListTenderProjectsTest.php`: add `stats` (with its 4 keys) to the
  existing `assertJsonStructure` for `meta`; add a test that `meta.stats`
  stays the same (global) regardless of the list's own filters — e.g.
  create projects across multiple statuses, request with `?status=`
  narrowing `data` to one, assert `meta.stats.totalCount` still reflects
  every project.

## Out of scope

- Any new route/endpoint — `stats` is embedded in the existing list
  response only.
- Frontend wiring (`useTenderProjectsList`, `page.tsx`, replacing
  `PLACEHOLDER_STATS`).
- Reconciling the frontend's placeholder status filter values
  (`draft/in_progress/completed/cancelled`) with the real DB enum — already
  noted out of scope in the list-query design, unchanged here.
- Per-status counts beyond the 4 cards (e.g. a `draft` or `archived`
  count) — not something the current UI shows.
