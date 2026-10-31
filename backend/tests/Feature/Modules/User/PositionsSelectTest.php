<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Position;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('fetching position select options requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/positions/select');

    $response->assertStatus(401);
});

test('an internal user with no role or permission can fetch position select options', function () {
    Position::create(['name' => 'Manager']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/positions/select');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Manager');
});

test('a vendor user cannot fetch position select options', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/positions/select');

    $response->assertStatus(403);
});

test('position select options include only id and name, ordered by name', function () {
    Position::create(['name' => 'Manager']);
    Position::create(['name' => 'Analyst']);
    $admin = User::factory()->create(['user_type' => 'internal']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));
    $this->actingAs($admin, 'web');

    $response = $this->getJson('/api/v1/dashboard/positions/select');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'Analyst')
        ->assertJsonPath('data.1.name', 'Manager')
        ->assertJsonMissingPath('data.0.internalProfilesCount');
});

test('position select options cache is invalidated when a position is created', function () {
    $admin = User::factory()->create(['user_type' => 'internal']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));
    $this->actingAs($admin, 'web');

    $this->getJson('/api/v1/dashboard/positions/select')
        ->assertJsonCount(0, 'data');

    Position::create(['name' => 'Director']);

    $this->getJson('/api/v1/dashboard/positions/select')
        ->assertJsonCount(1, 'data');
});

test('position select options survive a real serializing cache store', function () {
    config(['cache.default' => 'database']);

    Position::create(['name' => 'Director']);
    $admin = User::factory()->create(['user_type' => 'internal']);
    $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));
    $this->actingAs($admin, 'web');

    $this->getJson('/api/v1/dashboard/positions/select')->assertOk();

    $response = $this->getJson('/api/v1/dashboard/positions/select');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Director');
});
