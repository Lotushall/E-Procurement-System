<?php

use App\Modules\Auth\Application\DTOs\ChangePasswordData;
use App\Modules\Auth\Application\UseCases\ChangePasswordUseCase;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use App\Modules\User\Infrastructure\Repositories\UserRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

function changePasswordUseCase(): ChangePasswordUseCase
{
    return new ChangePasswordUseCase(new UserRepository);
}

test('execute updates the password when the current password is correct', function () {
    $user = UserModel::factory()->create([
        'password' => Hash::make('old-secret123'),
    ]);

    changePasswordUseCase()->execute(new ChangePasswordData(
        userId: $user->id,
        currentPassword: 'old-secret123',
        password: 'new-secret123',
    ));

    expect(Hash::check('new-secret123', $user->fresh()->password))->toBeTrue();
});

test('execute throws when the current password is wrong', function () {
    $user = UserModel::factory()->create([
        'password' => Hash::make('old-secret123'),
    ]);

    $threw = false;

    try {
        changePasswordUseCase()->execute(new ChangePasswordData(
            userId: $user->id,
            currentPassword: 'wrong-password',
            password: 'new-secret123',
        ));
    } catch (ValidationException $e) {
        $threw = true;
        expect($e->errors()['currentPassword'][0])->toBe('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    }

    expect($threw)->toBeTrue();
    expect(Hash::check('old-secret123', $user->fresh()->password))->toBeTrue();
});

test('execute records password_changed_at', function () {
    $user = UserModel::factory()->create([
        'password' => Hash::make('old-secret123'),
    ]);

    changePasswordUseCase()->execute(new ChangePasswordData(
        userId: $user->id,
        currentPassword: 'old-secret123',
        password: 'new-secret123',
    ));

    expect($user->fresh()->password_changed_at)->not->toBeNull();
});
