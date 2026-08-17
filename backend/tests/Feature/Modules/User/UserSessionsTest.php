<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withHeader('Referer', 'http://localhost:3000');
});

function actingSessionsAdmin(): User
{
    $admin = User::factory()->create(['user_type' => 'internal']);
    $role = Role::create(['name' => 'admin', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::firstOrCreate(['name' => 'users.update', 'guard_name' => 'web']));
    $admin->assignRole($role);

    return $admin;
}

function insertSessionRow(string $id, int $userId, string $userAgent, ?int $lastActivity = null): void
{
    DB::table('sessions')->updateOrInsert(['id' => $id], [
        'user_id' => $userId,
        'ip_address' => '10.0.0.5',
        'user_agent' => $userAgent,
        'payload' => 'x',
        'last_activity' => $lastActivity ?? now()->timestamp,
    ]);
}

test('fetching sessions requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/users/1/sessions');

    $response->assertStatus(401);
});

test('fetching sessions requires the users.update permission', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson("/api/v1/dashboard/users/{$user->id}/sessions");

    $response->assertStatus(403);
});

test('sessions list marks the row matching the current session as current and parses the user agent', function () {
    $admin = actingSessionsAdmin();
    $this->actingAs($admin, 'web');

    $sessionId = session()->getId();

    insertSessionRow(
        $sessionId,
        $admin->id,
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );

    $response = $this->withCredentials()
        ->withCookie(config('session.cookie'), $sessionId)
        ->getJson("/api/v1/dashboard/users/{$admin->id}/sessions");

    $response->assertOk()
        ->assertJsonPath('data.0.current', true)
        ->assertJsonPath('data.0.browser', 'Chrome')
        ->assertJsonPath('data.0.os', 'Windows')
        ->assertJsonPath('data.0.device', 'Desktop');
});

test('sessions list only returns rows for the requested user', function () {
    $admin = actingSessionsAdmin();
    $this->actingAs($admin, 'web');
    $otherUser = User::factory()->create(['user_type' => 'internal']);

    insertSessionRow(session()->getId(), $admin->id, 'Mozilla/5.0');
    insertSessionRow('unrelated-session-id', $otherUser->id, 'Mozilla/5.0');

    $response = $this->getJson("/api/v1/dashboard/users/{$admin->id}/sessions");

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
});

test('revoking a single session removes only that row, scoped to the user', function () {
    $admin = actingSessionsAdmin();
    $this->actingAs($admin, 'web');
    $otherUser = User::factory()->create(['user_type' => 'internal']);

    insertSessionRow('target-session', $admin->id, 'Mozilla/5.0');
    insertSessionRow('other-users-session', $otherUser->id, 'Mozilla/5.0');

    $this->deleteJson("/api/v1/dashboard/users/{$admin->id}/sessions/target-session")->assertOk();
    $this->deleteJson("/api/v1/dashboard/users/{$admin->id}/sessions/other-users-session")->assertOk();

    expect(DB::table('sessions')->where('id', 'target-session')->exists())->toBeFalse();
    expect(DB::table('sessions')->where('id', 'other-users-session')->exists())->toBeTrue();
});

test('revoking all sessions with keep_current preserves only the current row', function () {
    $admin = actingSessionsAdmin();
    $this->actingAs($admin, 'web');

    $currentId = session()->getId();
    insertSessionRow($currentId, $admin->id, 'Mozilla/5.0');
    insertSessionRow('stale-session', $admin->id, 'Mozilla/5.0', now()->subDay()->timestamp);

    $this->withCredentials()
        ->withCookie(config('session.cookie'), $currentId)
        ->deleteJson("/api/v1/dashboard/users/{$admin->id}/sessions?keep_current=1")
        ->assertOk();

    expect(DB::table('sessions')->where('id', $currentId)->exists())->toBeTrue();
    expect(DB::table('sessions')->where('id', 'stale-session')->exists())->toBeFalse();
});

test('revoking all sessions without keep_current removes every row including current', function () {
    $admin = actingSessionsAdmin();
    $this->actingAs($admin, 'web');

    $currentId = session()->getId();
    insertSessionRow($currentId, $admin->id, 'Mozilla/5.0');
    insertSessionRow('stale-session', $admin->id, 'Mozilla/5.0', now()->subDay()->timestamp);

    $this->deleteJson("/api/v1/dashboard/users/{$admin->id}/sessions")->assertOk();

    expect(DB::table('sessions')->where('user_id', $admin->id)->count())->toBe(0);
});
