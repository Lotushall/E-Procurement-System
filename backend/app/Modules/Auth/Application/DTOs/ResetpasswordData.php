<?php

namespace App\Modules\Auth\Application\DTOs;

use Spatie\LaravelData\Data;

final class ResetpasswordData extends Data
{
    public function __construct(
        public readonly string $encryptedEmail,
        public readonly string $token,
        public readonly string $password,
    ) {}
}
