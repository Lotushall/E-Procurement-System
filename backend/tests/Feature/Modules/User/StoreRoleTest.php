<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForStore(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $user->assignRole($role);

    return $user;
}

test('creating a role requires authentication', function () {
    $response = $this->postJson('/api/v1/dashboard/roles', ['name' => 'procurement_officer', 'permissions' => []]);

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot create a role', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/dashboard/roles', ['name' => 'procurement_officer', 'permissions' => []]);

    $response->assertStatus(403);
});

test('a user with the admin role can create a role', function () {
    Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'vendors.review', 'guard_name' => 'web']);

    $this->actingAs(internalAdminUserForStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/roles', [
        'name' => 'procurement_officer',
        'permissions' => ['vendors.view', 'vendors.review'],
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'procurement_officer')
        ->assertJsonPath('data.userCount', 0);
    expect($response->json('data.permissions'))->toEqualCanonicalizing(['vendors.view', 'vendors.review']);
});

test('role name must match the lowercase snake pattern', function () {
    $this->actingAs(internalAdminUserForStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/roles', ['name' => 'Procurement Officer', 'permissions' => []]);

    $response->assertStatus(422)->assertJsonValidationErrors('name');
});

test('role name must be unique', function () {
    Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/roles', ['name' => 'procurement_officer', 'permissions' => []]);

    $response->assertStatus(422)->assertJsonValidationErrors('name');
});

test('permissions must be within the known catalog', function () {
    $this->actingAs(internalAdminUserForStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/roles', [
        'name' => 'procurement_officer',
        'permissions' => ['not.a.real.permission'],
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('permissions.0');
});
