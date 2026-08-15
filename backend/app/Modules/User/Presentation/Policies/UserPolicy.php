<?php

namespace App\Modules\User\Presentation\Policies;

use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->user_type === UserType::Internal;
    }

    public function manageRoles(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->can('roles.manage');
    }
}
