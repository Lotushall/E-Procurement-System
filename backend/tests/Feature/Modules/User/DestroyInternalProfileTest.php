<?php

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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

test('deleting an internal profile also soft-deletes the linked user account', function () {
    $target = User::factory()->create(['user_type' => 'internal']);
    $profile = InternalProfiles::create(['user_id' => $target->id, 'firstname' => 'Somchai', 'lastname' => 'Jaidee']);
    $this->actingAs(internalAdminUserForInternalProfileDestroy(), 'web');

    $response = $this->deleteJson("/api/v1/dashboard/internal-profiles/{$profile->id}");

    $response->assertStatus(204);
    $this->assertDatabaseMissing('internal_profiles', ['id' => $profile->id]);
    $this->assertSoftDeleted('users', ['id' => $target->id]);
});

test('deleting an internal profile revokes the linked user account sessions', function () {
    $target = User::factory()->create(['user_type' => 'internal']);
    $profile = InternalProfiles::create(['user_id' => $target->id, 'firstname' => 'Somchai', 'lastname' => 'Jaidee']);
    DB::table('sessions')->insert([
        'id' => 'target-profile-session',
        'user_id' => $target->id,
        'ip_address' => '10.0.0.5',
        'user_agent' => 'Mozilla/5.0',
        'payload' => 'x',
        'last_activity' => now()->timestamp,
    ]);
    $this->actingAs(internalAdminUserForInternalProfileDestroy(), 'web');

    $this->deleteJson("/api/v1/dashboard/internal-profiles/{$profile->id}")->assertStatus(204);

    expect(DB::table('sessions')->where('id', 'target-profile-session')->exists())->toBeFalse();
});

test('deleting your own linked internal profile is rejected with 422', function () {
    $admin = internalAdminUserForInternalProfileDestroy();
    $profile = InternalProfiles::create(['user_id' => $admin->id, 'firstname' => 'Admin', 'lastname' => 'User']);
    $this->actingAs($admin, 'web');

    $response = $this->deleteJson("/api/v1/dashboard/internal-profiles/{$profile->id}");

    $response->assertStatus(422)->assertJson(['message' => 'ไม่สามารถลบบัญชีของตัวเองได้']);
    $this->assertDatabaseHas('internal_profiles', ['id' => $profile->id]);
    $this->assertDatabaseHas('users', ['id' => $admin->id, 'deleted_at' => null]);
});
