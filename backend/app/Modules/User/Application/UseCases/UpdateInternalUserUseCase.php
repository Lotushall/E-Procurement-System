<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\User\Application\DTOs\UpdateInternalUserData;
use App\Modules\User\Domain\Entities\InternalProfile;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Repositories\InternalProfilesRepositoryInterface;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class UpdateInternalUserUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly InternalProfilesRepositoryInterface $internalProfiles,
    ) {}

    public function execute(int $id, UpdateInternalUserData $data): User
    {
        return DB::transaction(function () use ($id, $data): User {
            $user = $this->users->findById($id) ?? throw (new ModelNotFoundException)->setModel(User::class, [$id]);

            $user->changeUsername($data->username);
            $user->changeEmail(Email::fromString($data->email));

            if ($data->password !== null) {
                $user->changePassword(Hash::make($data->password));
            }

            $user = $this->users->save($user);

            $this->users->syncRole($user->id(), $data->role);
            $this->users->syncPermissions($user->id(), $data->permissions);

            $phone = $data->phone !== null ? PhoneNumber::fromString($data->phone) : null;
            $profile = $this->internalProfiles->findByUserId($user->id());

            if ($profile !== null) {
                $profile->update(
                    employeeNo: $data->employeeNo,
                    prefix: $data->prefix,
                    firstname: $data->firstname,
                    lastname: $data->lastname,
                    department: $data->department,
                    position: $data->position,
                    phone: $phone,
                );
            } else {
                $profile = InternalProfile::create(
                    userId: $user->id(),
                    employeeNo: $data->employeeNo,
                    prefix: $data->prefix,
                    firstname: $data->firstname,
                    lastname: $data->lastname,
                    department: $data->department,
                    position: $data->position,
                    phone: $phone,
                );
            }

            $this->internalProfiles->saveProfile($profile);

            app_log('Internal user updated', [
                'user_id' => $id,
                'role' => $data->role,
            ], 'info', 'user');

            return $user;
        });
    }
}
