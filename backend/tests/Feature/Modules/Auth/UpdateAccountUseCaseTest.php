<?php

use App\Modules\Auth\Application\DTOs\UpdateAccountData;
use App\Modules\Auth\Application\UseCases\UpdateAccountUseCase;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use App\Modules\User\Infrastructure\Notifications\QueuedVerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

function updateAccountUseCase(): UpdateAccountUseCase
{
    return app(UpdateAccountUseCase::class);
}

test('execute updates the username and email', function () {
    $user = UserModel::factory()->create([
        'username' => 'jdoe',
        'email' => 'jdoe@example.com',
    ]);

    $updated = updateAccountUseCase()->execute(new UpdateAccountData(
        userId: $user->id,
        username: 'jdoe2',
        email: 'jdoe2@example.com',
    ));

    expect($updated->username())->toBe('jdoe2')
        ->and($updated->email()->value)->toBe('jdoe2@example.com');

    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'username' => 'jdoe2',
        'email' => 'jdoe2@example.com',
    ]);
});

test('execute resets email verification when the email changes', function () {
    $user = UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'email_verified_at' => now(),
    ]);

    $updated = updateAccountUseCase()->execute(new UpdateAccountData(
        userId: $user->id,
        username: $user->username,
        email: 'new@example.com',
    ));

    expect($updated->isVerified())->toBeFalse();
});

test('execute sends a new verification email when the email changes', function () {
    Notification::fake();

    $user = UserModel::factory()->create([
        'email' => 'jdoe@example.com',
        'email_verified_at' => now(),
    ]);

    updateAccountUseCase()->execute(new UpdateAccountData(
        userId: $user->id,
        username: $user->username,
        email: 'new@example.com',
    ));

    Notification::assertSentTo($user, QueuedVerifyEmail::class);
});

test('execute does not send a verification email when the email is unchanged', function () {
    Notification::fake();

    $user = UserModel::factory()->create([
        'username' => 'jdoe',
        'email' => 'jdoe@example.com',
        'email_verified_at' => now(),
    ]);

    updateAccountUseCase()->execute(new UpdateAccountData(
        userId: $user->id,
        username: 'jdoe2',
        email: 'jdoe@example.com',
    ));

    Notification::assertNothingSent();
});
