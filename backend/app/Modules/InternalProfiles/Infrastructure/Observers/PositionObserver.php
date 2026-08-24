<?php

namespace App\Modules\InternalProfiles\Infrastructure\Observers;

use App\Modules\InternalProfiles\Application\Queries\ListPositionOptionsQuery;
use App\Modules\InternalProfiles\Infrastructure\Models\Position;

class PositionObserver
{
    public function saved(Position $position): void
    {
        app_cache_forget(ListPositionOptionsQuery::CACHE_KEY);
    }

    public function deleted(Position $position): void
    {
        app_cache_forget(ListPositionOptionsQuery::CACHE_KEY);
    }
}
