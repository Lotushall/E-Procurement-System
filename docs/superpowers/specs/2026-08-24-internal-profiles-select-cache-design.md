# Internal Profiles: Department/Position Select (Cached)

## Problem

The frontend needs a lightweight source of department/position options for a
`<select>` dropdown (e.g. when creating/editing an internal profile). The
existing `GET /api/v1/dashboard/departments` and `.../positions` endpoints are
built for the management page: they attach `internalProfilesCount` and are
already consumed there. Reusing them for a dropdown means shipping unneeded
data. Department/position data changes rarely, so the new endpoint should be
cached.

## Scope

Backend only. The frontend hooks (`useDepartments.ts`, `usePositions.ts`) are
out of scope for this change and will consume the new endpoint separately.

## Design

### New endpoints

- `GET /api/v1/dashboard/departments/select`
- `GET /api/v1/dashboard/positions/select`

Both gated by `role:admin`, same as every other route in this route group.
Response shape: `{"data": [{"id": 1, "name": "IT"}, ...]}`, ordered by `name`.

### Query layer

New `ListDepartmentOptionsQuery` / `ListPositionOptionsQuery` classes in
`Application/Queries/`, alongside the existing `ListDepartmentsQuery` /
`ListPositionsQuery`. Each:

- Queries `Department::query()->orderBy('name')->get(['id', 'name'])`
  (or `Position` equivalent), mapped to a plain array of
  `['id' => int, 'name' => string]`.
- Wraps the query in `app_cache_remember($key, null, $callback)` (permanent
  cache, no TTL).

**Cache value must be a plain array, not an Eloquent model/Collection.**
`config/cache.php` sets `serializable_classes => false` (Laravel 13 hardening
default), which blocks unserializing arbitrary objects from cache stores that
serialize (database, file, redis). Caching Eloquent objects would silently
break on read. Plain arrays of scalars are unaffected and require no config
changes.

Cache keys: `internal-profiles.departments.select`,
`internal-profiles.positions.select`.

### Cache invalidation

New `DepartmentObserver` / `PositionObserver` in
`Infrastructure/Observers/`, each implementing `saved()` and `deleted()` to
call `app_cache_forget($key)`. Registered on the models via the
`#[ObservedBy([...])]` attribute (same attribute-based style already used for
`#[Fillable(['name'])]` on these models), so every mutation path — not just
today's use cases — busts the cache automatically.

### Controllers

Add a `select()` action to the existing `DepartmentController` and
`PositionController`, injecting the new query classes alongside the existing
ones. No new controllers.

### Routes

Add the two `/select` routes to
`routes/api/v1/dashboard/internal-profiles.php`, inside the existing
`departments` / `positions` route groups, with `role:admin` middleware
matching the sibling routes.

### Testing

Feature tests per resource (department, position) covering:

- Requires authentication (401).
- Requires the `admin` role (403 otherwise).
- Response contains only `id` and `name` (no `internalProfilesCount`),
  ordered by name.
- Cache invalidates on create/update/delete: warm the cache via a `select`
  call, mutate through the existing store/update/destroy endpoints, call
  `select` again, assert the change is reflected.

## Out of scope

- Frontend consumption of the new endpoint.
- Changing the existing `/departments` and `/positions` management endpoints.
- Cache invalidation for data changed outside Eloquent (e.g. raw DB queries,
  seeders) — none exist today; the observer covers all current mutation
  paths.
