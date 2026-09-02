# Tender Projects: List Query Endpoint

## Problem

`TenderProjectController` only has `store` — there is no way to list or
search tender projects yet. The frontend's `tender-projects/page.tsx`
already has a search box and status filter wired to local state
(`2026-08-31-tender-project-search-filter-design.md`) and stats cards on
placeholder numbers (`2026-08-31-tender-project-stats-cards-design.md`),
both waiting on a real backend list endpoint.

## Scope

Backend only. A `GET` list/index endpoint for Tender Projects: request
validation, filtering, sorting, pagination, authorization, and the JSON
response shape. Frontend wiring (connecting the existing search/filter/stats
UI to this endpoint) and any stats/aggregation endpoint (total budget,
in-progress count, etc.) are separate, out of scope here.

## Design

### Architecture choice

`TenderProjectController::store` follows this module's DDD write path
(domain entity `TenderProject` + `TenderProjectRepositoryInterface` +
`CreateTenderProjectUseCase`). For the list/read path, this design follows
the simpler convention used everywhere else in the codebase for lists
(`ListUsersQuery`, `VendorApprovalController::index`, etc.): the Application
query class queries the Eloquent model (`TenderProjects`) directly, with
model-level `#[Scope]` filters — no repository or domain-entity involvement.
`store`'s domain/repository layer is untouched.

### Authorization — permission vs. Gate ability naming

`TenderServiceProvider::boot()` documents why `tender-projects.store` (the
Gate ability) is a different string from `tender-projects.create` (the
permission `TenderProjectPolicy::create` checks via `checkPermissionTo`):
Spatie registers a `Gate::before` hook that grants access immediately
whenever the ability name exactly matches a permission the user holds,
bypassing the policy method (and its `user_type` guard) entirely. This
design follows the same split for listing:

- Permission (seeded manually into `AdminUserSeeder`, same as
  `tender-projects.create` was): `tender-projects.viewAny`.
- Policy method:
  ```php
  public function viewAny(User $user): bool
  {
      return $user->user_type === UserType::Internal
          && $user->checkPermissionTo('tender-projects.viewAny');
  }
  ```
- Gate ability (distinct name, registered in `TenderServiceProvider::boot()`):
  `tender-projects.index` → `Gate::define('tender-projects.index', [TenderProjectPolicy::class, 'viewAny'])`.
- Route middleware uses the Gate ability, not the permission:
  `->middleware('can:tender-projects.index')`.

### Route

`routes/api/v1/dashboard/tender-projects.php`:

```php
Route::get('tender-projects', [TenderProjectController::class, 'index'])
    ->middleware('can:tender-projects.index')
    ->name('dashboard.tender-projects.index');
```

### Request validation

New `ListTenderProjectsRequest` (`Presentation/Http/Requests/Project`), no
`authorize()` override (authorization lives in the route's `can:`
middleware, matching `ListUsersRequest`):

```php
public function rules(): array
{
    return [
        'search' => ['nullable', 'string', 'max:255'],
        'status' => ['nullable', 'string', Rule::in([
            'draft', 'published', 'closed', 'completed', 'cancelled', 'archived',
        ])],
        'department_id' => ['nullable', 'integer', 'exists:departments,id'],
        'fiscal_year' => ['nullable', 'integer'],
        'sort_by' => ['nullable', 'string', Rule::in(['created_at', 'name', 'budget', 'fiscal_year'])],
        'sort_direction' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
        'page' => ['nullable', 'integer', 'min:1'],
        'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
    ];
}
```

`status` is validated against the real DB enum
(`draft/published/closed/completed/cancelled/archived`), not the frontend's
current placeholder filter values (`draft/in_progress/completed/cancelled`
— see Out of scope). `department_id` existence is checked against the
`departments` table.

### Model scopes

New `#[Scope]` methods on `TenderProjects`, mirroring `User`'s:

- `search(Builder $query, ?string $search)`: when non-empty, `WHERE name LIKE %term% OR project_code LIKE %term%`.
- `status(Builder $query, ?string $status)`: `WHERE status = $status` when given.
- `departmentId(Builder $query, ?int $departmentId)`: `WHERE department_id = $departmentId` when given.
- `fiscalYear(Builder $query, ?int $fiscalYear)`: `WHERE fiscal_year = $fiscalYear` when given.
- `sort(Builder $query, ?string $sortBy, ?string $sortDirection = null)`: `orderBy` the given column if it's in `['name', 'budget', 'fiscal_year']`, else `created_at`; direction `asc` only when explicitly `'asc'`, else `desc`.

### Application query

New `ListTenderProjectsQuery` (`Application/Project/Queries`), mirroring
`ListUsersQuery`:

```php
final class ListTenderProjectsQuery
{
    private const DEFAULT_PER_PAGE = 20;

    public function execute(
        ?string $search = null,
        ?string $status = null,
        ?int $departmentId = null,
        ?int $fiscalYear = null,
        ?string $sortBy = null,
        ?string $sortDirection = null,
        ?int $page = null,
        ?int $perPage = null,
    ): LengthAwarePaginator {
        return TenderProjects::query()
            ->search($search)
            ->status($status)
            ->departmentId($departmentId)
            ->fiscalYear($fiscalYear)
            ->sort($sortBy, $sortDirection)
            ->orderByDesc('id')
            ->paginate(perPage: $perPage ?? self::DEFAULT_PER_PAGE, page: $page ?? 1);
    }
}
```

### Controller

```php
public function index(ListTenderProjectsRequest $request): JsonResponse
{
    $projects = $this->listTenderProjects->execute(
        search: $request->validated('search'),
        status: $request->validated('status'),
        departmentId: $request->validated('department_id'),
        fiscalYear: $request->validated('fiscal_year'),
        sortBy: $request->validated('sort_by'),
        sortDirection: $request->validated('sort_direction'),
        page: $request->validated('page'),
        perPage: $request->validated('per_page'),
    );

    return response()->json([
        'data' => TenderProjectResource::collection($projects->getCollection()),
        'meta' => [
            'currentPage' => $projects->currentPage(),
            'lastPage' => $projects->lastPage(),
            'perPage' => $projects->perPage(),
            'total' => $projects->total(),
        ],
    ]);
}
```

### Resource: supporting both the model and the domain entity

`TenderProjectResource::toArray()` currently assumes a `TenderProject`
domain entity (method calls: `$this->id()`, `$this->projectCode()->value`,
`$this->budget()->amount`). The list query returns raw `TenderProjects`
Eloquent rows (attribute access: `$model->id`, `$model->project_code`,
`$model->budget`). Rather than adding a second resource class, `toArray()`
branches on the resource's runtime type and builds the same camelCase shape
either way:

```php
public function toArray(Request $request): array
{
    return $this->resource instanceof TenderProjects
        ? $this->fromModel($this->resource)
        : $this->fromEntity($this->resource);
}

private function fromEntity(TenderProject $project): array
{
    // existing method-call based mapping, unchanged
}

private function fromModel(TenderProjects $model): array
{
    return [
        'id' => $model->id,
        'projectCode' => $model->project_code,
        'name' => $model->name,
        'description' => $this->whenNotNull($model->description),
        'budget' => $model->budget,
        'departmentId' => $model->department_id,
        'personInChargeId' => $this->whenNotNull($model->person_in_charge_id),
        'createdBy' => $model->created_by,
        'procurementMethod' => $model->procurement_method,
        'fiscalYear' => $model->fiscal_year,
        'projectStartAt' => $this->whenNotNull($model->project_start_at?->toIso8601String()),
        'projectEndAt' => $this->whenNotNull($model->project_end_at?->toIso8601String()),
        'status' => $model->status,
    ];
}
```

`$model->budget` (cast `decimal:2`) is already the same 2-decimal string
format as `Money::fromString($model->budget)->amount`, so both branches
produce an identical `budget` shape.

### Testing

A Pest feature test (e.g. `tests/Feature/Tender/ListTenderProjectsTest.php`)
covering:

- Authorized request returns paginated data in the documented shape.
- `search` matches by `name` and separately by `project_code`.
- `status`, `department_id`, `fiscal_year` filters each narrow results correctly.
- `sort_by` + `sort_direction` change ordering (including the default when omitted).
- Pagination `meta` (currentPage/lastPage/perPage/total) is correct.
- Request without the `tender-projects.viewAny` permission is rejected (403).
- Unauthenticated request is rejected.
- Invalid filter/sort value (e.g. unknown `status`) returns 422.

## Out of scope

- Frontend wiring: connecting `tender-projects/page.tsx`'s search input,
  status filter, or stats cards to this endpoint.
- Reconciling the frontend's placeholder status filter values
  (`draft/in_progress/completed/cancelled`) with the real DB enum
  (`draft/published/closed/completed/cancelled/archived`) — the frontend
  will need updating separately when it's actually wired up.
- Any stats/aggregation endpoint (total budget, counts by status, etc.).
- Changes to the `store` flow, domain entity, or repository.
