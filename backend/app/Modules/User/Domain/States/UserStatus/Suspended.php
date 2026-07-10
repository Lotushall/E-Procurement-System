<?php

namespace App\Modules\User\Domain\States\UserStatus;

use App\Modules\User\Domain\States\UserStatus;

class Suspended extends UserStatus
{
    protected static ?string $name = 'suspended';
}
