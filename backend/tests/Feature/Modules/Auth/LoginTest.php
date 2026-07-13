<?php

use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withHeader('Referer', 'http://localhost:3000');
});

test('a verified active user can login with email and password', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'username' => 'jdoe',
        'password' => Hash::make('secret123'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'identifier' => 'jdoe@example.com',
        'password' => 'secret123',
    ]);

    $response->assertOk()
        ->assertJson(['message' => 'เข้าสู่ระบบสำเร็จ'])
        ->assertJsonPath('data.email', 'jdoe@example.com');

    $this->assertAuthenticated('web');
});

test('a verified active user can login with username and password', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'username' => 'jdoe',
        'password' => Hash::make('secret123'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'identifier' => 'jdoe',
        'password' => 'secret123',
    ]);

    $response->assertOk();
    $this->assertAuthenticated('web');
});

test('login fails with 422 when the password is wrong', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'identifier' => 'jdoe@example.com',
        'password' => 'wrong-password',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('identifier');

    $this->assertGuest('web');
});

test('login fails with 422 when the email is not verified', function () {
    UserModel::factory()->unverified()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'identifier' => 'jdoe@example.com',
        'password' => 'secret123',
    ]);

    $response->assertStatus(422)
        ->assertJsonFragment(['identifier' => ['กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ']]);
});

test('login fails with 422 when the account is suspended', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
        'status' => 'suspended',
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'identifier' => 'jdoe@example.com',
        'password' => 'secret123',
    ]);

    $response->assertStatus(422)
        ->assertJsonFragment(['identifier' => ['บัญชีของคุณถูกระงับการใช้งาน']]);
});

test('login validation requires identifier and password', function () {
    $response = $this->postJson('/api/v1/auth/login', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['identifier', 'password']);
});

test('remember=true issues a remember token for the user', function () {
    $user = UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
        'remember_token' => null,
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'identifier' => 'jdoe@example.com',
        'password' => 'secret123',
        'remember' => true,
    ]);

    $response->assertOk();

    expect($user->fresh()->remember_token)->not->toBeNull();
});
