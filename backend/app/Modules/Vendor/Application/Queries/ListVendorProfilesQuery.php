<?php

namespace App\Modules\Vendor\Application\Queries;

use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;

final class ListVendorProfilesQuery
{
    private const DEFAULT_PER_PAGE = 20;

    public function execute(?string $status, ?int $page = null, ?int $perPage = null)
    {
        $query = VendorProfiles::query()
            ->with(['VendorProfilesCompanyDetail', 'VendorProfilesIndividualDetail'])
            ->when($status !== null, fn ($query) => $query->where('verification_status', $status))
            ->latest()
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
