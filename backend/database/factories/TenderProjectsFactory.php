<?php

namespace Database\Factories;

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TenderProjects>
 */
class TenderProjectsFactory extends Factory
{
    protected $model = TenderProjects::class;

    /**
     * @var list<string>
     */
    private const array PROJECT_NAMES = [
        'จัดซื้อครุภัณฑ์คอมพิวเตอร์',
        'จัดซื้อครุภัณฑ์สำนักงาน',
        'จ้างเหมาบริการทำความสะอาดอาคาร',
        'จ้างเหมาบริการรักษาความปลอดภัย',
        'ปรับปรุงระบบเครือข่ายคอมพิวเตอร์',
        'ก่อสร้างอาคารสำนักงาน',
        'จัดซื้อวัสดุสำนักงาน',
        'จ้างที่ปรึกษาโครงการพัฒนาระบบ',
        'ปรับปรุงซ่อมแซมอาคาร',
        'จัดซื้อยานพาหนะ',
    ];

    /**
     * @var list<string>
     */
    private const array PROCUREMENT_METHODS = ['e-bidding', 'e-market', 'วิธีเฉพาะเจาะจง', 'วิธีคัดเลือก'];

    /**
     * @var list<string>
     */
    private const array STATUSES = ['draft', 'published', 'closed', 'completed', 'cancelled', 'archived'];

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $fiscalYear = fake()->numberBetween(2567, 2569);

        return [
            'project_code' => 'TP-'.$fiscalYear.'-'.fake()->unique()->numerify('####'),
            'name' => fake()->randomElement(self::PROJECT_NAMES),
            'description' => fake()->optional(0.7)->sentence(12),
            'budget' => fake()->randomFloat(2, 50000, 20000000),
            'department_id' => fn () => Department::inRandomOrder()->first()?->id ?? Department::firstOrCreate(['name' => 'IT'])->id,
            'person_in_charge_id' => function () {
                $ids = InternalProfiles::pluck('id');

                return $ids->isNotEmpty() && fake()->boolean(60) ? $ids->random() : null;
            },
            'created_by' => function () {
                $ids = User::where('user_type', 'internal')->pluck('id');

                return $ids->isNotEmpty() ? $ids->random() : null;
            },
            'procurement_method' => fake()->randomElement(self::PROCUREMENT_METHODS),
            'fiscal_year' => $fiscalYear,
            'project_start_at' => fn () => fake()->dateTimeBetween('-6 months', '+2 months'),
            'project_end_at' => fn (array $attributes) => fake()->dateTimeBetween($attributes['project_start_at'], '+1 year'),
            'status' => fake()->randomElement(self::STATUSES),
        ];
    }

    /**
     * A project explicitly in the given status.
     */
    public function status(string $status): static
    {
        return $this->state(['status' => $status]);
    }
}
