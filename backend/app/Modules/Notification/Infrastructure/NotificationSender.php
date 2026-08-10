<?php

namespace App\Modules\Notification\Infrastructure;

use App\Modules\Notification\Domain\Contracts\NotificationSenderInterface;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Notification as NotificationFacade;

final class NotificationSender implements NotificationSenderInterface
{
    public function send(array $userIds, Notification $notification): void
    {
        $users = User::query()->whereIn('id', $userIds)->get();

        NotificationFacade::send($users, $notification);
    }
}
