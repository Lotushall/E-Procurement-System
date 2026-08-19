<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function internalAdminUserForUserDestroy(): User
{
    $admin = User::factory()->create(['user_type' => 'internal']);
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'users.delete', 'guard_name' => 'web']));
    $admin->assignRole($role);

    return $admin;
}

test('deleting a user requires authentication', function () {
    $target = User::factory()->create(['user_type' => 'internal']);

    $response = $this->deleteJson("/api/v1/dashboard/users/{$target->id}");

    $response->assertStatus(401);
});

test('an internal user without the users.delete permission cannot delete a user', function () {
    $target = User::factory()->create(['user_type' => 'internal']);
    $actor = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($actor, 'web');

    $response = $this->deleteJson("/api/v1/dashboard/users/{$target->id}");

    $response->assertStatus(403);
});

test('a user with the users.delete permission can delete another user', function () {
    $target = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs(internalAdminUserForUserDestroy(), 'web');

    $response = $this->deleteJson("/api/v1/dashboard/users/{$target->id}");

    $response->assertStatus(204);
    $this->assertSoftDeleted('users', ['id' => $target->id]);
});

test('a soft-deleted user no longer appears in the users index', function () {
    $target = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs(internalAdminUserForUserDestroy(), 'web');

    $this->deleteJson("/api/v1/dashboard/users/{$target->id}")->assertStatus(204);

    $response = $this->getJson('/api/v1/dashboard/users');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('id'))->not->toContain($target->id);
});

test('deleting a user revokes all of their sessions', function () {
    $target = User::factory()->create(['user_type' => 'internal']);
    DB::table('sessions')->insert([
        'id' => 'target-session-http',
        'user_id' => $target->id,
        'ip_address' => '10.0.0.5',
        'user_agent' => 'Mozilla/5.0',
        'payload' => 'x',
        'last_activity' => now()->timestamp,
    ]);
    $this->actingAs(internalAdminUserForUserDestroy(), 'web');

    $this->deleteJson("/api/v1/dashboard/users/{$target->id}")->assertStatus(204);

    expect(DB::table('sessions')->where('id', 'target-session-http')->exists())->toBeFalse();
});

test('deleting your own account is rejected with 422', function () {
    $admin = internalAdminUserForUserDestroy();
    $this->actingAs($admin, 'web');

    $response = $this->deleteJson("/api/v1/dashboard/users/{$admin->id}");

    $response->assertStatus(422)->assertJson(['message' => 'ไม่สามารถลบบัญชีของตัวเองได้']);
    $this->assertDatabaseHas('users', ['id' => $admin->id, 'deleted_at' => null]);
});

test('deleting a nonexistent user returns 404', function () {
    $this->actingAs(internalAdminUserForUserDestroy(), 'web');

    $response = $this->deleteJson('/api/v1/dashboard/users/999999');

    $response->assertStatus(404);
});

test('a soft-deleted user cannot log in', function () {
    $target = User::factory()->create([
        'email' => 'target-deleted@example.com',
        'password' => Hash::make('secret123'),
    ]);
    $this->actingAs(internalAdminUserForUserDestroy(), 'web');

    $this->deleteJson("/api/v1/dashboard/users/{$target->id}")->assertStatus(204);

    $response = $this->withHeader('Referer', 'http://localhost:3000')
        ->postJson('/api/v1/auth/login', [
            'identifier' => 'target-deleted@example.com',
            'password' => 'secret123',
        ]);

    $response->assertStatus(422)
        ->assertJsonFragment(['identifier' => ['ข้อมูลเข้าสู่ระบบไม่ถูกต้อง']]);
});

test('a soft-deleted user 404s on the show endpoint', function () {
    $target = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs(internalAdminUserForUserDestroy(), 'web');

    $this->deleteJson("/api/v1/dashboard/users/{$target->id}")->assertStatus(204);

    $response = $this->getJson("/api/v1/dashboard/users/{$target->id}");

    $response->assertStatus(404);
});
