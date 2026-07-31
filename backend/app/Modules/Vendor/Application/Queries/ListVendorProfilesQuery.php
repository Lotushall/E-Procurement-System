<?php

namespace App\Modules\Vendor\Application\Queries;

use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Collection;

final class ListVendorProfilesQuery
{
    public function execute(?string $status): Collection
    {
        return VendorProfiles::query()
            ->with(['VendorProfilesCompanyDetail', 'VendorProfilesIndividualDetail'])
            ->when($status !== null, fn ($query) => $query->where('verification_status', $status))
            ->latest()
            ->get();
    }
}
