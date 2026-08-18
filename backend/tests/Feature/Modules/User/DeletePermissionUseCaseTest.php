<?php

use App\Modules\User\Application\UseCases\DeletePermissionUseCase;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('execute deletes a permission not assigned to any role', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);

    app(DeletePermissionUseCase::class)->execute('reports.export');

    $this->assertDatabaseMissing('permissions', ['name' => 'reports.export']);
});

test('execute deletes a permission and detaches it from every role that had it', function () {
    $permission = Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);
    $role = Role::create(['name' => 'reporter', 'guard_name' => 'web']);
    $role->givePermissionTo($permission);

    app(DeletePermissionUseCase::class)->execute('reports.export');

    expect($role->fresh()->permissions)->toHaveCount(0);
});

test('execute throws when the permission does not exist', function () {
    app(DeletePermissionUseCase::class)->execute('missing.permission');
})->throws(ModelNotFoundException::class);
