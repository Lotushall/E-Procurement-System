<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a company vendor can fetch their own profile', function () {
    $user = User::factory()->create(['user_type' => 'company']);
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
        country: 'Thailand',
        province: 'Bangkok',
        postalCode: PostalCode::fromString('10110'),
        contactName: 'Jane Doe',
        contactPosition: 'Manager',
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('contact@company.com'),
        lineId: 'acme-co',
        otherContact: null,
    ));

    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/vendor/profile');

    $response->assertOk()
        ->assertJsonPath('data.id', $vendorProfile->id())
        ->assertJsonPath('data.verificationStatus', 'pending')
        ->assertJsonPath('data.detail.type', 'company')
        ->assertJsonPath('data.detail.companyName', 'Acme Co., Ltd.')
        ->assertJsonPath('data.detail.businessType', 'Trading')
        ->assertJsonMissingPath('data.detail.taxId');
});

test('an individual vendor can fetch their own profile', function () {
    $user = User::factory()->create(['user_type' => 'individual']);
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
        email: Email::fromString('individual@example.com'),
        phone: PhoneNumber::fromString('0812345678'),
        address: '456 Side St.',
        country: 'Thailand',
        province: 'Bangkok',
        postalCode: PostalCode::fromString('10110'),
        contactName: 'John Doe',
        lineId: 'john-doe',
        otherContact: null,
    ));

    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/vendor/profile');

    $response->assertOk()
        ->assertJsonPath('data.detail.type', 'individual')
        ->assertJsonPath('data.detail.storeName', "John's Store")
        ->assertJsonPath('data.detail.firstname', 'John')
        ->assertJsonMissingPath('data.detail.citizenId');
});

test('fetching the vendor profile requires authentication', function () {
    $response = $this->getJson('/api/v1/vendor/profile');

    $response->assertStatus(401);
});

test('a user without a vendor profile receives a 404', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/vendor/profile');

    $response->assertStatus(404);
});
