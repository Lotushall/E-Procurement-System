<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForPermissionDestroy(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $user->assignRole($role);

    return $user;
}

test('deleting a permission requires authentication', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);

    $response = $this->deleteJson('/api/v1/dashboard/permissions/reports.export');

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot delete a permission', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->deleteJson('/api/v1/dashboard/permissions/reports.export');

    $response->assertStatus(403);
});

test('a user with the admin role can delete a permission', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);
    $this->actingAs(internalAdminUserForPermissionDestroy(), 'web');

    $response = $this->deleteJson('/api/v1/dashboard/permissions/reports.export');

    $response->assertStatus(204);
    $this->assertDatabaseMissing('permissions', ['name' => 'reports.export']);
});

test('deleting a permission still assigned to a role succeeds with no block, per accepted-risk design', function () {
    $permission = Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);
    $role = Role::create(['name' => 'reporter', 'guard_name' => 'web']);
    $role->givePermissionTo($permission);
    $this->actingAs(internalAdminUserForPermissionDestroy(), 'web');

    $response = $this->deleteJson('/api/v1/dashboard/permissions/reports.export');

    $response->assertStatus(204);
    expect($role->fresh()->permissions)->toHaveCount(0);
});

test('deleting a nonexistent permission returns 404', function () {
    $this->actingAs(internalAdminUserForPermissionDestroy(), 'web');

    $response = $this->deleteJson('/api/v1/dashboard/permissions/missing.permission');

    $response->assertStatus(404);
});
