<?php

namespace App\Modules\Tender\Domain\States\TorStatus;

use App\Modules\Tender\Domain\States\TorStatus;

class Completed extends TorStatus
{
    protected static ?string $name = 'completed';
}
