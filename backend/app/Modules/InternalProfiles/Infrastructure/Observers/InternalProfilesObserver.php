<?php

namespace App\Modules\InternalProfiles\Infrastructure\Observers;

use App\Modules\InternalProfiles\Application\Queries\ListInternalProfileOptionsQuery;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;

class InternalProfilesObserver
{
    public function saved(InternalProfiles $profile): void
    {
        app_cache_forget(ListInternalProfileOptionsQuery::CACHE_KEY);
    }

    public function deleted(InternalProfiles $profile): void
    {
        app_cache_forget(ListInternalProfileOptionsQuery::CACHE_KEY);
    }
}
