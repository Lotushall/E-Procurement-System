<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * @var array<string, string>
     */
    private const array RENAMES = [
        'tender-projects.create' => 'tender_projects.create',
        'tender-projects.viewAny' => 'tender_projects.viewAny',
    ];

    /**
     * `TenderProjectPolicy` was changed to check the underscore-form
     * permission names (`tender_projects.create`/`tender_projects.viewAny`)
     * to match this codebase's convention for multi-word resource names
     * (e.g. `users.create`), but any already-seeded environment still has
     * grants against the old hyphenated names. This handles both: a plain
     * rename when only the old name exists, or a merge (reassigning every
     * role/user grant from the old id to the new id, then dropping the old
     * row) when `AdminUserSeeder` already created the new-name row too.
     */
    public function up(): void
    {
        foreach (self::RENAMES as $old => $new) {
            $this->rename($old, $new);
        }
    }

    private function rename(string $old, string $new): void
    {
        $oldId = DB::table('permissions')->where('name', $old)->where('guard_name', 'web')->value('id');

        if ($oldId === null) {
            return;
        }

        $newId = DB::table('permissions')->where('name', $new)->where('guard_name', 'web')->value('id');

        if ($newId === null) {
            DB::table('permissions')->where('id', $oldId)->update(['name' => $new]);
            app(PermissionRegistrar::class)->forgetCachedPermissions();

            return;
        }

        foreach (['role_has_permissions', 'model_has_permissions'] as $pivotTable) {
            foreach (DB::table($pivotTable)->where('permission_id', $oldId)->get() as $row) {
                $attributes = (array) $row;
                $attributes['permission_id'] = $newId;

                if (! DB::table($pivotTable)->where($attributes)->exists()) {
                    DB::table($pivotTable)->insert($attributes);
                }
            }

            DB::table($pivotTable)->where('permission_id', $oldId)->delete();
        }

        DB::table('permissions')->where('id', $oldId)->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Best-effort only: if `up()` merged two rows together for a given
     * permission, the merge isn't reversible (the original hyphenated id is
     * gone). If `up()` did a plain rename, this restores it.
     */
    public function down(): void
    {
        foreach (self::RENAMES as $old => $new) {
            DB::table('permissions')->where('name', $new)->where('guard_name', 'web')->update(['name' => $old]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
