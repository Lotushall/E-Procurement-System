<?php

namespace App\Modules\Vendor\Application\Queries;

use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListVendorProfilesQuery
{
    private const DEFAULT_PER_PAGE = 20;

    public function execute(
        ?string $status,
        ?string $search = null,
        ?string $sortBy = null,
        ?string $sortDirection = null,
        ?int $page = null,
        ?int $perPage = null,
    ): Collection|LengthAwarePaginator {
        $query = VendorProfiles::query()
            ->with(['VendorProfilesCompanyDetail', 'VendorProfilesIndividualDetail', 'VendorProfilesContact'])
            ->status($status)
            ->search($search)
            ->sort($sortBy, $sortDirection)
            ->orderByDesc('id');

        if ($page === null && $perPage === null) {
            return $query->get();
        }

        return $query->paginate(
            perPage: $perPage ?? self::DEFAULT_PER_PAGE,
            page: $page ?? 1,
        );
    }
}
