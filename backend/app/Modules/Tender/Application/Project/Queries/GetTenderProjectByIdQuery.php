<?php

namespace App\Modules\Tender\Application\Project\Queries;

use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class GetTenderProjectByIdQuery
{
    public function execute(int $id): TenderProjects
    {
        return TenderProjects::query()
            ->with(['TenderProjectsDepartment', 'TenderProjectsPersonInCharge'])
            ->find($id) ?? throw (new ModelNotFoundException)->setModel(TenderProjects::class, [$id]);
    }
}
