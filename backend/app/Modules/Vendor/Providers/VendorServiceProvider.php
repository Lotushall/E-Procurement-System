<?php

namespace App\Modules\Vendor\Providers;

use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use App\Modules\Vendor\Presentation\Policies\VendorProfilePolicy;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Gate;
use Nwidart\Modules\Support\ModuleServiceProvider;

class VendorServiceProvider extends ModuleServiceProvider
{
    /**
     * The name of the module.
     */
    protected string $name = 'Vendor';

    /**
     * The lowercase version of the module name.
     */
    protected string $nameLower = 'vendor';

    /**
     * Command classes to register.
     *
     * @var string[]
     */
    // protected array $commands = [];

    /**
     * Provider classes to register.
     *
     * @var string[]
     */
    protected array $providers = [];

    public function register(): void
    {
        parent::register();

        $this->app->bind(VendorRepositoryInterface::class, VendorRepository::class);
    }

    public function boot(): void
    {
        parent::boot();

        Gate::define('viewAny', [VendorProfilePolicy::class, 'viewAny']);
        Gate::define('review', [VendorProfilePolicy::class, 'review']);
    }

    /**
     * Define module schedules.
     *
     * @param  $schedule
     */
    // protected function configureSchedules(Schedule $schedule): void
    // {
    //     $schedule->command('inspire')->hourly();
    // }
}
