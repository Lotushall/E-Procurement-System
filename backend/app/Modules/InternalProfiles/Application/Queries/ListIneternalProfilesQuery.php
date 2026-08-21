<?php

namespace App\Modules\InternalProfiles\Application\Queries;

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListIneternalProfilesQuery
{
    private const DEFAULT_PER_PAGE = 20;

    public function execute(
        ?string $search = null,
        ?string $sortBy = null,
        ?string $sortDirection = null,
        ?int $page = null,
        ?int $perPage = null,
    ): LengthAwarePaginator {
        return InternalProfiles::query()
            ->with([
                'InternalProfileDepartment',
                'InternalProfilePosition',
            ])
            ->search($search)
            ->sort($sortBy, $sortDirection)
            ->paginate(perPage: $perPage ?? self::DEFAULT_PER_PAGE, page: $page ?? 1);
    }
}
