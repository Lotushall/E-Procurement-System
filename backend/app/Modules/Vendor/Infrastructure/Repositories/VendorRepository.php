<?php

namespace App\Modules\Vendor\Infrastructure\Repositories;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorContact;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorContact as VendorContactModel;
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

        return $this->mapProfileToEntity($model);
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
        $model->province = $detail->province();
        $model->postal_code = $detail->postalCode()?->value;
        $model->save();

        return $this->mapCompanyDetailToEntity($model);
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
        $model->address = $detail->address();
        $model->province = $detail->province();
        $model->postal_code = $detail->postalCode()?->value;
        $model->save();

        return $this->mapIndividualDetailToEntity($model);
    }

    public function saveContact(VendorContact $contact): VendorContact
    {
        $model = $contact->id() !== null
            ? VendorContactModel::findOrFail($contact->id())
            : new VendorContactModel;

        $model->vendor_profile_id = $contact->vendorProfileId();
        $model->contact_name = $contact->contactName();
        $model->contact_position = $contact->contactPosition();
        $model->contact_phone = $contact->contactPhone()?->value;
        $model->contact_email = $contact->contactEmail()?->value;
        $model->line_id = $contact->lineId();
        $model->other_contact = $contact->otherContact();
        $model->is_main_contact = $contact->isMainContact();
        $model->save();

        return $this->mapContactToEntity($model);
    }

    public function findContactByVendorProfileId(int $vendorProfileId): ?VendorContact
    {
        $model = VendorContactModel::where('vendor_profile_id', $vendorProfileId)->first();

        return $model !== null ? $this->mapContactToEntity($model) : null;
    }

    private function mapProfileToEntity(VendorProfiles $model): VendorProfile
    {
        return VendorProfile::reconstitute(
            id: $model->id,
            userId: $model->user_id,
            status: $model->verification_status,
            verifiedAt: $model->verified_at !== null ? CarbonImmutable::instance($model->verified_at) : null,
            verifiedBy: $model->verified_by,
            remark: $model->remark,
        );
    }

    private function mapCompanyDetailToEntity(VendorCompanyDetails $model): VendorCompanyDetail
    {
        return VendorCompanyDetail::reconstitute(
            id: $model->id,
            vendorProfileId: $model->vendor_profile_id,
            companyName: $model->company_name,
            businessRegistrationNo: $model->business_registration_no,
            taxId: TaxId::fromString($model->tax_id),
            branchNo: $model->branch_no,
            businessType: $model->business_type,
            address: $model->address,
            province: $model->province,
            postalCode: $model->postal_code !== null ? PostalCode::fromString($model->postal_code) : null,
        );
    }

    private function mapIndividualDetailToEntity(VendorIndividualDetails $model): VendorIndividualDetail
    {
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
            address: $model->address,
            province: $model->province,
            postalCode: $model->postal_code !== null ? PostalCode::fromString($model->postal_code) : null,
        );
    }

    private function mapContactToEntity(VendorContactModel $model): VendorContact
    {
        return VendorContact::reconstitute(
            id: $model->id,
            vendorProfileId: $model->vendor_profile_id,
            contactName: $model->contact_name,
            contactPosition: $model->contact_position,
            contactPhone: $model->contact_phone !== null ? PhoneNumber::fromString($model->contact_phone) : null,
            contactEmail: $model->contact_email !== null ? Email::fromString($model->contact_email) : null,
            lineId: $model->line_id,
            otherContact: $model->other_contact,
            isMainContact: $model->is_main_contact,
        );
    }
}
