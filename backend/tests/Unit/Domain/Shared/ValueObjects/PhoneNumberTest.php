<?php

use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;

test('creates a phone number by stripping non-digit characters', function () {
    $phone = PhoneNumber::fromString('081-234-5678');

    expect($phone->value)->toBe('0812345678')
        ->and((string) $phone)->toBe('0812345678');
});

test('accepts a 9-digit phone number', function () {
    $phone = PhoneNumber::fromString('812345678');

    expect($phone->value)->toBe('812345678');
});

test('rejects a phone number shorter than 9 digits', function () {
    PhoneNumber::fromString('12345');
})->throws(InvalidArgumentException::class);

test('rejects a phone number longer than 10 digits', function () {
    PhoneNumber::fromString('123456789012');
})->throws(InvalidArgumentException::class);
