<?php

use App\Modules\Auth\Application\DTOs\ResetpasswordData;
use App\Modules\Auth\Application\UseCases\ResetPasswordUseCase;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

uses(RefreshDatabase::class);

function resetPasswordUseCase(): ResetPasswordUseCase
{
    return app(ResetPasswordUseCase::class);
}

test('execute updates the password when the token and encrypted email are valid', function () {
    $user = UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('old-secret123'),
    ]);

    $token = Password::createToken($user);

    resetPasswordUseCase()->execute(new ResetpasswordData(
        encryptedEmail: Crypt::encryptString('jdoe@example.com'),
        token: $token,
        password: 'new-secret123',
    ));

    expect(Hash::check('new-secret123', $user->fresh()->password))->toBeTrue();
});

test('execute throws for an invalid token', function () {
    UserModel::factory()->create(['email' => 'jdoe@example.com']);

    $threw = false;

    try {
        resetPasswordUseCase()->execute(new ResetpasswordData(
            encryptedEmail: Crypt::encryptString('jdoe@example.com'),
            token: 'not-a-real-token',
            password: 'new-secret123',
        ));
    } catch (InvalidArgumentException $e) {
        $threw = true;
        expect($e->getMessage())->toBe('ลิงก์ตั้งรหัสผ่านใหม่ไม่ถูกต้องหรือหมดอายุ');
    }

    expect($threw)->toBeTrue();
});

test('execute throws when the email cannot be decrypted', function () {
    $threw = false;

    try {
        resetPasswordUseCase()->execute(new ResetpasswordData(
            encryptedEmail: 'not-an-encrypted-payload',
            token: 'irrelevant',
            password: 'new-secret123',
        ));
    } catch (InvalidArgumentException $e) {
        $threw = true;
    }

    expect($threw)->toBeTrue();
});
