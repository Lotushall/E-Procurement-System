<?php

namespace App\Modules\Vendor\Application\Dashboard\Queries;

use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;

final class GetVendorProfileByIdQuery
{
    public function execute(int $id): VendorProfiles
    {
        return VendorProfiles::with([
            'VendorProfilesUser:id,username,email',
            'VendorProfilesCompanyDetail',
            'VendorProfilesIndividualDetail',
            'VendorProfilesContact',
            'VendorProfilesDocuments',
        ])->findOrFail($id);
    }
}
