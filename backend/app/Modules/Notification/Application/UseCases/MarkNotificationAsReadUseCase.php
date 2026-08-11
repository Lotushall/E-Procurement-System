<?php

namespace App\Modules\Notification\Application\UseCases;

use App\Modules\User\Infrastructure\Models\User;

final class MarkNotificationAsReadUseCase
{
    public function execute(int $userId, string $notificationId): void
    {
        $notification = User::query()->findOrFail($userId)
            ->notifications()
            ->findOrFail($notificationId);

        $notification->markAsRead();
    }
}
