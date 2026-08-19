<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForDepartmentStore(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));

    return $user;
}

test('creating a department requires authentication', function () {
    $response = $this->postJson('/api/v1/dashboard/departments', ['name' => 'IT']);

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot create a department', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/dashboard/departments', ['name' => 'IT']);

    $response->assertStatus(403);
});

test('a user with the admin role can create a department', function () {
    $this->actingAs(internalAdminUserForDepartmentStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/departments', ['name' => 'IT']);

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'IT')
        ->assertJsonPath('data.internalProfilesCount', 0);
    $this->assertDatabaseHas('departments', ['name' => 'IT']);
});

test('department name must be unique', function () {
    Department::create(['name' => 'IT']);
    $this->actingAs(internalAdminUserForDepartmentStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/departments', ['name' => 'IT']);

    $response->assertStatus(422)->assertJsonValidationErrors('name');
});
