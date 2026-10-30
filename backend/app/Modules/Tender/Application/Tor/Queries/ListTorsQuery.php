<?php

namespace App\Modules\Tender\Application\Tor\Queries;

use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListTorsQuery
{
    private const DEFAULT_PER_PAGE = 20;

    /**
     * @param  string|null  $tenderProject  a tender project id, or 'none' for TORs outside any project
     */
    public function execute(
        User $viewer,
        ?string $search = null,
        ?string $status = null,
        ?int $departmentId = null,
        ?int $fiscalYear = null,
        ?string $tenderProject = null,
        ?string $procurementMethod = null,
        ?string $sortBy = null,
        ?string $sortDirection = null,
        ?int $page = null,
        ?int $perPage = null,
    ): LengthAwarePaginator {
        $tieBreakDirection = $sortDirection === 'asc' ? 'asc' : 'desc';

        return Tors::query()
            ->with(Tors::RESOURCE_RELATIONS)
            ->visibleTo($viewer)
            ->search($search)
            ->status($status)
            ->departmentId($departmentId)
            ->fiscalYear($fiscalYear)
            ->tenderProject($tenderProject)
            ->procurementMethod($procurementMethod)
            ->sort($sortBy, $sortDirection)
            ->orderBy('id', $tieBreakDirection)
            ->paginate(perPage: $perPage ?? self::DEFAULT_PER_PAGE, page: $page ?? 1);
    }
}
