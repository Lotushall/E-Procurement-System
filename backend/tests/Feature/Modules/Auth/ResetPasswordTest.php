<?php

use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

uses(RefreshDatabase::class);

test('resetting the password with a valid token updates the password', function () {
    $user = UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('old-secret123'),
    ]);

    $token = Password::createToken($user);

    $response = $this->postJson('/api/v1/auth/password/reset', [
        'email' => Crypt::encryptString('jdoe@example.com'),
        'token' => $token,
        'password' => 'new-secret123',
        'password_confirmation' => 'new-secret123',
    ]);

    $response->assertOk()
        ->assertJson(['message' => 'ตั้งรหัสผ่านใหม่สำเร็จ']);

    expect(Hash::check('new-secret123', $user->fresh()->password))->toBeTrue();
});

test('resetting the password with an invalid token fails with a generic message', function () {
    UserModel::factory()->create(['email' => 'jdoe@example.com']);

    $response = $this->postJson('/api/v1/auth/password/reset', [
        'email' => Crypt::encryptString('jdoe@example.com'),
        'token' => 'invalid-token',
        'password' => 'new-secret123',
        'password_confirmation' => 'new-secret123',
    ]);

    $response->assertStatus(403)
        ->assertJson(['message' => 'ลิงก์ตั้งรหัสผ่านใหม่ไม่ถูกต้องหรือหมดอายุ']);
});

test('reset password validation requires the password confirmation to match', function () {
    $response = $this->postJson('/api/v1/auth/password/reset', [
        'email' => 'irrelevant',
        'token' => 'irrelevant',
        'password' => 'new-secret123',
        'password_confirmation' => 'different-password',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('password');
});

test('reset password validation requires email, token, and password', function () {
    $response = $this->postJson('/api/v1/auth/password/reset', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['email', 'token', 'password']);
});
