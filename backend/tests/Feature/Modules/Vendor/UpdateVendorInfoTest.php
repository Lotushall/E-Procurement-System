<?php

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

function companyInfoPayload(array $overrides = []): array
{
    return array_merge([
        'vendorType' => 'company',
        'companyName' => 'Acme Holdings Co., Ltd.',
        'businessRegistrationNo' => '9999999999999',
        'branchNo' => '00001',
        'businessType' => 'Manufacturing',
        'taxId' => '9876543210123',
        'address' => '456 New St.',
        'province' => 'Chonburi',
        'postalCode' => '20000',
    ], $overrides);
}

function individualInfoPayload(array $overrides = []): array
{
    return array_merge([
        'vendorType' => 'individual',
        'storeName' => "John's New Store",
        'prefix' => 'Mr.',
        'firstname' => 'Johnny',
        'lastname' => 'Doe',
        'citizenId' => '9876543210123',
        'businessType' => 'Retail',
        'address' => '456 Side St.',
        'province' => 'Chonburi',
        'postalCode' => '20000',
    ], $overrides);
}

test('a company vendor can update their business info', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $profile->id(),
        companyName: 'Acme Co., Ltd.',
        businessRegistrationNo: '0123456789012',
        taxId: TaxId::fromString('1234567890123'),
        branchNo: '00000',
        businessType: 'Trading',
        address: '123 Main St.',
        province: 'Bangkok',
        postalCode: PostalCode::fromString('10110'),
    ));

    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/vendor/info', companyInfoPayload());

    $response->assertOk()
        ->assertJsonPath('data.detail.companyName', 'Acme Holdings Co., Ltd.');

    $this->assertDatabaseHas('vendor_company_details', [
        'vendor_profile_id' => $profile->id(),
        'company_name' => 'Acme Holdings Co., Ltd.',
        'business_type' => 'Manufacturing',
    ]);
});

test('an individual vendor can update their business info', function () {
    $user = User::factory()->create(['user_type' => 'individual']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $repository->saveIndividualDetail(VendorIndividualDetail::create(
        vendorProfileId: $profile->id(),
        storeName: "John's Store",
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        citizenId: CitizenId::fromString('1234567890123'),
        businessType: 'Retail',
        taxId: null,
        address: '456 Side St.',
        province: 'Bangkok',
        postalCode: PostalCode::fromString('10110'),
    ));

    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/vendor/info', individualInfoPayload());

    $response->assertOk()
        ->assertJsonPath('data.detail.storeName', "John's New Store");

    $this->assertDatabaseHas('vendor_individual_details', [
        'vendor_profile_id' => $profile->id(),
        'store_name' => "John's New Store",
        'firstname' => 'Johnny',
    ]);
});

test('updating vendor info requires authentication', function () {
    $response = $this->postJson('/api/v1/vendor/info', companyInfoPayload());

    $response->assertStatus(401);
});

test('company name is required when updating info as a company vendor', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $repository->saveProfile(VendorProfile::create(userId: $user->id));
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/vendor/info', companyInfoPayload(['companyName' => null]));

    $response->assertStatus(422)->assertJsonValidationErrors('companyName');
});

test('store name is required when updating info as an individual vendor', function () {
    $user = User::factory()->create(['user_type' => 'individual']);
    $repository = new VendorRepository;
    $repository->saveProfile(VendorProfile::create(userId: $user->id));
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/vendor/info', individualInfoPayload(['storeName' => null]));

    $response->assertStatus(422)->assertJsonValidationErrors('storeName');
});
