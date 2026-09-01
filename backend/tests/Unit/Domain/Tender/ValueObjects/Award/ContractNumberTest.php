<?php

use App\Modules\Tender\Domain\ValueObjects\Award\ContractNumber;

test('creates a contract number from a non-blank string', function () {
    $number = ContractNumber::fromString('CN-2569-0001');

    expect($number->value)->toBe('CN-2569-0001')
        ->and((string) $number)->toBe('CN-2569-0001');
});

test('trims surrounding whitespace', function () {
    $number = ContractNumber::fromString('  CN-2569-0001  ');

    expect($number->value)->toBe('CN-2569-0001');
});

test('rejects a blank contract number', function () {
    ContractNumber::fromString('   ');
})->throws(InvalidArgumentException::class);

test('rejects a contract number longer than 255 characters', function () {
    ContractNumber::fromString(str_repeat('a', 256));
})->throws(InvalidArgumentException::class);
