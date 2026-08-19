<?php

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Application\Queries\ListUsersQuery;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function listUsersQuery(): ListUsersQuery
{
    return app(ListUsersQuery::class);
}

test('execute returns all users when no filters are given', function () {
    User::factory()->create(['user_type' => 'internal']);
    User::factory()->create(['user_type' => 'company']);
    User::factory()->create(['user_type' => 'individual']);

    $result = listUsersQuery()->execute();

    expect($result->total())->toBe(3);
});

test('execute filters by type', function () {
    User::factory()->create(['user_type' => 'internal']);
    User::factory()->create(['user_type' => 'company']);

    $result = listUsersQuery()->execute(type: 'internal');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->user_type->value)->toBe('internal');
});

test('execute filters by status', function () {
    User::factory()->create(['user_type' => 'internal', 'status' => 'active']);
    User::factory()->create(['user_type' => 'internal', 'status' => 'suspended']);

    $result = listUsersQuery()->execute(status: 'suspended');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->status->getValue())->toBe('suspended');
});

test('execute searches by username or email', function () {
    User::factory()->create(['username' => 'somchai_j', 'email' => 'somchai@example.com', 'user_type' => 'internal']);
    User::factory()->create(['username' => 'other_user', 'email' => 'other@example.com', 'user_type' => 'internal']);

    expect(listUsersQuery()->execute(search: 'somchai_j')->total())->toBe(1);
    expect(listUsersQuery()->execute(search: 'somchai@example.com')->total())->toBe(1);
});

test('execute searches internal users by firstname or lastname', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $user->id, 'firstname' => 'Somchai', 'lastname' => 'Jaidee']);
    $other = User::factory()->create(['user_type' => 'internal']);
    InternalProfiles::create(['user_id' => $other->id, 'firstname' => 'Somsri', 'lastname' => 'Somboon']);

    $result = listUsersQuery()->execute(search: 'Jaidee');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($user->id);
});

test('execute searches company users by company name', function () {
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
    User::factory()->create(['user_type' => 'company']);
    User::factory()->create(['user_type' => 'internal']);

    $result = listUsersQuery()->execute(search: 'Acme');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($companyUser->id);
});

test('execute searches individual users by store name', function () {
    $repository = new VendorRepository;

    $individualUser = User::factory()->create(['user_type' => 'individual']);
    $profile = $repository->saveProfile(VendorProfile::create(userId: $individualUser->id));
    $repository->saveIndividualDetail(VendorIndividualDetail::create(
        vendorProfileId: $profile->id(),
        storeName: "John's Store",
        prefix: null,
        firstname: 'John',
        lastname: 'Doe',
        citizenId: CitizenId::fromString('1234567890124'),
        businessType: null,
        taxId: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $result = listUsersQuery()->execute(search: "John's Store");

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($individualUser->id);
});

test('execute sorts by the given column and direction', function () {
    User::factory()->create(['username' => 'bravo', 'user_type' => 'internal']);
    User::factory()->create(['username' => 'alpha', 'user_type' => 'internal']);

    $result = listUsersQuery()->execute(sortBy: 'username', sortDirection: 'asc');

    expect(collect($result->items())->pluck('username')->toArray())->toBe(['alpha', 'bravo']);
});

test('execute defaults to sorting by created_at descending', function () {
    $older = User::factory()->create(['user_type' => 'internal']);
    $older->forceFill(['created_at' => now()->subDay()])->save();
    $newer = User::factory()->create(['user_type' => 'internal']);

    $result = listUsersQuery()->execute();

    expect($result->items()[0]->id)->toBe($newer->id);
});

test('execute paginates results', function () {
    User::factory()->count(25)->create(['user_type' => 'internal']);

    $result = listUsersQuery()->execute(page: 2, perPage: 10);

    expect($result->count())->toBe(10)
        ->and($result->currentPage())->toBe(2)
        ->and($result->total())->toBe(25);
});
