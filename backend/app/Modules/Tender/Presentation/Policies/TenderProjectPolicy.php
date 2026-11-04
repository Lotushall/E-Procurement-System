<?php

namespace App\Modules\Tender\Presentation\Policies;

use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User;

class TenderProjectPolicy
{
    public function create(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->checkPermissionTo('tender_projects.create');
    }

    public function viewAny(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->checkPermissionTo('tender_projects.viewAny');
    }

    public function update(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->checkPermissionTo('tender_projects.update');
    }

    public function updateStatus(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->checkPermissionTo('tender_projects.updateStatus');
    }

    public function delete(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->checkPermissionTo('tender_projects.delete');
    }

    /**
     * Lifts the status lock: the project may move to any status and a
     * finished one may still be edited or deleted. Without it the project
     * follows the one-step-forward flow and a finished one is locked.
     */
    public function manageAnyStatus(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->checkPermissionTo('tender_projects.manageAnyStatus');
    }
}
