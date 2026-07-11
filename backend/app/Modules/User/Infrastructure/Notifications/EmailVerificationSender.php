<?php

namespace App\Modules\User\Infrastructure\Notifications;

use App\Modules\User\Domain\Contracts\EmailVerificationSenderInterface;
use App\Modules\User\Infrastructure\Models\User as UserModel;

final class EmailVerificationSender implements EmailVerificationSenderInterface
{
    public function sendVerificationEmail(int $userId): void
    {
        UserModel::findOrFail($userId)->sendEmailVerificationNotification();
    }
}
