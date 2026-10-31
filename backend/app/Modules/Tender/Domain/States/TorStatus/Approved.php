<?php

namespace App\Modules\Tender\Domain\States\TorStatus;

use App\Modules\Tender\Domain\States\TorStatus;

class Approved extends TorStatus
{
    protected static ?string $name = 'approved';
}
