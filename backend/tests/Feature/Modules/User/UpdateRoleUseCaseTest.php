<?php

use App\Modules\User\Application\DTOs\RoleData;
use App\Modules\User\Application\UseCases\UpdateRoleUseCase;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('execute renames the role and replaces its permissions', function () {
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']));
    Permission::firstOrCreate(['name' => 'vendors.review', 'guard_name' => 'web']);

    $updated = app(UpdateRoleUseCase::class)->execute($role->id, new RoleData(
        name: 'procurement_lead',
        permissions: ['vendors.review'],
    ));

    expect($updated->name)->toBe('procurement_lead')
        ->and($updated->permissions->pluck('name')->all())->toBe(['vendors.review']);
    $this->assertDatabaseHas('roles', ['id' => $role->id, 'name' => 'procurement_lead']);
});

test('execute throws when the role does not exist', function () {
    app(UpdateRoleUseCase::class)->execute(999999, new RoleData(name: 'x', permissions: []));
})->throws(ModelNotFoundException::class);

test('execute returns an error message instead of renaming the admin role away from admin', function () {
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

    $result = app(UpdateRoleUseCase::class)->execute($role->id, new RoleData(name: 'super_admin', permissions: []));

    expect($result)->toBe('ไม่สามารถเปลี่ยนชื่อ role admin ได้');
    expect(Role::find($role->id)->name)->toBe('admin');
});

test('execute allows changing the admin role permissions while keeping its name', function () {
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']);

    $updated = app(UpdateRoleUseCase::class)->execute($role->id, new RoleData(
        name: 'admin',
        permissions: ['vendors.view'],
    ));

    expect($updated->name)->toBe('admin')
        ->and($updated->permissions->pluck('name')->all())->toBe(['vendors.view']);
});
