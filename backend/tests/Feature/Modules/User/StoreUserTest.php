<?php

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForStoreUser(): User
{
    $admin = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'users.create', 'guard_name' => 'web']));
    $admin->assignRole($role);

    return $admin;
}

function unlinkedInternalProfileForStoreUser(array $overrides = []): InternalProfiles
{
    return InternalProfiles::create(array_merge([
        'firstname' => 'Jane',
        'lastname' => 'Doe',
    ], $overrides));
}

function validCreateUserPayload(array $overrides = []): array
{
    return array_merge([
        'username' => 'jdoe',
        'email' => 'jdoe@example.com',
        'password' => 'super-secret',
        'internalProfileId' => unlinkedInternalProfileForStoreUser()->id,
        'role' => 'staff',
        'permissions' => [],
    ], $overrides);
}

test('creating a user requires authentication', function () {
    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload());

    $response->assertStatus(401);
});

test('an internal user without the users.create permission cannot create a user', function () {
    $actor = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($actor, 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload());

    $response->assertStatus(403);
});

test('a user with the users.create permission can create an internal user', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForStoreUser(), 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload());

    $response->assertStatus(201)
        ->assertJsonPath('data.username', 'jdoe')
        ->assertJsonPath('data.email', 'jdoe@example.com')
        ->assertJsonPath('data.userType', 'internal')
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.role', 'staff');
    $this->assertDatabaseHas('users', ['username' => 'jdoe', 'email' => 'jdoe@example.com']);
});

test('username must be unique on create', function () {
    User::factory()->create(['username' => 'jdoe']);
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForStoreUser(), 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload());

    $response->assertStatus(422)->assertJsonValidationErrors('username');
});

test('email must be unique on create', function () {
    User::factory()->create(['email' => 'jdoe@example.com']);
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForStoreUser(), 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload());

    $response->assertStatus(422)->assertJsonValidationErrors('email');
});

test('password must be at least 8 characters on create', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForStoreUser(), 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload(['password' => 'short']));

    $response->assertStatus(422)->assertJsonValidationErrors('password');
});

test('role must exist in the known catalog on create', function () {
    $this->actingAs(internalAdminUserForStoreUser(), 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload(['role' => 'not-a-real-role']));

    $response->assertStatus(422)->assertJsonValidationErrors('role');
});

test('permissions must be within the known catalog on create', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForStoreUser(), 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload([
        'permissions' => ['not.a.real.permission'],
    ]));

    $response->assertStatus(422)->assertJsonValidationErrors('permissions.0');
});

test('internalProfileId is required on create', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForStoreUser(), 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload(['internalProfileId' => null]));

    $response->assertStatus(422)->assertJsonValidationErrors('internalProfileId');
});

test('internalProfileId must reference an existing internal profile', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForStoreUser(), 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload(['internalProfileId' => 999999]));

    $response->assertStatus(422)->assertJsonValidationErrors('internalProfileId');
});

test('username and email of a soft-deleted user can be reused on create', function () {
    User::factory()->create(['username' => 'jdoe', 'email' => 'jdoe@example.com', 'deleted_at' => now()]);
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForStoreUser(), 'web');

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload());

    $response->assertStatus(201);
    $this->assertDatabaseHas('users', ['username' => 'jdoe', 'email' => 'jdoe@example.com', 'deleted_at' => null]);
});

test('internalProfileId must not already be linked to another user', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs(internalAdminUserForStoreUser(), 'web');
    $existingUser = User::factory()->create(['user_type' => 'internal']);
    $linkedProfile = unlinkedInternalProfileForStoreUser(['user_id' => $existingUser->id]);

    $response = $this->postJson('/api/v1/dashboard/users', validCreateUserPayload(['internalProfileId' => $linkedProfile->id]));

    $response->assertStatus(422)->assertJsonValidationErrors('internalProfileId');
});
