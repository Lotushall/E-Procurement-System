<?php

namespace App\Modules\InternalProfiles\Infrastructure\Observers;

use App\Modules\InternalProfiles\Application\Queries\ListDepartmentOptionsQuery;
use App\Modules\InternalProfiles\Infrastructure\Models\Department;

class DepartmentObserver
{
    public function saved(Department $department): void
    {
        app_cache_forget(ListDepartmentOptionsQuery::CACHE_KEY);
    }

    public function deleted(Department $department): void
    {
        app_cache_forget(ListDepartmentOptionsQuery::CACHE_KEY);
    }
}
