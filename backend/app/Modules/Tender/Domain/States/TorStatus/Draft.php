<?php

namespace App\Modules\Tender\Domain\States\TorStatus;

use App\Modules\Tender\Domain\States\TorStatus;

class Draft extends TorStatus
{
    protected static ?string $name = 'draft';
}
