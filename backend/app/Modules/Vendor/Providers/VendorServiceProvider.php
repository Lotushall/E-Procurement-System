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

        // Ability names are deliberately NOT the same string as the
        // `vendors.*` permission names the policy methods check: Spatie
        // registers a Gate::before hook that grants access immediately
        // whenever the ability name exactly matches a permission the user
        // holds, bypassing these policy methods (and their user_type guard)
        // entirely on the allow path. Using distinct ability names forces
        // every request through the policy.
        Gate::define('vendors.list', [VendorProfilePolicy::class, 'viewAny']);
        Gate::define('vendors.moderate', [VendorProfilePolicy::class, 'review']);
        Gate::define('vendors.destroy', [VendorProfilePolicy::class, 'delete']);
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
