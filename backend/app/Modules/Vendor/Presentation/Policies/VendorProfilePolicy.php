<?php

namespace App\Modules\Vendor\Presentation\Policies;

use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User;

class VendorProfilePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->can('vendors.view');
    }

    public function review(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->can('vendors.review');
    }
}
