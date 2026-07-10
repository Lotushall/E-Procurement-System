<?php

namespace App\Modules\Auth\Application\UseCases;

use App\Modules\Auth\Application\DTOs\RegisterVendorData;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Support\Facades\DB;

class RegisterVendorUseCase
{
    public function handle(RegisterVendorData $data): User
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'username' => $data->username,
                'email' => $data->email,
                'password' => $data->password,
                'user_type' => $data->vendorType,
            ]);

            $vendorProfile = VendorProfiles::create([
                'user_id' => $user->id,
            ]);

            if ($data->isCompany()) {
                VendorCompanyDetails::create([
                    'vendor_profile_id' => $vendorProfile->id,
                    'company_name' => $data->companyName,
                    'tax_id' => $data->taxId,
                    'tax_id_hash' => VendorCompanyDetails::hashTaxId($data->taxId),
                    'contact_phone' => $data->phone,
                    'contact_email' => $data->email,
                ]);
            } else {
                [$firstname, $lastname] = $this->splitFullName($data->fullName);

                VendorIndividualDetails::create([
                    'vendor_profile_id' => $vendorProfile->id,
                    'firstname' => $firstname,
                    'lastname' => $lastname,
                    'citizen_id' => $data->idCard,
                    'citizen_id_hash' => VendorIndividualDetails::hashCitizenId($data->idCard),
                    'email' => $data->email,
                    'phone' => $data->phone,
                ]);
            }

            return $user;
        });
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function splitFullName(string $fullName): array
    {
        $parts = preg_split('/\s+/', trim($fullName), 2);

        return [$parts[0] ?? $fullName, $parts[1] ?? ''];
    }
}
