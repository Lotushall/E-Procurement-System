<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\InternalProfiles\Infrastructure\Models\Position;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForInternalProfileUpdate(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));

    return $user;
}

test('updating an internal profile requires authentication', function () {
    $profile = InternalProfiles::create(['firstname' => 'Somchai', 'lastname' => 'Jaidee']);

    $response = $this->patchJson("/api/v1/dashboard/internal-profiles/{$profile->id}", [
        'firstname' => 'Somsak',
        'lastname' => 'Jaidee',
    ]);

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot update an internal profile', function () {
    $profile = InternalProfiles::create(['firstname' => 'Somchai', 'lastname' => 'Jaidee']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->patchJson("/api/v1/dashboard/internal-profiles/{$profile->id}", [
        'firstname' => 'Somsak',
        'lastname' => 'Jaidee',
    ]);

    $response->assertStatus(403);
});

test('a user with the admin role can update an internal profile', function () {
    $oldDepartment = Department::create(['name' => 'IT']);
    $newDepartment = Department::create(['name' => 'HR']);
    $position = Position::create(['name' => 'Staff']);
    $profile = InternalProfiles::create([
        'employee_no' => 'EMP001',
        'firstname' => 'Somchai',
        'lastname' => 'Jaidee',
        'department_id' => $oldDepartment->id,
    ]);
    $this->actingAs(internalAdminUserForInternalProfileUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/internal-profiles/{$profile->id}", [
        'employeeNo' => 'EMP002',
        'prefix' => 'นาย',
        'firstname' => 'Somsak',
        'lastname' => 'Deejai',
        'departmentId' => $newDepartment->id,
        'positionId' => $position->id,
        'phone' => '0812345678',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.employeeNo', 'EMP002')
        ->assertJsonPath('data.prefix', 'นาย')
        ->assertJsonPath('data.firstname', 'Somsak')
        ->assertJsonPath('data.lastname', 'Deejai')
        ->assertJsonPath('data.department.name', 'HR')
        ->assertJsonPath('data.position.name', 'Staff')
        ->assertJsonPath('data.phone', '0812345678');

    $this->assertDatabaseHas('internal_profiles', [
        'id' => $profile->id,
        'employee_no' => 'EMP002',
        'firstname' => 'Somsak',
        'lastname' => 'Deejai',
        'department_id' => $newDepartment->id,
    ]);
});

test('a linked user account is preserved when updating an internal profile', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $profile = InternalProfiles::create(['user_id' => $user->id, 'firstname' => 'Somchai', 'lastname' => 'Jaidee']);
    $this->actingAs(internalAdminUserForInternalProfileUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/internal-profiles/{$profile->id}", [
        'firstname' => 'Somsak',
        'lastname' => 'Jaidee',
    ]);

    $response->assertOk();
    $this->assertDatabaseHas('internal_profiles', ['id' => $profile->id, 'user_id' => $user->id, 'firstname' => 'Somsak']);
});

test('firstname and lastname are required to update an internal profile', function () {
    $profile = InternalProfiles::create(['firstname' => 'Somchai', 'lastname' => 'Jaidee']);
    $this->actingAs(internalAdminUserForInternalProfileUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/internal-profiles/{$profile->id}", []);

    $response->assertStatus(422)->assertJsonValidationErrors(['firstname', 'lastname']);
});

test('updating a nonexistent internal profile returns 404', function () {
    $this->actingAs(internalAdminUserForInternalProfileUpdate(), 'web');

    $response = $this->patchJson('/api/v1/dashboard/internal-profiles/999999', [
        'firstname' => 'Somsak',
        'lastname' => 'Jaidee',
    ]);

    $response->assertStatus(404);
});
