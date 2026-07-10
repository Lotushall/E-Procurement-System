<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;

test('holds the given values', function () {
    $taxId = TaxId::fromString('1234567890123');
    $postalCode = PostalCode::fromString('10110');
    $contactPhone = PhoneNumber::fromString('0812345678');
    $contactEmail = Email::fromString('contact@company.com');

    $detail = new VendorCompanyDetail(
        id: 1,
        vendorProfileId: 10,
        companyName: 'Acme Co., Ltd.',
        businessRegistrationNo: '0123456789012',
        taxId: $taxId,
        branchNo: '00000',
        businessType: 'Trading',
        address: '123 Main St.',
        country: 'Thailand',
        province: 'Bangkok',
        postalCode: $postalCode,
        contactName: 'Jane Doe',
        contactPosition: 'Manager',
        contactPhone: $contactPhone,
        contactEmail: $contactEmail,
        lineId: 'acme-co',
        otherContact: null,
    );

    expect($detail->id)->toBe(1)
        ->and($detail->vendorProfileId)->toBe(10)
        ->and($detail->companyName)->toBe('Acme Co., Ltd.')
        ->and($detail->businessRegistrationNo)->toBe('0123456789012')
        ->and($detail->taxId)->toBe($taxId)
        ->and($detail->branchNo)->toBe('00000')
        ->and($detail->businessType)->toBe('Trading')
        ->and($detail->address)->toBe('123 Main St.')
        ->and($detail->country)->toBe('Thailand')
        ->and($detail->province)->toBe('Bangkok')
        ->and($detail->postalCode)->toBe($postalCode)
        ->and($detail->contactName)->toBe('Jane Doe')
        ->and($detail->contactPosition)->toBe('Manager')
        ->and($detail->contactPhone)->toBe($contactPhone)
        ->and($detail->contactEmail)->toBe($contactEmail)
        ->and($detail->lineId)->toBe('acme-co')
        ->and($detail->otherContact)->toBeNull();
});
