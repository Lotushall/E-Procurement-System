<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('fetching departments requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/departments');

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot fetch departments', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/departments');

    $response->assertStatus(403);
});

test('the departments list includes id, name, and internalProfilesCount', function () {
    $department = Department::create(['name' => 'IT']);
    $target = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $target->id, 'firstname' => 'A', 'lastname' => 'B', 'department_id' => $department->id]);
    $admin = User::factory()->create(['user_type' => 'internal']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));
    $this->actingAs($admin, 'web');

    $response = $this->getJson('/api/v1/dashboard/departments');

    $response->assertOk()
        ->assertJsonPath('data.0.id', $department->id)
        ->assertJsonPath('data.0.name', 'IT')
        ->assertJsonPath('data.0.internalProfilesCount', 1);
});
