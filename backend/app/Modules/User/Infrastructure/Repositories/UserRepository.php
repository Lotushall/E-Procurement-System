<?php

namespace App\Modules\User\Infrastructure\Repositories;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use Carbon\CarbonImmutable;

class UserRepository implements UserRepositoryInterface
{
    public function save(User $user): User
    {
        $model = $user->id() !== null
            ? UserModel::findOrFail($user->id())
            : new UserModel;

        $model->username = $user->username();
        $model->email = (string) $user->email();
        $model->password = $user->passwordHash();
        $model->user_type = $user->userType();
        $model->status = $user->status();
        $model->email_verified_at = $user->emailVerifiedAt();
        $model->last_login_at = $user->lastLoginAt();
        $model->password_changed_at = $user->passwordChangedAt();
        $model->save();

        return $this->toDomain($model);
    }

    public function findById(int $id): ?User
    {
        $model = UserModel::find($id);

        return $model !== null ? $this->toDomain($model) : null;
    }

    public function findByEmail(string $email): ?User
    {
        $model = UserModel::where('email', $email)->first();

        return $model !== null ? $this->toDomain($model) : null;
    }

    public function findByUsername(string $username): ?User
    {
        $model = UserModel::where('username', $username)->first();

        return $model !== null ? $this->toDomain($model) : null;
    }

    public function assignRole(int $userId, string $role): void
    {
        UserModel::findOrFail($userId)->assignRole($role);
    }

    public function delete(int $id): void
    {
        UserModel::findOrFail($id)->delete();
    }

    private function toDomain(UserModel $model): User
    {
        return User::reconstitute(
            id: $model->id,
            username: $model->username,
            email: Email::fromString($model->email),
            passwordHash: $model->password,
            userType: $model->user_type,
            status: $model->status,
            emailVerifiedAt: $model->email_verified_at !== null
                ? CarbonImmutable::instance($model->email_verified_at)
                : null,
            lastLoginAt: $model->last_login_at !== null
                ? CarbonImmutable::instance($model->last_login_at)
                : null,
            passwordChangedAt: $model->password_changed_at !== null
                ? CarbonImmutable::instance($model->password_changed_at)
                : null,
            createdAt: CarbonImmutable::instance($model->created_at),
            updatedAt: CarbonImmutable::instance($model->updated_at),
        );
    }
}
