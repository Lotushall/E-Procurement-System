<?php

namespace App\Modules\Vendor\Domain\States\VerificationStatus;

use App\Modules\Vendor\Domain\States\VerificationStatus;

class Pending extends VerificationStatus
{
    protected static ?string $name = 'pending';
}
