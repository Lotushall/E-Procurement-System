<?php

namespace App\Modules\User\Domain\Repositories;

use App\Modules\User\Domain\Entities\User;
use Spatie\ModelStates\Exceptions\CouldNotPerformTransition;

interface UserRepositoryInterface
{
    public function save(User $user): User;

    public function findById(int $id): ?User;

    public function findByEmail(string $email): ?User;

    public function findByUsername(string $username): ?User;

    public function assignRole(int $userId, string $role): void;

    public function delete(int $id): void;

    /**
     * @throws CouldNotPerformTransition if the transition is not allowed
     */
    public function updateStatus(int $id, string $status): void;
}
