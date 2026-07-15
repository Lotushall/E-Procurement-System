<?php

namespace App\Modules\Vendor\Application\Queries;

use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;

final class GetVendorProfileQuery
{
    public function execute(int $userId): VendorProfiles
    {
        return VendorProfiles::where('user_id', $userId)
            ->with(['VendorProfilesCompanyDetail', 'VendorProfilesIndividualDetail'])
            ->firstOrFail();
    }
}
