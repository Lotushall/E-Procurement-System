<?php

namespace App\Modules\User\Domain\States\UserStatus;

use App\Modules\User\Domain\States\UserStatus;

class Active extends UserStatus
{
    protected static ?string $name = 'active';
}
