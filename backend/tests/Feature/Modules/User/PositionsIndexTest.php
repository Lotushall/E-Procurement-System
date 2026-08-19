<?php

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\InternalProfiles\Infrastructure\Models\Position;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForPositionsIndex(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));

    return $user;
}

test('fetching positions requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/positions');

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot fetch positions', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/positions');

    $response->assertStatus(403);
});

test('the positions list includes id, name, and internalProfilesCount', function () {
    $position = Position::create(['name' => 'Developer']);
    $target = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $target->id, 'firstname' => 'A', 'lastname' => 'B', 'position_id' => $position->id]);
    $this->actingAs(internalAdminUserForPositionsIndex(), 'web');

    $response = $this->getJson('/api/v1/dashboard/positions');

    $response->assertOk()
        ->assertJsonPath('data.0.id', $position->id)
        ->assertJsonPath('data.0.name', 'Developer')
        ->assertJsonPath('data.0.internalProfilesCount', 1);
});
