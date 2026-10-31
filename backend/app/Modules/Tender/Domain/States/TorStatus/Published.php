<?php

namespace App\Modules\Tender\Domain\States\TorStatus;

use App\Modules\Tender\Domain\States\TorStatus;

class Published extends TorStatus
{
    protected static ?string $name = 'published';
}
