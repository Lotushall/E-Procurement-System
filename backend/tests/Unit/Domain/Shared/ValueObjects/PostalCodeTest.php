<?php

use App\Modules\Shared\Domain\ValueObjects\PostalCode;

test('creates a postal code from a 5-digit string', function () {
    $postalCode = PostalCode::fromString('10110');

    expect($postalCode->value)->toBe('10110')
        ->and((string) $postalCode)->toBe('10110');
});

test('rejects a postal code that is not 5 digits', function () {
    PostalCode::fromString('101');
})->throws(InvalidArgumentException::class);

test('rejects a postal code containing non-digit characters', function () {
    PostalCode::fromString('abcde');
})->throws(InvalidArgumentException::class);
