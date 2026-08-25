<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\Position;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForInternalProfileStore(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));

    return $user;
}

test('creating an internal profile requires authentication', function () {
    $response = $this->postJson('/api/v1/dashboard/internal-profiles', [
        'firstname' => 'Somchai',
        'lastname' => 'Jaidee',
    ]);

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot create an internal profile', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/dashboard/internal-profiles', [
        'firstname' => 'Somchai',
        'lastname' => 'Jaidee',
    ]);

    $response->assertStatus(403);
});

test('a user with the admin role can create an internal profile with no linked user account', function () {
    $department = Department::create(['name' => 'IT']);
    $position = Position::create(['name' => 'Staff']);
    $this->actingAs(internalAdminUserForInternalProfileStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/internal-profiles', [
        'employeeNo' => 'EMP001',
        'prefix' => 'นาย',
        'firstname' => 'Somchai',
        'lastname' => 'Jaidee',
        'departmentId' => $department->id,
        'positionId' => $position->id,
        'phone' => '0812345678',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.employeeNo', 'EMP001')
        ->assertJsonPath('data.prefix', 'นาย')
        ->assertJsonPath('data.firstname', 'Somchai')
        ->assertJsonPath('data.lastname', 'Jaidee')
        ->assertJsonPath('data.department.name', 'IT')
        ->assertJsonPath('data.position.name', 'Staff')
        ->assertJsonPath('data.phone', '0812345678')
        ->assertJsonMissingPath('data.userId');

    $this->assertDatabaseHas('internal_profiles', [
        'employee_no' => 'EMP001',
        'firstname' => 'Somchai',
        'lastname' => 'Jaidee',
        'user_id' => null,
    ]);
});

test('firstname and lastname are required to create an internal profile', function () {
    $this->actingAs(internalAdminUserForInternalProfileStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/internal-profiles', []);

    $response->assertStatus(422)->assertJsonValidationErrors(['firstname', 'lastname']);
});
