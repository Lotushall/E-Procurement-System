<?php

namespace App\Modules\InternalProfiles\Application\Queries;

use App\Modules\InternalProfiles\Infrastructure\Models\Position;
use Illuminate\Database\Eloquent\Collection;

final class ListPositionsQuery
{
    /**
     * @return Collection<int, Position>
     */
    public function execute(): Collection
    {
        return Position::query()
            ->withCount('internalProfiles')
            ->orderBy('id')
            ->get();
    }
}
