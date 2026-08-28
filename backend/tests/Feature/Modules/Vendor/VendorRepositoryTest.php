<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorContact;
use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\States\VerificationStatus\Approved;
use App\Modules\Vendor\Domain\States\VerificationStatus\Pending;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('saveProfile persists a new vendor profile and returns it reconstituted with an id', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $profile = VendorProfile::create(userId: $user->id);

    $saved = $repository->saveProfile($profile);

    expect($saved->id())->not->toBeNull()
        ->and($saved->userId())->toBe($user->id)
        ->and($saved->status())->toBeInstanceOf(Pending::class);

    $this->assertDatabaseHas('vendor_profiles', [
        'user_id' => $user->id,
        'verification_status' => 'pending',
    ]);
});

test('saveProfile persists an approval', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $profile->approve(verifiedBy: $user->id, remark: 'Looks good');
    $updated = $repository->saveProfile($profile);

    expect($updated->status())->toBeInstanceOf(Approved::class)
        ->and($updated->remark())->toBe('Looks good');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $updated->id(),
        'verification_status' => 'approved',
        'remark' => 'Looks good',
    ]);
});

test('saveCompanyDetail persists and round-trips through the encrypted tax id', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $vendorProfile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $detail = VendorCompanyDetail::create(
        vendorProfileId: $vendorProfile->id(),
        companyName: 'Acme Co., Ltd.',
        businessRegistrationNo: '0123456789012',
        taxId: TaxId::fromString('1234567890123'),
        branchNo: '00000',
        businessType: 'Trading',
        address: '123 Main St.',
        province: 'Bangkok',
        postalCode: PostalCode::fromString('10110'),
    );

    $saved = $repository->saveCompanyDetail($detail);

    expect($saved->id())->not->toBeNull()
        ->and($saved->taxId()->value)->toBe('1234567890123')
        ->and($saved->branchNo())->toBe('00000')
        ->and($saved->businessType())->toBe('Trading');

    $this->assertDatabaseHas('vendor_company_details', [
        'vendor_profile_id' => $vendorProfile->id(),
        'company_name' => 'Acme Co., Ltd.',
        'tax_id_hash' => hash('sha256', '1234567890123'),
        'branch_no' => '00000',
        'business_type' => 'Trading',
    ]);
});

test('saveIndividualDetail persists and round-trips through the encrypted citizen id', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $vendorProfile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $detail = VendorIndividualDetail::create(
        vendorProfileId: $vendorProfile->id(),
        storeName: "John's Store",
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        citizenId: CitizenId::fromString('1234567890123'),
        businessType: 'Retail',
        taxId: TaxId::fromString('9876543210123'),
        address: '456 Side St.',
        province: 'Bangkok',
        postalCode: PostalCode::fromString('10110'),
    );

    $saved = $repository->saveIndividualDetail($detail);

    expect($saved->id())->not->toBeNull()
        ->and($saved->storeName())->toBe("John's Store")
        ->and($saved->citizenId()->value)->toBe('1234567890123')
        ->and($saved->taxId()->value)->toBe('9876543210123');

    $this->assertDatabaseHas('vendor_individual_details', [
        'vendor_profile_id' => $vendorProfile->id(),
        'store_name' => "John's Store",
        'firstname' => 'John',
        'citizen_id_hash' => hash('sha256', '1234567890123'),
        'tax_id_hash' => hash('sha256', '9876543210123'),
    ]);
});

test('saveContact persists a new vendor contact and returns it reconstituted with an id', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $vendorProfile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $contact = VendorContact::create(
        vendorProfileId: $vendorProfile->id(),
        contactName: 'Jane Doe',
        contactPosition: 'Manager',
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('contact@company.com'),
        lineId: 'acme-co',
        otherContact: null,
        isMainContact: true,
    );

    $saved = $repository->saveContact($contact);

    expect($saved->id())->not->toBeNull()
        ->and($saved->contactName())->toBe('Jane Doe')
        ->and($saved->contactPhone()->value)->toBe('0812345678')
        ->and($saved->contactEmail()->value)->toBe('contact@company.com')
        ->and($saved->isMainContact())->toBeTrue();

    $this->assertDatabaseHas('vendor_contact', [
        'vendor_profile_id' => $vendorProfile->id(),
        'contact_name' => 'Jane Doe',
        'contact_position' => 'Manager',
        'is_main_contact' => true,
    ]);
});

test('saveContact allows a contact without phone or email', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $vendorProfile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $saved = $repository->saveContact(VendorContact::create(
        vendorProfileId: $vendorProfile->id(),
        contactName: 'John Doe',
        contactPosition: null,
        contactPhone: null,
        contactEmail: null,
        lineId: null,
        otherContact: null,
    ));

    expect($saved->contactPhone())->toBeNull()
        ->and($saved->contactEmail())->toBeNull()
        ->and($saved->isMainContact())->toBeFalse();
});

test('findContactsByVendorProfileId returns all reconstituted contacts', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $vendorProfile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $repository->saveContact(VendorContact::create(
        vendorProfileId: $vendorProfile->id(),
        contactName: 'Jane Doe',
        contactPosition: 'Manager',
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('contact@company.com'),
        lineId: 'acme-co',
        otherContact: null,
        isMainContact: true,
    ));

    $repository->saveContact(VendorContact::create(
        vendorProfileId: $vendorProfile->id(),
        contactName: 'John Smith',
        contactPosition: 'Sales',
        contactPhone: null,
        contactEmail: null,
        lineId: null,
        otherContact: null,
    ));

    $found = $repository->findContactsByVendorProfileId($vendorProfile->id());

    expect($found)->toHaveCount(2)
        ->and($found[0]->contactName())->toBe('Jane Doe')
        ->and($found[0]->contactEmail()->value)->toBe('contact@company.com')
        ->and($found[1]->contactName())->toBe('John Smith');
});

test('findContactsByVendorProfileId returns an empty array when no contact exists', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $vendorProfile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    expect($repository->findContactsByVendorProfileId($vendorProfile->id()))->toBe([]);
});

test('saveDocument persists a new vendor document and returns it reconstituted with an id', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $vendorProfile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $document = VendorDocument::create(
        vendorProfileId: $vendorProfile->id(),
        documentType: 'company_registration',
        fileName: 'registration.pdf',
        filePath: 'vendor-documents/registration.pdf',
    );

    $saved = $repository->saveDocument($document);

    expect($saved->id())->not->toBeNull()
        ->and($saved->documentType())->toBe('company_registration')
        ->and($saved->fileName())->toBe('registration.pdf')
        ->and($saved->isPending())->toBeTrue();

    $this->assertDatabaseHas('vendor_documents', [
        'vendor_profile_id' => $vendorProfile->id(),
        'document_type' => 'company_registration',
        'file_name' => 'registration.pdf',
        'status' => 'pending',
    ]);
});

test('findDocumentsByVendorProfileId returns all reconstituted documents', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $vendorProfile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $vendorProfile->id(),
        documentType: 'company_registration',
        fileName: 'registration.pdf',
        filePath: 'vendor-documents/registration.pdf',
    ));

    $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $vendorProfile->id(),
        documentType: 'tax_certificate',
        fileName: 'tax.pdf',
        filePath: 'vendor-documents/tax.pdf',
    ));

    $found = $repository->findDocumentsByVendorProfileId($vendorProfile->id());

    expect($found)->toHaveCount(2)
        ->and($found[0]->documentType())->toBe('company_registration')
        ->and($found[1]->documentType())->toBe('tax_certificate');
});

test('findDocumentsByVendorProfileId returns an empty array when no document exists', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $vendorProfile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    expect($repository->findDocumentsByVendorProfileId($vendorProfile->id()))->toBe([]);
});

test('findProfileById returns the reconstituted profile', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $found = $repository->findProfileById($profile->id());

    expect($found)->not->toBeNull()
        ->and($found->id())->toBe($profile->id())
        ->and($found->userId())->toBe($user->id);
});

test('findProfileById returns null when the profile does not exist', function () {
    $repository = new VendorRepository;

    expect($repository->findProfileById(999999))->toBeNull();
});

test('findCompanyDetailByVendorProfileId returns the reconstituted detail', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $vendorProfile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $vendorProfile->id(),
        companyName: 'Acme Co., Ltd.',
        businessRegistrationNo: '0123456789012',
        taxId: TaxId::fromString('1234567890123'),
        branchNo: '00000',
        businessType: 'Trading',
        address: '123 Main St.',
        province: 'Bangkok',
        postalCode: PostalCode::fromString('10110'),
    ));

    $found = $repository->findCompanyDetailByVendorProfileId($vendorProfile->id());

    expect($found)->not->toBeNull()
        ->and($found->companyName())->toBe('Acme Co., Ltd.')
        ->and($found->taxId()->value)->toBe('1234567890123');
});

test('findCompanyDetailByVendorProfileId returns null when no detail exists', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $vendorProfile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    expect($repository->findCompanyDetailByVendorProfileId($vendorProfile->id()))->toBeNull();
});

test('findIndividualDetailByVendorProfileId returns the reconstituted detail', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $vendorProfile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $repository->saveIndividualDetail(VendorIndividualDetail::create(
        vendorProfileId: $vendorProfile->id(),
        storeName: "John's Store",
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        citizenId: CitizenId::fromString('1234567890123'),
        businessType: 'Retail',
        taxId: TaxId::fromString('9876543210123'),
        address: '456 Side St.',
        province: 'Bangkok',
        postalCode: PostalCode::fromString('10110'),
    ));

    $found = $repository->findIndividualDetailByVendorProfileId($vendorProfile->id());

    expect($found)->not->toBeNull()
        ->and($found->storeName())->toBe("John's Store")
        ->and($found->citizenId()->value)->toBe('1234567890123');
});

test('findIndividualDetailByVendorProfileId returns null when no detail exists', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $vendorProfile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    expect($repository->findIndividualDetailByVendorProfileId($vendorProfile->id()))->toBeNull();
});

test('findDocumentByVendorProfileIdAndType returns the matching document', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $vendorProfile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $vendorProfile->id(),
        documentType: 'company_registration',
        fileName: 'registration.pdf',
        filePath: 'vendor-documents/registration.pdf',
    ));

    $found = $repository->findDocumentByVendorProfileIdAndType($vendorProfile->id(), 'company_registration');

    expect($found)->not->toBeNull()
        ->and($found->fileName())->toBe('registration.pdf');
});

test('findDocumentByVendorProfileIdAndType returns null when no document of that type exists', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $vendorProfile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    expect($repository->findDocumentByVendorProfileIdAndType($vendorProfile->id(), 'company_registration'))->toBeNull();
});

test('deleteDocumentFilesForUser deletes stored files for the user\'s vendor documents', function () {
    Storage::fake('local');
    $user = User::factory()->create();
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));
    Storage::disk('local')->put('vendor-documents/keep.pdf', 'content');
    $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'citizen_id',
        fileName: 'keep.pdf',
        filePath: 'vendor-documents/keep.pdf',
    ));

    $repository->deleteDocumentFilesForUser($user->id);

    Storage::disk('local')->assertMissing('vendor-documents/keep.pdf');
});

test('deleteDocumentFilesForUser is a no-op when the user has no vendor profile', function () {
    $user = User::factory()->create();
    $repository = new VendorRepository;

    expect(fn () => $repository->deleteDocumentFilesForUser($user->id))->not->toThrow(Exception::class);
});

test('freeIdentityForDeletedProfile mutates the company tax id hash and business registration no so they become reusable', function () {
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: User::factory()->create()->id));
    $detail = $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $profile->id(),
        companyName: 'Acme Co., Ltd.',
        businessRegistrationNo: '0123456789012',
        taxId: TaxId::fromString('1234567890123'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));
    $originalHash = VendorCompanyDetails::hashTaxId('1234567890123');

    $repository->freeIdentityForDeletedProfile($profile->id());

    $this->assertDatabaseMissing('vendor_company_details', [
        'id' => $detail->id(),
        'business_registration_no' => '0123456789012',
    ]);
    $this->assertDatabaseMissing('vendor_company_details', [
        'id' => $detail->id(),
        'tax_id_hash' => $originalHash,
    ]);

    $newProfile = $repository->saveProfile(VendorProfile::create(userId: User::factory()->create()->id));
    $newDetail = $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $newProfile->id(),
        companyName: 'New Co.',
        businessRegistrationNo: '0123456789012',
        taxId: TaxId::fromString('1234567890123'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    expect($newDetail->id())->not->toBeNull();
});

test('freeIdentityForDeletedProfile mutates the individual citizen id hash and tax id hash so they become reusable', function () {
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: User::factory()->create()->id));
    $detail = $repository->saveIndividualDetail(VendorIndividualDetail::create(
        vendorProfileId: $profile->id(),
        storeName: "John's Store",
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        citizenId: CitizenId::fromString('1234567890124'),
        businessType: null,
        taxId: TaxId::fromString('9999999999999'),
        address: null,
        province: null,
        postalCode: null,
    ));
    $originalCitizenHash = VendorIndividualDetails::hashCitizenId('1234567890124');
    $originalTaxHash = VendorIndividualDetails::hashTaxId('9999999999999');

    $repository->freeIdentityForDeletedProfile($profile->id());

    $this->assertDatabaseMissing('vendor_individual_details', [
        'id' => $detail->id(),
        'citizen_id_hash' => $originalCitizenHash,
    ]);
    $this->assertDatabaseMissing('vendor_individual_details', [
        'id' => $detail->id(),
        'tax_id_hash' => $originalTaxHash,
    ]);

    $newProfile = $repository->saveProfile(VendorProfile::create(userId: User::factory()->create()->id));
    $newDetail = $repository->saveIndividualDetail(VendorIndividualDetail::create(
        vendorProfileId: $newProfile->id(),
        storeName: "Jane's Store",
        prefix: 'Ms.',
        firstname: 'Jane',
        lastname: 'Doe',
        citizenId: CitizenId::fromString('1234567890124'),
        businessType: null,
        taxId: TaxId::fromString('9999999999999'),
        address: null,
        province: null,
        postalCode: null,
    ));

    expect($newDetail->id())->not->toBeNull();
});

test('freeIdentityForDeletedProfile is a no-op when the profile has no company or individual detail', function () {
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: User::factory()->create()->id));

    expect(fn () => $repository->freeIdentityForDeletedProfile($profile->id()))->not->toThrow(Exception::class);
});
