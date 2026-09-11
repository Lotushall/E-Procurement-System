<?php

namespace App\Modules\Tender\Domain\Repositories\Project;

use App\Modules\Tender\Domain\Entities\Project\TenderProject;
use Illuminate\Database\Eloquent\ModelNotFoundException;

interface TenderProjectRepositoryInterface
{
    /**
     * The next 4-digit sequence number for the given fiscal year, starting
     * at 1 when no project exists yet for that year.
     */
    public function nextSequenceForFiscalYear(int $fiscalYear): int;

    /**
     * @throws ModelNotFoundException when no project has the given id
     */
    public function findById(int $id): TenderProject;

    public function save(TenderProject $project): TenderProject;

    public function delete(int $id): void;
}
