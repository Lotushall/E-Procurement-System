<?php

namespace Database\Factories;

use App\Modules\Vendor\Infrastructure\Models\VendorContact;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VendorContact>
 */
class VendorContactFactory extends Factory
{
    protected $model = VendorContact::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'vendor_profile_id' => VendorProfiles::factory(),
            'contact_name' => fake()->name(),
            'contact_position' => fake()->jobTitle(),
            'contact_phone' => fake()->numerify('0#########'),
            'contact_email' => fake()->safeEmail(),
            'line_id' => fake()->userName(),
            'other_contact' => null,
            'is_main_contact' => false,
        ];
    }
}
