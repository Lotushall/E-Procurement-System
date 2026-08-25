<?php

namespace App\Modules\InternalProfiles\Application\DTOs;

use Spatie\LaravelData\Data;

final class CreateInternalProfileData extends Data
{
    public function __construct(
        public readonly string $firstname,
        public readonly string $lastname,
        public readonly ?string $employeeNo = null,
        public readonly ?string $prefix = null,
        public readonly ?int $departmentId = null,
        public readonly ?int $positionId = null,
        public readonly ?string $phone = null,
    ) {}
}
