<?php

namespace App\Modules\Tender\Infrastructure\Repositories\Tor;

use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\Entities\Tor\Tor;
use App\Modules\Tender\Domain\Repositories\Tor\TorRepositoryInterface;
use App\Modules\Tender\Domain\ValueObjects\Tor\TorCode;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class TorRepository implements TorRepositoryInterface
{
    /**
     * The counter row is locked and incremented in one transaction, so
     * concurrent callers each get a distinct number, and a number stays
     * issued even if the TOR it was drawn for is never saved or later deleted.
     */
    public function nextSequenceForFiscalYear(int $fiscalYear): int
    {
        return DB::transaction(function () use ($fiscalYear) {
            $counter = $this->lockedCounter($fiscalYear);

            if ($counter === null) {
                // Seeding the counter only fills a missing row; a concurrent
                // seed is ignored and both callers then queue on the row lock.
                DB::table('tor_code_sequences')->insertOrIgnore([
                    'fiscal_year' => $fiscalYear,
                    'last_sequence' => $this->highestExistingSequence($fiscalYear),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $counter = $this->lockedCounter($fiscalYear);
            }

            $next = $counter->last_sequence + 1;

            DB::table('tor_code_sequences')
                ->where('fiscal_year', $fiscalYear)
                ->update(['last_sequence' => $next, 'updated_at' => now()]);

            return $next;
        });
    }

    public function findById(int $id): Tor
    {
        return $this->mapToEntity(Tors::findOrFail($id));
    }

    public function save(Tor $tor): Tor
    {
        $model = $tor->id() !== null
            ? Tors::findOrFail($tor->id())
            : new Tors;

        $model->tor_code = (string) $tor->torCode();
        $model->title = $tor->title();
        $model->scope_of_work = $tor->scopeOfWork();
        $model->department_id = $tor->departmentId();
        $model->tender_project_id = $tor->tenderProjectId();
        $model->budget_estimate = $tor->budgetEstimate()->amount;
        $model->procurement_method = $tor->procurementMethod();
        $model->fiscal_year = $tor->fiscalYear();
        $model->bidding_start_at = $tor->biddingStartAt();
        $model->bidding_end_at = $tor->biddingEndAt();
        $model->status = $tor->status()->getValue();
        $model->created_by = $tor->createdBy();
        $model->approved_by = $tor->approvedBy();
        $model->approved_at = $tor->approvedAt();
        $model->remark = $tor->remark();
        $model->save();

        return $this->mapToEntity($model);
    }

    public function delete(int $id): void
    {
        Tors::findOrFail($id)->delete();
    }

    private function lockedCounter(int $fiscalYear): ?object
    {
        return DB::table('tor_code_sequences')
            ->where('fiscal_year', $fiscalYear)
            ->lockForUpdate()
            ->first();
    }

    /**
     * The highest sequence among TOR codes of the year that predate the
     * counter, compared as numbers so TOR-2569-10000 outranks TOR-2569-9999.
     */
    private function highestExistingSequence(int $fiscalYear): int
    {
        $prefix = "TOR-{$fiscalYear}-";

        return (int) Tors::where('tor_code', 'like', "{$prefix}%")
            ->pluck('tor_code')
            ->map(fn (string $code) => (int) substr($code, strlen($prefix)))
            ->max();
    }

    private function mapToEntity(Tors $model): Tor
    {
        return Tor::reconstitute(
            id: $model->id,
            torCode: TorCode::fromString($model->tor_code),
            title: $model->title,
            scopeOfWork: $model->scope_of_work,
            departmentId: $model->department_id,
            tenderProjectId: $model->tender_project_id,
            budgetEstimate: Money::fromString($model->budget_estimate),
            procurementMethod: $model->procurement_method,
            fiscalYear: $model->fiscal_year,
            biddingStartAt: $model->bidding_start_at !== null ? CarbonImmutable::instance($model->bidding_start_at) : null,
            biddingEndAt: $model->bidding_end_at !== null ? CarbonImmutable::instance($model->bidding_end_at) : null,
            status: $model->status,
            createdBy: $model->created_by,
            approvedBy: $model->approved_by,
            approvedAt: $model->approved_at !== null ? CarbonImmutable::instance($model->approved_at) : null,
            remark: $model->remark,
        );
    }
}
