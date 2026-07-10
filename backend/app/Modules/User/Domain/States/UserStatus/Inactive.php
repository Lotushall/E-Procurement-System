<?php

namespace App\Modules\User\Domain\States\UserStatus;

use App\Modules\User\Domain\States\UserStatus;

class Inactive extends UserStatus
{
    protected static ?string $name = 'inactive';
}
