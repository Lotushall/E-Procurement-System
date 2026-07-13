<?php

namespace App\Modules\Auth\Application\DTOs;

use Spatie\LaravelData\Data;

final class LoginData extends Data
{
    public function __construct(
        public readonly string $identifier,
        public readonly string $identifierField,
        public readonly string $password,
        public readonly bool $remember,
    ) {}
}
