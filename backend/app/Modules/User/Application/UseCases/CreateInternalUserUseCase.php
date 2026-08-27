<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\InternalProfiles\Domain\Entities\InternalProfile;
use App\Modules\InternalProfiles\Domain\Repositories\InternalProfilesRepositoryInterface;
use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\User\Application\DTOs\CreateInternalUserData;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class CreateInternalUserUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly InternalProfilesRepositoryInterface $internalProfiles,
    ) {}

    public function execute(CreateInternalUserData $data): User
    {
        return DB::transaction(function () use ($data): User {
            $profile = $this->internalProfiles->findById($data->internalProfileId)
                ?? throw (new ModelNotFoundException)->setModel(InternalProfile::class, [$data->internalProfileId]);

            $user = User::register(
                username: $data->username,
                email: Email::fromString($data->email),
                passwordHash: Hash::make($data->password),
                userType: UserType::Internal,
            );

            // Internal users are created directly by an administrator/seeder,
            // not via self-registration, so they skip the pending/email
            // verification flow that LoginUseCase enforces for vendors.
            $user->activate();
            $user->verifyEmail();

            $user = $this->users->save($user);

            $this->users->assignRole($user->id(), $data->role);
            $this->users->syncPermissions($user->id(), $data->permissions);

            $profile->linkToUser($user->id());
            $this->internalProfiles->saveProfile($profile);

            app_log('Internal user created', [
                'user_id' => $user->id(),
                'role' => $data->role,
            ], 'info', 'user');

            return $user;
        });
    }
}
