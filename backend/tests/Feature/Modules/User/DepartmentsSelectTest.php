<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('fetching department select options requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/departments/select');

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot fetch department select options', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/departments/select');

    $response->assertStatus(403);
});

test('department select options include only id and name, ordered by name', function () {
    Department::create(['name' => 'IT']);
    Department::create(['name' => 'Accounting']);
    $admin = User::factory()->create(['user_type' => 'internal']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));
    $this->actingAs($admin, 'web');

    $response = $this->getJson('/api/v1/dashboard/departments/select');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'Accounting')
        ->assertJsonPath('data.1.name', 'IT')
        ->assertJsonMissingPath('data.0.internalProfilesCount');
});

test('department select options cache is invalidated when a department is created', function () {
    $admin = User::factory()->create(['user_type' => 'internal']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));
    $this->actingAs($admin, 'web');

    $this->getJson('/api/v1/dashboard/departments/select')
        ->assertJsonCount(0, 'data');

    Department::create(['name' => 'HR']);

    $this->getJson('/api/v1/dashboard/departments/select')
        ->assertJsonCount(1, 'data');
});

test('department select options survive a real serializing cache store', function () {
    config(['cache.default' => 'database']);

    Department::create(['name' => 'Finance']);
    $admin = User::factory()->create(['user_type' => 'internal']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));
    $this->actingAs($admin, 'web');

    $this->getJson('/api/v1/dashboard/departments/select')->assertOk();

    $response = $this->getJson('/api/v1/dashboard/departments/select');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Finance');
});
