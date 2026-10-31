<?php

namespace App\Modules\Tender\Domain\States\TorStatus;

use App\Modules\Tender\Domain\States\TorStatus;

class NoBidder extends TorStatus
{
    protected static ?string $name = 'no_bidder';
}
