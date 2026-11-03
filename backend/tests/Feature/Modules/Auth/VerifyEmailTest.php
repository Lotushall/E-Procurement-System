<?php

use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;

uses(RefreshDatabase::class);

function verifyEmailUrl(int $id, string $hash): string
{
    return URL::temporarySignedRoute('verification.verify', now()->addMinutes(5), ['id' => $id, 'hash' => $hash]);
}

test('a valid signed link verifies the email', function () {
    $user = UserModel::factory()->unverified()->create(['email' => 'jdoe@example.com']);

    $this->getJson(verifyEmailUrl($user->id, sha1('jdoe@example.com')))
        ->assertOk()
        ->assertJson([
            'message' => 'ยืนยันอีเมลสำเร็จ',
            'data' => ['id' => $user->id, 'email' => 'jdoe@example.com'],
        ])
        ->assertJsonPath('data.verifiedAt', fn (?string $verifiedAt) => $verifiedAt !== null);

    expect($user->fresh()->email_verified_at)->not->toBeNull();
});

test('verifying an email that is already verified keeps the original verification time', function () {
    $verifiedAt = now()->subDays(3)->startOfSecond();
    $user = UserModel::factory()->create(['email' => 'jdoe@example.com', 'email_verified_at' => $verifiedAt]);

    $this->getJson(verifyEmailUrl($user->id, sha1('jdoe@example.com')))
        ->assertOk()
        ->assertJsonPath('data.verifiedAt', $verifiedAt->toIso8601String());

    expect($user->fresh()->email_verified_at->equalTo($verifiedAt))->toBeTrue();
});

test('a link whose hash does not match the email is rejected', function () {
    $user = UserModel::factory()->unverified()->create(['email' => 'jdoe@example.com']);

    $this->getJson(verifyEmailUrl($user->id, sha1('someone-else@example.com')))
        ->assertForbidden()
        ->assertJson(['message' => 'ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ']);

    expect($user->fresh()->email_verified_at)->toBeNull();
});

test('a link for a user that does not exist is rejected', function () {
    $this->getJson(verifyEmailUrl(999999, sha1('missing@example.com')))
        ->assertForbidden()
        ->assertJson(['message' => 'ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ']);
});

test('a link without a valid signature is rejected', function () {
    $user = UserModel::factory()->unverified()->create(['email' => 'jdoe@example.com']);

    $this->getJson('/api/v1/auth/email/verify/'.$user->id.'/'.sha1('jdoe@example.com'))
        ->assertForbidden();

    expect($user->fresh()->email_verified_at)->toBeNull();
});

test('an unexpected failure while verifying returns a server error', function () {
    $this->mock(UserRepositoryInterface::class)
        ->shouldReceive('findById')
        ->andThrow(new RuntimeException('database is down'));

    $this->getJson(verifyEmailUrl(1, sha1('jdoe@example.com')))
        ->assertServerError()
        ->assertJson(['message' => 'ยืนยันอีเมลไม่สำเร็จ']);
});
