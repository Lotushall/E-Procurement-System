<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\InternalProfiles\Infrastructure\Models\Position;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('fetching internal profiles requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/internal-profiles');

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot fetch internal profiles', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/internal-profiles');

    $response->assertStatus(403);
});

test('the internal profiles list can be filtered by search', function () {
    $target = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $target->id, 'employee_no' => 'EMP001', 'firstname' => 'Somchai', 'lastname' => 'Jaidee']);
    $other = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $other->id, 'employee_no' => 'EMP002', 'firstname' => 'Somsri', 'lastname' => 'Somboon']);
    $admin = User::factory()->create(['user_type' => 'internal']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));
    $this->actingAs($admin, 'web');

    $response = $this->getJson('/api/v1/dashboard/internal-profiles?search=Somchai');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.firstname', 'Somchai');
});

test('the internal profiles list can be sorted by department name', function () {
    $it = Department::create(['name' => 'IT']);
    $hr = Department::create(['name' => 'HR']);
    $userInIt = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $userInIt->id, 'firstname' => 'A', 'lastname' => 'A', 'department_id' => $it->id]);
    $userInHr = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $userInHr->id, 'firstname' => 'B', 'lastname' => 'B', 'department_id' => $hr->id]);
    $admin = User::factory()->create(['user_type' => 'internal']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));
    $this->actingAs($admin, 'web');

    $response = $this->getJson('/api/v1/dashboard/internal-profiles?sort_by=department&sort_direction=asc');

    $response->assertOk()
        ->assertJsonPath('data.0.department.name', 'HR')
        ->assertJsonPath('data.1.department.name', 'IT');
});

test('the internal profiles list can be sorted by position name', function () {
    $lead = Position::create(['name' => 'Lead']);
    $staff = Position::create(['name' => 'Staff']);
    $userLead = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $userLead->id, 'firstname' => 'A', 'lastname' => 'A', 'position_id' => $lead->id]);
    $userStaff = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $userStaff->id, 'firstname' => 'B', 'lastname' => 'B', 'position_id' => $staff->id]);
    $admin = User::factory()->create(['user_type' => 'internal']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));
    $this->actingAs($admin, 'web');

    $response = $this->getJson('/api/v1/dashboard/internal-profiles?sort_by=position&sort_direction=asc');

    $response->assertOk()
        ->assertJsonPath('data.0.position.name', 'Lead')
        ->assertJsonPath('data.1.position.name', 'Staff');
});

test('the internal profiles list can be filtered by department', function () {
    $it = Department::create(['name' => 'IT']);
    $hr = Department::create(['name' => 'HR']);
    $userInIt = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $userInIt->id, 'firstname' => 'A', 'lastname' => 'A', 'department_id' => $it->id]);
    $userInHr = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $userInHr->id, 'firstname' => 'B', 'lastname' => 'B', 'department_id' => $hr->id]);
    $admin = User::factory()->create(['user_type' => 'internal']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));
    $this->actingAs($admin, 'web');

    $response = $this->getJson('/api/v1/dashboard/internal-profiles?department_id='.$it->id);

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.firstname', 'A');
});

test('the internal profiles list can be filtered by position', function () {
    $lead = Position::create(['name' => 'Lead']);
    $staff = Position::create(['name' => 'Staff']);
    $userLead = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $userLead->id, 'firstname' => 'A', 'lastname' => 'A', 'position_id' => $lead->id]);
    $userStaff = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $userStaff->id, 'firstname' => 'B', 'lastname' => 'B', 'position_id' => $staff->id]);
    $admin = User::factory()->create(['user_type' => 'internal']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));
    $this->actingAs($admin, 'web');

    $response = $this->getJson('/api/v1/dashboard/internal-profiles?position_id='.$lead->id);

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.firstname', 'A');
});
