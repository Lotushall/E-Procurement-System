<?php

use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;

function makeVendorCompanyDetail(): VendorCompanyDetail
{
    return VendorCompanyDetail::create(
        vendorProfileId: 10,
        companyName: 'Acme Co., Ltd.',
        businessRegistrationNo: '0123456789012',
        taxId: TaxId::fromString('1234567890123'),
        branchNo: '00000',
        businessType: 'Trading',
        address: '123 Main St.',
        province: 'Bangkok',
        postalCode: PostalCode::fromString('10110'),
    );
}

test('create builds a new detail with no id', function () {
    $detail = makeVendorCompanyDetail();

    expect($detail->id())->toBeNull()
        ->and($detail->vendorProfileId())->toBe(10)
        ->and($detail->companyName())->toBe('Acme Co., Ltd.')
        ->and($detail->businessRegistrationNo())->toBe('0123456789012')
        ->and($detail->taxId()->value)->toBe('1234567890123')
        ->and($detail->branchNo())->toBe('00000')
        ->and($detail->businessType())->toBe('Trading')
        ->and($detail->address())->toBe('123 Main St.')
        ->and($detail->province())->toBe('Bangkok')
        ->and($detail->postalCode()->value)->toBe('10110');
});

test('reconstitute rebuilds a detail from persisted values', function () {
    $taxId = TaxId::fromString('1234567890123');

    $detail = VendorCompanyDetail::reconstitute(
        id: 1,
        vendorProfileId: 10,
        companyName: 'Acme Co., Ltd.',
        businessRegistrationNo: '0123456789012',
        taxId: $taxId,
        branchNo: '00000',
        businessType: 'Trading',
        address: '123 Main St.',
        province: 'Bangkok',
        postalCode: PostalCode::fromString('10110'),
    );

    expect($detail->id())->toBe(1)
        ->and($detail->taxId())->toBe($taxId);
});

test('update replaces the editable detail fields', function () {
    $detail = makeVendorCompanyDetail();
    $newTaxId = TaxId::fromString('9876543210123');
    $newPostalCode = PostalCode::fromString('20000');

    $detail->update(
        companyName: 'Acme Holdings Co., Ltd.',
        businessRegistrationNo: '9999999999999',
        taxId: $newTaxId,
        branchNo: '00001',
        businessType: 'Manufacturing',
        address: '456 New St.',
        province: 'Chonburi',
        postalCode: $newPostalCode,
    );

    expect($detail->companyName())->toBe('Acme Holdings Co., Ltd.')
        ->and($detail->businessRegistrationNo())->toBe('9999999999999')
        ->and($detail->taxId())->toBe($newTaxId)
        ->and($detail->branchNo())->toBe('00001')
        ->and($detail->businessType())->toBe('Manufacturing')
        ->and($detail->address())->toBe('456 New St.')
        ->and($detail->province())->toBe('Chonburi')
        ->and($detail->postalCode())->toBe($newPostalCode);
});
