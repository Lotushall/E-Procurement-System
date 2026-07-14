<?php

namespace App\Modules\User\Infrastructure\Notifications;

use App\Modules\User\Domain\Contracts\PasswordResetLinkSenderInterface;
use Illuminate\Support\Facades\Password;

final class PasswordResetLinkSender implements PasswordResetLinkSenderInterface
{
    public function sendResetLink(string $email): void
    {
        Password::sendResetLink(['email' => $email]);
    }
}
