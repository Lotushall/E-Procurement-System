<?php

namespace App\Modules\Tender\Application\Project\Queries;

use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListTenderProjectsQuery
{
    private const DEFAULT_PER_PAGE = 20;

    public function execute(
        ?string $search = null,
        ?string $status = null,
        ?int $departmentId = null,
        ?int $fiscalYear = null,
        ?string $sortBy = null,
        ?string $sortDirection = null,
        ?int $page = null,
        ?int $perPage = null,
    ): LengthAwarePaginator {
        $tieBreakDirection = $sortDirection === 'asc' ? 'asc' : 'desc';

        return TenderProjects::query()
            ->search($search)
            ->status($status)
            ->departmentId($departmentId)
            ->fiscalYear($fiscalYear)
            ->sort($sortBy, $sortDirection)
            ->orderBy('id', $tieBreakDirection)
            ->paginate(perPage: $perPage ?? self::DEFAULT_PER_PAGE, page: $page ?? 1);
    }
}
