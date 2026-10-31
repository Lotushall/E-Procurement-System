<?php

namespace App\Modules\Tender\Domain\States\TorStatus;

use App\Modules\Tender\Domain\States\TorStatus;

class RevisionRequired extends TorStatus
{
    protected static ?string $name = 'revision_required';
}
