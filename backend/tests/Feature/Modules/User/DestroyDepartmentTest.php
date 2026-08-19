<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForDepartmentDestroy(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));

    return $user;
}

test('deleting a department requires authentication', function () {
    $department = Department::create(['name' => 'IT']);

    $response = $this->deleteJson("/api/v1/dashboard/departments/{$department->id}");

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot delete a department', function () {
    $department = Department::create(['name' => 'IT']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->deleteJson("/api/v1/dashboard/departments/{$department->id}");

    $response->assertStatus(403);
});

test('a user with the admin role can delete a department with no users assigned', function () {
    $department = Department::create(['name' => 'IT']);
    $this->actingAs(internalAdminUserForDepartmentDestroy(), 'web');

    $response = $this->deleteJson("/api/v1/dashboard/departments/{$department->id}");

    $response->assertStatus(204);
    $this->assertDatabaseMissing('departments', ['id' => $department->id]);
});

test('deleting a department that still has users assigned is rejected with 422', function () {
    $department = Department::create(['name' => 'IT']);
    $target = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $target->id, 'firstname' => 'A', 'lastname' => 'B', 'department_id' => $department->id]);
    $this->actingAs(internalAdminUserForDepartmentDestroy(), 'web');

    $response = $this->deleteJson("/api/v1/dashboard/departments/{$department->id}");

    $response->assertStatus(422)->assertJson(['message' => 'ไม่สามารถลบแผนกที่ยังมีผู้ใช้งานอยู่ได้']);
    $this->assertDatabaseHas('departments', ['id' => $department->id]);
});

test('deleting a nonexistent department returns 404', function () {
    $this->actingAs(internalAdminUserForDepartmentDestroy(), 'web');

    $response = $this->deleteJson('/api/v1/dashboard/departments/999999');

    $response->assertStatus(404);
});
