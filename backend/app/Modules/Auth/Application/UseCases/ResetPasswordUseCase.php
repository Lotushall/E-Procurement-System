<?php

namespace App\Modules\Auth\Application\UseCases;

use App\Modules\Auth\Application\DTOs\ResetpasswordData;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use InvalidArgumentException;

final class ResetPasswordUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
    ) {}

    public function execute(ResetpasswordData $data): void
    {
        try {
            $email = Crypt::decryptString($data->encryptedEmail);
        } catch (DecryptException) {
            throw new InvalidArgumentException('ลิงก์ตั้งรหัสผ่านใหม่ไม่ถูกต้องหรือหมดอายุ');
        }

        $status = Password::reset(
            [
                'email' => $email,
                'token' => $data->token,
                'password' => $data->password,
                'password_confirmation' => $data->password,
            ],
            function ($eloquentUser) use ($data): void {
                $user = $this->users->findById($eloquentUser->id);
                $user->changePassword(Hash::make($data->password));
                $this->users->save($user);
            }
        );

        if ($status !== Password::PasswordReset) {
            throw new InvalidArgumentException('ลิงก์ตั้งรหัสผ่านใหม่ไม่ถูกต้องหรือหมดอายุ');
        }
    }
}
