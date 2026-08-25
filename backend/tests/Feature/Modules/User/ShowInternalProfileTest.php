<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\InternalProfiles\Infrastructure\Models\Position;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForInternalProfileShow(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));

    return $user;
}

test('fetching an internal profile by id requires authentication', function () {
    $profile = InternalProfiles::create(['firstname' => 'Somchai', 'lastname' => 'Jaidee']);

    $response = $this->getJson("/api/v1/dashboard/internal-profiles/{$profile->id}");

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot fetch an internal profile by id', function () {
    $profile = InternalProfiles::create(['firstname' => 'Somchai', 'lastname' => 'Jaidee']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson("/api/v1/dashboard/internal-profiles/{$profile->id}");

    $response->assertStatus(403);
});

test('a user with the admin role can fetch an internal profile by id', function () {
    $department = Department::create(['name' => 'IT']);
    $position = Position::create(['name' => 'Staff']);
    $profile = InternalProfiles::create([
        'employee_no' => 'EMP001',
        'firstname' => 'Somchai',
        'lastname' => 'Jaidee',
        'department_id' => $department->id,
        'position_id' => $position->id,
    ]);
    $this->actingAs(internalAdminUserForInternalProfileShow(), 'web');

    $response = $this->getJson("/api/v1/dashboard/internal-profiles/{$profile->id}");

    $response->assertOk()
        ->assertJsonPath('data.id', $profile->id)
        ->assertJsonPath('data.employeeNo', 'EMP001')
        ->assertJsonPath('data.firstname', 'Somchai')
        ->assertJsonPath('data.lastname', 'Jaidee')
        ->assertJsonPath('data.department.name', 'IT')
        ->assertJsonPath('data.position.name', 'Staff');
});

test('fetching a nonexistent internal profile returns 404', function () {
    $this->actingAs(internalAdminUserForInternalProfileShow(), 'web');

    $response = $this->getJson('/api/v1/dashboard/internal-profiles/999999');

    $response->assertStatus(404);
});
