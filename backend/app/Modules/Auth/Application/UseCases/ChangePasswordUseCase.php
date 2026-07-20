<?php

namespace App\Modules\Auth\Application\UseCases;

use App\Modules\Auth\Application\DTOs\ChangePasswordData;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

final class ChangePasswordUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
    ) {}

    public function execute(ChangePasswordData $data): User
    {
        $user = $this->users->findById($data->userId);

        if (! Hash::check($data->currentPassword, $user->passwordHash())) {
            throw ValidationException::withMessages([
                'currentPassword' => 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
            ]);
        }

        $user->changePassword(Hash::make($data->password));

        return $this->users->save($user);
    }
}
