<?php

namespace App\Modules\Tender\Domain\States\TorStatus;

use App\Modules\Tender\Domain\States\TorStatus;

class Awarded extends TorStatus
{
    protected static ?string $name = 'awarded';
}
