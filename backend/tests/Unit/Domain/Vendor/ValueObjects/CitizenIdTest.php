<?php

use App\Modules\Vendor\Domain\ValueObjects\CitizenId;

test('creates a citizen id from a 13-digit string', function () {
    $citizenId = CitizenId::fromString('1234567840123');

    expect($citizenId->value)->toBe('1234567840123')
        ->and((string) $citizenId)->toBe('1234567840123');
});

test('rejects a citizen id that is not 13 digits', function () {
    CitizenId::fromString('12345');
})->throws(InvalidArgumentException::class);

test('rejects a citizen id containing non-digit characters', function () {
    CitizenId::fromString('123456789012a');
})->throws(InvalidArgumentException::class);

test('rejects a citizen id whose check digit does not match', function () {
    CitizenId::fromString('1101700230709');
})->throws(InvalidArgumentException::class, 'Invalid citizen ID: the check digit does not match.');

test('fromPersisted loads a stored citizen id even when its check digit does not match', function () {
    expect(CitizenId::fromPersisted('1101700230709')->value)->toBe('1101700230709');
});

test('fromPersisted still rejects a stored citizen id that is not 13 digits', function () {
    CitizenId::fromPersisted('12345');
})->throws(InvalidArgumentException::class, 'Invalid citizen ID: must be 13 digits.');
