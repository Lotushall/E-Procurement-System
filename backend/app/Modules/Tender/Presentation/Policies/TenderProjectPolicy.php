<?php

namespace App\Modules\Tender\Presentation\Policies;

use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User;

class TenderProjectPolicy
{
    public function create(User $user): bool
    {
        return $user->user_type === UserType::Internal && $user->checkPermissionTo('tender-projects.create');
    }
}
