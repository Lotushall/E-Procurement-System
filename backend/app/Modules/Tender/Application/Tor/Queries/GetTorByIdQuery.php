<?php

namespace App\Modules\Tender\Application\Tor\Queries;

use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class GetTorByIdQuery
{
    /**
     * A TOR the viewer may not see is reported exactly like a missing one,
     * so the response never reveals that it exists.
     */
    public function execute(int $id, User $viewer): Tors
    {
        return Tors::query()
            ->with(Tors::RESOURCE_RELATIONS)
            ->visibleTo($viewer)
            ->find($id) ?? throw (new ModelNotFoundException)->setModel(Tors::class, [$id]);
    }
}
