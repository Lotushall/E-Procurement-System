<?php

namespace App\Modules\User\Application\DTOs;

use Spatie\LaravelData\Data;

final class CreateInternalUserData extends Data
{
    /**
     * @param  array<int, string>  $permissions
     */
    public function __construct(
        public readonly string $username,
        public readonly string $email,
        public readonly string $password,
        public readonly string $role,
        public readonly string $firstname,
        public readonly string $lastname,
        public readonly ?string $employeeNo = null,
        public readonly ?string $prefix = null,
        public readonly ?int $departmentId = null,
        public readonly ?int $positionId = null,
        public readonly ?string $phone = null,
        public readonly array $permissions = [],
    ) {}
}
