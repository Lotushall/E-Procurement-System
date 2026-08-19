<?php

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\InternalProfiles\Infrastructure\Models\Position;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForPositionDestroy(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));

    return $user;
}

test('deleting a position requires authentication', function () {
    $position = Position::create(['name' => 'Developer']);

    $response = $this->deleteJson("/api/v1/dashboard/positions/{$position->id}");

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot delete a position', function () {
    $position = Position::create(['name' => 'Developer']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->deleteJson("/api/v1/dashboard/positions/{$position->id}");

    $response->assertStatus(403);
});

test('a user with the admin role can delete a position with no users assigned', function () {
    $position = Position::create(['name' => 'Developer']);
    $this->actingAs(internalAdminUserForPositionDestroy(), 'web');

    $response = $this->deleteJson("/api/v1/dashboard/positions/{$position->id}");

    $response->assertStatus(204);
    $this->assertDatabaseMissing('positions', ['id' => $position->id]);
});

test('deleting a position that still has users assigned is rejected with 422', function () {
    $position = Position::create(['name' => 'Developer']);
    $target = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $target->id, 'firstname' => 'A', 'lastname' => 'B', 'position_id' => $position->id]);
    $this->actingAs(internalAdminUserForPositionDestroy(), 'web');

    $response = $this->deleteJson("/api/v1/dashboard/positions/{$position->id}");

    $response->assertStatus(422)->assertJson(['message' => 'ไม่สามารถลบตำแหน่งที่ยังมีผู้ใช้งานอยู่ได้']);
    $this->assertDatabaseHas('positions', ['id' => $position->id]);
});

test('deleting a nonexistent position returns 404', function () {
    $this->actingAs(internalAdminUserForPositionDestroy(), 'web');

    $response = $this->deleteJson('/api/v1/dashboard/positions/999999');

    $response->assertStatus(404);
});
