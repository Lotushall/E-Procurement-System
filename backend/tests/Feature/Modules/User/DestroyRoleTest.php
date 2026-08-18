<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForDestroy(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $user->assignRole($role);

    return $user;
}

test('deleting a role requires authentication', function () {
    $role = Role::create(['name' => 'unused_role', 'guard_name' => 'web']);

    $response = $this->deleteJson("/api/v1/dashboard/roles/{$role->id}");

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot delete a role', function () {
    $role = Role::create(['name' => 'unused_role', 'guard_name' => 'web']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->deleteJson("/api/v1/dashboard/roles/{$role->id}");

    $response->assertStatus(403);
});

test('a user with the admin role can delete an unused role', function () {
    $role = Role::create(['name' => 'unused_role', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForDestroy(), 'web');

    $response = $this->deleteJson("/api/v1/dashboard/roles/{$role->id}");

    $response->assertStatus(204);
    $this->assertDatabaseMissing('roles', ['id' => $role->id]);
});

test('deleting a role that still has users is rejected with 422', function () {
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $assignedUser = User::factory()->create(['user_type' => 'internal']);
    $assignedUser->assignRole($role);
    $this->actingAs(internalAdminUserForDestroy(), 'web');

    $response = $this->deleteJson("/api/v1/dashboard/roles/{$role->id}");

    $response->assertStatus(422)
        ->assertJson(['message' => 'ไม่สามารถลบ role ที่ยังมีผู้ใช้งานอยู่ได้']);
    $this->assertDatabaseHas('roles', ['id' => $role->id]);
});

test('deleting the admin role is rejected even when the acting user is its only member', function () {
    $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForDestroy(), 'web');

    $response = $this->deleteJson("/api/v1/dashboard/roles/{$adminRole->id}");

    $response->assertStatus(422)->assertJson(['message' => 'ไม่สามารถลบ role admin ได้']);
    $this->assertDatabaseHas('roles', ['id' => $adminRole->id]);
});

test('deleting a nonexistent role returns 404', function () {
    $this->actingAs(internalAdminUserForDestroy(), 'web');

    $response = $this->deleteJson('/api/v1/dashboard/roles/999999');

    $response->assertStatus(404);
});
