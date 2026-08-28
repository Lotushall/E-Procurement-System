<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * `vendors.view` never matched the `can:vendors.viewAny` route middleware
     * it was meant to satisfy. Some environments only ever seeded the wrong
     * name (`vendors.view` alone); others separately created the correct
     * `vendors.viewAny` permission too, leaving both rows with independent
     * role/user assignments. This handles both: a plain rename when only the
     * wrong name exists, or a merge (reassigning every role/user grant from
     * the old id to the existing correct id, then dropping the old row) when
     * both already exist.
     */
    public function up(): void
    {
        $oldId = DB::table('permissions')->where('name', 'vendors.view')->where('guard_name', 'web')->value('id');

        if ($oldId === null) {
            return;
        }

        $newId = DB::table('permissions')->where('name', 'vendors.viewAny')->where('guard_name', 'web')->value('id');

        if ($newId === null) {
            DB::table('permissions')->where('id', $oldId)->update(['name' => 'vendors.viewAny']);
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
     * Best-effort only: if `up()` merged two rows together, the merge isn't
     * reversible (the original `vendors.view` id is gone). If `up()` did a
     * plain rename, this restores it.
     */
    public function down(): void
    {
        DB::table('permissions')
            ->where('name', 'vendors.viewAny')
            ->where('guard_name', 'web')
            ->update(['name' => 'vendors.view']);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
