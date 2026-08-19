<?php

namespace App\Modules\User\Domain\Repositories;

use App\Modules\User\Domain\Entities\InternalProfile;

interface InternalProfilesRepositoryInterface
{
    public function saveProfile(InternalProfile $profile): InternalProfile;

    public function findByUserId(int $userId): ?InternalProfile;
}
