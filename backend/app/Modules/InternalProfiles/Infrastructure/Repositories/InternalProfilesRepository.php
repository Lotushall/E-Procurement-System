<?php

namespace App\Modules\InternalProfiles\Infrastructure\Repositories;

use App\Modules\InternalProfiles\Domain\Entities\InternalProfile;
use App\Modules\InternalProfiles\Domain\Repositories\InternalProfilesRepositoryInterface;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;

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
        $model->department_id = $profile->departmentId();
        $model->position_id = $profile->positionId();
        $model->phone = $profile->phone()?->value;
        $model->save();

        return $this->mapToEntity($model);
    }

    public function findById(int $id): ?InternalProfile
    {
        $model = InternalProfiles::find($id);

        return $model !== null ? $this->mapToEntity($model) : null;
    }

    public function findByUserId(int $userId): ?InternalProfile
    {
        $model = InternalProfiles::where('user_id', $userId)->first();

        return $model !== null ? $this->mapToEntity($model) : null;
    }

    public function delete(int $id): void
    {
        InternalProfiles::findOrFail($id)->delete();
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
            departmentId: $model->department_id,
            positionId: $model->position_id,
            phone: $model->phone !== null ? PhoneNumber::fromString($model->phone) : null,
        );
    }
}
