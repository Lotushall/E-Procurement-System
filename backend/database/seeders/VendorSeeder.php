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
    /**
     * How many vendors to seed per bucket — edit these to change the spread.
     */
    private const int PENDING_COMPANY_COUNT = 3;

    private const int PENDING_INDIVIDUAL_COUNT = 2;

    private const int APPROVED_COUNT = 3;

    private const int REJECTED_COUNT = 2;

    public function run(): void
    {
        $reviewer = User::where('email', 'admin@example.com')->first();

        if ($reviewer === null) {
            throw new RuntimeException('Run AdminUserSeeder first: php artisan db:seed --class=AdminUserSeeder');
        }

        for ($i = 0; $i < self::PENDING_COMPANY_COUNT; $i++) {
            $this->seedVendor(VendorCompanyDetails::class, $reviewer);
        }

        for ($i = 0; $i < self::PENDING_INDIVIDUAL_COUNT; $i++) {
            $this->seedVendor(VendorIndividualDetails::class, $reviewer);
        }

        for ($i = 0; $i < self::APPROVED_COUNT; $i++) {
            $this->seedVendor($this->randomDetailModel(), $reviewer, 'approved');
        }

        for ($i = 0; $i < self::REJECTED_COUNT; $i++) {
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
