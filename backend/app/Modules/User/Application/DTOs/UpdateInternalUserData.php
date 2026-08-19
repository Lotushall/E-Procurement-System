<?php

namespace App\Modules\User\Application\DTOs;

use Spatie\LaravelData\Data;

final class UpdateInternalUserData extends Data
{
    /**
     * @param  array<int, string>  $permissions
     */
    public function __construct(
        public readonly string $username,
        public readonly string $email,
        public readonly string $role,
        public readonly string $firstname,
        public readonly string $lastname,
        public readonly ?string $password = null,
        public readonly ?string $employeeNo = null,
        public readonly ?string $prefix = null,
        public readonly ?string $department = null,
        public readonly ?string $position = null,
        public readonly ?string $phone = null,
        public readonly array $permissions = [],
    ) {}
}
