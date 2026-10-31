<?php

namespace App\Modules\Tender\Application\Project\Queries;

use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class GetTenderProjectByIdQuery
{
    /**
     * The project's TORs are limited to the ones the viewer may see.
     */
    public function execute(int $id, User $viewer): TenderProjects
    {
        return TenderProjects::query()
            ->with([
                'TenderProjectsDepartment',
                'TenderProjectsPersonInCharge',
                'TenderProjectsTors' => fn (HasMany $query) => $query->visibleTo($viewer)->orderBy('tor_code'),
            ])
            ->withAllocatedBudget()
            ->find($id) ?? throw (new ModelNotFoundException)->setModel(TenderProjects::class, [$id]);
    }
}
