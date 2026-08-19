<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Position;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForPositionUpdate(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));

    return $user;
}

test('updating a position requires authentication', function () {
    $position = Position::create(['name' => 'Developer']);

    $response = $this->patchJson("/api/v1/dashboard/positions/{$position->id}", ['name' => 'Senior Developer']);

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot update a position', function () {
    $position = Position::create(['name' => 'Developer']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->patchJson("/api/v1/dashboard/positions/{$position->id}", ['name' => 'Senior Developer']);

    $response->assertStatus(403);
});

test('a user with the admin role can rename a position', function () {
    $position = Position::create(['name' => 'Developer']);
    $this->actingAs(internalAdminUserForPositionUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/positions/{$position->id}", ['name' => 'Senior Developer']);

    $response->assertOk()->assertJsonPath('data.name', 'Senior Developer');
    $this->assertDatabaseHas('positions', ['id' => $position->id, 'name' => 'Senior Developer']);
});

test('position name must stay unique on update, ignoring itself', function () {
    Position::create(['name' => 'Manager']);
    $position = Position::create(['name' => 'Developer']);
    $this->actingAs(internalAdminUserForPositionUpdate(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/positions/{$position->id}", ['name' => 'Manager']);
    $response->assertStatus(422)->assertJsonValidationErrors('name');

    $sameNameResponse = $this->patchJson("/api/v1/dashboard/positions/{$position->id}", ['name' => 'Developer']);
    $sameNameResponse->assertOk();
});

test('updating a nonexistent position returns 404', function () {
    $this->actingAs(internalAdminUserForPositionUpdate(), 'web');

    $response = $this->patchJson('/api/v1/dashboard/positions/999999', ['name' => 'Developer']);

    $response->assertStatus(404);
});
