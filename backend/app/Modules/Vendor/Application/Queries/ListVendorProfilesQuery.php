<?php

namespace App\Modules\Vendor\Application\Queries;

use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListVendorProfilesQuery
{
    private const DEFAULT_PER_PAGE = 15;

    public function execute(?string $status, ?int $page = null, ?int $perPage = null): Collection|LengthAwarePaginator
    {
        $query = VendorProfiles::query()
            ->with(['VendorProfilesCompanyDetail', 'VendorProfilesIndividualDetail'])
            ->when($status !== null, fn ($query) => $query->where('verification_status', $status))
            ->latest();

        if ($page === null && $perPage === null) {
            return $query->get();
        }

        return $query->paginate(
            perPage: $perPage ?? self::DEFAULT_PER_PAGE,
            page: $page ?? 1,
        );
    }
}
