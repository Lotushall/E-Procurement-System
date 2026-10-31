<?php

namespace App\Modules\Tender\Application\Project\Queries;

use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;

final class ListTenderProjectOptionsQuery
{
    /**
     * Not cached: projects change often, and caching would need invalidation
     * in the store/update/destroy use cases.
     *
     * @return array<int, array{id: int, projectCode: string, name: string}>
     */
    public function execute(): array
    {
        return TenderProjects::query()
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
