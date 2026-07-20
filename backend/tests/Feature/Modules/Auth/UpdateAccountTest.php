<?php

use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('an authenticated user can update their username and email', function () {
    $user = UserModel::factory()->create([
        'username' => 'jdoe',
        'email' => 'jdoe@example.com',
    ]);
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/auth/account', [
        'username' => 'jdoe2',
        'email' => 'jdoe2@example.com',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.username', 'jdoe2')
        ->assertJsonPath('data.email', 'jdoe2@example.com');

    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'username' => 'jdoe2',
        'email' => 'jdoe2@example.com',
    ]);
});

test('updating the account requires authentication', function () {
    $response = $this->postJson('/api/v1/auth/account', [
        'username' => 'jdoe2',
        'email' => 'jdoe2@example.com',
    ]);

    $response->assertStatus(401);
});

test('updating the account rejects a username already taken by another user', function () {
    UserModel::factory()->create(['username' => 'taken']);
    $user = UserModel::factory()->create(['username' => 'jdoe']);
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/auth/account', [
        'username' => 'taken',
        'email' => $user->email,
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('username');
});

test('updating the account allows keeping the same username and email', function () {
    $user = UserModel::factory()->create(['username' => 'jdoe', 'email' => 'jdoe@example.com']);
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/auth/account', [
        'username' => 'jdoe',
        'email' => 'jdoe@example.com',
    ]);

    $response->assertOk();
});

test('updating the account validation requires username and email', function () {
    $user = UserModel::factory()->create();
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/auth/account', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['username', 'email']);
});
