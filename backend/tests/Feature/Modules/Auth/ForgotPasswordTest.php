<?php

use App\Modules\User\Infrastructure\Models\User as UserModel;
use App\Modules\User\Infrastructure\Notifications\QueuedResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

test('requesting a reset link for an existing email sends the reset password notification', function () {
    Notification::fake();

    $user = UserModel::factory()->create(['email' => 'jdoe@example.com']);

    $response = $this->postJson('/api/v1/auth/password/forgot', [
        'email' => 'jdoe@example.com',
    ]);

    $response->assertOk()
        ->assertJson(['message' => 'หากมีบัญชีที่ใช้อีเมลนี้อยู่ในระบบ เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้แล้ว']);

    Notification::assertSentTo($user, QueuedResetPassword::class);
});

test('requesting a reset link for an email that does not exist returns the same generic message', function () {
    Notification::fake();

    $response = $this->postJson('/api/v1/auth/password/forgot', [
        'email' => 'missing@example.com',
    ]);

    $response->assertOk()
        ->assertJson(['message' => 'หากมีบัญชีที่ใช้อีเมลนี้อยู่ในระบบ เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้แล้ว']);

    Notification::assertNothingSent();
});

test('forgot password validation requires a valid email', function () {
    $response = $this->postJson('/api/v1/auth/password/forgot', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('email');
});

test('the reset password link points to the frontend reset-password page', function () {
    Notification::fake();

    $user = UserModel::factory()->create(['email' => 'jdoe@example.com']);

    $this->postJson('/api/v1/auth/password/forgot', ['email' => 'jdoe@example.com']);

    Notification::assertSentTo($user, QueuedResetPassword::class, function (QueuedResetPassword $notification) use ($user) {
        $mail = $notification->toMail($user);
        $url = $mail->actionUrl;

        return str_contains($url, '/reset-password?email=')
            && str_contains($url, '&token=');
    });
});
