<?php

use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\Exceptions\VendorIdentityAlreadyRegisteredException;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use App\Shared\Support\IdentityHash;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function companyInfoPayload(array $overrides = []): array
{
    return array_merge([
        'vendorType' => 'company',
        'companyName' => 'Acme Holdings Co., Ltd.',
        'businessRegistrationNo' => '9999999989999',
        'branchNo' => '00001',
        'businessType' => 'Manufacturing',
        'taxId' => '9876543250123',
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
        'citizenId' => '9876543250123',
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
        businessRegistrationNo: '0123456709012',
        taxId: TaxId::fromString('1234567840123'),
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
        citizenId: CitizenId::fromString('1234567840123'),
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

/**
 * A signed-in company vendor whose company detail carries the given attributes.
 *
 * @param  array<string, mixed>  $detail
 */
function signedInCompanyVendor(array $detail = []): VendorProfiles
{
    $user = User::factory()->create(['user_type' => 'company']);
    $profile = VendorProfiles::factory()->create(['user_id' => $user->id]);
    VendorCompanyDetails::factory()->create(['vendor_profile_id' => $profile->id, ...$detail]);
    test()->actingAs($user, 'web');

    return $profile;
}

test('updating vendor info rejects an ID number whose check digit does not match', function (array $overrides, string $field, string $message) {
    signedInCompanyVendor();

    $this->postJson('/api/v1/vendor/info', companyInfoPayload($overrides))
        ->assertUnprocessable()
        ->assertJsonValidationErrors([$field => $message]);
})->with([
    'tax ID' => [['taxId' => '0105536000314'], 'taxId', 'เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง กรุณาตรวจสอบเลขอีกครั้ง'],
    'business registration number' => [['businessRegistrationNo' => '0105536000314'], 'businessRegistrationNo', 'เลขทะเบียนนิติบุคคลไม่ถูกต้อง กรุณาตรวจสอบเลขอีกครั้ง'],
]);

test('updating an individual vendor rejects a citizen ID whose check digit does not match', function () {
    $user = User::factory()->create(['user_type' => 'individual']);
    VendorProfiles::factory()->create(['user_id' => $user->id]);
    $this->actingAs($user, 'web');

    $this->postJson('/api/v1/vendor/info', individualInfoPayload(['citizenId' => '1101700230709']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['citizenId' => 'เลขบัตรประจำตัวประชาชนไม่ถูกต้อง กรุณาตรวจสอบเลขอีกครั้ง']);
});

test('updating vendor info rejects a value that is only partly masked', function () {
    signedInCompanyVendor();

    $this->postJson('/api/v1/vendor/info', companyInfoPayload(['taxId' => 'xxxx0123']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('taxId');
});

test('updating vendor info rejects an ID number sent as an array instead of failing', function () {
    signedInCompanyVendor();

    $this->postJson('/api/v1/vendor/info', companyInfoPayload(['taxId' => ['0105536000313']]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['taxId' => 'เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก']);
});

test('a company vendor must send a tax ID', function () {
    signedInCompanyVendor();

    $this->postJson('/api/v1/vendor/info', companyInfoPayload(['taxId' => null]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('taxId');
});

test('a masked ID number with nothing stored behind it is rejected', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    VendorProfiles::factory()->create(['user_id' => $user->id]);
    $this->actingAs($user, 'web');

    $this->postJson('/api/v1/vendor/info', companyInfoPayload(['taxId' => 'xxxxxxxxx0313']))
        ->assertUnprocessable()
        ->assertExactJson(['message' => 'ข้อมูลกิจการไม่ถูกต้อง กรุณาตรวจสอบข้อมูลอีกครั้ง']);

    $this->assertDatabaseCount('vendor_company_details', 0);
});

test('a stored number from before the check digit was enforced does not block other edits', function () {
    $profile = signedInCompanyVendor([
        'tax_id' => '1234567890123',
        'tax_id_hash' => IdentityHash::make('1234567890123'),
        'business_registration_no' => '1234567890124',
    ]);

    $this->postJson('/api/v1/vendor/info', companyInfoPayload([
        'taxId' => 'xxxxxxxxx0123',
        'businessRegistrationNo' => 'xxxxxxxxx0124',
    ]))->assertOk();

    $detail = VendorCompanyDetails::where('vendor_profile_id', $profile->id)->sole();

    expect($detail->tax_id)->toBe('1234567890123')
        ->and($detail->business_registration_no)->toBe('1234567890124')
        ->and($detail->company_name)->toBe('Acme Holdings Co., Ltd.');
});

test('updating vendor info to an ID number another vendor holds is rejected without saying which', function (array $otherVendor, array $overrides) {
    VendorCompanyDetails::factory()->create($otherVendor);
    $profile = signedInCompanyVendor();
    $before = VendorCompanyDetails::where('vendor_profile_id', $profile->id)->sole();

    $this->postJson('/api/v1/vendor/info', companyInfoPayload($overrides))
        ->assertUnprocessable()
        ->assertExactJson(['message' => VendorIdentityAlreadyRegisteredException::PUBLIC_MESSAGE]);

    $after = VendorCompanyDetails::where('vendor_profile_id', $profile->id)->sole();

    expect($after->tax_id)->toBe($before->tax_id)
        ->and($after->business_registration_no)->toBe($before->business_registration_no)
        ->and($after->company_name)->toBe($before->company_name);
})->with([
    'tax ID' => fn () => [
        ['tax_id' => '0105536000313', 'tax_id_hash' => IdentityHash::make('0105536000313')],
        ['taxId' => '0105536000313'],
    ],
    'business registration number' => fn () => [
        ['business_registration_no' => '0105536000313'],
        ['businessRegistrationNo' => '0105536000313'],
    ],
]);

test('a vendor may keep their own ID numbers when saving', function () {
    $profile = signedInCompanyVendor([
        'tax_id' => '0105536000313',
        'tax_id_hash' => IdentityHash::make('0105536000313'),
        'business_registration_no' => '0105555123450',
    ]);

    $this->postJson('/api/v1/vendor/info', companyInfoPayload([
        'taxId' => '0105536000313',
        'businessRegistrationNo' => '0105555123450',
    ]))->assertOk();

    expect(VendorCompanyDetails::where('vendor_profile_id', $profile->id)->sole()->company_name)->toBe('Acme Holdings Co., Ltd.');
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
