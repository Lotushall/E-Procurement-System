<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForPermissionStore(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $user->assignRole($role);

    return $user;
}

test('creating a permission requires authentication', function () {
    $response = $this->postJson('/api/v1/dashboard/permissions', ['name' => 'reports.export', 'label' => 'ส่งออกรายงาน']);

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot create a permission', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/dashboard/permissions', ['name' => 'reports.export', 'label' => 'ส่งออกรายงาน']);

    $response->assertStatus(403);
});

test('a user with the admin role can create a permission', function () {
    $this->actingAs(internalAdminUserForPermissionStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/permissions', [
        'name' => 'reports.export',
        'label' => 'ส่งออกรายงาน',
    ]);

    $response->assertStatus(201)
        ->assertJson(['data' => ['name' => 'reports.export', 'label' => 'ส่งออกรายงาน', 'group' => 'reports']]);
});

test('permission name must match the prefix.action pattern', function () {
    $this->actingAs(internalAdminUserForPermissionStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/permissions', ['name' => 'ReportsExport', 'label' => 'x']);

    $response->assertStatus(422)->assertJsonValidationErrors('name');
});

test('permission name must be unique', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web', 'label' => 'x']);
    $this->actingAs(internalAdminUserForPermissionStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/permissions', ['name' => 'reports.export', 'label' => 'y']);

    $response->assertStatus(422)->assertJsonValidationErrors('name');
});

test('permission label is required', function () {
    $this->actingAs(internalAdminUserForPermissionStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/permissions', ['name' => 'reports.export', 'label' => '']);

    $response->assertStatus(422)->assertJsonValidationErrors('label');
});
