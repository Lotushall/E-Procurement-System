<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUser(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $user->assignRole($role);

    return $user;
}

test('fetching the permission catalog requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/permissions');

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot fetch the permission catalog', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/permissions');

    $response->assertStatus(403);
});

test('a user with the admin role can fetch the permission catalog', function () {
    Permission::create(['name' => 'vendors.view', 'guard_name' => 'web', 'label' => 'ดูรายชื่อผู้ค้า']);

    $this->actingAs(internalAdminUser(), 'web');

    $response = $this->getJson('/api/v1/dashboard/permissions');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonFragment(['name' => 'vendors.view', 'label' => 'ดูรายชื่อผู้ค้า', 'group' => 'vendors']);
});
