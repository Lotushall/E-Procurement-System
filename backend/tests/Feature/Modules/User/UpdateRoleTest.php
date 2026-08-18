<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForUpdate(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $user->assignRole($role);

    return $user;
}

test('updating a role requires authentication', function () {
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", ['name' => 'x', 'permissions' => []]);

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot update a role', function () {
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", ['name' => 'x', 'permissions' => []]);

    $response->assertStatus(403);
});

test('a user with the admin role can rename a role and change its permissions', function () {
    Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']);
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", [
        'name' => 'procurement_lead',
        'permissions' => ['vendors.view'],
    ]);

    $response->assertOk()
        ->assertJsonPath('data.name', 'procurement_lead')
        ->assertJsonPath('data.permissions', ['vendors.view'])
        ->assertJsonPath('data.userCount', 0);
});

test('role name must match the lowercase snake pattern on update', function () {
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", ['name' => 'Procurement Officer', 'permissions' => []]);

    $response->assertStatus(422)->assertJsonValidationErrors('name');
});

test('role name must stay unique on update, ignoring itself', function () {
    Role::create(['name' => 'existing_role', 'guard_name' => 'web']);
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", ['name' => 'existing_role', 'permissions' => []]);
    $response->assertStatus(422)->assertJsonValidationErrors('name');

    $sameNameResponse = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", ['name' => 'procurement_officer', 'permissions' => []]);
    $sameNameResponse->assertOk();
});

test('permissions must be within the known catalog on update', function () {
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", [
        'name' => 'procurement_officer',
        'permissions' => ['not.a.real.permission'],
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('permissions.0');
});

test('renaming the admin role is rejected with a 422', function () {
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", [
        'name' => 'super_admin',
        'permissions' => [],
    ]);

    $response->assertStatus(422)->assertJson(['message' => 'ไม่สามารถเปลี่ยนชื่อ role admin ได้']);
    expect(Role::find($role->id)->name)->toBe('admin');
});

test('updating the admin role permissions while keeping its name is allowed', function () {
    Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/roles/{$role->id}", [
        'name' => 'admin',
        'permissions' => ['vendors.view'],
    ]);

    $response->assertOk()->assertJsonPath('data.name', 'admin');
});

test('updating a nonexistent role returns 404', function () {
    $this->actingAs(internalAdminUserForUpdate(), 'web');

    $response = $this->patchJson('/api/v1/dashboard/roles/999999', ['name' => 'x', 'permissions' => []]);

    $response->assertStatus(404);
});
