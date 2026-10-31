<?php

namespace Database\Seeders;

use App\Modules\Tender\Domain\States\TorStatus;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use Illuminate\Database\Seeder;

/**
 * Sample TOR data for local development/demo use. Run after
 * TenderProjectSeeder so most TORs land inside an existing project, or on
 * its own: `php artisan db:seed --class=TorSeeder`
 */
class TorSeeder extends Seeder
{
    /**
     * How many TORs to seed per status, so every progress step shows up.
     */
    private const int TORS_PER_STATUS = 3;

    public function run(): void
    {
        foreach (TorStatus::all()->keys() as $status) {
            Tors::factory()->count(self::TORS_PER_STATUS)->status($status)->create();
        }
    }
}
