# Vendor Delete + Soft-Delete Auto-Purge Design

## Goal

Give Admin a way to delete a vendor from the Vendor dashboard, and add a
scheduled job that permanently purges any user account (vendor or internal)
that has been soft-deleted for more than 30 days.

## Background

The Vendor dashboard (`VendorApprovalController`, routes in
`routes/api/v1/dashboard/vendors.php`, resolving to bare `/api/v1/vendors/*`)
currently only supports index/show/approve/reject/pending. There is no way
to remove a vendor from this screen. A generic `DELETE
/api/v1/dashboard/users/{id}` already exists and can soft-delete any user
(including a vendor's `company`-type account), but it isn't exposed on the
vendor-specific screen and isn't scoped by vendor profile id.

`VendorProfile.userId` is a required, non-nullable field (unlike
`InternalProfile.userId`, which can be unlinked) — a vendor profile always
belongs to exactly one user account. `vendor_profiles.user_id`,
`vendor_company_details.vendor_profile_id`,
`vendor_individual_details.vendor_profile_id`,
`vendor_documents.vendor_profile_id`, and
`vendor_contact.vendor_profile_id` are all declared with
`->cascadeOnDelete()` at the database level (see
`database/migrations/0001_01_01_000000_create_users_table.php` and
`database/migrations/2026_07_15_143235_create_vendor_contact_table.php`).
This cascade is enforced by the database engine directly — it does **not**
go through Eloquent, so Eloquent model events on the cascaded child rows
never fire.

## Part A — Delete Vendor (soft delete)

### Behavior

Deleting a vendor soft-deletes the linked user account using the existing
`UserRepository::delete()` mechanism (already mutates
`username`/`email` to `{value}+deleted-{id}` so the originals become free to
reuse, then soft-deletes). All `vendor_profiles`/company or individual
detail/document/contact rows are left untouched in the database for audit
purposes. They disappear from the vendor list because the list query is
changed to exclude vendors whose linked user is soft-deleted.

No self-delete guard is needed: the acting user is always `internal`
type (enforced by policy) and the vendor being deleted is always `company`
type — they can never be the same account.

### New permission

`vendors.delete`, seeded in `database/seeders/AdminUserSeeder.php` next to
`vendors.view`/`vendors.review`, granted to the `admin` role. Also added to
`UserFactory::internal()`'s `afterCreating` permission grants (that state
already grants `vendors.view` + `vendors.review` and is the standard test
fixture for an authorized vendor-dashboard actor).

### New policy method

`VendorProfilePolicy::delete(User $user): bool` — same shape as `review()`:
`$user->user_type === UserType::Internal && $user->can('vendors.delete')`.

### New route

In `routes/api/v1/dashboard/vendors.php`:

```php
Route::delete('vendors/{id}', [VendorApprovalController::class, 'destroy'])
    ->middleware('can:vendors.delete')
    ->whereNumber('id')
    ->name('vendors.destroy');
```

Resolves to `DELETE /api/v1/vendors/{id}` (this file is not wrapped in a
`dashboard` prefix, matching its sibling routes).

### New use case

`App\Modules\Vendor\Application\Dashboard\UseCases\DeleteVendorProfileUseCase`:

```php
final class DeleteVendorProfileUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly UserRepositoryInterface $users,
        private readonly RevokeAllUserSessionsUseCase $revokeAllSessions,
    ) {}

    public function execute(int $vendorProfileId, int $actingUserId): void
    {
        $profile = $this->vendors->findProfileById($vendorProfileId)
            ?? throw new ModelNotFoundException("Vendor profile {$vendorProfileId} not found.");

        $userId = $profile->userId();

        $this->users->delete($userId);
        $this->revokeAllSessions->execute($userId);

        app_log('Vendor profile deleted', [
            'vendor_profile_id' => $vendorProfileId,
            'linked_user_id' => $userId,
            'acting_user_id' => $actingUserId,
        ], 'info', 'vendor');
    }
}
```

This depends on `UserRepositoryInterface` (User's Domain layer) and
`RevokeAllUserSessionsUseCase` (User's Application layer) directly, the same
cross-module pattern already used by
`DeleteInternalProfileUseCase` — deliberately not calling User's
`DeleteUserUseCase` to avoid an Application-layer-to-Application-layer
module dependency.

### Controller

`VendorApprovalController` gains a constructor dependency on
`DeleteVendorProfileUseCase` and:

```php
public function destroy(Request $request, int $id): JsonResponse
{
    $this->deleteVendorProfile->execute($id, $request->user()->id);

    return response()->json(null, 204);
}
```

### List/count query fixes

`ListVendorProfilesQuery` and `CountVendorProfilesByStatusQuery` both add
`->whereHas('VendorProfilesUser')` to their query chain, so a vendor whose
linked user has been soft-deleted no longer appears in the list or in the
status-tab counts. This relies on `User`'s existing `SoftDeletes` global
scope automatically excluding trashed users from the relation query.

### Resource defensive fix

`VendorProfileResource::toArray()`'s `user` field currently assumes
`VendorProfilesUser` is non-null whenever the relation is loaded:

```php
'user' => $this->whenLoaded('VendorProfilesUser', fn () => [
    'id' => $this->VendorProfilesUser->id,
    ...
]),
```

`whenLoaded()` only checks whether the relation was *attempted*, not
whether it resolved to a value — if the linked user is trashed, eager
loading resolves the relation to `null` and this crashes. This is already
a latent bug today (a vendor's user could already be deleted via the
generic Users screen) and becomes far more likely once vendor delete is a
first-class action. Fix:

```php
'user' => $this->whenLoaded('VendorProfilesUser', fn () => $this->VendorProfilesUser !== null ? [
    'id' => $this->VendorProfilesUser->id,
    'username' => $this->VendorProfilesUser->username,
    'email' => $this->VendorProfilesUser->email,
] : null),
```

`show()` (`GetVendorProfileByIdQuery`) is intentionally left unfiltered —
a deleted vendor's historical record stays viewable by direct id for audit,
it just won't appear in the list.

## Part B — Auto-purge soft-deleted users after 30 days

### Scope

Applies to **every** soft-deleted user, not just vendors — the retention
policy lives on `users.deleted_at`, which is the same column regardless of
whether the user was deleted via the vendor-delete flow (Part A), the
internal-profile-delete cascade, or the generic user-delete endpoint.

### New use case

`App\Modules\User\Application\UseCases\PurgeSoftDeletedUsersUseCase`:

```php
final class PurgeSoftDeletedUsersUseCase
{
    private const RETENTION_DAYS = 30;

    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly VendorRepositoryInterface $vendors,
    ) {}

    public function execute(): int
    {
        $cutoff = CarbonImmutable::now()->subDays(self::RETENTION_DAYS);
        $ids = $this->users->findIdsDeletedBefore($cutoff);

        foreach ($ids as $id) {
            $this->vendors->deleteDocumentFilesForUser($id);
            $this->users->forceDelete($id);

            app_log('User purged (hard delete)', ['user_id' => $id], 'info', 'user');
        }

        return count($ids);
    }
}
```

File cleanup **must** happen before `forceDelete()`, not after: the
database-level `cascadeOnDelete()` on `vendor_profiles.user_id` deletes the
row without going through Eloquent, so there is no later opportunity to
read `vendor_documents.file_path` once the user row is gone.

This depends on `VendorRepositoryInterface` (Vendor's Domain layer)
directly — the same style of cross-module reach used elsewhere (Domain
interfaces are an acceptable crossing point; Application-layer classes of
another module are not).

### Repository additions

`UserRepositoryInterface` (+ `UserRepository` implementation):

```php
/**
 * @return array<int, int> ids of users soft-deleted at or before the given cutoff
 */
public function findIdsDeletedBefore(CarbonImmutable $cutoff): array;

public function forceDelete(int $id): void;
```

`VendorRepositoryInterface` (+ `VendorRepository` implementation):

```php
/**
 * Delete any uploaded document files (from storage) belonging to the vendor
 * profile linked to the given user id. No-op if the user has no vendor profile.
 */
public function deleteDocumentFilesForUser(int $userId): void;
```

Implemented using the same `Storage::disk('local')->delete(...)` pattern
already used in `DeleteVendorDocumentUseCase`.

### Command + schedule

`routes/console.php` does not exist yet in this app (only
`routes/web.php` and `routes/api.php` do, even though
`bootstrap/app.php` already points `commands` at it) — it needs to be
created.

`app/Console/Commands/PurgeSoftDeletedUsersCommand.php`:

```php
final class PurgeSoftDeletedUsersCommand extends Command
{
    protected $signature = 'app:purge-soft-deleted-users';
    protected $description = 'Permanently delete user accounts soft-deleted for more than 30 days.';

    public function handle(PurgeSoftDeletedUsersUseCase $purge): int
    {
        $count = $purge->execute();
        $this->info("Purged {$count} user(s).");

        return self::SUCCESS;
    }
}
```

`routes/console.php`:

```php
use Illuminate\Support\Facades\Schedule;

Schedule::command('app:purge-soft-deleted-users')->daily();
```

## Testing

- `DestroyVendorTest.php` (HTTP feature): auth required (401), permission
  required (403 without `vendors.delete`), success soft-deletes the linked
  user and returns 204, deleted vendor disappears from
  `GET /vendors` and its counts, 404 for a nonexistent vendor id.
- `DeleteVendorProfileUseCaseTest.php`: linked user is soft-deleted, its
  sessions are revoked, throws `ModelNotFoundException` for a missing
  profile.
- Update `ListVendorsTest.php`: a vendor whose user was deleted no longer
  appears in the list or in the status counts.
- `PurgeSoftDeletedUsersUseCaseTest.php`: a user deleted more than 30 days
  ago is force-deleted (and its vendor profile tree is gone via DB
  cascade); a user deleted less than 30 days ago is left alone; a vendor's
  uploaded document file is removed from storage before the user row is
  force-deleted.
- `PurgeSoftDeletedUsersCommandTest.php` (or covered by the use case test
  plus a thin command smoke test): running `app:purge-soft-deleted-users`
  purges eligible users.

## Out of scope

- Frontend UI for the delete button (backend only, per user request).
- A restore/undo action for a soft-deleted vendor.
- Making the 30-day retention period configurable (hardcoded constant,
  matches the requirement as stated).
