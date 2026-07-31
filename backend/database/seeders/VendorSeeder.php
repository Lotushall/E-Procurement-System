<?php

namespace Database\Seeders;

use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorContact;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Seeder;

/**
 * Sample vendor data for local development/demo use.
 *
 * Not wired into DatabaseSeeder — call explicitly:
 * `php artisan db:seed --class=VendorSeeder`
 */
class VendorSeeder extends Seeder
{
    public function run(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $this->seedVendor(VendorCompanyDetails::factory(), VendorProfiles::factory());
        }

        for ($i = 0; $i < 2; $i++) {
            $this->seedVendor(VendorIndividualDetails::factory(), VendorProfiles::factory());
        }

        for ($i = 0; $i < 3; $i++) {
            $this->seedVendor($this->randomDetailFactory(), VendorProfiles::factory()->approved());
        }

        for ($i = 0; $i < 2; $i++) {
            $this->seedVendor($this->randomDetailFactory(), VendorProfiles::factory()->rejected());
        }
    }

    private function randomDetailFactory(): Factory
    {
        return fake()->boolean()
            ? VendorCompanyDetails::factory()
            : VendorIndividualDetails::factory();
    }

    private function seedVendor(Factory $detailFactory, Factory $profileFactory): void
    {
        $profile = $profileFactory->create();

        $detailFactory->create(['vendor_profile_id' => $profile->id]);

        VendorContact::factory()->create([
            'vendor_profile_id' => $profile->id,
            'is_main_contact' => true,
        ]);

        VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);
        VendorDocuments::factory()->approved()->create(['vendor_profile_id' => $profile->id]);
    }
}
