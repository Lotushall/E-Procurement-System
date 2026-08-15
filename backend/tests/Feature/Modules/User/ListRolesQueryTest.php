<?php

use App\Modules\User\Application\Queries\ListRolesQuery;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('execute returns roles with their permission names and user count', function () {
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $role->givePermissionTo([
        Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']),
        Permission::firstOrCreate(['name' => 'vendors.review', 'guard_name' => 'web']),
    ]);
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->assignRole($role);

    $result = app(ListRolesQuery::class)->execute();

    expect($result)->toHaveCount(1);
    $found = $result->first();
    expect($found->id)->toBe($role->id)
        ->and($found->name)->toBe('procurement_officer')
        ->and($found->permissions->pluck('name')->sort()->values()->all())->toBe(['vendors.review', 'vendors.view'])
        ->and($found->users_count)->toBe(1);
});

test('execute returns zero user count for a role nobody has', function () {
    Role::create(['name' => 'unused_role', 'guard_name' => 'web']);

    $result = app(ListRolesQuery::class)->execute();

    expect($result->first()->users_count)->toBe(0);
});
