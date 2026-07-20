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
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

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
