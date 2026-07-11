<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
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
        country: 'Thailand',
        province: 'Bangkok',
        postalCode: PostalCode::fromString('10110'),
        contactName: 'Jane Doe',
        contactPosition: 'Manager',
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('contact@company.com'),
        lineId: 'acme-co',
        otherContact: null,
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
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        citizenId: CitizenId::fromString('1234567890123'),
        shopName: "John's Shop",
        businessType: 'Retail',
        taxId: TaxId::fromString('9876543210123'),
        email: Email::fromString('individual@example.com'),
        phone: PhoneNumber::fromString('0812345678'),
        address: '456 Side St.',
        country: 'Thailand',
        province: 'Bangkok',
        postalCode: PostalCode::fromString('10110'),
        contactName: 'John Doe',
        lineId: 'john-doe',
        otherContact: null,
    );

    $saved = $repository->saveIndividualDetail($detail);

    expect($saved->id())->not->toBeNull()
        ->and($saved->citizenId()->value)->toBe('1234567890123')
        ->and($saved->taxId()->value)->toBe('9876543210123')
        ->and($saved->email()->value)->toBe('individual@example.com');

    $this->assertDatabaseHas('vendor_individual_details', [
        'vendor_profile_id' => $vendorProfile->id(),
        'firstname' => 'John',
        'citizen_id_hash' => hash('sha256', '1234567890123'),
        'tax_id_hash' => hash('sha256', '9876543210123'),
    ]);
});
