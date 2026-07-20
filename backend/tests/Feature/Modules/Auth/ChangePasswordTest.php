<?php

use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('an authenticated user can change their password', function () {
    $user = UserModel::factory()->create([
        'password' => Hash::make('old-secret123'),
    ]);
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/auth/password/change', [
        'currentPassword' => 'old-secret123',
        'password' => 'new-secret123',
        'password_confirmation' => 'new-secret123',
    ]);

    $response->assertOk();
    expect(Hash::check('new-secret123', $user->fresh()->password))->toBeTrue();
});

test('changing the password requires authentication', function () {
    $response = $this->postJson('/api/v1/auth/password/change', [
        'currentPassword' => 'old-secret123',
        'password' => 'new-secret123',
        'password_confirmation' => 'new-secret123',
    ]);

    $response->assertStatus(401);
});

test('changing the password fails with the wrong current password', function () {
    $user = UserModel::factory()->create([
        'password' => Hash::make('old-secret123'),
    ]);
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/auth/password/change', [
        'currentPassword' => 'wrong-password',
        'password' => 'new-secret123',
        'password_confirmation' => 'new-secret123',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('currentPassword');
    expect(Hash::check('old-secret123', $user->fresh()->password))->toBeTrue();
});

test('changing the password validation requires confirmation to match', function () {
    $user = UserModel::factory()->create([
        'password' => Hash::make('old-secret123'),
    ]);
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/auth/password/change', [
        'currentPassword' => 'old-secret123',
        'password' => 'new-secret123',
        'password_confirmation' => 'different-password',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('password');
});
