<?php

namespace App\Modules\Tender\Application\Tor\UseCases;

use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Application\Tor\DTOs\CreateTorData;
use App\Modules\Tender\Domain\Entities\Tor\Tor;
use App\Modules\Tender\Domain\Repositories\Tor\TorRepositoryInterface;
use App\Modules\Tender\Domain\ValueObjects\Tor\TorCode;
use Carbon\CarbonImmutable;

final class CreateTorUseCase
{
    public function __construct(
        private readonly TorRepositoryInterface $tors,
    ) {}

    /**
     * The TOR code numbers by the calendar year the TOR is created in, not by
     * its fiscal year.
     */
    public function execute(CreateTorData $data, int $createdBy): Tor
    {
        $year = CarbonImmutable::now()->year;
        $torCode = TorCode::forSequence($year, $this->tors->nextSequenceForYear($year));

        $tor = Tor::create(
            torCode: $torCode,
            title: $data->title,
            scopeOfWork: $data->scopeOfWork,
            departmentId: $data->departmentId,
            tenderProjectId: $data->tenderProjectId,
            budgetEstimate: Money::fromString($data->budgetEstimate),
            procurementMethod: $data->procurementMethod,
            fiscalYear: $data->fiscalYear,
            biddingStartAt: $data->biddingStartAt !== null ? CarbonImmutable::parse($data->biddingStartAt) : null,
            biddingEndAt: $data->biddingEndAt !== null ? CarbonImmutable::parse($data->biddingEndAt) : null,
            createdBy: $createdBy,
        );

        $saved = $this->tors->save($tor);

        app_log('TOR created', [
            'tor_id' => $saved->id(),
            'tor_code' => (string) $saved->torCode(),
        ], 'info', 'tender');

        return $saved;
    }
}
