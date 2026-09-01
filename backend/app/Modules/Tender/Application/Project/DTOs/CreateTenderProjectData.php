<?php

namespace App\Modules\Tender\Application\Project\DTOs;

use Spatie\LaravelData\Data;

final class CreateTenderProjectData extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly ?string $description,
        public readonly string $budget,
        public readonly int $departmentId,
        public readonly ?int $personInChargeId,
        public readonly string $procurementMethod,
        public readonly int $fiscalYear,
        public readonly ?string $projectStartAt,
        public readonly ?string $projectEndAt,
    ) {}
}
