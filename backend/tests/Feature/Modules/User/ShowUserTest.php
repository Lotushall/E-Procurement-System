<?php

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('fetching a user by id requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/users/1');

    $response->assertStatus(401);
});

test('a non-internal user cannot fetch a user by id', function () {
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $this->actingAs($vendorUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users/1');

    $response->assertStatus(403);
});

test('fetching an internal user returns a null vendorProfileId', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $internalUser->id, 'firstname' => 'Somchai', 'lastname' => 'Jaidee']);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson("/api/v1/dashboard/users/{$internalUser->id}");

    $response->assertOk()
        ->assertJsonPath('data.id', $internalUser->id)
        ->assertJsonPath('data.name', 'Somchai Jaidee')
        ->assertJsonPath('data.userType', 'internal')
        ->assertJsonPath('data.vendorProfileId', null);
});

test('fetching a company user returns its vendorProfileId', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $repository = new VendorRepository;
    $companyUser = User::factory()->create(['user_type' => 'company']);
    $profile = $repository->saveProfile(VendorProfile::create(userId: $companyUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
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

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson("/api/v1/dashboard/users/{$companyUser->id}");

    $response->assertOk()
        ->assertJsonPath('data.name', 'Acme Co., Ltd.')
        ->assertJsonPath('data.userType', 'company')
        ->assertJsonPath('data.vendorProfileId', $profile->id());
});

test('fetching a nonexistent user returns 404', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users/999999');

    $response->assertStatus(404);
});
