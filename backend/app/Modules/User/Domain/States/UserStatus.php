<?php

namespace App\Modules\User\Domain\States;

use App\Modules\User\Domain\States\UserStatus\Active;
use App\Modules\User\Domain\States\UserStatus\Inactive;
use App\Modules\User\Domain\States\UserStatus\Pending;
use App\Modules\User\Domain\States\UserStatus\Suspended;
use Spatie\ModelStates\State;
use Spatie\ModelStates\StateConfig;

abstract class UserStatus extends State
{
    protected static ?string $name = null;

    public static function config(): StateConfig
    {
        return parent::config()
            ->default(Pending::class)
            ->registerState([
                Pending::class,
                Active::class,
                Suspended::class,
                Inactive::class,
            ])
            ->allowTransition(Pending::class, Active::class)
            ->allowTransition(Pending::class, Suspended::class)
            ->allowTransition(Pending::class, Inactive::class)
            ->allowTransition(Active::class, Pending::class)
            ->allowTransition(Active::class, Suspended::class)
            ->allowTransition(Active::class, Inactive::class)
            ->allowTransition(Suspended::class, Pending::class)
            ->allowTransition(Suspended::class, Active::class)
            ->allowTransition(Suspended::class, Inactive::class)
            ->allowTransition(Inactive::class, Pending::class)
            ->allowTransition(Inactive::class, Active::class)
            ->allowTransition(Inactive::class, Suspended::class);
    }
}
