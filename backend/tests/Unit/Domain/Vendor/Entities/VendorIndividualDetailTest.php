<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;

test('holds the given values', function () {
    $citizenId = CitizenId::fromString('1234567890123');
    $taxId = TaxId::fromString('9876543210123');
    $email = Email::fromString('individual@example.com');
    $phone = PhoneNumber::fromString('0812345678');
    $postalCode = PostalCode::fromString('10110');

    $detail = new VendorIndividualDetail(
        id: 1,
        vendorProfileId: 10,
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        citizenId: $citizenId,
        shopName: 'John\'s Shop',
        businessType: 'Retail',
        taxId: $taxId,
        email: $email,
        phone: $phone,
        address: '456 Side St.',
        country: 'Thailand',
        province: 'Bangkok',
        postalCode: $postalCode,
        contactName: 'John Doe',
        lineId: 'john-doe',
        otherContact: null,
    );

    expect($detail->id)->toBe(1)
        ->and($detail->vendorProfileId)->toBe(10)
        ->and($detail->prefix)->toBe('Mr.')
        ->and($detail->firstname)->toBe('John')
        ->and($detail->lastname)->toBe('Doe')
        ->and($detail->citizenId)->toBe($citizenId)
        ->and($detail->shopName)->toBe('John\'s Shop')
        ->and($detail->businessType)->toBe('Retail')
        ->and($detail->taxId)->toBe($taxId)
        ->and($detail->email)->toBe($email)
        ->and($detail->phone)->toBe($phone)
        ->and($detail->address)->toBe('456 Side St.')
        ->and($detail->country)->toBe('Thailand')
        ->and($detail->province)->toBe('Bangkok')
        ->and($detail->postalCode)->toBe($postalCode)
        ->and($detail->contactName)->toBe('John Doe')
        ->and($detail->lineId)->toBe('john-doe')
        ->and($detail->otherContact)->toBeNull();
});
