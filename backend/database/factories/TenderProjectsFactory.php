<?php

namespace Database\Factories;

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TenderProjects>
 */
class TenderProjectsFactory extends Factory
{
    protected $model = TenderProjects::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_code' => fake()->unique()->numerify('TP-2569-####'),
            'name' => 'จัดซื้อคอมพิวเตอร์',
            'description' => null,
            'budget' => 500000,
            'department_id' => fn () => Department::firstOrCreate(['name' => 'IT'])->id,
            'person_in_charge_id' => null,
            'created_by' => null,
            'procurement_method' => 'e-bidding',
            'fiscal_year' => 2569,
            'project_start_at' => null,
            'project_end_at' => null,
            'status' => 'draft',
        ];
    }
}
