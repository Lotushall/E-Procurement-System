<?php

namespace App\Modules\User\Providers;

use App\Modules\User\Domain\Repositories\InternalProfilesRepositoryInterface;
use App\Modules\User\Infrastructure\Repositories\InternalProfilesRepository;
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
    }
}
