<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorContact;
use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
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
    $internalUser = User::factory()->internal()->create();
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
                '*' => ['id', 'verificationStatus', 'detail', 'created_at', 'updated_at'],
            ],
        ]);

    expect(collect($response->json('data'))->pluck('verificationStatus')->sort()->values()->toArray())
        ->toBe(['approved', 'pending', 'rejected']);

    $companyEntry = collect($response->json('data'))->firstWhere('id', $companyProfile->id());
    expect($companyEntry)->toMatchArray([
        'id' => $companyProfile->id(),
        'verificationStatus' => 'pending',
    ]);
    expect($companyEntry['detail'])->toMatchArray([
        'type' => 'company',
        'companyName' => 'Acme Co., Ltd.',
    ]);
    expect(Carbon::parse($companyEntry['created_at'])->diffInSeconds(now()))->toBeLessThan(10);

    $individualEntry = collect($response->json('data'))->firstWhere('id', $individualProfile->id());
    expect($individualEntry)->toMatchArray([
        'id' => $individualProfile->id(),
        'verificationStatus' => 'approved',
    ]);
    expect($individualEntry['detail'])->toMatchArray([
        'type' => 'individual',
        'storeName' => "John's Store",
    ]);

    $rejectedEntry = collect($response->json('data'))->firstWhere('id', $rejectedProfile->id());
    expect($rejectedEntry)->toMatchArray([
        'id' => $rejectedProfile->id(),
        'verificationStatus' => 'rejected',
    ]);
    expect($rejectedEntry['detail'])->toMatchArray([
        'type' => 'company',
        'companyName' => 'Rejected Co.',
    ]);
});

test('an internal user can filter vendors by status', function () {
    $internalUser = User::factory()->internal()->create();
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
    $internalUser = User::factory()->internal()->create();
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?status=bogus');

    $response->assertStatus(422);
});

test('listing vendors supports pagination via page and per_page', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    foreach ([1, 2, 3] as $i) {
        $vendorUser = User::factory()->create(['user_type' => 'company']);
        $profile = $repository->saveProfile(VendorProfile::create(userId: $vendorUser->id));
        $repository->saveCompanyDetail(VendorCompanyDetail::create(
            vendorProfileId: $profile->id(),
            companyName: "Vendor {$i}",
            businessRegistrationNo: str_repeat((string) $i, 13),
            taxId: TaxId::fromString(str_repeat((string) $i, 13)),
            branchNo: null,
            businessType: null,
            address: null,
            province: null,
            postalCode: null,
        ));
    }

    $this->actingAs($internalUser, 'web');

    $firstPage = $this->getJson('/api/v1/vendors?page=1&per_page=2');

    $firstPage->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 3)
        ->assertJsonPath('meta.current_page', 1)
        ->assertJsonPath('meta.per_page', 2);

    expect($firstPage->json('links.next'))->not->toBeNull();
    expect($firstPage->json('links.prev'))->toBeNull();

    $secondPage = $this->getJson('/api/v1/vendors?page=2&per_page=2');

    $secondPage->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('meta.current_page', 2);

    expect($secondPage->json('links.next'))->toBeNull();
    expect($secondPage->json('links.prev'))->not->toBeNull();
});

test('an invalid page value is rejected', function () {
    $internalUser = User::factory()->internal()->create();
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?page=0');

    $response->assertStatus(422);
});

test('an invalid per_page value is rejected', function () {
    $internalUser = User::factory()->internal()->create();
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?per_page=101');

    $response->assertStatus(422);
});

test('pagination respects the status filter', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    foreach ([1, 2, 3] as $i) {
        $vendorUser = User::factory()->create(['user_type' => 'company']);
        $profile = $repository->saveProfile(VendorProfile::create(userId: $vendorUser->id));
        $repository->saveCompanyDetail(VendorCompanyDetail::create(
            vendorProfileId: $profile->id(),
            companyName: "Pending Vendor {$i}",
            businessRegistrationNo: str_repeat((string) $i, 13),
            taxId: TaxId::fromString(str_repeat((string) $i, 13)),
            branchNo: null,
            businessType: null,
            address: null,
            province: null,
            postalCode: null,
        ));
    }

    $approvedUser = User::factory()->create(['user_type' => 'company']);
    $approvedProfile = VendorProfile::create(userId: $approvedUser->id);
    $approvedProfile->approve(verifiedBy: $internalUser->id);
    $approvedProfile = $repository->saveProfile($approvedProfile);
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $approvedProfile->id(),
        companyName: 'Approved Vendor',
        businessRegistrationNo: '9999999999999',
        taxId: TaxId::fromString('9999999999999'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?status=pending&page=1&per_page=2');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 3);

    collect($response->json('data'))->each(
        fn (array $vendor) => expect($vendor['verificationStatus'])->toBe('pending')
    );

    expect($response->json('links.next'))
        ->toContain('status=pending')
        ->toContain('per_page=2');
});

test('an internal user can search vendors by company name', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    $acmeUser = User::factory()->create(['user_type' => 'company']);
    $acmeProfile = $repository->saveProfile(VendorProfile::create(userId: $acmeUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $acmeProfile->id(),
        companyName: 'Acme Co., Ltd.',
        businessRegistrationNo: '0123456789012',
        taxId: TaxId::fromString('1234567890123'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $otherUser = User::factory()->create(['user_type' => 'company']);
    $otherProfile = $repository->saveProfile(VendorProfile::create(userId: $otherUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $otherProfile->id(),
        companyName: 'Globex Corp.',
        businessRegistrationNo: '9876543210987',
        taxId: TaxId::fromString('9876543210987'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?search=acme');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $acmeProfile->id());
});

test('an internal user can search vendors by individual store name and firstname', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    $johnUser = User::factory()->create(['user_type' => 'individual']);
    $johnProfile = $repository->saveProfile(VendorProfile::create(userId: $johnUser->id));
    $repository->saveIndividualDetail(VendorIndividualDetail::create(
        vendorProfileId: $johnProfile->id(),
        storeName: "John's Store",
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        citizenId: CitizenId::fromString('1234567890124'),
        businessType: null,
        taxId: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $janeUser = User::factory()->create(['user_type' => 'individual']);
    $janeProfile = $repository->saveProfile(VendorProfile::create(userId: $janeUser->id));
    $repository->saveIndividualDetail(VendorIndividualDetail::create(
        vendorProfileId: $janeProfile->id(),
        storeName: "Jane's Boutique",
        prefix: 'Ms.',
        firstname: 'Jane',
        lastname: 'Smith',
        citizenId: CitizenId::fromString('1234567890125'),
        businessType: null,
        taxId: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $byStoreName = $this->getJson('/api/v1/vendors?search='.urlencode("John's"));
    $byStoreName->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $johnProfile->id());

    $byFirstname = $this->getJson('/api/v1/vendors?search=Jane');
    $byFirstname->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $janeProfile->id());
});

test('an internal user can search vendors by owner email', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    $matchingUser = User::factory()->create(['user_type' => 'company', 'email' => 'findme@example.com']);
    $matchingProfile = $repository->saveProfile(VendorProfile::create(userId: $matchingUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $matchingProfile->id(),
        companyName: 'Findme Co.',
        businessRegistrationNo: '1122334455667',
        taxId: TaxId::fromString('1122334455667'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $otherUser = User::factory()->create(['user_type' => 'company', 'email' => 'someoneelse@example.com']);
    $otherProfile = $repository->saveProfile(VendorProfile::create(userId: $otherUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $otherProfile->id(),
        companyName: 'Other Co.',
        businessRegistrationNo: '7766554433221',
        taxId: TaxId::fromString('7766554433221'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?search=findme@example.com');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $matchingProfile->id());
});

test('an internal user can search vendors by business type', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    $companyUser = User::factory()->create(['user_type' => 'company']);
    $companyProfile = $repository->saveProfile(VendorProfile::create(userId: $companyUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $companyProfile->id(),
        companyName: 'Acme Co., Ltd.',
        businessRegistrationNo: '0123456789012',
        taxId: TaxId::fromString('1234567890123'),
        branchNo: null,
        businessType: 'Wholesale Trading',
        address: null,
        province: null,
        postalCode: null,
    ));

    $individualUser = User::factory()->create(['user_type' => 'individual']);
    $individualProfile = $repository->saveProfile(VendorProfile::create(userId: $individualUser->id));
    $repository->saveIndividualDetail(VendorIndividualDetail::create(
        vendorProfileId: $individualProfile->id(),
        storeName: "John's Store",
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        citizenId: CitizenId::fromString('1234567890124'),
        businessType: 'Food Retail',
        taxId: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $byCompanyBusinessType = $this->getJson('/api/v1/vendors?search=Wholesale');
    $byCompanyBusinessType->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $companyProfile->id());

    $byIndividualBusinessType = $this->getJson('/api/v1/vendors?search=Retail');
    $byIndividualBusinessType->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $individualProfile->id());
});

test('an internal user can search vendors by contact phone and contact email', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    $matchingUser = User::factory()->create(['user_type' => 'company']);
    $matchingProfile = $repository->saveProfile(VendorProfile::create(userId: $matchingUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $matchingProfile->id(),
        companyName: 'Findme Co.',
        businessRegistrationNo: '1122334455667',
        taxId: TaxId::fromString('1122334455667'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));
    $repository->saveContact(VendorContact::create(
        vendorProfileId: $matchingProfile->id(),
        contactName: 'Contact Person',
        contactPosition: null,
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('contact@findme.com'),
        lineId: null,
        otherContact: null,
        isMainContact: true,
    ));

    $otherUser = User::factory()->create(['user_type' => 'company']);
    $otherProfile = $repository->saveProfile(VendorProfile::create(userId: $otherUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $otherProfile->id(),
        companyName: 'Other Co.',
        businessRegistrationNo: '7766554433221',
        taxId: TaxId::fromString('7766554433221'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));
    $repository->saveContact(VendorContact::create(
        vendorProfileId: $otherProfile->id(),
        contactName: 'Other Contact',
        contactPosition: null,
        contactPhone: PhoneNumber::fromString('0898765432'),
        contactEmail: Email::fromString('contact@other.com'),
        lineId: null,
        otherContact: null,
        isMainContact: true,
    ));

    $this->actingAs($internalUser, 'web');

    $byPhone = $this->getJson('/api/v1/vendors?search=0812345678');
    $byPhone->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $matchingProfile->id());

    $byContactEmail = $this->getJson('/api/v1/vendors?search=contact@findme.com');
    $byContactEmail->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $matchingProfile->id());
});

test('search combines with the status filter', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    $pendingUser = User::factory()->create(['user_type' => 'company']);
    $pendingProfile = $repository->saveProfile(VendorProfile::create(userId: $pendingUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $pendingProfile->id(),
        companyName: 'Acme Pending Co.',
        businessRegistrationNo: '1231231231231',
        taxId: TaxId::fromString('1231231231231'),
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
        companyName: 'Acme Approved Co.',
        businessRegistrationNo: '3213213213213',
        taxId: TaxId::fromString('3213213213213'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?search=acme&status=approved');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $approvedProfile->id());
});

test('a too long search value is rejected', function () {
    $internalUser = User::factory()->internal()->create();
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?search='.str_repeat('a', 256));

    $response->assertStatus(422);
});

test('listing vendors includes status counts in the response meta', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    foreach ([1, 2] as $i) {
        $vendorUser = User::factory()->create(['user_type' => 'company']);
        $profile = $repository->saveProfile(VendorProfile::create(userId: $vendorUser->id));
        $repository->saveCompanyDetail(VendorCompanyDetail::create(
            vendorProfileId: $profile->id(),
            companyName: "Pending Vendor {$i}",
            businessRegistrationNo: str_repeat((string) $i, 13),
            taxId: TaxId::fromString(str_repeat((string) $i, 13)),
            branchNo: null,
            businessType: null,
            address: null,
            province: null,
            postalCode: null,
        ));
    }

    $approvedUser = User::factory()->create(['user_type' => 'company']);
    $approvedProfile = VendorProfile::create(userId: $approvedUser->id);
    $approvedProfile->approve(verifiedBy: $internalUser->id);
    $approvedProfile = $repository->saveProfile($approvedProfile);
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $approvedProfile->id(),
        companyName: 'Approved Vendor',
        businessRegistrationNo: '8888888888888',
        taxId: TaxId::fromString('8888888888888'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $rejectedUser = User::factory()->create(['user_type' => 'company']);
    $rejectedProfile = VendorProfile::create(userId: $rejectedUser->id);
    $rejectedProfile->reject(verifiedBy: $internalUser->id);
    $rejectedProfile = $repository->saveProfile($rejectedProfile);
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $rejectedProfile->id(),
        companyName: 'Rejected Vendor',
        businessRegistrationNo: '9999999999998',
        taxId: TaxId::fromString('9999999999998'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors');

    $response->assertOk()
        ->assertJsonPath('meta.counts.total', 4)
        ->assertJsonPath('meta.counts.pending', 2)
        ->assertJsonPath('meta.counts.approved', 1)
        ->assertJsonPath('meta.counts.rejected', 1);
});

test('status counts in meta respect the search filter but ignore the status filter', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    $acmePendingUser = User::factory()->create(['user_type' => 'company']);
    $acmePendingProfile = $repository->saveProfile(VendorProfile::create(userId: $acmePendingUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $acmePendingProfile->id(),
        companyName: 'Acme Pending',
        businessRegistrationNo: '1112223334445',
        taxId: TaxId::fromString('1112223334445'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $acmeApprovedUser = User::factory()->create(['user_type' => 'company']);
    $acmeApprovedProfile = VendorProfile::create(userId: $acmeApprovedUser->id);
    $acmeApprovedProfile->approve(verifiedBy: $internalUser->id);
    $acmeApprovedProfile = $repository->saveProfile($acmeApprovedProfile);
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $acmeApprovedProfile->id(),
        companyName: 'Acme Approved',
        businessRegistrationNo: '5556667778889',
        taxId: TaxId::fromString('5556667778889'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $globexPendingUser = User::factory()->create(['user_type' => 'company']);
    $globexPendingProfile = $repository->saveProfile(VendorProfile::create(userId: $globexPendingUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $globexPendingProfile->id(),
        companyName: 'Globex Pending',
        businessRegistrationNo: '2223334445556',
        taxId: TaxId::fromString('2223334445556'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?search=acme&status=pending&per_page=10');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('meta.counts.total', 2)
        ->assertJsonPath('meta.counts.pending', 1)
        ->assertJsonPath('meta.counts.approved', 1)
        ->assertJsonPath('meta.counts.rejected', 0);
});

test('an internal user can sort vendors by created_at', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    $oldestUser = User::factory()->create(['user_type' => 'company']);
    $oldestProfile = $repository->saveProfile(VendorProfile::create(userId: $oldestUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $oldestProfile->id(),
        companyName: 'Oldest Co.',
        businessRegistrationNo: '1000000000001',
        taxId: TaxId::fromString('1000000000001'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));
    VendorProfiles::whereKey($oldestProfile->id())->update(['created_at' => now()->subDays(3)]);

    $middleUser = User::factory()->create(['user_type' => 'company']);
    $middleProfile = $repository->saveProfile(VendorProfile::create(userId: $middleUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $middleProfile->id(),
        companyName: 'Middle Co.',
        businessRegistrationNo: '1000000000002',
        taxId: TaxId::fromString('1000000000002'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));
    VendorProfiles::whereKey($middleProfile->id())->update(['created_at' => now()->subDays(2)]);

    $newestUser = User::factory()->create(['user_type' => 'company']);
    $newestProfile = $repository->saveProfile(VendorProfile::create(userId: $newestUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $newestProfile->id(),
        companyName: 'Newest Co.',
        businessRegistrationNo: '1000000000003',
        taxId: TaxId::fromString('1000000000003'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));
    VendorProfiles::whereKey($newestProfile->id())->update(['created_at' => now()->subDays(1)]);

    $this->actingAs($internalUser, 'web');

    $ascending = $this->getJson('/api/v1/vendors?sort_by=created_at&sort_direction=asc');
    $ascending->assertOk();
    expect(collect($ascending->json('data'))->pluck('id')->toArray())
        ->toBe([$oldestProfile->id(), $middleProfile->id(), $newestProfile->id()]);

    $descending = $this->getJson('/api/v1/vendors?sort_by=created_at&sort_direction=desc');
    $descending->assertOk();
    expect(collect($descending->json('data'))->pluck('id')->toArray())
        ->toBe([$newestProfile->id(), $middleProfile->id(), $oldestProfile->id()]);
});

test('an internal user can sort vendors by verification_status', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    $pendingUser = User::factory()->create(['user_type' => 'company']);
    $pendingProfile = $repository->saveProfile(VendorProfile::create(userId: $pendingUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $pendingProfile->id(),
        companyName: 'Pending Co.',
        businessRegistrationNo: '2000000000001',
        taxId: TaxId::fromString('2000000000001'),
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
        businessRegistrationNo: '2000000000002',
        taxId: TaxId::fromString('2000000000002'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $rejectedUser = User::factory()->create(['user_type' => 'company']);
    $rejectedProfile = VendorProfile::create(userId: $rejectedUser->id);
    $rejectedProfile->reject(verifiedBy: $internalUser->id);
    $rejectedProfile = $repository->saveProfile($rejectedProfile);
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $rejectedProfile->id(),
        companyName: 'Rejected Co.',
        businessRegistrationNo: '2000000000003',
        taxId: TaxId::fromString('2000000000003'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?sort_by=verification_status&sort_direction=asc');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('verificationStatus')->toArray())
        ->toBe(['approved', 'pending', 'rejected']);
});

test('an internal user can sort vendors by user_type', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    $companyUser = User::factory()->create(['user_type' => 'company']);
    $companyProfile = $repository->saveProfile(VendorProfile::create(userId: $companyUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $companyProfile->id(),
        companyName: 'Company Vendor',
        businessRegistrationNo: '3000000000001',
        taxId: TaxId::fromString('3000000000001'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $individualUser = User::factory()->create(['user_type' => 'individual']);
    $individualProfile = $repository->saveProfile(VendorProfile::create(userId: $individualUser->id));
    $repository->saveIndividualDetail(VendorIndividualDetail::create(
        vendorProfileId: $individualProfile->id(),
        storeName: 'Individual Vendor',
        prefix: 'Mr.',
        firstname: 'Test',
        lastname: 'Vendor',
        citizenId: CitizenId::fromString('9999999999991'),
        businessType: null,
        taxId: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $ascending = $this->getJson('/api/v1/vendors?sort_by=user_type&sort_direction=asc');
    $ascending->assertOk();
    expect(collect($ascending->json('data'))->pluck('id')->toArray())
        ->toBe([$companyProfile->id(), $individualProfile->id()]);

    $descending = $this->getJson('/api/v1/vendors?sort_by=user_type&sort_direction=desc');
    $descending->assertOk();
    expect(collect($descending->json('data'))->pluck('id')->toArray())
        ->toBe([$individualProfile->id(), $companyProfile->id()]);
});

test('an internal user can sort vendors by business_type across company and individual vendors', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    $companyUser = User::factory()->create(['user_type' => 'company']);
    $companyProfile = $repository->saveProfile(VendorProfile::create(userId: $companyUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $companyProfile->id(),
        companyName: 'Trading Co.',
        businessRegistrationNo: '4000000000001',
        taxId: TaxId::fromString('4000000000001'),
        branchNo: null,
        businessType: 'Trading',
        address: null,
        province: null,
        postalCode: null,
    ));

    $individualUser = User::factory()->create(['user_type' => 'individual']);
    $individualProfile = $repository->saveProfile(VendorProfile::create(userId: $individualUser->id));
    $repository->saveIndividualDetail(VendorIndividualDetail::create(
        vendorProfileId: $individualProfile->id(),
        storeName: 'Retail Store',
        prefix: 'Mr.',
        firstname: 'Test',
        lastname: 'Vendor',
        citizenId: CitizenId::fromString('9999999999992'),
        businessType: 'Retail',
        taxId: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?sort_by=business_type&sort_direction=asc');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('id')->toArray())
        ->toBe([$individualProfile->id(), $companyProfile->id()]);
});

test('an internal user can sort vendors by name across company and individual vendors', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    $companyUser = User::factory()->create(['user_type' => 'company']);
    $companyProfile = $repository->saveProfile(VendorProfile::create(userId: $companyUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $companyProfile->id(),
        companyName: 'Zulu Trading',
        businessRegistrationNo: '4000000000003',
        taxId: TaxId::fromString('4000000000003'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $individualUser = User::factory()->create(['user_type' => 'individual']);
    $individualProfile = $repository->saveProfile(VendorProfile::create(userId: $individualUser->id));
    $repository->saveIndividualDetail(VendorIndividualDetail::create(
        vendorProfileId: $individualProfile->id(),
        storeName: 'Alpha Store',
        prefix: 'Mr.',
        firstname: 'Test',
        lastname: 'Vendor',
        citizenId: CitizenId::fromString('9999999999993'),
        businessType: null,
        taxId: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $ascending = $this->getJson('/api/v1/vendors?sort_by=name&sort_direction=asc');
    $ascending->assertOk();
    expect(collect($ascending->json('data'))->pluck('id')->toArray())
        ->toBe([$individualProfile->id(), $companyProfile->id()]);

    $descending = $this->getJson('/api/v1/vendors?sort_by=name&sort_direction=desc');
    $descending->assertOk();
    expect(collect($descending->json('data'))->pluck('id')->toArray())
        ->toBe([$companyProfile->id(), $individualProfile->id()]);
});

test('an invalid sort_by value is rejected', function () {
    $internalUser = User::factory()->internal()->create();
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?sort_by=bogus');

    $response->assertStatus(422);
});

test('an invalid sort_direction value is rejected', function () {
    $internalUser = User::factory()->internal()->create();
    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors?sort_by=created_at&sort_direction=bogus');

    $response->assertStatus(422);
});

test('listing vendors includes a document status count breakdown', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $profile = $repository->saveProfile(VendorProfile::create(userId: $vendorUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $profile->id(),
        companyName: 'Doc Status Co.',
        businessRegistrationNo: '5000000000001',
        taxId: TaxId::fromString('5000000000001'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $approvedDoc = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'citizen_id',
        fileName: 'citizen_id.pdf',
        filePath: 'vendor-documents/citizen_id.pdf',
    ));
    $approvedDoc->approve(verifiedBy: $internalUser->id);
    $repository->saveDocument($approvedDoc);

    $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'house_registration',
        fileName: 'house_registration.pdf',
        filePath: 'vendor-documents/house_registration.pdf',
    ));

    $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'commercial_registration',
        fileName: 'commercial_registration.pdf',
        filePath: 'vendor-documents/commercial_registration.pdf',
    ));

    $rejectedDoc = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'vat_registration',
        fileName: 'vat_registration.pdf',
        filePath: 'vendor-documents/vat_registration.pdf',
    ));
    $rejectedDoc->reject(verifiedBy: $internalUser->id, remark: 'Illegible scan');
    $repository->saveDocument($rejectedDoc);

    $otherUser = User::factory()->create(['user_type' => 'company']);
    $otherProfile = $repository->saveProfile(VendorProfile::create(userId: $otherUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $otherProfile->id(),
        companyName: 'Other Doc Status Co.',
        businessRegistrationNo: '5000000000004',
        taxId: TaxId::fromString('5000000000004'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $otherApprovedDoc1 = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $otherProfile->id(),
        documentType: 'citizen_id',
        fileName: 'citizen_id.pdf',
        filePath: 'vendor-documents/citizen_id.pdf',
    ));
    $otherApprovedDoc1->approve(verifiedBy: $internalUser->id);
    $repository->saveDocument($otherApprovedDoc1);

    $otherApprovedDoc2 = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $otherProfile->id(),
        documentType: 'house_registration',
        fileName: 'house_registration.pdf',
        filePath: 'vendor-documents/house_registration.pdf',
    ));
    $otherApprovedDoc2->approve(verifiedBy: $internalUser->id);
    $repository->saveDocument($otherApprovedDoc2);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors');

    $response->assertOk();

    $entry = collect($response->json('data'))->firstWhere('id', $profile->id());
    expect($entry['documentStatusCounts'])->toBe(['approved' => 1, 'pending' => 2, 'rejected' => 1]);

    $otherEntry = collect($response->json('data'))->firstWhere('id', $otherProfile->id());
    expect($otherEntry['documentStatusCounts'])->toBe(['approved' => 2, 'pending' => 0, 'rejected' => 0]);
});

test('a vendor with no documents has zero document status counts', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $profile = $repository->saveProfile(VendorProfile::create(userId: $vendorUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $profile->id(),
        companyName: 'No Docs Co.',
        businessRegistrationNo: '5000000000002',
        taxId: TaxId::fromString('5000000000002'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors');

    $response->assertOk()
        ->assertJsonPath('data.0.documentStatusCounts.approved', 0)
        ->assertJsonPath('data.0.documentStatusCounts.pending', 0)
        ->assertJsonPath('data.0.documentStatusCounts.rejected', 0);
});

test('a vendor detail response does not include document status counts', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;

    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $profile = $repository->saveProfile(VendorProfile::create(userId: $vendorUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $profile->id(),
        companyName: 'Detail Co.',
        businessRegistrationNo: '5000000000003',
        taxId: TaxId::fromString('5000000000003'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson("/api/v1/vendors/{$profile->id()}");

    $response->assertOk();
    expect($response->json('data'))->not->toHaveKey('documentStatusCounts');
});
