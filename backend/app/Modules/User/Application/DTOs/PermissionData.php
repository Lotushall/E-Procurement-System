<?php

namespace App\Modules\User\Application\DTOs;

use Spatie\LaravelData\Data;

final class PermissionData extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly string $label,
    ) {}
}
