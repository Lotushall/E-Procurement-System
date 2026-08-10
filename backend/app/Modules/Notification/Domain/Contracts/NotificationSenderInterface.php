<?php

namespace App\Modules\Notification\Domain\Contracts;

use Illuminate\Notifications\Notification;

interface NotificationSenderInterface
{
    /**
     * @param  int[]  $userIds
     */
    public function send(array $userIds, Notification $notification): void;
}
