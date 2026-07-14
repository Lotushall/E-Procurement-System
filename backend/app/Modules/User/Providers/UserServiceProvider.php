<?php

namespace App\Modules\User\Providers;

use App\Modules\User\Domain\Contracts\EmailVerificationSenderInterface;
use App\Modules\User\Domain\Contracts\PasswordResetLinkSenderInterface;
use App\Modules\User\Domain\Repositories\InternalProfilesRepositoryInterface;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use App\Modules\User\Infrastructure\Notifications\EmailVerificationSender;
use App\Modules\User\Infrastructure\Notifications\PasswordResetLinkSender;
use App\Modules\User\Infrastructure\Repositories\InternalProfilesRepository;
use App\Modules\User\Infrastructure\Repositories\UserRepository;
use Nwidart\Modules\Support\ModuleServiceProvider;

class UserServiceProvider extends ModuleServiceProvider
{
    /**
     * The name of the module.
     */
    protected string $name = 'User';

    /**
     * The lowercase version of the module name.
     */
    protected string $nameLower = 'user';

    public function register(): void
    {
        parent::register();

        $this->app->bind(InternalProfilesRepositoryInterface::class, InternalProfilesRepository::class);
        $this->app->bind(UserRepositoryInterface::class, UserRepository::class);
        $this->app->bind(EmailVerificationSenderInterface::class, EmailVerificationSender::class);
        $this->app->bind(PasswordResetLinkSenderInterface::class, PasswordResetLinkSender::class);
    }
}
