<?php

namespace App\Modules\Vendor\Presentation\Policies;

use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User;

class VendorProfilePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->checkPermissionTo('vendors.viewAny');
    }

    public function review(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->checkPermissionTo('vendors.review');
    }

    public function delete(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->checkPermissionTo('vendors.delete');
    }
}
