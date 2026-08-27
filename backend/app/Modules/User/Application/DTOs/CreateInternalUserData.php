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
        public readonly int $internalProfileId,
        public readonly array $permissions = [],
    ) {}
}
