<?php

namespace Database\Factories;

use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VendorIndividualDetails>
 */
class VendorIndividualDetailsFactory extends Factory
{
    protected $model = VendorIndividualDetails::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $citizenId = fake()->unique()->numerify('#############');
        $taxId = fake()->unique()->numerify('#############');

        return [
            'vendor_profile_id' => VendorProfiles::factory(),
            'store_name' => fake()->company(),
            'prefix' => fake()->randomElement(['นาย', 'นาง', 'นางสาว']),
            'firstname' => fake()->firstName(),
            'lastname' => fake()->lastName(),
            'citizen_id' => $citizenId,
            'citizen_id_hash' => VendorIndividualDetails::hashCitizenId($citizenId),
            'business_type' => fake()->word(),
            'tax_id' => $taxId,
            'tax_id_hash' => VendorIndividualDetails::hashTaxId($taxId),
            'address' => fake()->address(),
            'province' => fake()->city(),
            'postal_code' => fake()->numerify('#####'),
        ];
    }
}
