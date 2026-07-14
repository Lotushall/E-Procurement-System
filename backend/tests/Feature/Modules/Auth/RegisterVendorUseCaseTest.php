<?php

use App\Modules\Auth\Application\DTOs\RegisterVendorData;
use App\Modules\Auth\Application\UseCases\RegisterVendorUseCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function registerVendorUseCase(): RegisterVendorUseCase
{
    return app(RegisterVendorUseCase::class);
}

test('registering an individual vendor saves the store name on the vendor individual detail', function () {
    $user = registerVendorUseCase()->execute(new RegisterVendorData(
        vendorType: 'individual',
        companyName: null,
        taxId: null,
        fullName: 'John Doe',
        idCard: '1234567890123',
        storeName: "John's Store",
        phone: '0812345678',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'secret123',
    ));

    $this->assertDatabaseHas('vendor_individual_details', [
        'store_name' => "John's Store",
    ]);

    expect($user->userType()->value)->toBe('individual');
});

test('registering a company vendor does not require a store name', function () {
    $user = registerVendorUseCase()->execute(new RegisterVendorData(
        vendorType: 'company',
        companyName: 'Acme Co., Ltd.',
        taxId: '1234567890123',
        fullName: null,
        idCard: null,
        storeName: null,
        phone: '0812345678',
        username: 'acmeco',
        email: 'acme@example.com',
        password: 'secret123',
    ));

    $this->assertDatabaseHas('vendor_company_details', [
        'company_name' => 'Acme Co., Ltd.',
    ]);

    expect($user->userType()->value)->toBe('company');
});
