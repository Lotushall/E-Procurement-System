<?php

namespace App\Modules\Tender\Application\Tor\UseCases;

use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Application\Tor\DTOs\UpdateTorData;
use App\Modules\Tender\Domain\Entities\Tor\Tor;
use App\Modules\Tender\Domain\Repositories\Tor\TorRepositoryInterface;
use App\Modules\Tender\Domain\ValueObjects\Tor\TorCode;
use Carbon\CarbonImmutable;

final class UpdateTorUseCase
{
    public function __construct(
        private readonly TorRepositoryInterface $tors,
    ) {}

    /**
     * Replace every editable field of the TOR. The TOR code is kept as long
     * as the fiscal year stays the same; moving the TOR to another fiscal
     * year issues the next code in that year's sequence.
     *
     * Without $ignoresStatusLock only an editable TOR (Tor::isEditable()) may
     * change; with it, a TOR at any step may. Either way, changing an
     * approved TOR sends it back for review, and a published or bidding TOR
     * must keep a bidding window it can still move on with.
     *
     * @return Tor|string the saved TOR, or an error message if the edit was rejected
     */
    public function execute(int $id, UpdateTorData $data, int $actingUserId, bool $ignoresStatusLock): Tor|string
    {
        $tor = $this->tors->findById($id);

        if (! $ignoresStatusLock && ! $tor->isEditable()) {
            return 'ไม่สามารถแก้ไข TOR ได้ เนื่องจาก TOR อยู่ในขั้นที่แก้ไขไม่ได้แล้ว';
        }

        $previousTorCode = (string) $tor->torCode();
        $previousStatus = $tor->status()->getValue();

        $changed = $tor->update(
            torCode: $this->resolveTorCode($tor, $data->fiscalYear),
            title: $data->title,
            scopeOfWork: $data->scopeOfWork,
            departmentId: $data->departmentId,
            tenderProjectId: $data->tenderProjectId,
            budgetEstimate: Money::fromString($data->budgetEstimate),
            procurementMethod: $data->procurementMethod,
            fiscalYear: $data->fiscalYear,
            biddingStartAt: $data->biddingStartAt !== null ? CarbonImmutable::parse($data->biddingStartAt) : null,
            biddingEndAt: $data->biddingEndAt !== null ? CarbonImmutable::parse($data->biddingEndAt) : null,
        );

        if (! $changed) {
            return $tor;
        }

        if (! $tor->hasBiddingWindowForProgress(CarbonImmutable::now())) {
            return 'ไม่สามารถแก้ไขช่วงรับซองได้ TOR ที่ประกาศแล้วต้องมีวันเริ่มรับซองที่ยังไม่ถึง และ TOR ที่เปิดรับซองอยู่ต้องมีกำหนดยื่นข้อเสนอที่ยังไม่ผ่านไป';
        }

        $saved = $this->tors->save($tor);

        app_log('TOR updated', [
            'tor_id' => $saved->id(),
            'tor_code' => (string) $saved->torCode(),
            'previous_tor_code' => $previousTorCode,
            'previous_status' => $previousStatus,
            'status' => $saved->status()->getValue(),
            'acting_user_id' => $actingUserId,
            'ignores_status_lock' => $ignoresStatusLock,
        ], 'info', 'tender');

        return $saved;
    }

    private function resolveTorCode(Tor $tor, int $fiscalYear): TorCode
    {
        if ($tor->fiscalYear() === $fiscalYear) {
            return $tor->torCode();
        }

        $sequence = $this->tors->nextSequenceForFiscalYear($fiscalYear);

        return TorCode::fromString(sprintf('TOR-%d-%04d', $fiscalYear, $sequence));
    }
}
