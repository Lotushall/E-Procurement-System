<?php

namespace App\Modules\User\Application\DTOs;

use Spatie\LaravelData\Data;

final class RoleData extends Data
{
    /**
     * @param  array<int, string>  $permissions
     */
    public function __construct(
        public readonly string $name,
        public readonly array $permissions,
    ) {}
}
