<?php

namespace App\Modules\Auth\Application\UseCases;

use App\Modules\Auth\Application\DTOs\LoginData;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use App\Modules\User\Domain\States\UserStatus\Inactive;
use App\Modules\User\Domain\States\UserStatus\Suspended;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

final class LoginUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
    ) {}

    public function execute(LoginData $data): User
    {
        $user = $data->identifierField === 'email'
            ? $this->users->findByEmail($data->identifier)
            : $this->users->findByUsername($data->identifier);

        if ($user === null || ! Hash::check($data->password, $user->passwordHash())) {
            throw ValidationException::withMessages([
                'identifier' => 'These credentials do not match our records.',
            ]);
        }

        if (! $user->isVerified()) {
            throw ValidationException::withMessages([
                'identifier' => 'Please verify your email before logging in.',
            ]);
        }

        if ($user->status() instanceof Suspended) {
            throw ValidationException::withMessages([
                'identifier' => 'Your account has been suspended.',
            ]);
        }

        if ($user->status() instanceof Inactive) {
            throw ValidationException::withMessages([
                'identifier' => 'Your account is inactive.',
            ]);
        }

        return $user;
    }
}
