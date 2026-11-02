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

    public function create(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->checkPermissionTo('tors.create');
    }

    /**
     * Which TORs the user may update is further limited to the ones they can
     * see (Tors::visibleTo()) and, without manageAnyStatus(), to editable ones.
     */
    public function update(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->checkPermissionTo('tors.update');
    }

    /**
     * Which TORs the user may delete is further limited to the ones they can
     * see (Tors::visibleTo()) and, without manageAnyStatus(), to deletable ones.
     */
    public function delete(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->checkPermissionTo('tors.delete');
    }

    /**
     * Lifts the status lock on updating and deleting, so a TOR may be changed
     * or removed at any step of its progress.
     */
    public function manageAnyStatus(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->checkPermissionTo('tors.manageAnyStatus');
    }
}
