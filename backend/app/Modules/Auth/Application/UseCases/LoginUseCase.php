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
                'identifier' => 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง',
            ]);
        }

        if (! $user->isVerified()) {
            throw ValidationException::withMessages([
                'identifier' => 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ',
            ]);
        }

        if ($user->status() instanceof Suspended) {
            throw ValidationException::withMessages([
                'identifier' => 'บัญชีของคุณถูกระงับการใช้งาน',
            ]);
        }

        if ($user->status() instanceof Inactive) {
            throw ValidationException::withMessages([
                'identifier' => 'บัญชีของคุณถูกปิดใช้งาน',
            ]);
        }

        $user->recordLogin();

        return $this->users->save($user);
    }
}
