<?php

namespace App\Modules\InternalProfiles\Application\Queries;

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use Illuminate\Database\Eloquent\Collection;

final class ListDepartmentsQuery
{
    /**
     * @return Collection<int, Department>
     */
    public function execute(): Collection
    {
        return Department::query()
            ->withCount('internalProfiles')
            ->orderBy('id')
            ->get();
    }
}
