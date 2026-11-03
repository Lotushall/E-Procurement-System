<?php

namespace Database\Factories;

use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Shared\Support\ThaiIdNumber;
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
        // Citizen IDs start with 1-8 and end in a valid check digit.
        $citizenId = ThaiIdNumber::withCheckDigit(fake()->unique()->numerify(fake()->numberBetween(1, 8).'###########'));
        $taxId = ThaiIdNumber::withCheckDigit(fake()->unique()->numerify(fake()->numberBetween(1, 8).'###########'));

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
