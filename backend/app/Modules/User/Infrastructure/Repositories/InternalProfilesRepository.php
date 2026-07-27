<?php

namespace App\Modules\User\Infrastructure\Repositories;

use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\User\Domain\Entities\InternalProfile;
use App\Modules\User\Domain\Repositories\InternalProfilesRepositoryInterface;
use App\Modules\User\Infrastructure\Models\InternalProfiles;

class InternalProfilesRepository implements InternalProfilesRepositoryInterface
{
    public function saveProfile(InternalProfile $profile): InternalProfile
    {
        $model = $profile->id() !== null
            ? InternalProfiles::findOrFail($profile->id())
            : new InternalProfiles;

        $model->user_id = $profile->userId();
        $model->employee_no = $profile->employeeNo();
        $model->prefix = $profile->prefix();
        $model->firstname = $profile->firstname();
        $model->lastname = $profile->lastname();
        $model->department = $profile->department();
        $model->position = $profile->position();
        $model->phone = $profile->phone()?->value;
        $model->save();

        return $this->mapToEntity($model);
    }

    private function mapToEntity(InternalProfiles $model): InternalProfile
    {
        return InternalProfile::reconstitute(
            id: $model->id,
            userId: $model->user_id,
            employeeNo: $model->employee_no,
            prefix: $model->prefix,
            firstname: $model->firstname,
            lastname: $model->lastname,
            department: $model->department,
            position: $model->position,
            phone: $model->phone !== null ? PhoneNumber::fromString($model->phone) : null,
        );
    }
}
