<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForDepartmentUpdate(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));

    return $user;
}

test('updating a department requires authentication', function () {
    $department = Department::create(['name' => 'IT']);

    $response = $this->patchJson("/api/v1/dashboard/departments/{$department->id}", ['name' => 'HR']);

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot update a department', function () {
    $department = Department::create(['name' => 'IT']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->patchJson("/api/v1/dashboard/departments/{$department->id}", ['name' => 'HR']);

    $response->assertStatus(403);
});

test('a user with the admin role can rename a department', function () {
    $department = Department::create(['name' => 'IT']);
    $this->actingAs(internalAdminUserForDepartmentUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/departments/{$department->id}", ['name' => 'HR']);

    $response->assertOk()->assertJsonPath('data.name', 'HR');
    $this->assertDatabaseHas('departments', ['id' => $department->id, 'name' => 'HR']);
});

test('department name must stay unique on update, ignoring itself', function () {
    Department::create(['name' => 'HR']);
    $department = Department::create(['name' => 'IT']);
    $this->actingAs(internalAdminUserForDepartmentUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/departments/{$department->id}", ['name' => 'HR']);
    $response->assertStatus(422)->assertJsonValidationErrors('name');

    $sameNameResponse = $this->patchJson("/api/v1/dashboard/departments/{$department->id}", ['name' => 'IT']);
    $sameNameResponse->assertOk();
});

test('updating a nonexistent department returns 404', function () {
    $this->actingAs(internalAdminUserForDepartmentUpdate(), 'web');

    $response = $this->patchJson('/api/v1/dashboard/departments/999999', ['name' => 'IT']);

    $response->assertStatus(404);
});
