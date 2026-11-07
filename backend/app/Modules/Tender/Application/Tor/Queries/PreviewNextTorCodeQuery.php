<?php

namespace App\Modules\Tender\Application\Tor\Queries;

use App\Modules\Tender\Domain\Repositories\Tor\TorRepositoryInterface;
use App\Modules\Tender\Domain\ValueObjects\Tor\TorCode;
use Carbon\CarbonImmutable;

final class PreviewNextTorCodeQuery
{
    public function __construct(
        private readonly TorRepositoryInterface $tors,
    ) {}

    /**
     * The code a TOR created now would receive, numbered by the current
     * calendar year. Nothing is issued, so the code saved on create may differ
     * when another TOR is created first.
     */
    public function execute(): TorCode
    {
        $year = CarbonImmutable::now()->year;

        return TorCode::forSequence($year, $this->tors->peekNextSequenceForYear($year));
    }
}
