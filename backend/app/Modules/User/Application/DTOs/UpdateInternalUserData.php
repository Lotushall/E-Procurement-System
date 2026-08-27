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
        public readonly ?string $password = null,
        public readonly array $permissions = [],
    ) {}
}
