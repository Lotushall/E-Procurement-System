<?php

use App\Modules\User\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('listing users requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/users');

    $response->assertStatus(401);
});

test('a non-internal user cannot list users', function () {
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $this->actingAs($vendorUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users');

    $response->assertStatus(403);
});

test('an internal user can list all users with resolved names', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $internalUser->id, 'firstname' => 'Somchai', 'lastname' => 'Jaidee']);

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

    $response = $this->getJson('/api/v1/dashboard/users');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonStructure([
            'data' => [['id', 'username', 'email', 'name', 'userType', 'status', 'createdAt']],
            'meta' => ['currentPage', 'lastPage', 'perPage', 'total'],
        ]);

    $items = collect($response->json('data'));
    expect($items->firstWhere('id', $internalUser->id))->toMatchArray(['name' => 'Somchai Jaidee', 'userType' => 'internal']);
    expect($items->firstWhere('id', $companyUser->id))->toMatchArray(['name' => 'Acme Co., Ltd.', 'userType' => 'company']);
});

test('listing users filters by type', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    User::factory()->create(['user_type' => 'company']);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users?type=company');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.userType', 'company');
});

test('listing users filters by status', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    User::factory()->create(['user_type' => 'internal', 'status' => 'suspended']);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users?status=suspended');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.status', 'suspended');
});

test('listing users searches by keyword', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal', 'username' => 'somchai_j']);
    User::factory()->create(['user_type' => 'internal', 'username' => 'other_user']);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users?search=somchai_j');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $internalUser->id);
});

test('listing users sorts by the given column', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal', 'username' => 'zzz_admin']);
    User::factory()->create(['user_type' => 'internal', 'username' => 'aaa_user']);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users?sort_by=username&sort_direction=asc');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('username')->toArray())->toBe(['aaa_user', 'zzz_admin']);
});

test('listing users returns camelCase pagination meta with no links', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    User::factory()->count(2)->create(['user_type' => 'internal']);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users?page=1&per_page=2');

    $response->assertOk()
        ->assertJson(['meta' => ['currentPage' => 1, 'lastPage' => 2, 'perPage' => 2, 'total' => 3]])
        ->assertJsonMissingPath('links');
});

test('an invalid type value is rejected', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users?type=bogus');

    $response->assertStatus(422);
});

test('an invalid status value is rejected', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users?status=bogus');

    $response->assertStatus(422);
});

test('an invalid sort_by value is rejected', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users?sort_by=name');

    $response->assertStatus(422);
});

test('a too long search value is rejected', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/dashboard/users?search='.str_repeat('a', 256));

    $response->assertStatus(422);
});
