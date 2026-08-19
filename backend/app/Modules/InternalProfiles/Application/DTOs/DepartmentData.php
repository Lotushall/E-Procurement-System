<?php

namespace App\Modules\InternalProfiles\Application\DTOs;

use Spatie\LaravelData\Data;

final class DepartmentData extends Data
{
    public function __construct(
        public readonly string $name,
    ) {}
}
