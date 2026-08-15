<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalUserWithRolesManage(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'roles.manage', 'guard_name' => 'web']));
    $user->assignRole($role);

    return $user;
}

test('fetching the permission catalog requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/permissions');

    $response->assertStatus(401);
});

test('an internal user without roles.manage cannot fetch the permission catalog', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/permissions');

    $response->assertStatus(403);
});

test('a user with roles.manage can fetch the permission catalog', function () {
    $this->actingAs(internalUserWithRolesManage(), 'web');

    $response = $this->getJson('/api/v1/dashboard/permissions');

    $response->assertOk()
        ->assertJsonCount(6, 'data')
        ->assertJsonFragment(['name' => 'roles.manage', 'label' => 'จัดการ role และสิทธิ์', 'group' => 'Role/สิทธิ์']);
});
