<?php

namespace Database\Factories;

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VendorDocuments>
 */
class VendorDocumentsFactory extends Factory
{
    protected $model = VendorDocuments::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'vendor_profile_id' => VendorProfiles::factory(),
            'document_type' => fake()->randomElement(['company_registration', 'id_card', 'vat_registration']),
            'file_name' => fake()->word().'.pdf',
            'file_path' => 'vendor-documents/'.fake()->uuid().'.pdf',
            'status' => 'pending',
            'verified_by' => null,
            'verified_at' => null,
            'remark' => null,
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'approved',
            'verified_by' => User::factory()->state(['user_type' => 'internal']),
            'verified_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'rejected',
            'verified_by' => User::factory()->state(['user_type' => 'internal']),
            'verified_at' => now(),
            'remark' => 'Rejected during testing.',
        ]);
    }
}
