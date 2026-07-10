<?php

namespace App\Modules\Vendor\Domain\States;

use App\Modules\Vendor\Domain\States\DocumentStatus\Approved;
use App\Modules\Vendor\Domain\States\DocumentStatus\Pending;
use App\Modules\Vendor\Domain\States\DocumentStatus\Rejected;
use Spatie\ModelStates\State;
use Spatie\ModelStates\StateConfig;

abstract class DocumentStatus extends State
{
    protected static ?string $name = null;

    public static function config(): StateConfig
    {
        return parent::config()
            ->default(Pending::class)
            ->registerState([
                Pending::class,
                Approved::class,
                Rejected::class,
            ])
            ->allowTransition(Pending::class, Approved::class)
            ->allowTransition(Pending::class, Rejected::class)
            ->allowTransition(Rejected::class, Pending::class);
    }
}
