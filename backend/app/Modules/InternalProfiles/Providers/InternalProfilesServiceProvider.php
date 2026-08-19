<?php

namespace App\Modules\InternalProfiles\Providers;

use App\Modules\InternalProfiles\Domain\Repositories\DepartmentRepositoryInterface;
use App\Modules\InternalProfiles\Domain\Repositories\InternalProfilesRepositoryInterface;
use App\Modules\InternalProfiles\Domain\Repositories\PositionRepositoryInterface;
use App\Modules\InternalProfiles\Infrastructure\Repositories\DepartmentRepository;
use App\Modules\InternalProfiles\Infrastructure\Repositories\InternalProfilesRepository;
use App\Modules\InternalProfiles\Infrastructure\Repositories\PositionRepository;
use Nwidart\Modules\Support\ModuleServiceProvider;

class InternalProfilesServiceProvider extends ModuleServiceProvider
{
    /**
     * The name of the module.
     */
    protected string $name = 'InternalProfiles';

    /**
     * The lowercase version of the module name.
     */
    protected string $nameLower = 'internalprofiles';

    public function register(): void
    {
        parent::register();

        $this->app->bind(InternalProfilesRepositoryInterface::class, InternalProfilesRepository::class);
        $this->app->bind(DepartmentRepositoryInterface::class, DepartmentRepository::class);
        $this->app->bind(PositionRepositoryInterface::class, PositionRepository::class);
    }
}
