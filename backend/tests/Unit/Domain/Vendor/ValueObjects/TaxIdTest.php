<?php

use App\Modules\Vendor\Domain\ValueObjects\TaxId;

test('creates a tax id from a 13-digit string', function () {
    $taxId = TaxId::fromString('1234567890123');

    expect($taxId->value)->toBe('1234567890123')
        ->and((string) $taxId)->toBe('1234567890123');
});

test('rejects a tax id that is not 13 digits', function () {
    TaxId::fromString('12345');
})->throws(InvalidArgumentException::class);

test('rejects a tax id containing non-digit characters', function () {
    TaxId::fromString('123456789012a');
})->throws(InvalidArgumentException::class);
