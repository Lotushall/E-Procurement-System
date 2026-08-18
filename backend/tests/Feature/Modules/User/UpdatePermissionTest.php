<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForPermissionUpdate(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $user->assignRole($role);

    return $user;
}

test('updating a permission requires authentication', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);

    $response = $this->patchJson('/api/v1/dashboard/permissions/reports.export', ['name' => 'reports.export', 'label' => 'y']);

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot update a permission', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->patchJson('/api/v1/dashboard/permissions/reports.export', ['name' => 'reports.export', 'label' => 'y']);

    $response->assertStatus(403);
});

test('a user with the admin role can update a permission label', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'ส่งออกรายงาน']);
    $this->actingAs(internalAdminUserForPermissionUpdate(), 'web');

    $response = $this->patchJson('/api/v1/dashboard/permissions/reports.export', [
        'name' => 'reports.export',
        'label' => 'ส่งออกรายงาน (แก้ไข)',
    ]);

    $response->assertOk()
        ->assertJson(['data' => ['name' => 'reports.export', 'label' => 'ส่งออกรายงาน (แก้ไข)', 'group' => 'reports']]);
});

test('permission name must match the prefix.action pattern on update', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);
    $this->actingAs(internalAdminUserForPermissionUpdate(), 'web');

    $response = $this->patchJson('/api/v1/dashboard/permissions/reports.export', ['name' => 'ReportsExport', 'label' => 'x']);

    $response->assertStatus(422)->assertJsonValidationErrors('name');
});

test('permission label is required on update', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);
    $this->actingAs(internalAdminUserForPermissionUpdate(), 'web');

    $response = $this->patchJson('/api/v1/dashboard/permissions/reports.export', ['name' => 'reports.export', 'label' => '']);

    $response->assertStatus(422)->assertJsonValidationErrors('label');
});

test('permission name must stay unique on update, ignoring itself', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);
    Permission::create(['name' => 'reports.import', 'guard_name' => 'web', 'label' => 'y']);
    $this->actingAs(internalAdminUserForPermissionUpdate(), 'web');

    $conflict = $this->patchJson('/api/v1/dashboard/permissions/reports.export', ['name' => 'reports.import', 'label' => 'z']);
    $conflict->assertStatus(422)->assertJsonValidationErrors('name');

    $sameName = $this->patchJson('/api/v1/dashboard/permissions/reports.export', ['name' => 'reports.export', 'label' => 'z']);
    $sameName->assertOk();
});

test('updating a nonexistent permission returns 404', function () {
    $this->actingAs(internalAdminUserForPermissionUpdate(), 'web');

    $response = $this->patchJson('/api/v1/dashboard/permissions/missing.permission', ['name' => 'missing.permission', 'label' => 'x']);

    $response->assertStatus(404);
});
