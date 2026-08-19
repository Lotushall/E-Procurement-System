<?php

namespace App\Modules\User\Application\DTOs;

use Spatie\LaravelData\Data;

final class UpdateAccountData extends Data
{
    public function __construct(
        public readonly string $username,
        public readonly string $email,
        public readonly ?string $password = null,
    ) {}
}
