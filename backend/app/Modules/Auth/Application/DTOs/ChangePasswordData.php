<?php

namespace App\Modules\Auth\Application\DTOs;

use Spatie\LaravelData\Data;

final class ChangePasswordData extends Data
{
    public function __construct(
        public readonly int $userId,
        public readonly string $currentPassword,
        public readonly string $password,
    ) {}
}
