<?php

namespace App\Modules\User\Domain\Entities;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Domain\States\UserStatus;
use Carbon\CarbonImmutable;

final class User
{
    public function __construct(
        public readonly ?int $id,
        public readonly string $username,
        public readonly Email $email,
        public readonly string $password,
        public readonly UserType $userType,
        public readonly UserStatus $status,
        public readonly ?CarbonImmutable $emailVerifiedAt,
    ) {}
}
