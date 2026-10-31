<?php

namespace App\Modules\Tender\Domain\States\TorStatus;

use App\Modules\Tender\Domain\States\TorStatus;

class Cancelled extends TorStatus
{
    protected static ?string $name = 'cancelled';
}
