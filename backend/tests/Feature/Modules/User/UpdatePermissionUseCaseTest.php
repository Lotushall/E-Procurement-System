<?php

use App\Modules\User\Application\DTOs\PermissionData;
use App\Modules\User\Application\UseCases\UpdatePermissionUseCase;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('execute renames the permission and updates its label', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'ส่งออกรายงาน']);

    $updated = app(UpdatePermissionUseCase::class)->execute('reports.export', new PermissionData(
        name: 'reports.export_v2',
        label: 'ส่งออกรายงาน (v2)',
    ));

    expect($updated->name)->toBe('reports.export_v2')
        ->and($updated->label)->toBe('ส่งออกรายงาน (v2)');
    $this->assertDatabaseHas('permissions', ['name' => 'reports.export_v2', 'label' => 'ส่งออกรายงาน (v2)']);
});

test('execute keeps role assignments intact after renaming a permission', function () {
    $permission = Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'ส่งออกรายงาน']);
    $role = Role::create(['name' => 'reporter', 'guard_name' => 'web']);
    $role->givePermissionTo($permission);

    app(UpdatePermissionUseCase::class)->execute('reports.export', new PermissionData(
        name: 'reports.export_v2',
        label: 'ส่งออกรายงาน (v2)',
    ));

    expect($role->fresh()->permissions->pluck('name')->all())->toBe(['reports.export_v2']);
});

test('execute throws when the permission does not exist', function () {
    app(UpdatePermissionUseCase::class)->execute('missing.permission', new PermissionData(name: 'x.y', label: 'x'));
})->throws(ModelNotFoundException::class);
