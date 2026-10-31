<?php

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForSelectAvailable(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));

    return $user;
}

test('fetching available internal profiles requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/internal-profiles/select-available');

    $response->assertStatus(401);
});

test('an internal user with no role or permission can fetch available internal profiles', function () {
    InternalProfiles::create(['firstname' => 'Anan', 'lastname' => 'Suk']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/internal-profiles/select-available');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Anan Suk');
});

test('a vendor user cannot fetch available internal profiles', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/internal-profiles/select-available');

    $response->assertStatus(403);
});

test('available internal profiles only include profiles with no linked user, ordered by firstname', function () {
    InternalProfiles::create(['firstname' => 'Somchai', 'lastname' => 'Jaidee']);
    InternalProfiles::create(['firstname' => 'Anan', 'lastname' => 'Suk', 'employee_no' => 'EMP002']);
    $linkedUser = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['firstname' => 'Malee', 'lastname' => 'Rak', 'user_id' => $linkedUser->id]);
    $this->actingAs(internalAdminUserForSelectAvailable(), 'web');

    $response = $this->getJson('/api/v1/dashboard/internal-profiles/select-available');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'Anan Suk (EMP002)')
        ->assertJsonPath('data.1.name', 'Somchai Jaidee');
});
