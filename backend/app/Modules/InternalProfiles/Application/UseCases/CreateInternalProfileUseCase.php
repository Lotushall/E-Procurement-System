<?php

namespace App\Modules\InternalProfiles\Application\UseCases;

use App\Modules\InternalProfiles\Application\DTOs\CreateInternalProfileData;
use App\Modules\InternalProfiles\Domain\Entities\InternalProfile;
use App\Modules\InternalProfiles\Domain\Repositories\InternalProfilesRepositoryInterface;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;

final class CreateInternalProfileUseCase
{
    public function __construct(
        private readonly InternalProfilesRepositoryInterface $internalProfiles,
    ) {}

    public function execute(CreateInternalProfileData $data): InternalProfile
    {
        $profile = $this->internalProfiles->saveProfile(InternalProfile::create(
            userId: null,
            employeeNo: $data->employeeNo,
            prefix: $data->prefix,
            firstname: $data->firstname,
            lastname: $data->lastname,
            departmentId: $data->departmentId,
            positionId: $data->positionId,
            phone: $data->phone !== null ? PhoneNumber::fromString($data->phone) : null,
        ));

        app_log('Internal profile created', [
            'internal_profile_id' => $profile->id(),
        ], 'info', 'user');

        return $profile;
    }
}
