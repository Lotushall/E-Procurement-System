<?php

namespace App\Modules\InternalProfiles\Application\Queries;

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class GetInternalProfileByIdQuery
{
    public function execute(int $id): InternalProfiles
    {
        return InternalProfiles::query()
            ->with(['InternalProfileDepartment', 'InternalProfilePosition'])
            ->find($id) ?? throw (new ModelNotFoundException)->setModel(InternalProfiles::class, [$id]);
    }
}
