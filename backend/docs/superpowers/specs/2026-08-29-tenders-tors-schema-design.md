# Tender Project + TOR Schema Design

## Goal

Design the database schema for the procurement workflow's first slice:
recording a Tender Project, the TOR (Terms of Reference) documents that
describe the work being procured, vendor price submissions (bids) against a
TOR (including uploaded documents), the evaluation committee and scoring
criteria used to judge those bids, and the resulting contract/award record.

This is a schema-only spec (migrations only — no models, repositories, use
cases, controllers, or frontend).

## Background

The frontend already has placeholder nav entries and empty pages for this
area (`frontend/app/dashboard/tenders/page.tsx`,
`frontend/app/dashboard/tors/page.tsx`, sidebar labels "Tender Projects" and
"การจัดการ TOR"), but no fields or backend support exist yet. The backend
already has standalone `departments` and `positions` lookup tables
(`database/migrations/2026_08_19_153512_create_departments_table.php`,
`2026_08_19_153513_create_positions_table.php`, model
`App\Modules\InternalProfiles\Infrastructure\Models\Department`), and
`internal_profiles` already has a `department_id` FK to `departments` using
`->constrained()->restrictOnDelete()`
(`database/migrations/2026_08_19_153514_update_internal_profiles_add_department_and_position_id.php`).
This design reuses `departments` rather than introducing a new lookup table,
and follows the same `restrictOnDelete()` convention for it.

Users can be hard-deleted by the existing 30-day soft-delete purge job
(`PurgeSoftDeletedUsersUseCase`, see
`docs/superpowers/specs/2026-08-28-vendor-delete-and-purge-design.md`), so
any FK from these new tables to `users` must be `nullable()` +
`nullOnDelete()` — never `cascadeOnDelete()` — so a purge never silently
deletes a tender project, TOR, or bid.

**Follow-up needed on the existing purge job:** `vendor_profiles.id` is the
parent of `tor_bids.vendor_profile_id` (`cascadeOnDelete()`, see below), and
`vendor_profiles` itself cascades from `users` on hard delete. That means
purging a vendor user will DB-cascade-delete their `tor_bids`,
`tor_bid_documents`, and — if that bid won — its `tor_awards` and
`tor_award_documents` rows too, but — exactly like the `vendor_documents`
case already solved in the purge spec — the cascade never touches the
uploaded *files* on disk. Whoever implements bid-document and award-document
upload must extend `PurgeSoftDeletedUsersUseCase`'s file-cleanup step to
also delete `tor_bid_documents.file_path` and `tor_award_documents.file_path`
files before the user is force-deleted, the same way it already does for
`vendor_documents`.

## Relationship

- A Tender Project can have **zero, one, or many** TORs. A TOR belongs to
  **at most one** Tender Project (nullable FK on `tors`, not the other way
  around) — a TOR can exist as a standalone document before (or without
  ever) being attached to a project.
- A TOR can have many attached documents (`tor_documents`), following the
  same one-to-many file-attachment pattern already used by
  `vendor_documents` for vendor profiles.
- A TOR can receive many bids, one per vendor (`tor_bids`, unique on
  `tor_id` + `vendor_profile_id`) — a vendor submits/edits a single priced
  bid per TOR rather than a running history of submissions.
- Each bid can have many attached documents (`tor_bid_documents`), mirroring
  the `tor_documents` pattern.
- A TOR has many evaluation committee members (`tor_evaluation_committees`)
  and many scoring criteria (`tor_evaluation_criteria`), both scoped to that
  TOR specifically (a project's TORs can each have a different committee).
- Each bid can receive many scores (`tor_bid_scores`) — one row per
  criterion per evaluator, so a 3-person committee scoring 4 criteria
  produces up to 12 rows per bid.
- A bid that wins has **at most one** award/contract record (`tor_awards`,
  unique on `tor_bid_id`), which can have many attached documents
  (`tor_award_documents`), mirroring the `tor_documents` pattern again.

## Schema

### `tenders_projects`

```php
Schema::create('tenders_projects', function (Blueprint $table) {
    $table->id();
    $table->string('project_code')->unique();
    $table->string('name');
    $table->text('description')->nullable();
    $table->decimal('budget', 14, 2);
    $table->foreignId('department_id')->constrained()->restrictOnDelete();
    $table->foreignId('person_in_charge_id')->nullable()->constrained('internal_profiles')->nullOnDelete();
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->string('procurement_method');
    $table->unsignedSmallInteger('fiscal_year'); // ปีงบประมาณ
    $table->timestamp('project_start_at')->nullable();
    $table->timestamp('project_end_at')->nullable();
    $table->enum('status', ['draft', 'published', 'closed', 'completed', 'cancelled', 'archived'])->default('draft');
    $table->timestamps();
});
```

| Field | Notes |
|---|---|
| `project_code` | Unique human-readable project number, e.g. `e-GP-2569-0001`. |
| `budget` | Project's total budget. |
| `department_id` | Owning department. Required; `restrictOnDelete()` — a department in use cannot be deleted, matching `internal_profiles.department_id`'s existing convention. |
| `person_in_charge_id` | The responsible staff member. `nullable()` + `nullOnDelete()` — if the `internal_profiles` row is removed, the project stays but loses its assignee rather than being deleted or blocked. |
| `created_by` | The internal user who created the project. `nullable()` + `nullOnDelete()` per the hard-delete-purge concern above. |
| `procurement_method` | Free-text/string for now (e.g. `e-bidding`, `selective`, `specific`) — no fixed enum requested. |
| `fiscal_year` | Thai fiscal year (พ.ศ.), stored as a plain integer. |
| `project_start_at` / `project_end_at` | The project's own overall timeline. Deliberately generic (not "bidding" dates) — the actual per-lot bidding window now lives on `tors` (see below), since each TOR in a project can open/close for bids on its own schedule. |
| `status` | `draft → published → closed → completed`, with `cancelled` reachable from any non-terminal state, and `archived` as a final housekeeping state once a project is old enough to hide from active views. This tracks only the project's own administrative lifecycle — it deliberately has no `awarded` state. A project groups multiple TORs, and each TOR can be won by a different vendor, so "who won" is never a single project-level fact — it belongs on `tors.status` and `tor_bids.status` instead. No state-machine enforcement in this spec — just the column and its default. |

### `tors`

```php
Schema::create('tors', function (Blueprint $table) {
    $table->id();
    $table->string('tor_code')->unique();
    $table->string('title');
    $table->text('scope_of_work');
    $table->foreignId('department_id')->constrained()->restrictOnDelete();
    $table->foreignId('tender_project_id')->nullable()->constrained('tenders_projects')->nullOnDelete();
    $table->decimal('budget_estimate', 14, 2);
    $table->timestamp('bidding_start_at')->nullable();
    $table->timestamp('bidding_end_at')->nullable();
    $table->enum('status', [
        'draft', 'in_review', 'revision_required', 'approved',
        'published', 'bidding', 'evaluation', 'awarded',
        'cancelled', 'completed',
    ])->default('draft');
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamp('approved_at')->nullable();
    $table->text('remark')->nullable();
    $table->timestamps();
});
```

| Field | Notes |
|---|---|
| `tor_code` | Unique human-readable TOR number, independent of `project_code`. |
| `scope_of_work` | ขอบเขตงาน — the core content of the TOR. |
| `department_id` | Owning department. Kept independent of `tender_project_id` since a TOR can exist (and be authored) before any project links to it. |
| `tender_project_id` | Nullable — see Relationship above. `nullOnDelete()`: deleting a project must never delete or block-delete its TORs. |
| `budget_estimate` | ราคากลาง — the TOR's own budget estimate, deliberately separate from `tenders_projects.budget` since a TOR is written before a project necessarily exists. |
| `bidding_start_at` / `bidding_end_at` | The actual window vendors can submit a `tor_bids` row against this TOR — per-TOR because each lot within a project can open/close independently. Not enforced at the DB or application layer in this spec. |
| `status` | The TOR carries its own full procurement lifecycle, independent of `tenders_projects.status`: `draft → in_review → approved → published → bidding → evaluation → awarded → completed`, with `revision_required` looping a rejected review back for edits (instead of a dead-end `rejected`) and `cancelled` reachable from any non-terminal state. Each TOR progresses independently because TORs in the same project can go to different vendors and reach award on different timelines. `approved_by`/`approved_at` are only meaningful once `status` reaches `approved` or later; `remark` carries the reviewer's revision notes. This spec adds only the status value — recording *which* vendor won is `tor_bids.status = awarded` on the corresponding bid row, not a column here. |

### `tor_documents`

```php
Schema::create('tor_documents', function (Blueprint $table) {
    $table->id();
    $table->string('label');
    $table->foreignId('tor_id')->constrained()->cascadeOnDelete();
    $table->string('file_name');
    $table->string('file_path');
    $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
    $table->string('document_type')->nullable();
    $table->timestamps();
});
```

| Field | Notes |
|---|---|
| `label` | Display name for the attachment, e.g. "ขอบเขตงานฉบับเต็ม", "ภาคผนวก ก". |
| `document_type` | Optional free-text category (e.g. `scope`, `annex`, `drawing`) — no fixed enum. |

Mirrors the existing `vendor_documents` attachment pattern
(`database/migrations/0001_01_01_000000_create_users_table.php`):
`tor_id` cascades (an attachment is meaningless without its parent TOR),
`uploaded_by` nulls out on user purge. No `status`/`verified_by` columns —
unlike vendor documents, individual TOR attachments aren't independently
reviewed; the TOR's own `status` covers approval.

### `tor_bids`

```php
Schema::create('tor_bids', function (Blueprint $table) {
    $table->id();
    $table->foreignId('tor_id')->constrained()->cascadeOnDelete();
    $table->foreignId('vendor_profile_id')->constrained()->cascadeOnDelete();
    $table->decimal('price_offered', 14, 2);
    $table->enum('status', [
        'submitted', 'withdrawn', 'disqualified',
        'qualified', 'winner', 'lost',
    ])->default('submitted');
    $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamp('reviewed_at')->nullable();
    $table->text('remark')->nullable();
    $table->timestamps();

    $table->unique(['tor_id', 'vendor_profile_id']);
});
```

| Field | Notes |
|---|---|
| `tor_id` | The TOR being bid on. `cascadeOnDelete()` — a bid has no meaning without its TOR (same reasoning as `tor_documents.tor_id`). |
| `vendor_profile_id` | The bidding vendor. `cascadeOnDelete()`: if the vendor profile itself is ever removed (currently only reachable via the 30-day purge cascade — see the Background note above), its bids go with it. |
| `unique(tor_id, vendor_profile_id)` | One bid per vendor per TOR — a vendor edits their existing row (updating `price_offered`, re-uploading `tor_bid_documents`) up until the TOR leaves `bidding` status, rather than accumulating a new row per revision. |
| `price_offered` | The vendor's total price for the TOR. No line-item breakdown in this spec. |
| `status` | `submitted → qualified → winner`/`lost`, with `disqualified` branching off the qualification check and `withdrawn` reachable any time the vendor pulls their own bid before it's decided. `qualified`/`disqualified` reflects a technical pass/fail check; `winner`/`lost` is the price-comparison outcome among qualified bids. `reviewed_by`/`reviewed_at` are only meaningful once status moves past `submitted`; `remark` carries the reviewer's decision note (e.g. disqualification reason). |

### `tor_bid_documents`

```php
Schema::create('tor_bid_documents', function (Blueprint $table) {
    $table->id();
    $table->string('label');
    $table->foreignId('tor_bid_id')->constrained()->cascadeOnDelete();
    $table->string('file_name');
    $table->string('file_path');
    $table->string('document_type')->nullable();
    $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
});
```

Same shape as `tor_documents`, scoped to a bid instead of a TOR —
`tor_bid_id` cascades (an attachment is meaningless without its parent
bid), `uploaded_by` is the vendor's own user account and nulls out on purge.
Typical `document_type` values: price schedule, company profile, technical
proposal — free-text, no fixed enum, matching `tor_documents.document_type`.

### `tor_evaluation_committees`

```php
Schema::create('tor_evaluation_committees', function (Blueprint $table) {
    $table->id();
    $table->foreignId('tor_id')->constrained()->cascadeOnDelete();
    $table->foreignId('internal_profile_id')->nullable()->constrained('internal_profiles')->nullOnDelete();
    $table->enum('role', ['chairman', 'secretary', 'member'])->default('member');
    $table->timestamps();

    $table->unique(['tor_id', 'internal_profile_id']);
});
```

| Field | Notes |
|---|---|
| `internal_profile_id` | The assigned committee member. `nullable()` + `nullOnDelete()`, matching `tenders_projects.person_in_charge_id` — the assignment record (and any scores that member gave) survives even if their profile is later removed. |
| `role` | `chairman`/`secretary`/`member` — no uniqueness enforced on role (e.g. nothing stops two `chairman` rows at the DB level); left to the application layer. |
| `unique(tor_id, internal_profile_id)` | A person can only be assigned to a TOR's committee once. |

### `tor_evaluation_criteria`

```php
Schema::create('tor_evaluation_criteria', function (Blueprint $table) {
    $table->id();
    $table->foreignId('tor_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->decimal('max_score', 5, 2);
    $table->decimal('weight', 5, 2);
    $table->timestamps();
});
```

| Field | Notes |
|---|---|
| `name` | e.g. "ราคา", "คุณภาพทางเทคนิค", "ระยะเวลาส่งมอบ". |
| `max_score` | The full score achievable for this criterion (e.g. `100.00`). |
| `weight` | Percentage weight toward the bid's overall score (e.g. `40.00` for 40%). No DB-level check that weights across a TOR's criteria sum to 100 — left to the application layer. |

### `tor_bid_scores`

```php
Schema::create('tor_bid_scores', function (Blueprint $table) {
    $table->id();
    $table->foreignId('tor_bid_id')->constrained()->cascadeOnDelete();
    $table->foreignId('tor_evaluation_criterion_id')->constrained()->cascadeOnDelete();
    $table->foreignId('evaluator_id')->nullable()->constrained('internal_profiles')->nullOnDelete();
    $table->decimal('score', 5, 2);
    $table->text('remark')->nullable();
    $table->timestamps();

    $table->unique(['tor_bid_id', 'tor_evaluation_criterion_id', 'evaluator_id'], 'tor_bid_scores_unique');
});
```

| Field | Notes |
|---|---|
| `evaluator_id` | The committee member who gave this score. `nullable()` + `nullOnDelete()`, same reasoning as `tor_evaluation_committees.internal_profile_id` — a historical score is kept even if the evaluator's profile is later removed. |
| `score` | This evaluator's score for this bid on this criterion, out of the criterion's `max_score`. |
| `unique(...)`, named `tor_bid_scores_unique` | One score per evaluator per criterion per bid — a committee of 3 scoring 4 criteria produces up to 12 rows per bid. The default Laravel-generated index name (`tor_bid_scores_tor_bid_id_tor_evaluation_criterion_id_evaluator_id_unique`) is 74 characters, over MySQL's 64-character identifier limit, so the name is given explicitly. |

### `tor_awards`

```php
Schema::create('tor_awards', function (Blueprint $table) {
    $table->id();
    $table->foreignId('tor_bid_id')->unique()->constrained()->cascadeOnDelete();
    $table->string('contract_number')->unique();
    $table->date('contract_date');
    $table->decimal('contract_value', 14, 2);
    $table->date('start_date')->nullable();
    $table->date('end_date')->nullable();
    $table->foreignId('signed_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
});
```

| Field | Notes |
|---|---|
| `tor_bid_id` | The winning bid this contract is for. `unique()` — a bid can have at most one award record — and `cascadeOnDelete()`, matching the other `tor_bid_id` FKs. |
| `contract_number` | เลขที่สัญญา, unique. |
| `contract_value` | The final agreed value — deliberately separate from `tor_bids.price_offered` since negotiation can change the figure actually signed. |
| `start_date` / `end_date` | ระยะเวลาสัญญา. |
| `signed_by` | The internal user who executed the contract. `nullable()` + `nullOnDelete()` per the purge concern above. |

### `tor_award_documents`

```php
Schema::create('tor_award_documents', function (Blueprint $table) {
    $table->id();
    $table->string('label');
    $table->foreignId('tor_award_id')->constrained()->cascadeOnDelete();
    $table->string('file_name');
    $table->string('file_path');
    $table->string('document_type')->nullable();
    $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
});
```

Same shape as `tor_documents`/`tor_bid_documents`, scoped to an award —
`tor_award_id` cascades, `uploaded_by` nulls out on purge. Typical
`document_type` values: signed contract, purchase order, delivery
acceptance record.

## Migration file changes

- `database/migrations/2026_08_28_161804_create_tenders_projects_table.php`
  — `tenders_projects` schema above.
- `database/migrations/2026_08_28_161830_create_tors_table.php` — `tors`
  schema above. Timestamped after `tenders_projects`, so the nullable
  `tender_project_id` FK resolves correctly without reordering.
- `database/migrations/2026_08_29_090000_create_tor_documents_table.php` —
  `tor_documents` schema above (depends on `tors`).
- `database/migrations/2026_08_29_093000_create_tor_bids_table.php` —
  `tor_bids` schema above (depends on `tors` and `vendor_profiles`).
- `database/migrations/2026_08_29_093500_create_tor_bid_documents_table.php`
  — `tor_bid_documents` schema above (depends on `tor_bids`).
- `database/migrations/2026_08_29_100000_create_tor_evaluation_committees_table.php`
  — `tor_evaluation_committees` schema above (depends on `tors` and
  `internal_profiles`).
- `database/migrations/2026_08_29_100500_create_tor_evaluation_criteria_table.php`
  — `tor_evaluation_criteria` schema above (depends on `tors`).
- `database/migrations/2026_08_29_101000_create_tor_bid_scores_table.php` —
  `tor_bid_scores` schema above (depends on `tor_bids`,
  `tor_evaluation_criteria`, and `internal_profiles`).
- `database/migrations/2026_08_29_101500_create_tor_awards_table.php` —
  `tor_awards` schema above (depends on `tor_bids` and `users`).
- `database/migrations/2026_08_29_102000_create_tor_award_documents_table.php`
  — `tor_award_documents` schema above (depends on `tor_awards`).

## Out of scope

- Enforcing the TOR/project/bid status state machines (e.g. preventing
  `status = awarded` without `reviewed_by` set, or requiring a `tor_awards`
  row to exist before a bid's status can be `winner`) at the database or
  application layer — left for the implementation plan that builds the
  actual create/update endpoints.
- Computing a bid's overall weighted score from `tor_bid_scores` +
  `tor_evaluation_criteria.weight` — this spec stores the raw per-evaluator
  scores; aggregation is application logic, not a schema concern.
- Enforcing that a TOR's `tor_evaluation_criteria.weight` values sum to
  100%, or that only `chairman`/`secretary` committee roles appear once per
  TOR — both left to the application layer.
- New Eloquent models, repositories, use cases, controllers, routes,
  policies, or frontend forms — this spec covers only the table schema.
  Module placement (e.g. a new `App\Modules\Tender` module) and the rest of
  the application layer are implementation-plan decisions.
- Configurable/enum-constrained `procurement_method` values.
- Updating `PurgeSoftDeletedUsersUseCase` to clean up `tor_bid_documents`
  and `tor_award_documents` files on disk before a vendor is purged —
  flagged above as required follow-up work once upload is actually
  implemented, but not done in this schema-only pass.
