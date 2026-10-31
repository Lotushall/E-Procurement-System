<?php

namespace App\Console\Commands;

use App\Modules\Tender\Application\Tor\UseCases\OpenDueBiddingWindowsUseCase;
use Illuminate\Console\Command;

final class OpenDueBiddingWindowsCommand extends Command
{
    protected $signature = 'app:open-due-bidding-windows';

    protected $description = 'Open bidding on published TORs whose bidding start time has arrived.';

    public function handle(OpenDueBiddingWindowsUseCase $openDueBiddingWindows): int
    {
        $count = $openDueBiddingWindows->execute();
        $this->info("Opened bidding on {$count} TOR(s).");

        return self::SUCCESS;
    }
}
