<?php

namespace App\Modules\Auth\Application\UseCases;

use App\Modules\User\Domain\Contracts\PasswordResetLinkSenderInterface;

final class ForgotPasswordUseCase
{
    public function __construct(
        private readonly PasswordResetLinkSenderInterface $passwordResetLinkSender,
    ) {}

    public function execute(string $email): void
    {
        $this->passwordResetLinkSender->sendResetLink($email);
    }
}
