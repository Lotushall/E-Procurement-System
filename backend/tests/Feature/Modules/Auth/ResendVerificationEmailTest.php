<?php

use App\Modules\User\Domain\Contracts\EmailVerificationSenderInterface;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use App\Modules\User\Infrastructure\Notifications\QueuedVerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

const RESEND_VERIFICATION_MESSAGE = 'หากมีบัญชีที่ใช้อีเมลนี้อยู่และยังไม่ได้ยืนยัน ระบบได้ส่งลิงก์ยืนยันใหม่ให้แล้ว';

test('resending to an unverified email sends a new verification link', function () {
    Notification::fake();
    $user = UserModel::factory()->unverified()->create(['email' => 'jdoe@example.com']);

    $this->postJson('/api/v1/auth/email/resend', ['email' => 'jdoe@example.com'])
        ->assertOk()
        ->assertJson(['message' => RESEND_VERIFICATION_MESSAGE]);

    Notification::assertSentTo($user, QueuedVerifyEmail::class);
});

test('resending to an email that is already verified sends nothing but answers the same', function () {
    Notification::fake();
    UserModel::factory()->create(['email' => 'jdoe@example.com']);

    $this->postJson('/api/v1/auth/email/resend', ['email' => 'jdoe@example.com'])
        ->assertOk()
        ->assertJson(['message' => RESEND_VERIFICATION_MESSAGE]);

    Notification::assertNothingSent();
});

test('resending to an email that does not exist sends nothing but answers the same', function () {
    Notification::fake();

    $this->postJson('/api/v1/auth/email/resend', ['email' => 'missing@example.com'])
        ->assertOk()
        ->assertJson(['message' => RESEND_VERIFICATION_MESSAGE]);

    Notification::assertNothingSent();
});

test('resending a verification email requires a valid email', function (array $payload) {
    $this->postJson('/api/v1/auth/email/resend', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
})->with([
    'missing' => [[]],
    'not an email' => [['email' => 'not-an-email']],
]);

test('an unexpected failure while resending returns a server error', function () {
    UserModel::factory()->unverified()->create(['email' => 'jdoe@example.com']);
    $this->mock(EmailVerificationSenderInterface::class)
        ->shouldReceive('sendVerificationEmail')
        ->andThrow(new RuntimeException('mail server is down'));

    $this->postJson('/api/v1/auth/email/resend', ['email' => 'jdoe@example.com'])
        ->assertServerError()
        ->assertJson(['message' => 'ไม่สามารถส่งอีเมลยืนยันซ้ำได้']);
});
