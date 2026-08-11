<?php

namespace App\Modules\Notification\Application\Queries;

use App\Modules\User\Infrastructure\Models\User;

final class CountUnreadNotificationsQuery
{
    public function execute(int $userId): int
    {
        return User::query()->findOrFail($userId)->unreadNotifications()->count();
    }
}
