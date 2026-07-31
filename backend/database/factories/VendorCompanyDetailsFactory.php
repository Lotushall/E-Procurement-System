<?php

namespace Database\Factories;

use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VendorCompanyDetails>
 */
class VendorCompanyDetailsFactory extends Factory
{
    protected $model = VendorCompanyDetails::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $taxId = fake()->unique()->numerify('#############');

        return [
            'vendor_profile_id' => VendorProfiles::factory(),
            'company_name' => fake()->company(),
            'business_registration_no' => fake()->unique()->numerify('#############'),
            'tax_id' => $taxId,
            'tax_id_hash' => VendorCompanyDetails::hashTaxId($taxId),
            'branch_no' => '00000',
            'business_type' => fake()->word(),
            'address' => fake()->address(),
            'province' => fake()->city(),
            'postal_code' => fake()->numerify('#####'),
        ];
    }
}
