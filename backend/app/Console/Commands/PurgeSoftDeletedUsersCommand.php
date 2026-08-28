<?php

namespace App\Console\Commands;

use App\Modules\User\Application\UseCases\PurgeSoftDeletedUsersUseCase;
use Illuminate\Console\Command;

final class PurgeSoftDeletedUsersCommand extends Command
{
    protected $signature = 'app:purge-soft-deleted-users';

    protected $description = 'Permanently delete user accounts soft-deleted for more than 30 days.';

    public function handle(PurgeSoftDeletedUsersUseCase $purge): int
    {
        $count = $purge->execute();
        $this->info("Purged {$count} user(s).");

        return self::SUCCESS;
    }
}
