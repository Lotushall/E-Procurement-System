<?php

namespace App\Modules\Tender\Domain\Repositories\Tor;

use App\Modules\Tender\Domain\Entities\Tor\Tor;
use Illuminate\Database\Eloquent\ModelNotFoundException;

interface TorRepositoryInterface
{
    /**
     * Issue the next sequence number for the given fiscal year, starting at 1
     * for a year without TORs. A number is issued once and never again, even
     * after the TOR carrying it is deleted.
     */
    public function nextSequenceForFiscalYear(int $fiscalYear): int;

    /**
     * @throws ModelNotFoundException when no TOR has the given id
     */
    public function findById(int $id): Tor;

    public function save(Tor $tor): Tor;

    public function delete(int $id): void;
}
