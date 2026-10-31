<?php

namespace App\Modules\Tender\Domain\States\TorStatus;

use App\Modules\Tender\Domain\States\TorStatus;

class InReview extends TorStatus
{
    protected static ?string $name = 'in_review';
}
