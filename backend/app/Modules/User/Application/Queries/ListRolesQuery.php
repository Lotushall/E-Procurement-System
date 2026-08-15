<?php

namespace App\Modules\User\Application\Queries;

use Illuminate\Database\Eloquent\Collection;
use Spatie\Permission\Models\Role;

final class ListRolesQuery
{
    /**
     * @return Collection<int, Role>
     */
    public function execute(): Collection
    {
        return Role::query()
            ->with('permissions')
            ->withCount('users')
            ->orderBy('id')
            ->get();
    }
}
