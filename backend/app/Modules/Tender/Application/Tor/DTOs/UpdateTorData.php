<?php

namespace App\Modules\Tender\Application\Tor\DTOs;

use Spatie\LaravelData\Data;

final class UpdateTorData extends Data
{
    public function __construct(
        public readonly string $title,
        public readonly string $scopeOfWork,
        public readonly int $departmentId,
        public readonly ?int $tenderProjectId,
        public readonly string $budgetEstimate,
        public readonly string $procurementMethod,
        public readonly int $fiscalYear,
        public readonly ?string $biddingStartAt,
        public readonly ?string $biddingEndAt,
    ) {}
}
