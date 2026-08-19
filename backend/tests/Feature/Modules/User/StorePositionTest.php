<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Position;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForPositionStore(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));

    return $user;
}

test('creating a position requires authentication', function () {
    $response = $this->postJson('/api/v1/dashboard/positions', ['name' => 'Developer']);

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot create a position', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/dashboard/positions', ['name' => 'Developer']);

    $response->assertStatus(403);
});

test('a user with the admin role can create a position', function () {
    $this->actingAs(internalAdminUserForPositionStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/positions', ['name' => 'Developer']);

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Developer')
        ->assertJsonPath('data.internalProfilesCount', 0);
    $this->assertDatabaseHas('positions', ['name' => 'Developer']);
});

test('position name must be unique', function () {
    Position::create(['name' => 'Developer']);
    $this->actingAs(internalAdminUserForPositionStore(), 'web');

    $response = $this->postJson('/api/v1/dashboard/positions', ['name' => 'Developer']);

    $response->assertStatus(422)->assertJsonValidationErrors('name');
});
