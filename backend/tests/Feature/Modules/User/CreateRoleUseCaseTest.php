<?php

use App\Modules\User\Application\DTOs\RoleData;
use App\Modules\User\Application\UseCases\CreateRoleUseCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

test('execute creates a role with the given permissions synced', function () {
    Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'vendors.review', 'guard_name' => 'web']);

    $role = app(CreateRoleUseCase::class)->execute(new RoleData(
        name: 'procurement_officer',
        permissions: ['vendors.view', 'vendors.review'],
    ));

    expect($role->name)->toBe('procurement_officer')
        ->and($role->permissions->pluck('name')->sort()->values()->all())->toBe(['vendors.review', 'vendors.view'])
        ->and($role->users_count)->toBe(0);

    $this->assertDatabaseHas('roles', ['name' => 'procurement_officer', 'guard_name' => 'web']);
});

test('execute creates a role with no permissions when none are given', function () {
    $role = app(CreateRoleUseCase::class)->execute(new RoleData(name: 'empty_role', permissions: []));

    expect($role->permissions)->toHaveCount(0);
});
