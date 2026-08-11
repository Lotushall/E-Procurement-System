<?php

namespace App\Modules\Notification\Application\UseCases;

use App\Modules\User\Infrastructure\Models\User;

final class MarkAllNotificationsAsReadUseCase
{
    public function execute(int $userId): void
    {
        User::query()->findOrFail($userId)
            ->unreadNotifications()
            ->update(['read_at' => now()]);
    }
}
