<?php

use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;

function makeVendorIndividualDetail(): VendorIndividualDetail
{
    return VendorIndividualDetail::create(
        vendorProfileId: 10,
        storeName: "John's Store",
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        citizenId: CitizenId::fromString('1234567890123'),
        businessType: 'Retail',
        taxId: TaxId::fromString('9876543210123'),
        address: '456 Side St.',
        province: 'Bangkok',
        postalCode: PostalCode::fromString('10110'),
    );
}

test('create builds a new detail with no id', function () {
    $detail = makeVendorIndividualDetail();

    expect($detail->id())->toBeNull()
        ->and($detail->vendorProfileId())->toBe(10)
        ->and($detail->prefix())->toBe('Mr.')
        ->and($detail->firstname())->toBe('John')
        ->and($detail->lastname())->toBe('Doe')
        ->and($detail->citizenId()->value)->toBe('1234567890123')
        ->and($detail->storeName())->toBe("John's Store")
        ->and($detail->businessType())->toBe('Retail')
        ->and($detail->taxId()->value)->toBe('9876543210123')
        ->and($detail->address())->toBe('456 Side St.')
        ->and($detail->province())->toBe('Bangkok')
        ->and($detail->postalCode()->value)->toBe('10110');
});

test('reconstitute rebuilds a detail from persisted values', function () {
    $citizenId = CitizenId::fromString('1234567890123');

    $detail = VendorIndividualDetail::reconstitute(
        id: 1,
        vendorProfileId: 10,
        storeName: "John's Store",
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        citizenId: $citizenId,
        businessType: 'Retail',
        taxId: TaxId::fromString('9876543210123'),
        address: '456 Side St.',
        province: 'Bangkok',
        postalCode: PostalCode::fromString('10110'),
    );

    expect($detail->id())->toBe(1)
        ->and($detail->citizenId())->toBe($citizenId);
});

test('update replaces the editable detail fields but not the citizen id', function () {
    $detail = makeVendorIndividualDetail();
    $originalCitizenId = $detail->citizenId();
    $newTaxId = TaxId::fromString('1112223334445');
    $newPostalCode = PostalCode::fromString('20000');

    $detail->update(
        storeName: "Jane's Store",
        prefix: 'Dr.',
        firstname: 'Jane',
        lastname: 'Smith',
        businessType: 'Wholesale',
        taxId: $newTaxId,
        address: '789 New St.',
        province: 'Chonburi',
        postalCode: $newPostalCode,
    );

    expect($detail->citizenId())->toBe($originalCitizenId)
        ->and($detail->prefix())->toBe('Dr.')
        ->and($detail->firstname())->toBe('Jane')
        ->and($detail->lastname())->toBe('Smith')
        ->and($detail->storeName())->toBe("Jane's Store")
        ->and($detail->businessType())->toBe('Wholesale')
        ->and($detail->taxId())->toBe($newTaxId)
        ->and($detail->address())->toBe('789 New St.')
        ->and($detail->province())->toBe('Chonburi')
        ->and($detail->postalCode())->toBe($newPostalCode);
});
