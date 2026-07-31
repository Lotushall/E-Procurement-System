<?php

namespace Database\Seeders;

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorContact;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Seeder;
use RuntimeException;

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
        $reviewer = User::where('email', 'admin@example.com')->first();

        if ($reviewer === null) {
            throw new RuntimeException('Run AdminUserSeeder first: php artisan db:seed --class=AdminUserSeeder');
        }

        for ($i = 0; $i < 3; $i++) {
            $this->seedVendor(VendorCompanyDetails::class, $reviewer);
        }

        for ($i = 0; $i < 2; $i++) {
            $this->seedVendor(VendorIndividualDetails::class, $reviewer);
        }

        for ($i = 0; $i < 3; $i++) {
            $this->seedVendor($this->randomDetailModel(), $reviewer, 'approved');
        }

        for ($i = 0; $i < 2; $i++) {
            $this->seedVendor($this->randomDetailModel(), $reviewer, 'rejected');
        }
    }

    /**
     * @return class-string<VendorCompanyDetails>|class-string<VendorIndividualDetails>
     */
    private function randomDetailModel(): string
    {
        return fake()->boolean()
            ? VendorCompanyDetails::class
            : VendorIndividualDetails::class;
    }

    private function seedVendor(string $detailModel, User $reviewer, ?string $status = null): void
    {
        $userType = $detailModel === VendorCompanyDetails::class ? 'company' : 'individual';

        $profileFactory = VendorProfiles::factory()->state([
            'user_id' => User::factory()->state(['user_type' => $userType]),
        ]);

        $profile = match ($status) {
            'approved' => $profileFactory->approved()->create(['verified_by' => $reviewer->id]),
            'rejected' => $profileFactory->rejected()->create(['verified_by' => $reviewer->id]),
            default => $profileFactory->create(),
        };

        $detailModel::factory()->create(['vendor_profile_id' => $profile->id]);

        VendorContact::factory()->create([
            'vendor_profile_id' => $profile->id,
            'is_main_contact' => true,
        ]);

        VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);
        VendorDocuments::factory()->approved()->create([
            'vendor_profile_id' => $profile->id,
            'verified_by' => $reviewer->id,
        ]);
    }
}
