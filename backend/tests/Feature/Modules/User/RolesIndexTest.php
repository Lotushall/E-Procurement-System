<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('fetching roles requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/roles');

    $response->assertStatus(401);
});

test('a non-internal user cannot fetch roles', function () {
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $this->actingAs($vendorUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/roles');

    $response->assertStatus(403);
});

test('an internal user without the admin role can still fetch roles', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/roles');

    $response->assertOk();
});

test('the roles list includes id, permissions, and userCount', function () {
    $role = Role::create(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']));
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $internalUser->assignRole($role);
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/roles');

    $response->assertOk()
        ->assertJsonPath('data.0.id', $role->id)
        ->assertJsonPath('data.0.name', 'admin')
        ->assertJsonPath('data.0.permissions', ['vendors.view'])
        ->assertJsonPath('data.0.userCount', 1);
});
