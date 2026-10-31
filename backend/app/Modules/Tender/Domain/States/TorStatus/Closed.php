<?php

namespace App\Modules\Tender\Domain\States\TorStatus;

use App\Modules\Tender\Domain\States\TorStatus;

class Closed extends TorStatus
{
    protected static ?string $name = 'closed';
}
