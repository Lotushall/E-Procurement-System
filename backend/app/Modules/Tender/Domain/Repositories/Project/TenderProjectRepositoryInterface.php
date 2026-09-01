<?php

namespace App\Modules\Tender\Domain\Repositories\Project;

use App\Modules\Tender\Domain\Entities\Project\TenderProject;

interface TenderProjectRepositoryInterface
{
    /**
     * The next 4-digit sequence number for the given fiscal year, starting
     * at 1 when no project exists yet for that year.
     */
    public function nextSequenceForFiscalYear(int $fiscalYear): int;

    public function save(TenderProject $project): TenderProject;
}
