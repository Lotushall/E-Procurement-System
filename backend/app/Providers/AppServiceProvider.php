<?php

namespace App\Providers;

use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Model::preventLazyLoading();

        Relation::enforceMorphMap([
            'user' => User::class,
        ]);

        // Shared by the `/select` option endpoints of several modules. The
        // ability name matches no permission name, so Spatie's Gate::before
        // hook cannot grant it without running this check.
        Gate::define('select-options', fn (User $user): bool => $user->user_type === UserType::Internal);
    }
}
