<?php

namespace Database\Seeders;

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use Illuminate\Database\Seeder;

/**
 * Sample tender project data for local development/demo use.
 *
 * Not wired into DatabaseSeeder — call explicitly:
 * `php artisan db:seed --class=TenderProjectSeeder`
 */
class TenderProjectSeeder extends Seeder
{
    /**
     * How many tender projects to seed — edit to change the spread.
     */
    private const int PROJECT_COUNT = 30;

    /**
     * Seeded up front so projects spread across more than a single
     * default department.
     */
    private const array DEPARTMENT_NAMES = [
        'เทคโนโลยีสารสนเทศ',
        'การเงินและบัญชี',
        'ทรัพยากรบุคคล',
        'จัดซื้อจัดจ้าง',
        'บริหารทั่วไป',
    ];

    public function run(): void
    {
        foreach (self::DEPARTMENT_NAMES as $name) {
            Department::firstOrCreate(['name' => $name]);
        }

        TenderProjects::factory()->count(self::PROJECT_COUNT)->create();
    }
}
