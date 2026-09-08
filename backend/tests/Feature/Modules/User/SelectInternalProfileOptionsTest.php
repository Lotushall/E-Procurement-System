<?php

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForInternalProfileOptions(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));

    return $user;
}

test('fetching internal profile options requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/internal-profiles/select');

    $response->assertStatus(401);
});

test('an internal user without the admin role cannot fetch internal profile options', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/internal-profiles/select');

    $response->assertStatus(403);
});

test('internal profile options include every profile regardless of linked user, ordered by firstname then lastname', function () {
    InternalProfiles::create(['firstname' => 'Somchai', 'lastname' => 'Jaidee', 'employee_no' => 'EMP002']);
    InternalProfiles::create(['firstname' => 'Anan', 'lastname' => 'Suk']);
    $linkedUser = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['firstname' => 'Malee', 'lastname' => 'Rak', 'user_id' => $linkedUser->id]);
    $this->actingAs(internalAdminUserForInternalProfileOptions(), 'web');

    $response = $this->getJson('/api/v1/dashboard/internal-profiles/select');

    $response->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.name', 'Anan Suk')
        ->assertJsonPath('data.1.name', 'Malee Rak')
        ->assertJsonPath('data.2.name', 'EMP002 - Somchai Jaidee');
});
