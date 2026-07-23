<?php

use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\DTOs\UpdateVendorInfoData;
use App\Modules\Vendor\Application\UseCases\UpdateVendorInfoUseCase;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function updateVendorInfoUseCase(): UpdateVendorInfoUseCase
{
    return app(UpdateVendorInfoUseCase::class);
}

function companyInfoData(array $overrides = []): UpdateVendorInfoData
{
    return UpdateVendorInfoData::from(array_merge([
        'vendorType' => 'company',
        'companyName' => 'Acme Holdings Co., Ltd.',
        'businessRegistrationNo' => '9999999999999',
        'branchNo' => '00001',
        'storeName' => null,
        'prefix' => null,
        'firstname' => null,
        'lastname' => null,
        'citizenId' => null,
        'businessType' => 'Manufacturing',
        'taxId' => '9876543210123',
        'address' => '456 New St.',
        'province' => 'Chonburi',
        'postalCode' => '20000',
    ], $overrides));
}

function individualInfoData(array $overrides = []): UpdateVendorInfoData
{
    return UpdateVendorInfoData::from(array_merge([
        'vendorType' => 'individual',
        'companyName' => null,
        'businessRegistrationNo' => null,
        'branchNo' => null,
        'storeName' => "John's New Store",
        'prefix' => 'Mr.',
        'firstname' => 'Johnny',
        'lastname' => 'Doe',
        'citizenId' => '9876543210123',
        'businessType' => 'Retail',
        'taxId' => null,
        'address' => '456 Side St.',
        'province' => 'Chonburi',
        'postalCode' => '20000',
    ], $overrides));
}

test('execute updates an existing company detail', function () {
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

    updateVendorInfoUseCase()->execute($profile->id(), companyInfoData());

    $this->assertDatabaseHas('vendor_company_details', [
        'vendor_profile_id' => $profile->id(),
        'company_name' => 'Acme Holdings Co., Ltd.',
        'business_registration_no' => '9999999999999',
        'branch_no' => '00001',
        'business_type' => 'Manufacturing',
        'tax_id_hash' => hash('sha256', '9876543210123'),
    ]);

    $this->assertDatabaseCount('vendor_company_details', 1);
});

test('execute preserves the stored tax id and registration number when the incoming values are masked', function () {
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

    updateVendorInfoUseCase()->execute($profile->id(), companyInfoData([
        'businessRegistrationNo' => 'xxxxxxxxx9012',
        'taxId' => 'xxxxxxxxx0123',
    ]));

    $this->assertDatabaseHas('vendor_company_details', [
        'vendor_profile_id' => $profile->id(),
        'business_registration_no' => '0123456789012',
        'tax_id_hash' => hash('sha256', '1234567890123'),
    ]);
});

test('execute creates a company detail when none exists yet', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    updateVendorInfoUseCase()->execute($profile->id(), companyInfoData());

    $this->assertDatabaseHas('vendor_company_details', [
        'vendor_profile_id' => $profile->id(),
        'company_name' => 'Acme Holdings Co., Ltd.',
    ]);
});

test('execute updates an existing individual detail', function () {
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
        taxId: TaxId::fromString('1111111111111'),
        address: '456 Side St.',
        province: 'Bangkok',
        postalCode: PostalCode::fromString('10110'),
    ));

    updateVendorInfoUseCase()->execute($profile->id(), individualInfoData());

    $this->assertDatabaseHas('vendor_individual_details', [
        'vendor_profile_id' => $profile->id(),
        'store_name' => "John's New Store",
        'firstname' => 'Johnny',
    ]);
});

test('execute does not change the citizen id once it has been set, even if a different value is submitted', function () {
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
        taxId: TaxId::fromString('1111111111111'),
        address: '456 Side St.',
        province: 'Bangkok',
        postalCode: PostalCode::fromString('10110'),
    ));

    updateVendorInfoUseCase()->execute($profile->id(), individualInfoData(['citizenId' => '9876543210123']));

    $this->assertDatabaseHas('vendor_individual_details', [
        'vendor_profile_id' => $profile->id(),
        'store_name' => "John's New Store",
        'citizen_id_hash' => hash('sha256', '1234567890123'),
    ]);
});

test('execute preserves the stored citizen id when the incoming value is masked', function () {
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

    updateVendorInfoUseCase()->execute($profile->id(), individualInfoData([
        'citizenId' => 'xxxxxxxxx0123',
    ]));

    $this->assertDatabaseHas('vendor_individual_details', [
        'vendor_profile_id' => $profile->id(),
        'citizen_id_hash' => hash('sha256', '1234567890123'),
    ]);
});

test('execute creates an individual detail when none exists yet', function () {
    $user = User::factory()->create(['user_type' => 'individual']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    updateVendorInfoUseCase()->execute($profile->id(), individualInfoData());

    $this->assertDatabaseHas('vendor_individual_details', [
        'vendor_profile_id' => $profile->id(),
        'store_name' => "John's New Store",
    ]);
});
