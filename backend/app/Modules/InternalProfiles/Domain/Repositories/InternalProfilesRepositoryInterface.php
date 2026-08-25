<?php

namespace App\Modules\InternalProfiles\Domain\Repositories;

use App\Modules\InternalProfiles\Domain\Entities\InternalProfile;

interface InternalProfilesRepositoryInterface
{
    public function saveProfile(InternalProfile $profile): InternalProfile;

    public function findById(int $id): ?InternalProfile;

    public function findByUserId(int $userId): ?InternalProfile;

    public function delete(int $id): void;
}
