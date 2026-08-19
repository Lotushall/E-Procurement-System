<?php

namespace App\Modules\User\Application\Queries;

use App\Modules\User\Infrastructure\Models\User;

final class GetUserByIdQuery
{
    public function execute(int $id): User
    {
        return User::query()
            ->with([
                'UserInternalProfile.department',
                'UserInternalProfile.position',
                'UserVendorProfile.VendorProfilesCompanyDetail',
                'UserVendorProfile.VendorProfilesIndividualDetail',
                'roles.permissions',
                'permissions',
            ])
            ->findOrFail($id);
    }
}
