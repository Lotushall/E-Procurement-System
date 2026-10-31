<?php

namespace App\Modules\Tender\Application\Project\Queries;

use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListTenderProjectsQuery
{
    private const DEFAULT_PER_PAGE = 20;

    /**
     * Each project's tors_count only counts the TORs the viewer may see.
     */
    public function execute(
        User $viewer,
        ?string $search = null,
        ?string $status = null,
        ?int $departmentId = null,
        ?int $fiscalYear = null,
        ?string $dateFrom = null,
        ?string $dateTo = null,
        ?string $sortBy = null,
        ?string $sortDirection = null,
        ?int $page = null,
        ?int $perPage = null,
    ): LengthAwarePaginator {
        $tieBreakDirection = $sortDirection === 'asc' ? 'asc' : 'desc';

        return TenderProjects::query()
            ->with('TenderProjectsDepartment', 'TenderProjectsPersonInCharge')
            ->withCount(['TenderProjectsTors as tors_count' => fn (Builder $query) => $query->visibleTo($viewer)])
            ->search($search)
            ->status($status)
            ->departmentId($departmentId)
            ->fiscalYear($fiscalYear)
            ->dateRange($dateFrom, $dateTo)
            ->sort($sortBy, $sortDirection)
            ->orderBy('id', $tieBreakDirection)
            ->paginate(perPage: $perPage ?? self::DEFAULT_PER_PAGE, page: $page ?? 1);
    }
}
