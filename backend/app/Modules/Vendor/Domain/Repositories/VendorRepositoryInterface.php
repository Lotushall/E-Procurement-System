<?php

namespace App\Modules\Vendor\Domain\Repositories;

use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorContact;
use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;

interface VendorRepositoryInterface
{
    public function saveProfile(VendorProfile $profile): VendorProfile;

    public function findProfileById(int $id): ?VendorProfile;

    public function saveCompanyDetail(VendorCompanyDetail $detail): VendorCompanyDetail;

    public function findCompanyDetailByVendorProfileId(int $vendorProfileId): ?VendorCompanyDetail;

    public function saveIndividualDetail(VendorIndividualDetail $detail): VendorIndividualDetail;

    public function findIndividualDetailByVendorProfileId(int $vendorProfileId): ?VendorIndividualDetail;

    public function saveContact(VendorContact $contact): VendorContact;

    /**
     * @return array<int, VendorContact>
     */
    public function findContactsByVendorProfileId(int $vendorProfileId): array;

    public function saveDocument(VendorDocument $document): VendorDocument;

    /**
     * @return array<int, VendorDocument>
     */
    public function findDocumentsByVendorProfileId(int $vendorProfileId): array;

    public function findDocumentByVendorProfileIdAndType(int $vendorProfileId, string $documentType): ?VendorDocument;
}
