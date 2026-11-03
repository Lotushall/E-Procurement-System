<?php

use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use App\Modules\Vendor\Presentation\Http\Resources\VendorCompanyDetailResource;
use App\Modules\Vendor\Presentation\Http\Resources\VendorIndividualDetailResource;

test('the company detail resource masks a sensitive id of four characters or fewer entirely', function () {
    $detail = new VendorCompanyDetails(['tax_id' => '1234', 'business_registration_no' => '12']);

    $resource = (new VendorCompanyDetailResource($detail))->resolve();

    expect($resource['taxId'])->toBe('xxxx')
        ->and($resource['businessRegistrationNo'])->toBe('xx');
});

test('the individual detail resource masks a sensitive id of four characters or fewer entirely', function () {
    $detail = new VendorIndividualDetails(['citizen_id' => '123', 'tax_id' => '1234']);

    $resource = (new VendorIndividualDetailResource($detail))->resolve();

    expect($resource['citizenId'])->toBe('xxx')
        ->and($resource['taxId'])->toBe('xxxx');
});

test('the detail resources keep the last four characters of a longer sensitive id', function () {
    $company = (new VendorCompanyDetailResource(new VendorCompanyDetails(['tax_id' => '1234567840123'])))->resolve();
    $individual = (new VendorIndividualDetailResource(new VendorIndividualDetails(['citizen_id' => '1234567840123'])))->resolve();

    expect($company['taxId'])->toBe('xxxxxxxxx0123')
        ->and($individual['citizenId'])->toBe('xxxxxxxxx0123');
});
