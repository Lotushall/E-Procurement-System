<?php

namespace App\Modules\Tender\Application\Project\Queries;

use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;

final class GetTenderProjectStatsQuery
{
    /**
     * @return array{totalCount: int, totalBudget: float, inProgressCount: int, completedCount: int}
     */
    public function execute(): array
    {
        $stats = TenderProjects::query()
            ->selectRaw(
                'COUNT(*) as total_count, '.
                'SUM(budget) as total_budget, '.
                'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as in_progress_count, '.
                'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed_count',
                ['published', 'completed'],
            )
            ->first();

        return [
            'totalCount' => (int) $stats->total_count,
            'totalBudget' => (float) $stats->total_budget,
            'inProgressCount' => (int) $stats->in_progress_count,
            'completedCount' => (int) $stats->completed_count,
        ];
    }
}
