<?php

namespace App\Modules\Notification\Providers;

use App\Modules\Notification\Domain\Contracts\NotificationSenderInterface;
use App\Modules\Notification\Infrastructure\NotificationSender;
use Nwidart\Modules\Support\ModuleServiceProvider;

class NotificationServiceProvider extends ModuleServiceProvider
{
    /**
     * The name of the module.
     */
    protected string $name = 'Notification';

    /**
     * The lowercase version of the module name.
     */
    protected string $nameLower = 'notification';

    public function register(): void
    {
        parent::register();

        $this->app->bind(NotificationSenderInterface::class, NotificationSender::class);
    }
}
