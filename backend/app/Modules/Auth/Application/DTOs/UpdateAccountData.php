<?php

namespace App\Modules\Auth\Application\DTOs;

use Spatie\LaravelData\Data;

final class UpdateAccountData extends Data
{
    public function __construct(
        public readonly int $userId,
        public readonly string $username,
        public readonly string $email,
    ) {}
}
