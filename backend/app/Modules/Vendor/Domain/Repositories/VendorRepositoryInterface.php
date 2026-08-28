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

    public function findContactByVendorProfileIdAndId(int $vendorProfileId, int $contactId): ?VendorContact;

    public function deleteContact(VendorContact $contact): void;

    public function saveDocument(VendorDocument $document): VendorDocument;

    /**
     * @return array<int, VendorDocument>
     */
    public function findDocumentsByVendorProfileId(int $vendorProfileId): array;

    public function findDocumentByVendorProfileIdAndType(int $vendorProfileId, string $documentType): ?VendorDocument;

    public function findDocumentByVendorProfileIdAndId(int $vendorProfileId, int $documentId): ?VendorDocument;

    public function findDocumentById(int $documentId): ?VendorDocument;

    public function deleteDocument(VendorDocument $document): void;

    /**
     * Delete any uploaded document files (from storage) belonging to the vendor
     * profile linked to the given user id. No-op if the user has no vendor profile.
     */
    public function deleteDocumentFilesForUser(int $userId): void;

    /**
     * Mutate the unique identity fields (business registration no, tax id hash,
     * citizen id hash) of the vendor profile's company/individual detail so
     * their original values become free for a new vendor to reuse. No-op for
     * whichever detail type the profile doesn't have.
     */
    public function freeIdentityForDeletedProfile(int $vendorProfileId): void;
}
