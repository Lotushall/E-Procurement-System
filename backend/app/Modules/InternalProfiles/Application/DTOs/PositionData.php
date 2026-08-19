<?php

namespace App\Modules\InternalProfiles\Application\DTOs;

use Spatie\LaravelData\Data;

final class PositionData extends Data
{
    public function __construct(
        public readonly string $name,
    ) {}
}
