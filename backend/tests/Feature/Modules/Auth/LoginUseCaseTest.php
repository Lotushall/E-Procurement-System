<?php

use App\Modules\Auth\Application\DTOs\LoginData;
use App\Modules\Auth\Application\UseCases\LoginUseCase;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use App\Modules\User\Infrastructure\Repositories\UserRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

function loginUseCase(): LoginUseCase
{
    return new LoginUseCase(new UserRepository);
}

test('login succeeds with a verified active user identified by email', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'username' => 'jdoe',
        'password' => Hash::make('secret123'),
    ]);

    $user = loginUseCase()->execute(new LoginData(
        identifier: 'jdoe@example.com',
        identifierField: 'email',
        password: 'secret123',
        remember: false,
    ));

    expect($user->email()->value)->toBe('jdoe@example.com');
});

test('login succeeds with a verified active user identified by username', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'username' => 'jdoe',
        'password' => Hash::make('secret123'),
    ]);

    $user = loginUseCase()->execute(new LoginData(
        identifier: 'jdoe',
        identifierField: 'username',
        password: 'secret123',
        remember: false,
    ));

    expect($user->username())->toBe('jdoe');
});

test('login succeeds when status is pending but the email is verified', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
        'status' => 'pending',
    ]);

    $user = loginUseCase()->execute(new LoginData(
        identifier: 'jdoe@example.com',
        identifierField: 'email',
        password: 'secret123',
        remember: false,
    ));

    expect($user->email()->value)->toBe('jdoe@example.com');
});

test('login fails when the identifier does not exist', function () {
    $threw = false;

    try {
        loginUseCase()->execute(new LoginData(
            identifier: 'missing@example.com',
            identifierField: 'email',
            password: 'secret123',
            remember: false,
        ));
    } catch (ValidationException $e) {
        $threw = true;
        expect($e->errors()['identifier'][0])->toBe('ข้อมูลเข้าสู่ระบบไม่ถูกต้อง');
    }

    expect($threw)->toBeTrue();
});

test('login fails when the password is wrong', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
    ]);

    $threw = false;

    try {
        loginUseCase()->execute(new LoginData(
            identifier: 'jdoe@example.com',
            identifierField: 'email',
            password: 'wrong-password',
            remember: false,
        ));
    } catch (ValidationException $e) {
        $threw = true;
        expect($e->errors()['identifier'][0])->toBe('ข้อมูลเข้าสู่ระบบไม่ถูกต้อง');
    }

    expect($threw)->toBeTrue();
});

test('login fails when the email is not verified', function () {
    UserModel::factory()->unverified()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
    ]);

    $threw = false;

    try {
        loginUseCase()->execute(new LoginData(
            identifier: 'jdoe@example.com',
            identifierField: 'email',
            password: 'secret123',
            remember: false,
        ));
    } catch (ValidationException $e) {
        $threw = true;
        expect($e->errors()['identifier'][0])->toBe('กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ');
    }

    expect($threw)->toBeTrue();
});

test('login fails when the account is suspended', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
        'status' => 'suspended',
    ]);

    $threw = false;

    try {
        loginUseCase()->execute(new LoginData(
            identifier: 'jdoe@example.com',
            identifierField: 'email',
            password: 'secret123',
            remember: false,
        ));
    } catch (ValidationException $e) {
        $threw = true;
        expect($e->errors()['identifier'][0])->toBe('บัญชีของคุณถูกระงับการใช้งาน');
    }

    expect($threw)->toBeTrue();
});

test('login fails when the account is inactive', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
        'status' => 'inactive',
    ]);

    $threw = false;

    try {
        loginUseCase()->execute(new LoginData(
            identifier: 'jdoe@example.com',
            identifierField: 'email',
            password: 'secret123',
            remember: false,
        ));
    } catch (ValidationException $e) {
        $threw = true;
        expect($e->errors()['identifier'][0])->toBe('บัญชีของคุณถูกปิดใช้งาน');
    }

    expect($threw)->toBeTrue();
});

test('login records last_login_at on success', function () {
    UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'password' => Hash::make('secret123'),
    ]);

    $user = loginUseCase()->execute(new LoginData(
        identifier: 'jdoe@example.com',
        identifierField: 'email',
        password: 'secret123',
        remember: false,
    ));

    expect($user->lastLoginAt())->not->toBeNull();
});
