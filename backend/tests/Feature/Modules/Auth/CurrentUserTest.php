<?php

use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('an authenticated user can fetch their own profile with empty roles and permissions', function () {
    $user = UserModel::factory()->create([
        'username' => 'jdoe',
        'email' => 'jdoe@example.com',
    ]);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/auth/user');

    $response->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.username', 'jdoe')
        ->assertJsonPath('data.email', 'jdoe@example.com')
        ->assertJsonPath('data.userType', $user->user_type->value)
        ->assertJsonPath('data.roles', [])
        ->assertJsonPath('data.permissions', []);
});

test('an authenticated user sees their assigned roles and permissions', function () {
    $user = UserModel::factory()->create();
    $permission = Permission::create(['name' => 'users.view']);
    $role = Role::create(['name' => 'admin']);
    $role->givePermissionTo($permission);
    $user->assignRole($role);

    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/auth/user');

    $response->assertOk()
        ->assertJsonPath('data.roles', ['admin'])
        ->assertJsonPath('data.permissions', ['users.view']);
});

test('fetching the current user requires authentication', function () {
    $response = $this->getJson('/api/v1/auth/user');

    $response->assertStatus(401);
});
