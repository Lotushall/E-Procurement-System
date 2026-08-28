<?php

namespace App\Modules\Vendor\Application\Dashboard\Queries;

use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;

final class CountVendorProfilesByStatusQuery
{
    /**
     * @return array{total: int, pending: int, approved: int, rejected: int}
     */
    public function execute(?string $search = null): array
    {
        $counts = VendorProfiles::query()
            ->whereHas('VendorProfilesUser')
            ->search($search)
            ->selectRaw("
                count(*) as total,
                count(case when verification_status = 'pending' then 1 end) as pending,
                count(case when verification_status = 'approved' then 1 end) as approved,
                count(case when verification_status = 'rejected' then 1 end) as rejected
            ")
            ->first();

        return [
            'total' => (int) $counts->total,
            'pending' => (int) $counts->pending,
            'approved' => (int) $counts->approved,
            'rejected' => (int) $counts->rejected,
        ];
    }
}
