<?php

namespace App\Modules\Tender\Presentation\Policies;

use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User;

class TorPolicy
{
    /**
     * Holding any of these lets an internal user open TORs at all. Which TORs
     * they actually see is decided by the Tors::visibleTo() scope.
     *
     * @var list<string>
     */
    private const array VIEW_PERMISSIONS = ['tors.viewAny', 'tors.viewDepartment', 'tors.viewOwn'];

    public function viewAny(User $user): bool
    {
        if ($user->user_type !== UserType::Internal) {
            return false;
        }

        foreach (self::VIEW_PERMISSIONS as $permission) {
            if ($user->checkPermissionTo($permission)) {
                return true;
            }
        }

        return false;
    }
}
