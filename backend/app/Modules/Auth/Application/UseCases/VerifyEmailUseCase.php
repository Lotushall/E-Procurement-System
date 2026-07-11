<?php

namespace App\Modules\Auth\Application\UseCases;

use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use InvalidArgumentException;

final class VerifyEmailUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
    ) {}

    public function execute(int $userId, string $hash): User
    {
        $user = $this->users->findById($userId);

        if ($user === null || ! hash_equals($hash, sha1($user->email()->value))) {
            throw new InvalidArgumentException('Invalid verification link.');
        }

        if ($user->isVerified()) {
            return $user;
        }

        $user->verifyEmail();

        return $this->users->save($user);
    }
}
