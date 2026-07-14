<?php

namespace App\Modules\Vendor\Infrastructure\Repositories;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Carbon\CarbonImmutable;

class VendorRepository implements VendorRepositoryInterface
{
    public function saveProfile(VendorProfile $profile): VendorProfile
    {
        $model = $profile->id() !== null
            ? VendorProfiles::findOrFail($profile->id())
            : new VendorProfiles;

        $model->user_id = $profile->userId();
        $model->verification_status = $profile->status();
        $model->verified_at = $profile->verifiedAt();
        $model->verified_by = $profile->verifiedBy();
        $model->remark = $profile->remark();
        $model->save();

        return VendorProfile::reconstitute(
            id: $model->id,
            userId: $model->user_id,
            status: $model->verification_status,
            verifiedAt: $model->verified_at !== null ? CarbonImmutable::instance($model->verified_at) : null,
            verifiedBy: $model->verified_by,
            remark: $model->remark,
        );
    }

    public function saveCompanyDetail(VendorCompanyDetail $detail): VendorCompanyDetail
    {
        $model = $detail->id() !== null
            ? VendorCompanyDetails::findOrFail($detail->id())
            : new VendorCompanyDetails;

        $model->vendor_profile_id = $detail->vendorProfileId();
        $model->company_name = $detail->companyName();
        $model->business_registration_no = $detail->businessRegistrationNo();
        $model->tax_id = $detail->taxId()->value;
        $model->tax_id_hash = VendorCompanyDetails::hashTaxId($detail->taxId()->value);
        $model->branch_no = $detail->branchNo();
        $model->business_type = $detail->businessType();
        $model->address = $detail->address();
        $model->country = $detail->country();
        $model->province = $detail->province();
        $model->postal_code = $detail->postalCode()?->value;
        $model->contact_name = $detail->contactName();
        $model->contact_position = $detail->contactPosition();
        $model->contact_phone = $detail->contactPhone()->value;
        $model->contact_email = $detail->contactEmail()->value;
        $model->line_id = $detail->lineId();
        $model->other_contact = $detail->otherContact();
        $model->save();

        return VendorCompanyDetail::reconstitute(
            id: $model->id,
            vendorProfileId: $model->vendor_profile_id,
            companyName: $model->company_name,
            businessRegistrationNo: $model->business_registration_no,
            taxId: TaxId::fromString($model->tax_id),
            branchNo: $model->branch_no,
            businessType: $model->business_type,
            address: $model->address,
            country: $model->country,
            province: $model->province,
            postalCode: $model->postal_code !== null ? PostalCode::fromString($model->postal_code) : null,
            contactName: $model->contact_name,
            contactPosition: $model->contact_position,
            contactPhone: PhoneNumber::fromString($model->contact_phone),
            contactEmail: Email::fromString($model->contact_email),
            lineId: $model->line_id,
            otherContact: $model->other_contact,
        );
    }

    public function saveIndividualDetail(VendorIndividualDetail $detail): VendorIndividualDetail
    {
        $model = $detail->id() !== null
            ? VendorIndividualDetails::findOrFail($detail->id())
            : new VendorIndividualDetails;

        $model->vendor_profile_id = $detail->vendorProfileId();
        $model->store_name = $detail->storeName();
        $model->prefix = $detail->prefix();
        $model->firstname = $detail->firstname();
        $model->lastname = $detail->lastname();
        $model->citizen_id = $detail->citizenId()->value;
        $model->citizen_id_hash = VendorIndividualDetails::hashCitizenId($detail->citizenId()->value);
        $model->business_type = $detail->businessType();
        $model->tax_id = $detail->taxId()?->value;
        $model->tax_id_hash = $detail->taxId() !== null
            ? VendorIndividualDetails::hashTaxId($detail->taxId()->value)
            : null;
        $model->email = $detail->email()?->value;
        $model->phone = $detail->phone()->value;
        $model->address = $detail->address();
        $model->country = $detail->country();
        $model->province = $detail->province();
        $model->postal_code = $detail->postalCode()?->value;
        $model->contact_name = $detail->contactName();
        $model->line_id = $detail->lineId();
        $model->other_contact = $detail->otherContact();
        $model->save();

        return VendorIndividualDetail::reconstitute(
            id: $model->id,
            vendorProfileId: $model->vendor_profile_id,
            storeName: $model->store_name,
            prefix: $model->prefix,
            firstname: $model->firstname,
            lastname: $model->lastname,
            citizenId: CitizenId::fromString($model->citizen_id),
            businessType: $model->business_type,
            taxId: $model->tax_id !== null ? TaxId::fromString($model->tax_id) : null,
            email: $model->email !== null ? Email::fromString($model->email) : null,
            phone: PhoneNumber::fromString($model->phone),
            address: $model->address,
            country: $model->country,
            province: $model->province,
            postalCode: $model->postal_code !== null ? PostalCode::fromString($model->postal_code) : null,
            contactName: $model->contact_name,
            lineId: $model->line_id,
            otherContact: $model->other_contact,
        );
    }
}
