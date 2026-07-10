<?php

namespace App\Modules\User\Domain\States\UserStatus;

use App\Modules\User\Domain\States\UserStatus;

class Pending extends UserStatus
{
    protected static ?string $name = 'pending';
}
