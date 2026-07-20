<?php

namespace App\Modules\Auth\Application\UseCases;

use App\Modules\Auth\Application\DTOs\UpdateAccountData;
use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\User\Domain\Contracts\EmailVerificationSenderInterface;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;

final class UpdateAccountUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly EmailVerificationSenderInterface $verificationSender,
    ) {}

    public function execute(UpdateAccountData $data): User
    {
        $user = $this->users->findById($data->userId);
        $newEmail = Email::fromString($data->email);
        $emailChanged = ! $user->email()->equals($newEmail);

        $user->changeUsername($data->username);
        $user->changeEmail($newEmail);

        $saved = $this->users->save($user);

        if ($emailChanged) {
            $this->verificationSender->sendVerificationEmail($saved->id());
        }

        return $saved;
    }
}
