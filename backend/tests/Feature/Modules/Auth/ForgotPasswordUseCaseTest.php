<?php

use App\Modules\Auth\Application\UseCases\ForgotPasswordUseCase;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use App\Modules\User\Infrastructure\Notifications\QueuedResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

function forgotPasswordUseCase(): ForgotPasswordUseCase
{
    return app(ForgotPasswordUseCase::class);
}

test('execute sends a reset password notification to an existing user', function () {
    Notification::fake();

    $user = UserModel::factory()->create(['email' => 'jdoe@example.com']);

    forgotPasswordUseCase()->execute('jdoe@example.com');

    Notification::assertSentTo($user, QueuedResetPassword::class);
});

test('execute does not send anything for an email that does not exist', function () {
    Notification::fake();

    forgotPasswordUseCase()->execute('missing@example.com');

    Notification::assertNothingSent();
});
