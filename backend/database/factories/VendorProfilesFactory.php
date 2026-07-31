<?php

namespace Database\Factories;

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VendorProfiles>
 */
class VendorProfilesFactory extends Factory
{
    protected $model = VendorProfiles::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->state(['user_type' => 'company']),
            'verification_status' => 'pending',
            'verified_at' => null,
            'verified_by' => null,
            'remark' => null,
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'verification_status' => 'approved',
            'verified_at' => now(),
            'verified_by' => User::factory()->state(['user_type' => 'internal']),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'verification_status' => 'rejected',
            'verified_at' => now(),
            'verified_by' => User::factory()->state(['user_type' => 'internal']),
            'remark' => 'Rejected during testing.',
        ]);
    }
}
