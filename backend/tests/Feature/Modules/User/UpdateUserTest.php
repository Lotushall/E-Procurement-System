<?php

use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForUpdateUser(): User
{
    $admin = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'users.update', 'guard_name' => 'web']));
    $admin->assignRole($role);

    return $admin;
}

test('updating a user requires authentication', function () {
    $target = User::factory()->create(['user_type' => 'company']);

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}", ['username' => 'x', 'email' => 'x@example.com']);

    $response->assertStatus(401);
});

test('an internal user without the users.update permission cannot update a user', function () {
    $target = User::factory()->create(['user_type' => 'company']);
    $actor = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($actor, 'web');

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}", ['username' => 'x', 'email' => 'x@example.com']);

    $response->assertStatus(403);
});

test('a vendor user account can be updated with just username, email, and password', function () {
    $target = User::factory()->create(['user_type' => 'company', 'username' => 'oldname']);
    $this->actingAs(internalAdminUserForUpdateUser(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}", [
        'username' => 'newname',
        'email' => 'newemail@example.com',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.username', 'newname')
        ->assertJsonPath('data.email', 'newemail@example.com');
    $this->assertDatabaseHas('users', ['id' => $target->id, 'username' => 'newname']);
});

test('a vendor user update rejects role and permissions being required', function () {
    $target = User::factory()->create(['user_type' => 'company']);
    $this->actingAs(internalAdminUserForUpdateUser(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}", [
        'username' => 'newname',
        'email' => 'newemail@example.com',
    ]);

    $response->assertOk();
    $this->assertDatabaseMissing('internal_profiles', ['user_id' => $target->id]);
});

test('an internal user can be updated with a new role and permissions', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']);
    $target = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs(internalAdminUserForUpdateUser(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}", [
        'username' => 'newname',
        'email' => 'newemail@example.com',
        'role' => 'staff',
        'permissions' => ['vendors.view'],
    ]);

    $response->assertOk()
        ->assertJsonPath('data.username', 'newname')
        ->assertJsonPath('data.role', 'staff');
    expect($target->fresh()->hasRole('staff'))->toBeTrue();
});

test('an internal user update requires role', function () {
    $target = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs(internalAdminUserForUpdateUser(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}", [
        'username' => 'newname',
        'email' => 'newemail@example.com',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors(['role']);
});

test('username must stay unique on update, ignoring itself', function () {
    User::factory()->create(['username' => 'taken']);
    $target = User::factory()->create(['user_type' => 'company', 'username' => 'original']);
    $this->actingAs(internalAdminUserForUpdateUser(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}", [
        'username' => 'taken',
        'email' => 'newemail@example.com',
    ]);
    $response->assertStatus(422)->assertJsonValidationErrors('username');

    $sameNameResponse = $this->patchJson("/api/v1/dashboard/users/{$target->id}", [
        'username' => 'original',
        'email' => 'newemail@example.com',
    ]);
    $sameNameResponse->assertOk();
});

test('username and email of a deleted user can be reused on update', function () {
    $deletedUser = User::factory()->create(['username' => 'taken', 'email' => 'taken@example.com']);
    app(UserRepositoryInterface::class)->delete($deletedUser->id);
    $target = User::factory()->create(['user_type' => 'company', 'username' => 'original', 'email' => 'original@example.com']);
    $this->actingAs(internalAdminUserForUpdateUser(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/users/{$target->id}", [
        'username' => 'taken',
        'email' => 'taken@example.com',
    ]);

    $response->assertOk();
    $this->assertDatabaseHas('users', ['id' => $target->id, 'username' => 'taken', 'email' => 'taken@example.com']);
});

test('updating a nonexistent user returns 404', function () {
    $this->actingAs(internalAdminUserForUpdateUser(), 'web');

    $response = $this->patchJson('/api/v1/dashboard/users/999999', [
        'username' => 'x',
        'email' => 'x@example.com',
    ]);

    $response->assertStatus(404);
});
