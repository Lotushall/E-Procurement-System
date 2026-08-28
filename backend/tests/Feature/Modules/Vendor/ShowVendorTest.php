<?php

use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorContact;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('fetching a vendor by id requires authentication', function () {
    $response = $this->getJson('/api/v1/vendors/1');

    $response->assertStatus(401);
});

test('a vendor user cannot fetch a vendor by id', function () {
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $this->actingAs($vendorUser, 'web');

    $response = $this->getJson('/api/v1/vendors/1');

    $response->assertStatus(403);
});

test('an internal user can fetch a vendor profile by id', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    $companyUser = User::factory()->create(['user_type' => 'company', 'email' => 'vendor@example.com']);
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
    $repository->saveContact(VendorContact::create(
        vendorProfileId: $companyProfile->id(),
        contactName: 'Jane Doe',
        contactPosition: 'Manager',
        contactPhone: null,
        contactEmail: null,
        lineId: null,
        otherContact: null,
        isMainContact: true,
    ));
    VendorDocuments::factory()->create([
        'vendor_profile_id' => $companyProfile->id(),
        'file_name' => 'registration.pdf',
    ]);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson("/api/v1/vendors/{$companyProfile->id()}");

    $response->assertOk()
        ->assertJsonPath('data.id', $companyProfile->id())
        ->assertJsonPath('data.verificationStatus', 'pending')
        ->assertJsonPath('data.detail.type', 'company')
        ->assertJsonPath('data.detail.companyName', 'Acme Co., Ltd.')
        ->assertJsonPath('data.user.email', 'vendor@example.com')
        ->assertJsonPath('data.user.id', $companyUser->id)
        ->assertJsonCount(1, 'data.contact')
        ->assertJsonPath('data.contact.0.contactName', 'Jane Doe')
        ->assertJsonCount(1, 'data.document')
        ->assertJsonPath('data.document.0.fileName', 'registration.pdf');
});

test('fetching a nonexistent vendor returns 404', function () {
    $internalUser = User::factory()->internal()->create();
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors/99999');

    $response->assertStatus(404);
});

test('fetching a vendor whose linked user was deleted returns the profile with a null user', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    $companyUser = User::factory()->create(['user_type' => 'company']);
    $companyProfile = $repository->saveProfile(VendorProfile::create(userId: $companyUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $companyProfile->id(),
        companyName: 'Deleted Vendor Co.',
        businessRegistrationNo: '9990001112223',
        taxId: TaxId::fromString('9990001112223'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));
    app(UserRepositoryInterface::class)->delete($companyUser->id);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson("/api/v1/vendors/{$companyProfile->id()}");

    $response->assertOk()
        ->assertJsonPath('data.id', $companyProfile->id())
        ->assertJsonPath('data.user', null);
});
