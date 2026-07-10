<?php

namespace App\Modules\User\Domain\Entities;

use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;

final class InternalProfile
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $userId,
        public readonly ?string $employeeNo,
        public readonly ?string $prefix,
        public readonly string $firstname,
        public readonly string $lastname,
        public readonly ?string $department,
        public readonly ?string $position,
        public readonly ?PhoneNumber $phone,
    ) {}
}
