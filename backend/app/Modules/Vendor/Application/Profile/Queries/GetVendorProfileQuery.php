<?php

namespace App\Modules\Vendor\Application\Profile\Queries;

use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;

final class GetVendorProfileQuery
{
    public function execute(int $userId): VendorProfiles
    {
        return VendorProfiles::where('user_id', $userId)
            ->with(['VendorProfilesCompanyDetail', 'VendorProfilesIndividualDetail', 'VendorProfilesContact', 'VendorProfilesDocuments'])
            ->firstOrFail();
    }
}
