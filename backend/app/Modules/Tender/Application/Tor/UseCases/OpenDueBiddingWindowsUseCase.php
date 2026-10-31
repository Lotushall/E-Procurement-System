<?php

namespace App\Modules\Tender\Application\Tor\UseCases;

use App\Modules\Tender\Domain\States\TorStatus\Bidding;
use App\Modules\Tender\Domain\States\TorStatus\Published;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use Carbon\CarbonImmutable;

final class OpenDueBiddingWindowsUseCase
{
    /**
     * Move every published TOR whose bidding start time has arrived into
     * bidding (ประกาศแล้ว → เปิดรับซอง in CONTEXT.md).
     *
     * @return int how many TORs were opened for bidding
     */
    public function execute(): int
    {
        $opened = 0;

        Tors::query()
            ->whereState('status', Published::class)
            ->where('bidding_start_at', '<=', CarbonImmutable::now())
            ->each(function (Tors $tor) use (&$opened): void {
                $tor->status->transitionTo(Bidding::class);

                app_log('TOR bidding opened', [
                    'tor_id' => $tor->id,
                    'bidding_start_at' => $tor->bidding_start_at?->toIso8601String(),
                ], 'info', 'tender');

                $opened++;
            });

        return $opened;
    }
}
