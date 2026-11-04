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
     * Lifts the status lock: an admin may move a project to any status and
     * still edit or delete a finished one; everyone else follows the
     * one-step-forward flow and cannot touch a finished project.
     */
    public function manageAnyStatus(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->hasRole('admin');
    }
}
