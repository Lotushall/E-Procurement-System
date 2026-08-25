<?php

namespace App\Modules\InternalProfiles\Application\UseCases;

use App\Modules\InternalProfiles\Application\DTOs\UpdateInternalProfileData;
use App\Modules\InternalProfiles\Domain\Entities\InternalProfile;
use App\Modules\InternalProfiles\Domain\Repositories\InternalProfilesRepositoryInterface;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class UpdateInternalProfileUseCase
{
    public function __construct(
        private readonly InternalProfilesRepositoryInterface $internalProfiles,
    ) {}

    public function execute(int $id, UpdateInternalProfileData $data): InternalProfile
    {
        $profile = $this->internalProfiles->findById($id)
            ?? throw (new ModelNotFoundException)->setModel(InternalProfiles::class, [$id]);

        $profile->update(
            employeeNo: $data->employeeNo,
            prefix: $data->prefix,
            firstname: $data->firstname,
            lastname: $data->lastname,
            departmentId: $data->departmentId,
            positionId: $data->positionId,
            phone: $data->phone !== null ? PhoneNumber::fromString($data->phone) : null,
        );

        $profile = $this->internalProfiles->saveProfile($profile);

        app_log('Internal profile updated', [
            'internal_profile_id' => $profile->id(),
        ], 'info', 'user');

        return $profile;
    }
}
