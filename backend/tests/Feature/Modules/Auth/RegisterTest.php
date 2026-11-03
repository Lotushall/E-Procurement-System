<?php

use App\Modules\User\Domain\Contracts\EmailVerificationSenderInterface;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use App\Modules\Vendor\Domain\Exceptions\VendorIdentityAlreadyRegisteredException;
use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use App\Shared\Support\IdentityHash;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function individualRegisterPayload(array $overrides = []): array
{
    return array_merge([
        'vendorType' => 'individual',
        'fullName' => 'John Doe',
        'idCard' => '1234567840123',
        'storeName' => "John's Store",
        'phone' => '0812345678',
        'username' => 'johndoe',
        'email' => 'john@example.com',
        'password' => 'Secret123!',
        'password_confirmation' => 'Secret123!',
        'confirmPassword' => 'Secret123!',
        'terms' => true,
    ], $overrides);
}

function companyRegisterPayload(array $overrides = []): array
{
    return array_merge([
        'vendorType' => 'company',
        'companyName' => 'Acme Co., Ltd.',
        'taxId' => '1234567840123',
        'phone' => '0812345678',
        'username' => 'acmeco',
        'email' => 'acme@example.com',
        'password' => 'Secret123!',
        'password_confirmation' => 'Secret123!',
        'confirmPassword' => 'Secret123!',
        'terms' => true,
    ], $overrides);
}

test('registering an individual vendor persists the store name', function () {
    $response = $this->postJson('/api/v1/auth/register', individualRegisterPayload());

    $response->assertCreated();

    $this->assertDatabaseHas('vendor_individual_details', [
        'store_name' => "John's Store",
        'firstname' => 'John',
        'lastname' => 'Doe',
    ]);
});

test('store name is required when registering as an individual vendor', function () {
    $response = $this->postJson('/api/v1/auth/register', individualRegisterPayload(['storeName' => null]));

    $response->assertStatus(422)
        ->assertJsonValidationErrors('storeName');
});

test('a one-character username is accepted when registering', function () {
    $response = $this->postJson('/api/v1/auth/register', companyRegisterPayload(['username' => 'a']));

    $response->assertCreated();

    $this->assertDatabaseHas('users', ['username' => 'a']);
});

test('an unexpected failure while registering returns a server error and saves nothing', function () {
    $this->mock(EmailVerificationSenderInterface::class)
        ->shouldReceive('sendVerificationEmail')
        ->andThrow(new RuntimeException('mail server is down'));

    $this->postJson('/api/v1/auth/register', companyRegisterPayload())
        ->assertServerError()
        ->assertJson(['message' => 'สมัครสมาชิกไม่สำเร็จ']);

    $this->assertDatabaseMissing('users', ['username' => 'acmeco']);
});

test('store name is not required when registering as a company vendor', function () {
    $response = $this->postJson('/api/v1/auth/register', companyRegisterPayload());

    $response->assertCreated();

    $this->assertDatabaseHas('vendor_company_details', [
        'company_name' => 'Acme Co., Ltd.',
    ]);
});

test('registering rejects a tax ID or citizen ID whose check digit does not match', function (array $payload, string $field, string $message) {
    $this->postJson('/api/v1/auth/register', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors([$field => $message]);

    $this->assertDatabaseCount('users', 0);
})->with([
    'company tax ID' => fn () => [companyRegisterPayload(['taxId' => '0105536000314']), 'taxId', 'เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง กรุณาตรวจสอบเลขอีกครั้ง'],
    'individual citizen ID' => fn () => [individualRegisterPayload(['idCard' => '1101700230709']), 'idCard', 'เลขบัตรประจำตัวประชาชนไม่ถูกต้อง กรุณาตรวจสอบเลขอีกครั้ง'],
]);

test('registering accepts a valid number typed with dashes or spaces', function () {
    $this->postJson('/api/v1/auth/register', companyRegisterPayload(['taxId' => '0 1055-36000-31-3']))
        ->assertCreated();

    expect(VendorCompanyDetails::sole()->tax_id)->toBe('0105536000313');
});

test('registering rejects an ID number sent as an array instead of failing', function () {
    $this->postJson('/api/v1/auth/register', companyRegisterPayload(['taxId' => ['0105536000313']]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['taxId' => 'เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก']);
});

test('registering with a tax ID or citizen ID another vendor holds is rejected without saying which', function (string $model, array $existing, array $payload) {
    $model::factory()->create($existing);
    $usersBefore = UserModel::count();

    $this->postJson('/api/v1/auth/register', $payload)
        ->assertUnprocessable()
        ->assertExactJson(['message' => VendorIdentityAlreadyRegisteredException::PUBLIC_MESSAGE]);

    expect(UserModel::count())->toBe($usersBefore);
})->with([
    'company tax ID held by a company' => fn () => [
        VendorCompanyDetails::class,
        ['tax_id' => '0105536000313', 'tax_id_hash' => IdentityHash::make('0105536000313')],
        companyRegisterPayload(['taxId' => '0105536000313']),
    ],
    'company tax ID held by an individual as their tax ID' => fn () => [
        VendorIndividualDetails::class,
        ['tax_id' => '0105536000313', 'tax_id_hash' => IdentityHash::make('0105536000313')],
        companyRegisterPayload(['taxId' => '0105536000313']),
    ],
    'citizen ID held by an individual' => fn () => [
        VendorIndividualDetails::class,
        ['citizen_id' => '1101700230708', 'citizen_id_hash' => IdentityHash::make('1101700230708')],
        individualRegisterPayload(['idCard' => '1101700230708']),
    ],
]);
