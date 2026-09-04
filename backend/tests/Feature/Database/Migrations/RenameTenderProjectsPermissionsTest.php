<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function runTenderProjectsPermissionRenameMigration()
{
    return require database_path('migrations/2026_09_04_120000_rename_tender_projects_permissions.php');
}

test('renames the permission in place when no underscore-form row exists yet', function () {
    $oldId = DB::table('permissions')->insertGetId([
        'name' => 'tender-projects.create',
        'guard_name' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $role = Role::create(['name' => 'test-role', 'guard_name' => 'web']);
    DB::table('role_has_permissions')->insert(['permission_id' => $oldId, 'role_id' => $role->id]);

    runTenderProjectsPermissionRenameMigration()->up();

    expect(DB::table('permissions')->where('id', $oldId)->value('name'))->toBe('tender_projects.create')
        ->and(DB::table('role_has_permissions')->where(['permission_id' => $oldId, 'role_id' => $role->id])->exists())->toBeTrue();
});

test('merges grants into the existing underscore-form row and drops the stale row when both exist', function () {
    $oldId = DB::table('permissions')->insertGetId([
        'name' => 'tender-projects.viewAny',
        'guard_name' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $newId = DB::table('permissions')->insertGetId([
        'name' => 'tender_projects.viewAny',
        'guard_name' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $role = Role::create(['name' => 'test-role', 'guard_name' => 'web']);
    DB::table('role_has_permissions')->insert(['permission_id' => $oldId, 'role_id' => $role->id]);

    runTenderProjectsPermissionRenameMigration()->up();

    expect(DB::table('permissions')->where('id', $oldId)->exists())->toBeFalse()
        ->and(DB::table('permissions')->where('id', $newId)->exists())->toBeTrue()
        ->and(DB::table('role_has_permissions')->where(['permission_id' => $newId, 'role_id' => $role->id])->exists())->toBeTrue();
});

test('does nothing when neither hyphenated permission name exists', function () {
    $countBefore = DB::table('permissions')->count();

    runTenderProjectsPermissionRenameMigration()->up();

    expect(DB::table('permissions')->count())->toBe($countBefore);
});

test('down restores the hyphenated name after a plain rename', function () {
    $id = DB::table('permissions')->insertGetId([
        'name' => 'tender-projects.create',
        'guard_name' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $migration = runTenderProjectsPermissionRenameMigration();
    $migration->up();

    $migration->down();

    expect(DB::table('permissions')->where('id', $id)->value('name'))->toBe('tender-projects.create');
});
