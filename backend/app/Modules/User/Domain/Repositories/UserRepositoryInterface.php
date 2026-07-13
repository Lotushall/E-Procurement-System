<?php

namespace App\Modules\User\Domain\Repositories;

use App\Modules\User\Domain\Entities\User;

interface UserRepositoryInterface
{
    public function save(User $user): User;

    public function findById(int $id): ?User;

    public function findByEmail(string $email): ?User;

    public function findByUsername(string $username): ?User;
}
