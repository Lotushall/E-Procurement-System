<?php

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForInternalProfileDestroy(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));

    return $user;
}

test('deleting an internal profile requires authentication', function () {
    $profile = InternalProfiles::create(['firstname' => 'Somchai', 'lastname' => 'Jaidee']);

    $response = $this->deleteJson("/api/v1/dashboard/internal-profiles/{$profile->id}");

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot delete an internal profile', function () {
    $profile = InternalProfiles::create(['firstname' => 'Somchai', 'lastname' => 'Jaidee']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->deleteJson("/api/v1/dashboard/internal-profiles/{$profile->id}");

    $response->assertStatus(403);
});

test('a user with the admin role can delete an internal profile', function () {
    $profile = InternalProfiles::create(['firstname' => 'Somchai', 'lastname' => 'Jaidee']);
    $this->actingAs(internalAdminUserForInternalProfileDestroy(), 'web');

    $response = $this->deleteJson("/api/v1/dashboard/internal-profiles/{$profile->id}");

    $response->assertStatus(204);
    $this->assertDatabaseMissing('internal_profiles', ['id' => $profile->id]);
});

test('deleting a nonexistent internal profile returns 404', function () {
    $this->actingAs(internalAdminUserForInternalProfileDestroy(), 'web');

    $response = $this->deleteJson('/api/v1/dashboard/internal-profiles/999999');

    $response->assertStatus(404);
});
