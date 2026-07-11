<?php

namespace App\Modules\Auth\Application\UseCases;

use App\Modules\User\Domain\Contracts\EmailVerificationSenderInterface;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;

final class ResendVerificationEmailUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly EmailVerificationSenderInterface $verificationSender,
    ) {}

    public function execute(string $email): void
    {
        $user = $this->users->findByEmail($email);

        if ($user === null || $user->isVerified()) {
            return;
        }

        $this->verificationSender->sendVerificationEmail($user->id());
    }
}
