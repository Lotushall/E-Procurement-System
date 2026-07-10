<?php

use App\Modules\Vendor\Domain\ValueObjects\CitizenId;

test('creates a citizen id from a 13-digit string', function () {
    $citizenId = CitizenId::fromString('1234567890123');

    expect($citizenId->value)->toBe('1234567890123')
        ->and((string) $citizenId)->toBe('1234567890123');
});

test('rejects a citizen id that is not 13 digits', function () {
    CitizenId::fromString('12345');
})->throws(InvalidArgumentException::class);

test('rejects a citizen id containing non-digit characters', function () {
    CitizenId::fromString('123456789012a');
})->throws(InvalidArgumentException::class);
