<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

test('listing vendors requires authentication', function () {
    $response = $this->getJson('/api/v1/vendors');

    $response->assertStatus(401);
});

test('a vendor user cannot list vendors', function () {
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $this->actingAs($vendorUser, 'web');

    $response = $this->getJson('/api/v1/vendors');

    $response->assertStatus(403);
});

test('an internal user can list all vendors regardless of status', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $repository = new VendorRepository;

    $companyUser = User::factory()->create(['user_type' => 'company']);
    $companyProfile = $repository->saveProfile(VendorProfile::create(userId: $companyUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $companyProfile->id(),
        companyName: 'Acme Co., Ltd.',
        businessRegistrationNo: '0123456789012',
        taxId: TaxId::fromString('1234567890123'),
        branchNo: '00000',
        businessType: 'Trading',
        address: '123 Main St.',
        province: 'Bangkok',
        postalCode: null,
    ));

    $individualUser = User::factory()->create(['user_type' => 'individual']);
    $individualProfile = VendorProfile::create(userId: $individualUser->id);
    $individualProfile->approve(verifiedBy: $internalUser->id);
    $individualProfile = $repository->saveProfile($individualProfile);
    $repository->saveIndividualDetail(VendorIndividualDetail::create(
        vendorProfileId: $individualProfile->id(),
        storeName: "John's Store",
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        citizenId: CitizenId::fromString('1234567890124'),
        businessType: 'Retail',
        taxId: null,
        address: '456 Side St.',
        province: 'Bangkok',
        postalCode: null,
    ));

    $rejectedUser = User::factory()->create(['user_type' => 'company']);
    $rejectedProfile = VendorProfile::create(userId: $rejectedUser->id);
    $rejectedProfile->reject(verifiedBy: $internalUser->id);
    $rejectedProfile = $repository->saveProfile($rejectedProfile);
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $rejectedProfile->id(),
        companyName: 'Rejected Co.',
        businessRegistrationNo: '3333333333333',
        taxId: TaxId::fromString('3333333333333'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors');

    $response->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'displayName', 'vendorType', 'verificationStatus', 'submittedAt'],
            ],
        ]);

    expect(collect($response->json('data'))->pluck('verificationStatus')->sort()->values()->toArray())
        ->toBe(['approved', 'pending', 'rejected']);

    $companyEntry = collect($response->json('data'))->firstWhere('id', $companyProfile->id());
    expect($companyEntry)->toMatchArray([
        'id' => $companyProfile->id(),
        'displayName' => 'Acme Co., Ltd.',
        'vendorType' => 'company',
        'verificationStatus' => 'pending',
    ]);
    expect(Carbon::parse($companyEntry['submittedAt'])->diffInSeconds(now()))->toBeLessThan(10);

    $individualEntry = collect($response->json('data'))->firstWhere('id', $individualProfile->id());
    expect($individualEntry)->toMatchArray([
        'id' => $individualProfile->id(),
        'displayName' => "John's Store",
        'vendorType' => 'individual',
        'verificationStatus' => 'approved',
    ]);

    $rejectedEntry = collect($response->json('data'))->firstWhere('id', $rejectedProfile->id());
    expect($rejectedEntry)->toMatchArray([
        'id' => $rejectedProfile->id(),
        'displayName' => 'Rejected Co.',
        'vendorType' => 'company',
        'verificationStatus' => 'rejected',
    ]);
});

test('an internal user can filter vendors by status', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $repository = new VendorRepository;

    $pendingUser = User::factory()->create(['user_type' => 'company']);
    $pendingProfile = $repository->saveProfile(VendorProfile::create(userId: $pendingUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $pendingProfile->id(),
        companyName: 'Pending Co.',
        businessRegistrationNo: '1111111111111',
        taxId: TaxId::fromString('1111111111111'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $approvedUser = User::factory()->create(['user_type' => 'company']);
    $approvedProfile = VendorProfile::create(userId: $approvedUser->id);
    $approvedProfile->approve(verifiedBy: $internalUser->id);
    $approvedProfile = $repository->saveProfile($approvedProfile);
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $approvedProfile->id(),
        companyName: 'Approved Co.',
        businessRegistrationNo: '2222222222222',
        taxId: TaxId::fromString('2222222222222'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?status=approved');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $approvedProfile->id())
        ->assertJsonPath('data.0.verificationStatus', 'approved');
});

test('an invalid status value is rejected', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?status=bogus');

    $response->assertStatus(422);
});
