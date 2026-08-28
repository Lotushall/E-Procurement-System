<?php

namespace App\Modules\User\Domain\Repositories;

use App\Modules\User\Domain\Entities\User;
use Carbon\CarbonImmutable;
use Spatie\ModelStates\Exceptions\CouldNotPerformTransition;

interface UserRepositoryInterface
{
    public function save(User $user): User;

    public function findById(int $id): ?User;

    public function findByEmail(string $email): ?User;

    public function findByUsername(string $username): ?User;

    public function assignRole(int $userId, string $role): void;

    /**
     * Replace the user's role with the given one.
     */
    public function syncRole(int $userId, string $role): void;

    /**
     * Replace the user's direct (non-role) permissions with the given ones.
     *
     * @param  array<int, string>  $permissions
     */
    public function syncPermissions(int $userId, array $permissions): void;

    public function delete(int $id): void;

    /**
     * @return array<int, int> ids of users soft-deleted at or before the given cutoff
     */
    public function findIdsDeletedBefore(CarbonImmutable $cutoff): array;

    public function forceDelete(int $id): void;

    /**
     * @throws CouldNotPerformTransition if the transition is not allowed
     */
    public function updateStatus(int $id, string $status): void;
}
