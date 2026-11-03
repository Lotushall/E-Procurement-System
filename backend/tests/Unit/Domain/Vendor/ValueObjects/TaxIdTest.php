<?php

use App\Modules\Vendor\Domain\ValueObjects\TaxId;

test('creates a tax id from a 13-digit string', function () {
    $taxId = TaxId::fromString('1234567840123');

    expect($taxId->value)->toBe('1234567840123')
        ->and((string) $taxId)->toBe('1234567840123');
});

test('rejects a tax id that is not 13 digits', function () {
    TaxId::fromString('12345');
})->throws(InvalidArgumentException::class);

test('rejects a tax id containing non-digit characters', function () {
    TaxId::fromString('123456789012a');
})->throws(InvalidArgumentException::class);

test('rejects a tax id whose check digit does not match', function () {
    TaxId::fromString('0105536000314');
})->throws(InvalidArgumentException::class, 'Invalid tax ID: the check digit does not match.');

test('fromPersisted loads a stored tax id even when its check digit does not match', function () {
    expect(TaxId::fromPersisted('0105536000314')->value)->toBe('0105536000314');
});

test('fromPersisted still rejects a stored tax id that is not 13 digits', function () {
    TaxId::fromPersisted('12345');
})->throws(InvalidArgumentException::class, 'Invalid tax ID: must be 13 digits.');
