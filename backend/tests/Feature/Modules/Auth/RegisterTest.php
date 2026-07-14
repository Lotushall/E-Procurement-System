<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function individualRegisterPayload(array $overrides = []): array
{
    return array_merge([
        'vendorType' => 'individual',
        'fullName' => 'John Doe',
        'idCard' => '1234567890123',
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
        'taxId' => '1234567890123',
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

test('store name is not required when registering as a company vendor', function () {
    $response = $this->postJson('/api/v1/auth/register', companyRegisterPayload());

    $response->assertCreated();

    $this->assertDatabaseHas('vendor_company_details', [
        'company_name' => 'Acme Co., Ltd.',
    ]);
});
