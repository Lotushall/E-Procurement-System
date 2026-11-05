<?php

namespace App\Modules\Tender\Application\Project\Queries;

use App\Modules\Tender\Domain\Entities\Project\TenderProject;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;

final class ListTenderProjectOptionsQuery
{
    /**
     * Not cached: projects change often, and caching would need invalidation
     * in the store/update/destroy use cases.
     *
     * $openForTor keeps only the projects that still take new TORs, the same
     * statuses StoreTorRequest accepts.
     *
     * @return array<int, array{id: int, projectCode: string, name: string}>
     */
    public function execute(?int $departmentId = null, bool $openForTor = false): array
    {
        return TenderProjects::query()
            ->when($departmentId !== null, fn ($query) => $query->where('department_id', $departmentId))
            ->when($openForTor, fn ($query) => $query->whereIn('status', TenderProject::OPEN_FOR_TOR_STATUSES))
            ->orderBy('project_code')
            ->get(['id', 'project_code', 'name'])
            ->map(fn (TenderProjects $project): array => [
                'id' => $project->id,
                'projectCode' => $project->project_code,
                'name' => $project->name,
            ])
            ->all();
    }
}
