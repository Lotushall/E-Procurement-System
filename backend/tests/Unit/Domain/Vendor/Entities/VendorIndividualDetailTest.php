<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;

function makeVendorIndividualDetail(): VendorIndividualDetail
{
    return VendorIndividualDetail::create(
        vendorProfileId: 10,
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        citizenId: CitizenId::fromString('1234567890123'),
        shopName: "John's Shop",
        businessType: 'Retail',
        taxId: TaxId::fromString('9876543210123'),
        email: Email::fromString('individual@example.com'),
        phone: PhoneNumber::fromString('0812345678'),
        address: '456 Side St.',
        country: 'Thailand',
        province: 'Bangkok',
        postalCode: PostalCode::fromString('10110'),
        contactName: 'John Doe',
        lineId: 'john-doe',
        otherContact: null,
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
        ->and($detail->shopName())->toBe("John's Shop")
        ->and($detail->businessType())->toBe('Retail')
        ->and($detail->taxId()->value)->toBe('9876543210123')
        ->and($detail->email()->value)->toBe('individual@example.com')
        ->and($detail->phone()->value)->toBe('0812345678')
        ->and($detail->address())->toBe('456 Side St.')
        ->and($detail->country())->toBe('Thailand')
        ->and($detail->province())->toBe('Bangkok')
        ->and($detail->postalCode()->value)->toBe('10110')
        ->and($detail->contactName())->toBe('John Doe')
        ->and($detail->lineId())->toBe('john-doe')
        ->and($detail->otherContact())->toBeNull();
});

test('reconstitute rebuilds a detail from persisted values', function () {
    $citizenId = CitizenId::fromString('1234567890123');

    $detail = VendorIndividualDetail::reconstitute(
        id: 1,
        vendorProfileId: 10,
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        citizenId: $citizenId,
        shopName: "John's Shop",
        businessType: 'Retail',
        taxId: TaxId::fromString('9876543210123'),
        email: Email::fromString('individual@example.com'),
        phone: PhoneNumber::fromString('0812345678'),
        address: '456 Side St.',
        country: 'Thailand',
        province: 'Bangkok',
        postalCode: PostalCode::fromString('10110'),
        contactName: 'John Doe',
        lineId: 'john-doe',
        otherContact: null,
    );

    expect($detail->id())->toBe(1)
        ->and($detail->citizenId())->toBe($citizenId);
});

test('update replaces the editable detail fields but not the citizen id', function () {
    $detail = makeVendorIndividualDetail();
    $originalCitizenId = $detail->citizenId();
    $newTaxId = TaxId::fromString('1112223334445');
    $newEmail = Email::fromString('new-individual@example.com');
    $newPhone = PhoneNumber::fromString('0898765432');
    $newPostalCode = PostalCode::fromString('20000');

    $detail->update(
        prefix: 'Dr.',
        firstname: 'Jane',
        lastname: 'Smith',
        shopName: "Jane's Shop",
        businessType: 'Wholesale',
        taxId: $newTaxId,
        email: $newEmail,
        phone: $newPhone,
        address: '789 New St.',
        country: 'Thailand',
        province: 'Chonburi',
        postalCode: $newPostalCode,
        contactName: 'Jane Smith',
        lineId: 'jane-smith',
        otherContact: 'WhatsApp: 0898765432',
    );

    expect($detail->citizenId())->toBe($originalCitizenId)
        ->and($detail->prefix())->toBe('Dr.')
        ->and($detail->firstname())->toBe('Jane')
        ->and($detail->lastname())->toBe('Smith')
        ->and($detail->shopName())->toBe("Jane's Shop")
        ->and($detail->businessType())->toBe('Wholesale')
        ->and($detail->taxId())->toBe($newTaxId)
        ->and($detail->email())->toBe($newEmail)
        ->and($detail->phone())->toBe($newPhone)
        ->and($detail->address())->toBe('789 New St.')
        ->and($detail->province())->toBe('Chonburi')
        ->and($detail->postalCode())->toBe($newPostalCode)
        ->and($detail->contactName())->toBe('Jane Smith')
        ->and($detail->lineId())->toBe('jane-smith')
        ->and($detail->otherContact())->toBe('WhatsApp: 0898765432');
});
