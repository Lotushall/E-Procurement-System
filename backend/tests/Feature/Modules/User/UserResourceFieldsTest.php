<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\InternalProfiles\Infrastructure\Models\Position;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function actingInternalAdmin(): User
{
    $admin = User::factory()->create(['user_type' => 'internal']);
    $role = Role::create(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'users.viewAny', 'guard_name' => 'web']));
    $admin->assignRole($role);

    return $admin;
}

test('user detail exposes role, internalProfile, and permissions for an internal user', function () {
    $admin = actingInternalAdmin();
    $this->actingAs($admin, 'web');

    $target = User::factory()->create(['user_type' => 'internal']);
    $department = Department::create(['name' => 'ฝ่ายจัดซื้อ']);
    $position = Position::create(['name' => 'เจ้าหน้าที่']);
    InternalProfiles::create([
        'user_id' => $target->id,
        'employee_no' => 'EMP-001',
        'prefix' => 'นาย',
        'firstname' => 'สมชาย',
        'lastname' => 'ใจดี',
        'department_id' => $department->id,
        'position_id' => $position->id,
        'phone' => '0812345678',
    ]);
    $staffRole = Role::create(['name' => 'staff', 'guard_name' => 'web']);
    $staffRole->givePermissionTo(Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']));
    $target->assignRole($staffRole);

    $response = $this->getJson("/api/v1/dashboard/users/{$target->id}");

    $response->assertOk()
        ->assertJsonPath('data.role', 'staff')
        ->assertJsonPath('data.internalProfile.employeeNo', 'EMP-001')
        ->assertJsonPath('data.internalProfile.firstname', 'สมชาย')
        ->assertJsonPath('data.internalProfile.positionId', $position->id)
        ->assertJsonPath('data.internalProfile.position', 'เจ้าหน้าที่')
        ->assertJsonPath('data.internalProfile.departmentId', $department->id)
        ->assertJsonPath('data.internalProfile.department', 'ฝ่ายจัดซื้อ')
        ->assertJsonPath('data.permissions', ['vendors.view']);
});

test('user detail omits internalProfile, role, emailVerifiedAt, lastLoginAt, and passwordChangedAt when absent', function () {
    $admin = actingInternalAdmin();
    $this->actingAs($admin, 'web');

    $target = User::factory()->unverified()->create(['user_type' => 'company']);

    $response = $this->getJson("/api/v1/dashboard/users/{$target->id}");

    $response->assertOk()
        ->assertJsonMissingPath('data.internalProfile')
        ->assertJsonMissingPath('data.role')
        ->assertJsonMissingPath('data.emailVerifiedAt')
        ->assertJsonMissingPath('data.lastLoginAt')
        ->assertJsonMissingPath('data.passwordChangedAt');
});

test('user detail exposes emailVerifiedAt, lastLoginAt, and passwordChangedAt', function () {
    $admin = actingInternalAdmin();
    $this->actingAs($admin, 'web');

    $target = User::factory()->create([
        'user_type' => 'internal',
        'last_login_at' => now(),
        'password_changed_at' => now(),
    ]);

    $response = $this->getJson("/api/v1/dashboard/users/{$target->id}");

    $response->assertOk();
    expect($response->json('data.emailVerifiedAt'))->not->toBeNull();
    expect($response->json('data.lastLoginAt'))->not->toBeNull();
    expect($response->json('data.passwordChangedAt'))->not->toBeNull();
});
