<?php

namespace App\Modules\Tender\Providers;

use App\Modules\Tender\Domain\Repositories\Project\TenderProjectRepositoryInterface;
use App\Modules\Tender\Infrastructure\Repositories\Project\TenderProjectRepository;
use App\Modules\Tender\Presentation\Policies\TenderProjectPolicy;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Gate;
use Nwidart\Modules\Support\ModuleServiceProvider;

class TenderServiceProvider extends ModuleServiceProvider
{
    /**
     * The name of the module.
     */
    protected string $name = 'Tender';

    /**
     * The lowercase version of the module name.
     */
    protected string $nameLower = 'tender';

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

        $this->app->bind(TenderProjectRepositoryInterface::class, TenderProjectRepository::class);
    }

    public function boot(): void
    {
        parent::boot();

        // The ability names are deliberately NOT the same strings as the
        // permission names their policy methods check (`tender_projects.create`,
        // `tender_projects.viewAny`, `tender_projects.update`,
        // `tender_projects.updateStatus`, `tender_projects.delete`): Spatie registers
        // a Gate::before hook that grants access immediately whenever the
        // ability name exactly matches a permission the user holds, bypassing
        // the policy method (and its user_type guard) entirely on the allow
        // path. Using distinct ability names forces every request through the
        // policy.
        Gate::define('tender-projects.store', [TenderProjectPolicy::class, 'create']);
        Gate::define('tender-projects.index', [TenderProjectPolicy::class, 'viewAny']);
        Gate::define('tender-projects.update', [TenderProjectPolicy::class, 'update']);
        Gate::define('tender-projects.updateStatus', [TenderProjectPolicy::class, 'updateStatus']);
        Gate::define('tender-projects.destroy', [TenderProjectPolicy::class, 'delete']);
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
