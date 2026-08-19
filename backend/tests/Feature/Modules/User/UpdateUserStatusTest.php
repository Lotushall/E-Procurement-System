<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForUserStatus(): User
{
    $admin = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'users.updateStatus', 'guard_name' => 'web']));
    $admin->assignRole($role);

    return $admin;
}

test('updating status requires authentication', function () {
    $target = User::factory()->create(['user_type' => 'internal', 'status' => 'pending']);

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}/status", ['status' => 'active']);

    $response->assertStatus(401);
});

test('an internal user without the users.updateStatus permission cannot change status', function () {
    $target = User::factory()->create(['user_type' => 'internal', 'status' => 'pending']);
    $actor = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($actor, 'web');

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}/status", ['status' => 'active']);

    $response->assertStatus(403);
});

test('a user with the users.updateStatus permission can move pending to active', function () {
    $target = User::factory()->create(['user_type' => 'internal', 'status' => 'pending']);
    $this->actingAs(internalAdminUserForUserStatus(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}/status", ['status' => 'active']);

    $response->assertSuccessful()->assertJson(['data' => ['status' => 'active']]);
    $this->assertDatabaseHas('users', ['id' => $target->id, 'status' => 'active']);
});

test('any status can transition directly to any other status', function (string $from, string $to) {
    $target = User::factory()->create(['user_type' => 'internal', 'status' => $from]);
    $this->actingAs(internalAdminUserForUserStatus(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}/status", ['status' => $to]);

    $response->assertSuccessful()->assertJson(['data' => ['status' => $to]]);
    $this->assertDatabaseHas('users', ['id' => $target->id, 'status' => $to]);
})->with([
    'pending -> active' => ['pending', 'active'],
    'pending -> suspended' => ['pending', 'suspended'],
    'pending -> inactive' => ['pending', 'inactive'],
    'active -> pending' => ['active', 'pending'],
    'active -> suspended' => ['active', 'suspended'],
    'active -> inactive' => ['active', 'inactive'],
    'suspended -> pending' => ['suspended', 'pending'],
    'suspended -> active' => ['suspended', 'active'],
    'suspended -> inactive' => ['suspended', 'inactive'],
    'inactive -> pending' => ['inactive', 'pending'],
    'inactive -> active' => ['inactive', 'active'],
    'inactive -> suspended' => ['inactive', 'suspended'],
]);

test('changing to the same status is rejected with 422', function () {
    $target = User::factory()->create(['user_type' => 'internal', 'status' => 'active']);
    $this->actingAs(internalAdminUserForUserStatus(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}/status", ['status' => 'active']);

    $response->assertStatus(422);
    $this->assertDatabaseHas('users', ['id' => $target->id, 'status' => 'active']);
});

test('an invalid status value is rejected with a validation error', function () {
    $target = User::factory()->create(['user_type' => 'internal', 'status' => 'pending']);
    $this->actingAs(internalAdminUserForUserStatus(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}/status", ['status' => 'banned']);

    $response->assertInvalid('status');
});

test('changing status of a nonexistent user returns 404', function () {
    $this->actingAs(internalAdminUserForUserStatus(), 'web');

    $response = $this->patchJson('/api/v1/dashboard/users/999999/status', ['status' => 'active']);

    $response->assertStatus(404);
});
